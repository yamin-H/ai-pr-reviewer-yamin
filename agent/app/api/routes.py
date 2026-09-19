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

async def verify_internal_secret(x_internal_secret: Optional[str] = Header(None)) -> None:
    """
    Validate the internal service-to-service secret on every request routed
    through this dependency.

    Rejects with:
      - 500 if INTERNAL_SERVICE_KEY is not configured on this server
            (misconfiguration, never returns 403 so the two failure modes
             are clearly distinguishable in logs and monitoring)
      - 403 if the header is absent or its value does not match exactly
    """
    if not INTERNAL_SERVICE_KEY:
        # Server is misconfigured — this should have been caught at startup
        # by validate_required_env(), but we guard defensively here as well.
        raise HTTPException(
            status_code=500,
            detail="Internal service key is not configured on this server.",
        )

    if not x_internal_secret or x_internal_secret != INTERNAL_SERVICE_KEY:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized internal service call.",
        )

router = APIRouter(dependencies=[Depends(verify_internal_secret)])


class ReviewRequest(BaseModel):
    job_id: str
    repo: str
    pr_number: int
    installation_id: int
    confidence_threshold: Optional[float] = 0.5
    past_dismissal_rate: Optional[float] = 0.20
    head_sha: Optional[str] = None

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
    print(f"Got review job: {body.job_id} for PR #{body.pr_number} on {body.repo} (threshold: {body.confidence_threshold})")

    result = await review_graph.ainvoke({
        "job_id": body.job_id,
        "repo": body.repo,
        "pr_number": body.pr_number,
        "installation_id": body.installation_id,
        "confidence_threshold": body.confidence_threshold or 0.5,
        "past_dismissal_rate": body.past_dismissal_rate or 0.20,
        "head_sha": body.head_sha
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
        "risk_score": result.get("risk_score"),
        "risk_breakdown": result.get("risk_breakdown"),
        "head_sha": result.get("head_sha") or body.head_sha,
        "custom_rules_count": len(result.get("custom_rules", [])),
        "comments_posted": len(result.get("comments", [])),
        "files_reviewed": len(result.get("changed_files", [])),
        "comment_url": result.get("posted_urls", [None])[0] if result.get("posted_urls") else None,
        "comments": comments_data,
        "llm_calls": result.get("llm_calls", 1),
        "prompt_tokens": result.get("prompt_tokens", 0),
        "completion_tokens": result.get("completion_tokens", 0),
        "total_tokens": result.get("total_tokens", 0),
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