from github import Github
from app.core.config import GITHUB_TOKEN
from app.services.github import get_github_client
from app.graph.onboard.state import OnboardState
from datetime import datetime, timedelta, timezone

async def fetch_history(state: OnboardState) -> OnboardState:
    repo_name = state.get('repo', '')
    print(f"Fetching PR history for {repo_name}...")

    try:
        github_client = await get_github_client(state.get('installation_id'))
    except Exception as e:
        print(f"Could not get installation client: {e}. Falling back to default token.")
        github_client = Github(GITHUB_TOKEN) if GITHUB_TOKEN else None

    if not github_client:
        print(f"No GitHub client available to fetch history for {repo_name}")
        return {**state, "prs": [], "decisions": [], "stored_count": 0, "error": "No GitHub credentials"}

    try:
        repo = github_client.get_repo(repo_name)
    except Exception as e:
        print(f"Failed to access repository '{repo_name}': {e}")
        return {**state, "prs": [], "decisions": [], "stored_count": 0, "error": str(e)}

    cutoff = datetime.now(timezone.utc) - timedelta(days=30 * state.get('months_back', 6))

    prs = []
    count = 0
    try:
        for pr in repo.get_pulls(state='closed', sort='updated', direction='desc'):
            if pr.merged_at is None:
                continue
            if pr.merged_at < cutoff:
                break

            # collect review comments
            comments = []
            try:
                for comment in pr.get_review_comments():
                    comments.append({
                        "body": comment.body,
                        "path": comment.path,
                        "user": comment.user.login if comment.user else "ghost"
                    })
            except Exception as ce:
                print(f"Failed to fetch review comments for PR #{pr.number}: {ce}")

            # collect reviews
            reviews = []
            try:
                for review in pr.get_reviews():
                    if review.state in ['APPROVED', 'CHANGES_REQUESTED']:
                        reviews.append({
                            "state": review.state,
                            "body": review.body or "",
                            "user": review.user.login if review.user else "ghost"
                        })
            except Exception as re:
                print(f"Failed to fetch reviews for PR #{pr.number}: {re}")

            prs.append({
                "number": pr.number,
                "title": pr.title,
                "body": pr.body or "",
                "comments": comments,
                "reviews": reviews,
                "merged_at": pr.merged_at.isoformat()
            })
            count += 1
            if count >= 30:  # Cap at 30 recent PRs for responsive onboarding
                break
    except Exception as e:
        print(f"Error reading pull requests: {e}")

    print(f"Found {len(prs)} merged PRs for {repo_name}")
    return {**state, "prs": prs, "decisions": [], "stored_count": 0}