from typing import Optional
import warnings
from dotenv import load_dotenv
import os

from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain.chains.mapreduce import MapReduceChain
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.rate_limiters import InMemoryRateLimiter

warnings.filterwarnings("ignore")

load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")

prompt_template = """Write a concise summary of the following text delimited by triple backquotes.
              Return your response in bullet points which covers the key points of the text.
              Do not provide any introduction just provide the summary.
              ```{text}```
              BULLET POINT SUMMARY:
  """

map_prompt_template = """
                      Write a summary of this chunk of text that includes the main points and any important details.
                      Do not provide any introduction just provide the summary.
                      {text}
                      """
combine_prompt_template = """Combine the following summaries into one coherent summary: {text}"""

prompt = PromptTemplate(template=prompt_template, input_variables=["text"])
map_prompt = PromptTemplate(template=map_prompt_template, input_variables=["text"])
combine_prompt = PromptTemplate(
    template=combine_prompt_template, input_variables=["text"]
)

class Summarizer:
    def __init__(self):
        rate_limiter = InMemoryRateLimiter(
            requests_per_second=0.5,
            check_every_n_seconds=0.1,
            max_bucket_size=10,
        )
        self.gemini_llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite-001", api_key=API_KEY, rate_limiter=rate_limiter)

        self.summarizer = load_summarize_chain(
            self.gemini_llm,
            chain_type="map_reduce",
            map_prompt=map_prompt,
            combine_prompt=prompt,
            return_intermediate_steps=True,
        )
        
    def summarize(self, text: str) -> str:
        '''
        Returns dict containing `"input_documents"`, `"intermediate_steps"`, `"summary"`, and `"detailed_summary"`
        '''
        chunked = self.chunk_text(text)
        summary = self.summarizer({"input_documents": chunked})
        
        detailed_summary = "\n".join([out for out in summary["intermediate_steps"]])
        summary["detailed_summary"] = detailed_summary
        summary["summary"] = summary.pop("output_text")

        return summary

    def chunk_text(self, text: str) -> list:
        text_splitter = RecursiveCharacterTextSplitter()
        docs = text_splitter.create_documents([text])
        return docs


if __name__ == "__main__":
    import json
    import os

    with open("sample_data/transcriptions.json", "r") as f:
        data = json.load(f)
    all_text = " ".join([entry["text"] for entry in data])

    model = Summarizer()
    summary = model.summarize(all_text)

    print(summary["summary"])