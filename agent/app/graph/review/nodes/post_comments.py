from app.graph.review.state import ReviewState
from app.services.github import post_pull_request_review
from app.services.progress import report_progress

async def post_comments(state: ReviewState) -> ReviewState:
    print(f"[Node 5] Posting {len(state['comments'])} comments to GitHub")
    await report_progress(state['job_id'], 'post_comments', 'running', f"Posting {len(state['comments'])} comments to GitHub")

    posted_urls = []

    if not state['comments']:
        url = await post_pull_request_review(
            repo_name=state['repo'],
            pr_number=state['pr_number'],
            body="✅ **PR Review Agent** — No issues found. Looks good!",
            event="APPROVE",
            installation_id=state.get('installation_id')
        )
        posted_urls.append(url)
        await report_progress(state['job_id'], 'post_comments', 'completed', "No issues found — posted clean review")
        return {**state, "posted_urls": posted_urls}

    severity_icons = {
        "error": "🔴",
        "warning": "⚠️",
        "suggestion": "💡"
    }

    has_errors = any(c.severity == "error" for c in state['comments'])
    event = "REQUEST_CHANGES" if has_errors else "COMMENT"

    comment_body = "## 🤖 PR Review Agent\n\n"
    comment_body += f"Found **{len(state['comments'])}** potential points of interest in this pull request.\n\n"

    by_file: dict = {}
    for c in state['comments']:
        by_file.setdefault(c.filename, []).append(c)

    for filename, comments in by_file.items():
        comment_body += f"### `{filename}`\n\n"
        for c in comments:
            icon = severity_icons.get(c.severity, "⚠️")
            comment_body += f"{icon} **Line {c.line}** — {c.comment}\n"
            if c.past_pr_number:
                comment_body += f"  > Referenced from PR #{c.past_pr_number}\n"
            comment_body += f"  *Confidence: {c.confidence:.0%}*\n\n"

    inline_comments = [
        {
            "path": c.filename,
            "line": c.line,
            "body": f"{severity_icons.get(c.severity, '⚠️')} **{c.severity.upper()}**: {c.comment}"
                    + (f"\n\n> Referenced from past PR #{c.past_pr_number}" if c.past_pr_number else "")
                    + f"\n*Confidence: {c.confidence:.0%}*"
        }
        for c in state['comments']
    ]

    url = await post_pull_request_review(
        repo_name=state['repo'],
        pr_number=state['pr_number'],
        body=comment_body,
        inline_comments=inline_comments,
        event=event,
        installation_id=state.get('installation_id')
    )
    posted_urls.append(url)
    print(f"[Node 5] Posted review: {url}")
    await report_progress(state['job_id'], 'post_comments', 'completed', "Posted PR review to GitHub")

    return {**state, "posted_urls": posted_urls}