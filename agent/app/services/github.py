from github import Github
from app.services.http_client import get_installation_token, invalidate_token_cache
import logging

logger = logging.getLogger(__name__)

async def get_github_client(installation_id: int = None) -> Github:
    """
    Get a GitHub client. Uses installation token if installation_id provided,
    falls back to PAT for development.
    """
    if installation_id:
        try:
            token = await get_installation_token(installation_id)
            return Github(token)

        except Exception as e:
            logger.error(f"Failed to get installation token: {e}")
            raise Exception("Cannot fetch PR diff without a valid GitHub App installation token.")

    raise Exception("Installation ID is required.")


async def get_pr_details(repo_name: str, pr_number: int, installation_id: int = None) -> tuple[list[dict], str]:
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

    return changed_files, pr.head.sha


async def get_pr_diff(repo_name: str, pr_number: int, installation_id: int = None) -> list[dict]:
    files, _ = await get_pr_details(repo_name, pr_number, installation_id)
    return files


async def post_commit_status(
    repo_name: str,
    sha: str,
    state: str,
    description: str,
    target_url: str = None,
    context: str = "Powerful AI / PR Risk",
    installation_id: int = None
) -> bool:
    try:
        github_client = await get_github_client(installation_id)
        repo = github_client.get_repo(repo_name)
        commit = repo.get_commit(sha)
        commit.create_status(
            state=state,
            description=description[:140],
            context=context,
            target_url=target_url or ""
        )
        logger.info(f"[github] Posted commit status ({state}) to {repo_name}@{sha[:7]}: {description}")
        return True
    except Exception as e:
        logger.warning(f"[github] Warning: Failed to post commit status: {e}")
        return False


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
                # Use side from comment if provided, default to RIGHT
                side = c.get("side", "RIGHT")
                if side not in ("LEFT", "RIGHT"):
                    side = "RIGHT"
                formatted_inline.append({
                    "path": c.get("path") or c.get("filename"),
                    "line": int(c.get("line", 1)),
                    "side": side,
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
        logger.warning(f"GitHub create_review failed ({e}); falling back to PR issue comment")
        posted = pr.create_issue_comment(body)
        return posted.html_url