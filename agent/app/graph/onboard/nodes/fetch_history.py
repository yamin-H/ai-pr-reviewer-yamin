from github import Github
from app.core.config import GITHUB_TOKEN
from app.graph.onboard.state import OnboardState
from datetime import datetime, timedelta, timezone

github_client = Github(GITHUB_TOKEN)

def fetch_history(state: OnboardState) -> OnboardState:
    print(f"Fetching PR history for {state['repo']}...")

    repo = github_client.get_repo(state['repo'])
    cutoff = datetime.now(timezone.utc) - timedelta(days=30 * state['months_back'])

    prs = []
    for pr in repo.get_pulls(state='closed', sort='updated', direction='desc'):
        if pr.merged_at is None:
            continue
        if pr.merged_at < cutoff:
            break

        # collect review comments
        comments = []
        for comment in pr.get_review_comments():
            comments.append({
                "body": comment.body,
                "path": comment.path,
                "user": comment.user.login
            })

        # collect reviews
        reviews = []
        for review in pr.get_reviews():
            if review.state in ['APPROVED', 'CHANGES_REQUESTED']:
                reviews.append({
                    "state": review.state,
                    "body": review.body or "",
                    "user": review.user.login
                })

        # include ALL merged PRs, even without comments
        prs.append({
            "number": pr.number,
            "title": pr.title,
            "body": pr.body or "",
            "comments": comments,
            "reviews": reviews,
            "merged_at": pr.merged_at.isoformat()
        })

    print(f"Found {len(prs)} merged PRs")
    return {**state, "prs": prs, "decisions": [], "stored_count": 0}