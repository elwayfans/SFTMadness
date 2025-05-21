import json
import argparse
import os
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss

def chunk_text(text, chunk_size=500):
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

def main(company):
    base_path = f"/app/shared_data/{company}"
    os.makedirs(base_path, exist_ok=True)

    data_path = os.path.join(base_path, "college_knowledge.json")
    if not os.path.isfile(data_path):
        raise FileNotFoundError(f"Missing {data_path}")

    with open(data_path, "r") as f:
        raw_data = json.load(f)

    texts, urls = [], []
    for entry in raw_data:
        text = entry["text"]
        url = entry["url"]
        chunks = chunk_text(text) if len(text) > 1000 else [text]
        for chunk in chunks:
            texts.append(chunk)
            urls.append(url)

    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = model.encode(texts, show_progress_bar=True)

    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(np.array(embeddings))

    # Save all outputs to company-specific folder
    faiss.write_index(index, os.path.join(base_path, "faiss.index"))
    np.save(os.path.join(base_path, "embeddings.npy"), embeddings)

    with open(os.path.join(base_path, "docs.json"), "w") as f:
        json.dump({"texts": texts, "urls": urls}, f)

    print(f"Embeddings and FAISS index saved for company '{company}'.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--company", required=True, help="Company name for processing")
    args = parser.parse_args()
    main(args.company)
