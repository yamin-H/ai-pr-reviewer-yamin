import httpx
from app.core.config import NODE_API_URL

async def report_progress(job_id: str, node: str, status: str, message: str = "", meta: dict = None):
    """Send a pipeline progress event to the Node API to be streamed to the frontend."""
    print(f"[Progress] {node}:{status} → {NODE_API_URL}/internal/pipeline-update")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{NODE_API_URL}/internal/pipeline-update",
                json={
                    "job_id": job_id,
                    "node": node,
                    "status": status,
                    "message": message,
                    "meta": meta or {}
                },
                timeout=5
            )
            print(f"[Progress] Response: {response.status_code}")
    except Exception as e:
        print(f"[Progress] Failed to report {node}: {e}")