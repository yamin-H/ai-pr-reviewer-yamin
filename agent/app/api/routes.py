from fastapi import APIRouter, Header, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm import llm
from app.services.memory import store_decision, search_memory
from app.graph.onboard.agent import onboard_graph
from app.graph.review.agent import review_graph
from app.core.config import INTERNAL_SERVICE_KEY
import json

async def verify_internal_secret(x_internal_secret: Optional[str] = Header(None)):
    expected = INTERNAL_SERVICE_KEY or "powerful-internal-secret-change-in-prod"
    if x_internal_secret is not None and x_internal_secret != expected:
        raise HTTPException(status_code=403, detail="Unauthorized internal service call")

router = APIRouter(dependencies=[Depends(verify_internal_secret)])


class ReviewRequest(BaseModel):
    job_id: str
    repo: str
    pr_number: int
    installation_id: int

class OnboardRequest(BaseModel):
    repo: str
    org_id: str
    installation_id: Optional[int] = None
    months_back: int = 6

class DigestRequest(BaseModel):
    org_id: str
    prs_reviewed: int
    flags_raised: int
    flags_approved: int
    flags_dismissed: int
    reviews: list[dict]

class LearnRequest(BaseModel):
    org_id: str
    repo_id: str
    pr_number: int
    file_path: Optional[str] = None
    line: Optional[int] = None
    severity: Optional[str] = "warning"
    comment: str
    action: str  # "approve" or "dismiss"


@router.post("/review")
async def review_pr(body: ReviewRequest):
    print(f"Got review job: {body.job_id} for PR #{body.pr_number} on {body.repo}")

    result = await review_graph.ainvoke({
        "job_id": body.job_id,
        "repo": body.repo,
        "pr_number": body.pr_number,
        "installation_id": body.installation_id
    })

    # Serialize comments for the Node API to save them in Prisma
    comments_data = []
    if result.get("comments"):
        for c in result["comments"]:
            # Assuming c is a Pydantic model or dataclass with these fields
            comments_data.append({
                "filename": c.filename,
                "line": c.line,
                "severity": c.severity,
                "comment": c.comment,
                "confidence": c.confidence,
                "past_pr_number": c.past_pr_number
            })

    return {
        "status": "completed",
        "job_id": body.job_id,
        "comments_posted": len(result.get("comments", [])),
        "files_reviewed": len(result.get("changed_files", [])),
        "comment_url": result.get("posted_urls", [None])[0] if result.get("posted_urls") else None,
        "comments": comments_data
    }


@router.post("/onboard")
async def onboard_repo(body: OnboardRequest):
    print(f"Starting onboarding for {body.repo} (installation: {body.installation_id})")

    result = await onboard_graph.ainvoke({
        "repo": body.repo,
        "org_id": body.org_id,
        "installation_id": body.installation_id,
        "months_back": body.months_back,
        "prs": [],
        "decisions": [],
        "stored_count": 0,
        "error": None
    })

    return {
        "status": "completed",
        "repo": body.repo,
        "stored_count": result.get("stored_count", 0),
        "error": result.get("error"),
        "message": f"Memory ready — {result.get('stored_count', 0)} decisions stored"
    }



@router.post("/memory/learn")
async def learn_from_feedback(body: LearnRequest):
    outcome = "approved" if body.action == "approve" else "dismissed"

    # Map severity to standard decision categories
    severity_map = {
        "error": "security",
        "warning": "code_smell",
        "suggestion": "style"
    }
    decision_type = severity_map.get((body.severity or "").lower(), "general")

    # Format contextual text for high-relevance semantic embedding
    if outcome == "approved":
        content = f"Rule/Pattern approved on {body.file_path or 'code'}: {body.comment}"
    else:
        content = f"Dismissed/Rejected pattern on {body.file_path or 'code'}: {body.comment}"

    await store_decision(
        org_id=body.org_id,
        repo_id=body.repo_id,
        content=content,
        decision_type=decision_type,
        outcome=outcome,
        pr_number=body.pr_number,
        file_path=body.file_path
    )

    return {
        "status": "learned",
        "outcome": outcome,
        "content": content,
        "decision_type": decision_type
    }


@router.post("/memory/test")
async def test_memory():
    await store_decision(
        org_id="test-org",
        repo_id="yamin-H/bug-test-repo",
        content="Team rejected N+1 query pattern in UserService. Developer was fetching user inside a loop. Requested to use batch query with whereIn instead.",
        decision_type="performance",
        outcome="rejected",
        pr_number=5,
        file_path="src/services/UserService.ts"
    )

    results = await search_memory(
        repo_id="yamin-H/bug-test-repo",
        query="database call inside a for loop fetching users one by one"
    )

    return {"stored": True, "search_results": results}


@router.post("/digest")
async def generate_digest(body: DigestRequest):
    all_comments = []
    for review in body.reviews:
        all_comments.extend(review.get('comments', []))

    comments_text = "\n".join([f"- {c}" for c in all_comments[:50]])

    response = llm.invoke([
        SystemMessage(content="You analyze code review patterns and summarize them concisely."),
        HumanMessage(content=f"""Analyze this week's code review activity:

PRs reviewed: {body.prs_reviewed}
Flags raised: {body.flags_raised}
Flags approved: {body.flags_approved}
Flags dismissed: {body.flags_dismissed}

Comments made this week:
{comments_text or 'none'}

Respond ONLY with JSON, no markdown:
{{
  "top_issue": "one sentence describing the most common issue flagged",
  "top_dismissed": "one sentence describing what was most often dismissed",
  "patterns_learned": <number of new patterns identified>
}}""")
    ])

    raw = response.content.strip().replace("```json", "").replace("```", "").strip()
    result = json.loads(raw)

    return result