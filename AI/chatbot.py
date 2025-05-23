import json
import numpy as np
import faiss
import os
import traceback
from sentence_transformers import SentenceTransformer
import openai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI()


openai.api_key = "lm-studio"
# openai.api_base = "http://localhost:8888/v1"
openai.api_base = "http://host.docker.internal:8888/v1"

try:
    model = SentenceTransformer("all-MiniLM-L6-v2")
except Exception as e:
    print("Error loading SentenceTransformer model:")
    traceback.print_exc()
    raise RuntimeError("Failed to load embedding model")

company_cache = {}

class Query(BaseModel):
    prompt: str
    company: str

def load_company_data(company):
    if company in company_cache:
        return company_cache[company]

    base_path = f"/app/shared_data/{company}"
    index_path = os.path.join(base_path, "faiss.index")
    docs_path = os.path.join(base_path, "docs.json")

    if not os.path.isfile(index_path):
        raise FileNotFoundError(f"Missing FAISS index for company '{company}' at {index_path}")
    if not os.path.isfile(docs_path):
        raise FileNotFoundError(f"Missing docs.json for company '{company}' at {docs_path}")

    try:
        index = faiss.read_index(index_path)
    except Exception as e:
        print("Error loading FAISS index:")
        traceback.print_exc()
        raise ValueError(f"Failed to load FAISS index for '{company}'")

    try:
        with open(docs_path, "r", encoding="utf-8") as f:
            docs = json.load(f)
        texts = docs["texts"]
        urls = docs["urls"]
    except Exception as e:
        print("Error reading docs.json:")
        traceback.print_exc()
        raise ValueError(f"Invalid or malformed docs.json for '{company}'")

    company_cache[company] = (index, texts, urls)
    return index, texts, urls

def get_context(query, k, model, index, texts, urls):
    try:
        query_embedding = model.encode([query])
        D, I = index.search(np.array(query_embedding), k)
    except Exception as e:
        print("Error during embedding or index search:")
        traceback.print_exc()
        raise RuntimeError("Failed to retrieve context from FAISS")

    results = []
    for i in I[0]:
        try:
            source = urls[i]
            passage = texts[i]
            results.append(f"[{source}]\n{passage}")
        except IndexError:
            print(f"Index {i} out of range for texts/urls")
            continue
    return "\n\n".join(results)

def ask_bot(question, model, index, texts, urls):
    try:
        context = get_context(question, k=5, model=model, index=index, texts=texts, urls=urls)

        prompt = f"""
You are a professional and helpful college admissions assistant operating in a text-based chat. You represent the admissions office for the institution described in the information provided to you. Your tone should be friendly, informative, and respectful—never dismissive.

Use only the information you've been given to answer questions. Always clean up formatting issues in the data, including removing escape characters (e.g., convert \"Tower Suites,\" to “Tower Suites”), stripping out website newline indicators such as \n or /n, and eliminating extra spacing or symbols that break readability. Do not include instructions like “click here” or describe how to navigate web pages. Instead, explain things clearly and naturally as part of the conversation.

If a user asks what you can help with, explain that you can answer questions related to admissions and any topics included in the data you were provided. If someone asks about something not included in your data but still relevant to the institution, such as another office or service, provide a direct URL if one is included in your information. If no link is available, politely recommend that they contact the appropriate department or visit the institution’s official website.

If a question is completely off-topic and unrelated to anything in the data, respond with: “I'm sorry, I can't help you with that.” You must never generate or respond with NSFW content under any circumstance.

Always stay professional, helpful, and focused on delivering accurate, well-formatted information that reflects the tone and clarity of a real college admissions assistant.

Information:
{context}

Question: {question}
Answer:
"""

        response = openai.ChatCompletion.create(
            model="phi-3.1-mini-128k-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=9000
        )

        return response["choices"][0]["message"]["content"].strip()
    except openai.error.OpenAIError as e:
        print("OpenAI API error:")
        traceback.print_exc()
        raise RuntimeError("OpenAI API request failed")
    except Exception as e:
        print("Unknown error in ask_bot:")
        traceback.print_exc()
        raise RuntimeError("An unexpected error occurred during response generation")

@app.post("/chat")
def chat(query: Query):
    try:
        index, texts, urls = load_company_data(query.company)
        answer = ask_bot(query.prompt, model, index, texts, urls)
        return {"response": answer}
    except FileNotFoundError as e:
        print(f"404 Error: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        print(f"422 Validation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        print(f"500 Internal error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print("Unhandled exception:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/chat")
def get_chat():

    url = "http://host.docker.internal:8888/v1/models"
    resp = requests.get(url)
    resp.raise_for_status()
    return resp.json()
