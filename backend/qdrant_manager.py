from qdrant_client import QdrantClient
from qdrant_client.http.models import VectorParams, PointStruct, Distance
import google.generativeai as genai
import os

# Environment setup
# os.environ["TOKENIZERS_PARALLELISM"] = "false"

class QdrantManager:
    def __init__(self, qdrant_api_key: str, google_api_key: str, host="localhost", port=6333):
        if host == "localhost": 
            self.client = QdrantClient(url=host, port=port)
        else:
            self.client = QdrantClient(url=host, port=port, api_key=qdrant_api_key)

        # Configure Gemini
        genai.configure(api_key=google_api_key)
    
    def collection_exists(self, collection_name: str) -> bool:
        try:
            self.client.get_collection(collection_name)
            return True
        except Exception:
            return False

    def create_collection(self, collection_name, vector_size=768):
        if self.collection_exists(collection_name):
            print(f"Collection '{collection_name}' already exists")
            return

        self.client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE
            )
        )

    def delete_collection(self, collection_name):
        if not self.collection_exists(collection_name):
            raise ValueError(f"Collection '{collection_name}' does not exist")
        
        self.client.delete_collection(collection_name)
    
    def get_next_id(self, collection_name: str) -> int:
        try:
            response = self.client.count(collection_name)
            return response.count if response.count else 0
        except Exception as e:
            return 0

    def add_text(self, collection_name: str, text: str):
        if not self.collection_exists(collection_name):
            raise ValueError(f"Collection '{collection_name}' does not exist")

        # Encode text
        embedding_response = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
        )

        embedding = embedding_response['embedding']

        next_id = self.get_next_id(collection_name)

        self.client.upsert(
            collection_name=collection_name,
            points=[
                PointStruct(
                    id=next_id,
                    vector=embedding,
                    payload={"text": text, "start_time": next_id * 10, "end_time": (next_id + 1) * 10},
                )
            ]
        )

    def search_similar(self, collection_name, prompt, limit: int = 30, similarity_threshold: float = 0.2):
        # Get embedding
        embedding_response = genai.embed_content(
            model="models/text-embedding-004",
            content=prompt
        )

        # Access the values directly from the embedding response
        embedding = embedding_response['embedding']

        results = self.client.search(
            collection_name=collection_name,
            query_vector=embedding,
            limit=limit,
            with_payload=True, 
            score_threshold=similarity_threshold # Gets results with score >= similarity_threshold
        )

        return results


    def chat(self, collection_name: str, prompt: str, conversation_history: list = []):
        if not self.collection_exists(collection_name):
            print(f"Collection '{collection_name}' does not exist")
            raise ValueError(f"Collection '{collection_name}' does not exist")

        results = self.search_similar(collection_name, prompt, similarity_threshold=0.5)
        print(results)

        if not results:
            return "No relevant context found. How can I help you?"

        history_context = "\n".join(conversation_history[-6:])

        combined_text = "\n".join(
            [
                f"{result.payload['start_time']} - {result.payload['end_time']}: {result.payload['text']}"
                for result in results
            ]
        )

        input_text = f"""Previous Conversation:\n{history_context}\n\nContext: {combined_text}\n\nUser: {prompt}\n"""

        model = genai.GenerativeModel("gemini-1.5-flash")
        result = model.generate_content(input_text)
        return result.text

    def get_transcriptions(self, collection_name: str):
        if not self.collection_exists(collection_name):
            raise ValueError(f"Collection '{collection_name}' does not exist")

        try:
            all_transcriptions = []
            next_offset = None

            while True:
                # Fetch batch of payloads
                scroll_result = self.client.scroll(
                    collection_name=collection_name,
                    scroll_filter=None, 
                    limit=1000, 
                    with_payload=True,
                    with_vectors=True, 
                    offset=next_offset
                )

                points = scroll_result[0]
                next_offset = scroll_result[1] 

                print(points[0])


                # Extract required fields and store as JSON objects
                transcriptions = [
                    {
                        "text": point.payload.get("text", ""),
                        "start_time": point.payload.get("start_time", 0),
                        "end_time": point.payload.get("end_time", 0),
                        "vector": point.vector
                    }
                    for point in points
                ]
                all_transcriptions.extend(transcriptions)

                # Stop when no more data
                if next_offset is None:
                    break

            print(f"Total transcriptions retrieved: {len(all_transcriptions)}")
            return all_transcriptions  # Returns a list of JSON objects

        except Exception as e:
            print(f"Error: {e}")
            return []
