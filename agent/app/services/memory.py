import httpx
from app.core.config import NODE_API_URL, INTERNAL_SERVICE_KEY
from app.services.embeddings import embed
from app.services.http_client import post_with_retry

async def store_decision(
    org_id: str,
    repo_id: str,
    content: str,
    decision_type: str,
    outcome: str,
    pr_number: int,
    file_path: str = None
):
    """Embed a past decision and store it via Node API (single source of truth)."""
    vector = embed(content)

    await post_with_retry(
        "/internal/memory/store",
        {
            "org_id": org_id,
            "repo_id": repo_id,
            "content": content,
            "decision_type": decision_type,
            "outcome": outcome,
            "pr_number": pr_number,
            "file_path": file_path,
            "embedding": vector
        },
        max_retries=3,
        timeout=30.0,
        idempotency_key=f"memory-store-{org_id}-{repo_id}-{pr_number}-{file_path or 'none'}"
    )

    print(f"Stored decision for PR #{pr_number}: {content[:60]}...")


async def search_memory(
    repo_id: str,
    query: str,
    limit: int = 5
) -> list[dict]:
    """Search for similar past decisions using cosine similarity via Node API."""
    vector = embed(query)

    result = await post_with_retry(
        "/internal/memory/search",
        {
            "repo_id": repo_id,
            "embedding": vector,
            "limit": limit
        },
        max_retries=3,
        timeout=30.0
    )

    return result.get("results", [])