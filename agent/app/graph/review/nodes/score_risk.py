import re
from app.graph.review.state import ReviewState
from app.services.progress import report_progress
from app.services.github import post_commit_status

# Critical path patterns for security, payments, data, and infrastructure
CRITICAL_PATTERNS = [
    (r"(auth|login|session|jwt|token|secret|crypto|security|password|permission|oauth|guard)", 18, "Security & Authentication"),
    (r"(payment|billing|stripe|subscription|checkout|invoice|pricing)", 15, "Payments & Financial"),
    (r"(schema\.prisma|migration|docker|k8s|helm|\.env|nginx|database|db)", 12, "Infrastructure & Data Schema"),
    (r"(route|service|worker|pipeline)", 8, "Core Business Logic"),
]

def calculate_diff_points(total_lines: int) -> tuple[int, str]:
    if total_lines <= 50:
        return 5, "Small diff (≤50 lines)"
    elif total_lines <= 200:
        return 12, "Moderate diff (51–200 lines)"
    elif total_lines <= 500:
        return 20, "Substantial diff (201–500 lines)"
    elif total_lines <= 1000:
        return 26, "Large diff (501–1000 lines)"
    else:
        return 30, "Very large diff (>1000 lines)"

def calculate_file_points(file_count: int) -> tuple[int, str]:
    if file_count <= 2:
        return 4, "Narrow scope (1–2 files)"
    elif file_count <= 5:
        return 9, "Moderate scope (3–5 files)"
    elif file_count <= 10:
        return 15, "Broad scope (6–10 files)"
    else:
        return 20, "Extensive scope (>10 files)"

def calculate_criticality_points(changed_files: list[dict]) -> tuple[int, list[str]]:
    total_crit = 0
    matched_reasons = []
    seen_categories = set()

    for f in changed_files:
        filename = f.get("filename", "").lower()
        for pattern, points, category in CRITICAL_PATTERNS:
            if category not in seen_categories and re.search(pattern, filename):
                total_crit += points
                seen_categories.add(category)
                matched_reasons.append(f"{category} changes detected in {f.get('filename')}")

    capped_crit = min(35, total_crit)
    return capped_crit, matched_reasons

def calculate_dismissal_points(dismissal_rate: float) -> tuple[int, str]:
    # Baseline dismissal (e.g. 20%) gives ~5 pts; high team dismissal (>50%) adds up to 15 pts
    pts = min(15, max(2, round(dismissal_rate * 25)))
    return pts, f"Team dismissal history: {round(dismissal_rate * 100)}%"

async def score_risk(state: ReviewState) -> ReviewState:
    job_id = state.get("job_id", "unknown")
    print(f"[Node score_risk] Evaluating risk for PR #{state.get('pr_number')} on {state.get('repo')}")
    await report_progress(job_id, "score_risk", "running", "Evaluating PR risk score and file criticality...")

    changed_files = state.get("changed_files", [])
    total_lines = sum((f.get("additions", 0) + f.get("deletions", 0)) for f in changed_files)
    file_count = len(changed_files)
    dismissal_rate = float(state.get("past_dismissal_rate", 0.20))

    # 1. Diff Size (0–30 pts)
    diff_pts, diff_desc = calculate_diff_points(total_lines)

    # 2. File Count (0–20 pts)
    file_pts, file_desc = calculate_file_points(file_count)

    # 3. File Criticality (0–35 pts)
    crit_pts, crit_reasons = calculate_criticality_points(changed_files)

    # 4. Team Dismissal Friction (0–15 pts)
    dismissal_pts, dismissal_desc = calculate_dismissal_points(dismissal_rate)

    raw_score = diff_pts + file_pts + crit_pts + dismissal_pts
    final_score = min(100, max(5, raw_score))

    if final_score < 30:
        risk_level = "Low Risk"
        status_state = "success"
    elif final_score <= 70:
        risk_level = "Moderate Risk"
        status_state = "pending"
    else:
        risk_level = "High Risk"
        status_state = "failure"

    breakdown = {
        "score": final_score,
        "level": risk_level,
        "diff_points": diff_pts,
        "diff_description": diff_desc,
        "total_lines_changed": total_lines,
        "file_points": file_pts,
        "file_description": file_desc,
        "file_count": file_count,
        "criticality_points": crit_pts,
        "criticality_reasons": crit_reasons,
        "dismissal_points": dismissal_pts,
        "dismissal_description": dismissal_desc,
    }

    print(f"[Node score_risk] Assessed PR #{state.get('pr_number')}: {final_score}/100 ({risk_level})")

    # Post GitHub Commit Status (Checks API) if head_sha is present
    head_sha = state.get("head_sha")
    repo = state.get("repo")
    installation_id = state.get("installation_id")

    if head_sha and repo:
        desc = f"Risk Score: {final_score}/100 ({risk_level})"
        await post_commit_status(
            repo_name=repo,
            sha=head_sha,
            state=status_state,
            description=desc,
            context="Powerful AI / PR Risk",
            installation_id=installation_id
        )

    await report_progress(
        job_id,
        "score_risk",
        "completed",
        f"PR Risk Score: {final_score}/100 ({risk_level})",
        {"risk_score": final_score, "level": risk_level, "breakdown": breakdown}
    )

    return {
        **state,
        "risk_score": final_score,
        "risk_breakdown": breakdown
    }
