from github import Github
from app.core.config import NODE_API_URL
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
                    json={"installation_id": installation_id}
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