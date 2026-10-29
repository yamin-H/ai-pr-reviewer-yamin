import pytest
from unittest.mock import patch, AsyncMock
from app.graph.review.nodes.score_risk import (
    calculate_diff_points,
    calculate_file_points,
    calculate_criticality_points,
    calculate_dismissal_points,
    score_risk,
)

def test_calculate_diff_points():
    pts, desc = calculate_diff_points(30)
    assert pts == 5
    assert "≤50 lines" in desc

    pts, desc = calculate_diff_points(1500)
    assert pts == 30
    assert ">1000 lines" in desc

def test_calculate_file_points():
    pts, desc = calculate_file_points(1)
    assert pts == 4

    pts, desc = calculate_file_points(15)
    assert pts == 20

def test_calculate_criticality_points():
    files = [
        {"filename": "src/auth/jwt.ts"},
        {"filename": "src/billing/stripe.ts"},
        {"filename": "prisma/schema.prisma"},
    ]
    pts, reasons = calculate_criticality_points(files)
    assert pts > 0
    assert len(reasons) >= 3

@pytest.mark.asyncio
@patch("app.graph.review.nodes.score_risk.report_progress", new_callable=AsyncMock)
async def test_score_risk_end_to_end(mock_report):
    state = {
        "job_id": "test-job-risk",
        "repo": "owner/repo",
        "pr_number": 42,
        "changed_files": [
            {"filename": "src/auth/session.ts", "additions": 10, "deletions": 5},
        ],
        "past_dismissal_rate": 0.15,
    }

    result = await score_risk(state)
    assert "risk_score" in result
    assert 5 <= result["risk_score"] <= 100
    mock_report.assert_called()
