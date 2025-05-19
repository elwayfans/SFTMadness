import json
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss

with open("college_knowledge.json", "r") as f:
    raw_data = json.load(f)

texts, urls = [], []

for entry in raw_data:
    text = entry["text"]
    url = entry["url"]
    if len(text) > 1000:
        chunks = [text[i:i+500] for i in range(0, len(text), 500)]
    else:
        chunks = [text]
    for chunk in chunks:
        texts.append(chunk)
        urls.append(url)

model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(texts, show_progress_bar=True)

index = faiss.IndexFlatL2(embeddings.shape[1])
index.add(np.array(embeddings))

faiss.write_index(index, "faiss.index")
np.save("embeddings.npy", embeddings)

with open("docs.json", "w") as f:
    json.dump({"texts": texts, "urls": urls}, f)

print("✅ Embeddings and index saved.")
