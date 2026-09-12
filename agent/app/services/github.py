from github import Github
from app.core.config import NODE_API_URL, INTERNAL_SERVICE_KEY
import httpx

async def get_github_client(installation_id: int = None) -> Github:
    """
    Get a GitHub client. Uses installation token if installation_id provided,
    falls back to PAT for development.
    """
    if installation_id:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{NODE_API_URL}/internal/installation-token",
                    json={"installation_id": installation_id},
                    headers={"x-internal-secret": INTERNAL_SERVICE_KEY}
                )
                data = response.json()
                token = data.get("token")
                if token:
                    return Github(token)

        except Exception as e:
            print(f"Failed to get installation token: {e}")
            raise Exception("Cannot fetch PR diff without a valid GitHub App installation token.")

    raise Exception("Installation ID is required.")


async def get_pr_diff(repo_name: str, pr_number: int, installation_id: int = None) -> list[dict]:
    github_client = await get_github_client(installation_id)
    repo = github_client.get_repo(repo_name)
    pr = repo.get_pull(pr_number)

    changed_files = []
    for file in pr.get_files():
        if file.patch:
            changed_files.append({
                "filename": file.filename,
                "patch": file.patch,
                "additions": file.additions,
                "deletions": file.deletions,
                "status": file.status
            })

    return changed_files


async def post_review_comment(
    repo_name: str,
    pr_number: int,
    comment: str,
    installation_id: int = None
) -> str:
    github_client = await get_github_client(installation_id)
    repo = github_client.get_repo(repo_name)
    pr = repo.get_pull(pr_number)
    posted = pr.create_issue_comment(comment)
    return posted.html_url


async def post_pull_request_review(
    repo_name: str,
    pr_number: int,
    body: str,
    inline_comments: list[dict] = None,
    event: str = "COMMENT",
    installation_id: int = None
) -> str:
    """
    Publishes a true Pull Request Review with inline diff comments and approval/changes status.
    Falls back gracefully to a standard issue comment if inline line numbers are rejected.
    """
    github_client = await get_github_client(installation_id)
    repo = github_client.get_repo(repo_name)
    pr = repo.get_pull(pr_number)

    try:
        commit = repo.get_commit(pr.head.sha)
        formatted_inline = []
        if inline_comments:
            for c in inline_comments:
                formatted_inline.append({
                    "path": c.get("path") or c.get("filename"),
                    "line": int(c.get("line", 1)),
                    "side": "RIGHT",
                    "body": c.get("body") or c.get("comment", "")
                })

        if formatted_inline:
            review = pr.create_review(
                commit=commit,
                body=body,
                event=event,
                comments=formatted_inline
            )
        else:
            review = pr.create_review(
                commit=commit,
                body=body,
                event=event
            )
        return review.html_url
    except Exception as e:
        print(f"GitHub create_review failed ({e}); falling back to PR issue comment")
        posted = pr.create_issue_comment(body)
        return posted.html_url