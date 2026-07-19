from app.graph.review.state import ReviewState
from app.core.config import NODE_API_URL
from app.services.progress import report_progress
import httpx

async def notify_complete(state: ReviewState) -> ReviewState:
    print(f"[Node 6] Review complete for PR #{state['pr_number']}")
    await report_progress(state['job_id'], 'notify_complete', 'running', "Finalizing review...")

    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{NODE_API_URL}/internal/review-complete",
                json={
                    "job_id": state['job_id'],
                    "comments_count": len(state.get('comments', [])),
                    "comment_url": state.get('posted_urls', [None])[0],
                    "status": "completed"
                },
                timeout=10
            )
        print(f"[Node 6] Notified Node API — job {state['job_id']} complete")
    except Exception as e:
        print(f"[Node 6] Warning: failed to notify Node API: {e}")

    await report_progress(state['job_id'], 'notify_complete', 'completed', f"Review complete — {len(state.get('posted_urls', []))} comments posted")

    return state