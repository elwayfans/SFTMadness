from llama_cpp import Llama

llm = Llama(model_path="models/mistral-7b.Q4_K_M.gguf")

def run_llama(prompt: str) -> str:
    output = llm(prompt=prompt, max_tokens=256)
    return output["choices"][0]["text"].strip()
