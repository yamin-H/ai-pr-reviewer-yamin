from fastembed import TextEmbedding

print("Loading embedding model...")
model = TextEmbedding("BAAI/bge-small-en-v1.5")
print("Embedding model loaded!")

def embed(text: str) -> list[float]:
    """Convert text to a 384-dimensional vector."""
    vector = list(model.embed([text]))
    return vector[0].tolist()