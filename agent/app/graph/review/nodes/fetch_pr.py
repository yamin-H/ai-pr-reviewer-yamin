from app.graph.review.state import ReviewState
from app.services.github import get_pr_details
from app.services.progress import report_progress

async def fetch_pr(state: ReviewState) -> ReviewState:
    print(f"[Node 1] Fetching diff for PR #{state['pr_number']} on {state['repo']}")
    await report_progress(state['job_id'], 'fetch_pr', 'running', f"Fetching PR #{state['pr_number']} diff from GitHub...")

    changed_files, pr_head_sha = await get_pr_details(
        state['repo'],
        state['pr_number'],
        state.get('installation_id')
    )

    head_sha = state.get('head_sha') or pr_head_sha
    print(f"[Node 1] Got {len(changed_files)} changed files (head_sha: {head_sha[:7] if head_sha else 'unknown'})")
    await report_progress(state['job_id'], 'fetch_pr', 'completed', f"Fetched {len(changed_files)} changed files", {"files_count": len(changed_files), "head_sha": head_sha})

    return {
        **state,
        "changed_files": changed_files,
        "head_sha": head_sha,
        "chunks": [],
        "chunks_with_memory": [],
        "comments": [],
        "posted_urls": []
    }