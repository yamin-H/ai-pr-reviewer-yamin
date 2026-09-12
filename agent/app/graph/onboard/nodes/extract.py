from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm import llm
from app.graph.onboard.state import OnboardState
import json

from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm import llm
from app.graph.onboard.state import OnboardState
import json

async def extract_decisions(state: OnboardState) -> OnboardState:
    prs = state.get('prs', [])
    print(f"Extracting decisions from {len(prs)} PRs...")
    decisions = []

    valid_types = {"security", "performance", "style", "architecture", "testing", "documentation", "code_smell"}

    # Process PRs with comments/reviews, capping at 15 for prompt rate limit safety
    prs_with_activity = [
        pr for pr in prs 
        if pr.get('comments') or any(r.get('body') for r in pr.get('reviews', []))
    ][:15]

    for pr in prs_with_activity:
        comments_text = "\n".join([
            f"- {c.get('user', 'dev')} on {c.get('path', 'file')}: {c.get('body', '')}"
            for c in pr.get('comments', [])
        ])

        reviews_text = "\n".join([
            f"- {r.get('user', 'reviewer')} {r.get('state', '')}: {r.get('body', '')}"
            for r in pr.get('reviews', [])
            if r.get('body')
        ])

        prompt = f"""Analyze this PR review and extract the key decisions made.

PR #{pr['number']}: {pr['title']}

Review Comments:
{comments_text or 'none'}

Reviews:
{reviews_text or 'none'}

Extract 1-3 decisions from this PR. Each decision should capture:
- What pattern or issue was discussed
- What the team decided (accepted/rejected/requested change)
- Why (if mentioned)

Respond ONLY with a JSON array, no markdown, no explanation:
[
  {{
    "content": "one sentence describing the decision and context",
    "decision_type": "performance|security|style|architecture|testing|documentation|code_smell",
    "outcome": "approved|rejected|requested_change",
    "file_path": "the file path if mentioned or null"
  }}
]"""

        try:
            response = await llm.ainvoke([
                SystemMessage(content="You extract structured decisions from PR reviews. Respond only with valid JSON arrays."),
                HumanMessage(content=prompt)
            ])

            raw = response.content.strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            extracted = json.loads(raw)

            for d in extracted:
                d['pr_number'] = pr['number']
                dtype = (d.get('decision_type') or 'style').lower().replace(" ", "_")
                if dtype not in valid_types:
                    dtype = "style"
                d['decision_type'] = dtype
                d['outcome'] = (d.get('outcome') or 'approved').lower()
                decisions.append(d)

        except Exception as e:
            print(f"Failed to extract from PR #{pr['number']}: {e}")
            continue

    print(f"Extracted {len(decisions)} decisions")
    return {**state, "decisions": decisions}