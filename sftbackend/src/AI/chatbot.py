import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from openai import OpenAI

# Initialize OpenAI client with custom base URL and API key
client = OpenAI(
    base_url="http://localhost:8888/v1",
    api_key="lm-studio"
)

# Load sentence transformer model and FAISS index
model = SentenceTransformer("all-MiniLM-L6-v2")
index = faiss.read_index("faiss.index")

# Load documents and corresponding metadata
with open("docs.json", "r", encoding="utf-8") as f:
    docs = json.load(f)
texts = docs["texts"]
urls = docs["urls"]

def get_context(query, k=5):
    """
    Retrieve top-k relevant contexts from the FAISS index based on the query.
    """
    query_embedding = model.encode([query])
    D, I = index.search(np.array(query_embedding), k)
    results = []
    for i in I[0]:
        source = urls[i]
        passage = texts[i]
        results.append(f"[{source}]\n{passage}")
    return "\n\n".join(results)

def ask_bot(question):
    """
    Generate a response from the AI model based on the provided question and retrieved context.
    """
    context = get_context(question)

    prompt = f"""
You are a helpful college admissions assistant. Use only the information below to answer. If the user asks what you can answer please use the information below to answer.".

Information:
{context}

Question: {question}
Answer:
"""

    response = client.chat.completions.create(
        model="local-model",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_completion_tokens=1000
    )

    return response.choices[0].message.content.strip()

if __name__ == "__main__":
    print("🎓 College Bot")
    while True:
        q = input("You: ")
        if q.lower() in ("exit", "quit"):
            break
        print("Bot:", ask_bot(q))
