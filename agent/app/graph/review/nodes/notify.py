from app.graph.review.state import ReviewState
from app.services.progress import report_progress
from app.services.http_client import post_with_retry

async def notify_complete(state: ReviewState) -> ReviewState:
    print(f"[Node 6] Review complete for PR #{state['pr_number']}")
    await report_progress(state['job_id'], 'notify_complete', 'running', "Finalizing review...")

    try:
        await post_with_retry(
            "/internal/review-complete",
            {
                "job_id": state['job_id'],
                "comments_count": len(state.get('comments', [])),
                "comment_url": state.get('posted_urls', [None])[0],
                "status": "completed"
            },
            max_retries=3,
            timeout=15.0,
            idempotency_key=f"review-complete-{state['job_id']}"
        )

        print(f"[Node 6] Notified Node API — job {state['job_id']} complete")
    except Exception as e:
        print(f"[Node 6] ERROR: failed to notify Node API after retries: {e}")
        # Don't raise - let the graph complete, but log the error
        # The review is already posted to GitHub at this point

    await report_progress(state['job_id'], 'notify_complete', 'completed', f"Review complete — {len(state.get('posted_urls', []))} comments posted")

    return state