from app.graph.review.state import ReviewState
from app.services.github import get_pr_diff
from app.services.progress import report_progress

async def fetch_pr(state: ReviewState) -> ReviewState:
    print(f"[Node 1] Fetching diff for PR #{state['pr_number']} on {state['repo']}")
    await report_progress(state['job_id'], 'fetch_pr', 'running', f"Fetching PR #{state['pr_number']} diff from GitHub...")

    changed_files = await get_pr_diff(
        state['repo'],
        state['pr_number'],
        state.get('installation_id')
    )

    print(f"[Node 1] Got {len(changed_files)} changed files")
    await report_progress(state['job_id'], 'fetch_pr', 'completed', f"Fetched {len(changed_files)} changed files", {"files_count": len(changed_files)})

    return {**state, "changed_files": changed_files, "chunks": [], "chunks_with_memory": [], "comments": [], "posted_urls": []}