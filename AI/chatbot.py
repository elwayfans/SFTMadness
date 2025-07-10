import json
import numpy as np
import faiss
import os
import traceback
from collections import defaultdict
from sentence_transformers import SentenceTransformer
import openai
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List
from threading import Lock
import requests

app = FastAPI()

openai.api_key = "lm-studio"
openai.api_base = "http://host.docker.internal:8888/v1"

# Load SentenceTransformer
try:
    model = SentenceTransformer("all-MiniLM-L6-v2")
except Exception as e:
    print("Error loading SentenceTransformer model:")
    traceback.print_exc()
    raise RuntimeError("Failed to load embedding model")

company_cache = {}
queue_counts = defaultdict(int)
queue_lock = Lock()

# Input format
class QueryModel(BaseModel):
    prompt: str
    company: str

# Load cached company data
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
    except Exception:
        traceback.print_exc()
        raise ValueError(f"Failed to load FAISS index for '{company}'")

    try:
        with open(docs_path, "r", encoding="utf-8") as f:
            docs = json.load(f)
        texts = docs["texts"]
        urls = docs["urls"]
    except Exception:
        traceback.print_exc()
        raise ValueError(f"Invalid or malformed docs.json for '{company}'")

    company_cache[company] = (index, texts, urls)
    return index, texts, urls

# Get top-k FAISS matches
def get_context(query, k, model, index, texts, urls):
    try:
        query_embedding = model.encode([query])
        D, I = index.search(np.array(query_embedding), k)
    except Exception:
        traceback.print_exc()
        raise RuntimeError("Failed to retrieve context from FAISS")

    results = []
    for i in I[0]:
        try:
            source = urls[i]
            passage = texts[i]
            results.append(f"[{source}]\n{passage}")
        except IndexError:
            print(f"Index {i} out of range")
            continue
    return "\n\n".join(results)

# Get all running chatbot models
def get_running_models():
    try:
        models = openai.Model.list()
        return [m["id"] for m in models["data"] if m["id"].startswith("phi-3.1-mini")]
    except Exception:
        traceback.print_exc()
        return []

# Select least-loaded model
def get_least_loaded_model(model_ids):
    with queue_lock:
        sorted_models = sorted(model_ids, key=lambda m: queue_counts[m])
        chosen = sorted_models[0]
        queue_counts[chosen] += 1
        return chosen

# Release model after request
def release_model(model_id):
    with queue_lock:
        queue_counts[model_id] = max(0, queue_counts[model_id] - 1)

# Generate response using chatbot model
def ask_bot(question, embed_model, index, texts, urls, company_key):
    # Fetch identity data from backend
    try:
        response = requests.get(
            "http://host.docker.internal:8000/customs",
            params={"company": company_key}
        )
        response.raise_for_status()
        identity_data = response.json()["data"]
    except Exception as e:
        print(f"Failed to retrieve identity data for {company_key}: {e}")
        raise RuntimeError(f"Could not fetch school identity from backend for {company_key}")

    # Extract data fields
    name = identity_data.get("full_name", "this institution")
    short_name = identity_data.get("short_name", "the institution")
    school_type = identity_data.get("type", "institution")
    forbidden_terms = ", ".join([f'"{t}"' for t in identity_data.get("forbidden_terms", [])])
    instructions = identity_data.get("instructions", "")
    friendliness = identity_data.get("friendliness")
    humor = identity_data.get("humor")
    formality = identity_data.get("formality")
    technical_level = identity_data.get("technicalLevel")
    preferred_greeting = identity_data.get("preferredGreeting")
    signature_closing = identity_data.get("signatureClosing")

    # Style hints (if relevant)
    extra_style = f"Please maintain a friendly tone (friendliness: {friendliness}/100), a bit of humor (humor: {humor}/100), and a moderate level of formality (formality: {formality}/100). "
    extra_style += f"Use a clear and technically accurate style (technical level: {technical_level}/100). "
    if preferred_greeting:
        extra_style += f"Start with a greeting like: {preferred_greeting}. "
    if signature_closing:
        extra_style += f"End with: {signature_closing}. "

    # Get context
    context = get_context(question, k=5, model=embed_model, index=index, texts=texts, urls=urls)

    # Build prompt
    prompt = (
        f"You are a professional and helpful admissions assistant operating in a text-based chat. "
        f"You represent the admissions office for {name}. "
        f"Always refer to this institution as “{short_name}” or “the {school_type}.” "
        f"Never use the following terms: {forbidden_terms}. "
        f"You must only use the information that is explicitly provided to you in the dataset below. "
        f"Do not use any other knowledge you might have or pull information from outside sources. "
        f"When you present information to the user, remove any escape characters like backslashes, "
        f"website-specific formatting indicators like “\\n” or extra symbols, and other clutter. "
        f"Rephrase information so that it is clear, easy to understand, and conversational, as if you are speaking directly to the user. "
        f"If a question asks about something that is not included in the data, respond by saying: "
        f"“I’m sorry, I don’t have that information.” "
        f"If a user asks what you can help with, explain by saying: "
        f"“I can answer questions related to admissions and any topics included in the information provided to me. "
        f"If you’re looking for information that’s not covered here, I’ll let you know the best way to find it.” "
        f"If a question is completely off-topic and unrelated to the provided data, respond by saying: "
        f"“I’m sorry, I can’t help you with that.” "
        f"{instructions} {extra_style} "
        f"You must follow these instructions exactly and without exception. "
        f"The dataset begins below, and you must use only that data to answer questions.\n\n"
        f"Information:\n{context}\n\n"
        f"Question: {question}\n"
        f"Answer:"
    )

    # Send to LM Studio
    models = get_running_models()
    if not models:
        raise RuntimeError("No chatbot models are running")

    chosen_model = get_least_loaded_model(models)

    try:
        response = openai.ChatCompletion.create(
            model=chosen_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=9000
        )
        return response["choices"][0]["message"]["content"].strip()
    finally:
        release_model(chosen_model)

# FastAPI endpoints
@app.post("/chat")
def chat(query: QueryModel):
    try:
        index, texts, urls = load_company_data(query.company)
        answer = ask_bot(query.prompt, model, index, texts, urls, query.company)
        return {"response": answer}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/chat")
def get_chat():
    url = "http://host.docker.internal:8888/v1/models"
    resp = requests.get(url)
    resp.raise_for_status()
    return resp.json()

# --- NEW /customs endpoint for query param support ---
@app.get("/customs")
def get_custom(company: str = Query(...)):
    """
    Returns the knowledge data for a given company.
    """
    
    identity_path = f"/app/shared_data/{company}/college_knowledge.json"
    if not os.path.isfile(identity_path):
        raise HTTPException(status_code=404, detail="Company knowledge not found")
    try:
        with open(identity_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"data": data}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to load company knowledge")