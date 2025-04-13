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
    
    def add_text_pdf(self, collection_name: str, text: str):
        if not self.collection_exists(collection_name):
            # raise ValueError(f"Collection '{collection_name}' does not exist")
            self.create_collection(collection_name)
        
        print("Printed")

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
                    payload={"text": text, "isPDF": True},
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

        results = self.search_similar(collection_name, prompt, similarity_threshold=0.2)
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


                # Extract required fields and store as JSON objects
                transcriptions = [
                    {
                        "text": point.payload.get("text", ""),
                        "start_time": point.payload.get("start_time", 0),
                        "end_time": point.payload.get("end_time", 0),
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


    def get_text(self, collection_name: str):
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




                # Extract required fields and store as JSON objects
                transcriptions = [
                    {
                        "text": point.payload.get("text", ""),
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


    def generate_concept_graph(self, collection_name: str):
        """
        Generate a concept graph from transcription data.
        Returns a dictionary with 'nodes' and 'edges' representing the graph.
        """
        if not self.collection_exists(collection_name):
            raise ValueError(f"Collection '{collection_name}' does not exist")


        try:
            # Get all transcription texts
            transcriptions = self.get_transcriptions(collection_name)
            
            if not transcriptions:
                return {"nodes": [], "edges": []}
            
            # Combine all transcription texts
            combined_text = "\n".join([t.get("text", "") for t in transcriptions])
            
            # If combined text is too long, truncate it
            if len(combined_text) > 10000:
                combined_text = combined_text[:10000]
            
            # Prompt for Gemini to extract concepts and relationships
            prompt = f"""
            Analyze the following meeting transcript and extract key concepts and their relationships.
            
            TRANSCRIPT:
            {combined_text}
            
            Create a concept graph with the following structure:
            1. Nodes: Identify 8 key concepts, topics, or entities from the transcript.
            2. Edges: Identify relationships between these concepts.
            
            Output the result as a JSON object with the following structure:
            {{
                "nodes": [
                {{
                    "id": "unique_id_1",
                    "text": "concept_name",
                    "type": "concept|topic|action",
                    "importance": number from 1-10
                }},
                ...
                ],
                "edges": [
                {{
                    "source": "unique_id_of_source_node",
                    "target": "unique_id_of_target_node",
                    "type": "related|subTopic|implies",
                    "strength": number from 1-10
                }},
                ...
                ]
            }}
            
            Ensure that:
            - Each node has a unique ID (can be a simple number)
            - Each edge connects existing nodes by their IDs
            - Node types are one of: "concept", "topic", or "action"
            - Edge types are one of: "related", "subTopic", or "implies"
            - The graph is well-connected and represents the key relationships in the transcript
            - Only return the JSON, with no additional explanation
            """
            
            # Call Gemini to generate the concept graph
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(prompt)
            
            # Parse the response
            try:
                import json
                import re
                
                # Clean the response to extract just the JSON
                content = response.text
                
                # Extract JSON from possible markdown or surrounding text
                json_match = re.search(r'```(?:json)?(.*?)```', content, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1).strip()
                else:
                    json_str = content
                
                # Remove any non-JSON text before or after
                json_str = re.sub(r'^[^{]*', '', json_str)
                json_str = re.sub(r'[^}]*$', '', json_str)
                
                concept_graph = json.loads(json_str)
                
                # Ensure we have the expected structure
                if 'nodes' not in concept_graph or 'edges' not in concept_graph:
                    raise ValueError("Invalid concept graph structure")
                
                # Add timestamps and text snippets to nodes from original transcriptions
                for node in concept_graph['nodes']:
                    # Find relevant transcription segments for this concept
                    related_segments = []
                    for segment in transcriptions:
                        if node['text'].lower() in segment.get('text', '').lower():
                            related_segments.append(segment)
                    
                    # Add reference to first found segment
                    if related_segments:
                        node['start_time'] = related_segments[0].get('start_time', 0)
                        node['end_time'] = related_segments[0].get('end_time', 0)
                        node['text_snippet'] = related_segments[0].get('text', '')[:100] + '...'
                
                return concept_graph
                
            except Exception as e:
                print(f"Error parsing concept graph: {e}")
                # Fallback to a simplified structure if parsing fails
                return {
                    "nodes": [
                        {"id": str(i), "text": t.get("text", "")[:50], "type": "concept", "importance": 5}
                        for i, t in enumerate(transcriptions[:12])
                    ],
                    "edges": [
                        {"source": str(i), "target": str(i+1), "type": "related", "strength": 5}
                        for i in range(min(11, len(transcriptions)-1))
                    ]
                }
                
        except Exception as e:
            print(f"Error generating concept graph: {e}")
            # Return an empty graph
            return {"nodes": [], "edges": []}
