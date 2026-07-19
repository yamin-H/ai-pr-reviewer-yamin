from langchain_core.messages import HumanMessage, SystemMessage
from app.services.llm import llm
from app.graph.onboard.state import OnboardState
import json

def extract_decisions(state: OnboardState) -> OnboardState:
    prs = state.get('prs', [])
    print(f"Extracting decisions from {len(prs)} PRs...")
    decisions = []

    for pr in prs:
        # skip PRs with no review activity at all
        if not pr['comments'] and not any(r['body'] for r in pr['reviews']):
            continue

        comments_text = "\n".join([
            f"- {c['user']} on {c['path']}: {c['body']}"
            for c in pr['comments']
        ])

        reviews_text = "\n".join([
            f"- {r['user']} {r['state']}: {r['body']}"
            for r in pr['reviews']
            if r['body']
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
    "decision_type": "performance|security|style|architecture|testing|documentation",
    "outcome": "approved|rejected|requested_change",
    "file_path": "the file path if mentioned or null"
  }}
]"""

        try:
            response = llm.invoke([
                SystemMessage(content="You extract structured decisions from PR reviews. Respond only with valid JSON arrays."),
                HumanMessage(content=prompt)
            ])

            raw = response.content.strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            extracted = json.loads(raw)

            for d in extracted:
                d['pr_number'] = pr['number']
                decisions.append(d)

        except Exception as e:
            print(f"Failed to extract from PR #{pr['number']}: {e}")
            continue

    print(f"Extracted {len(decisions)} decisions")
    return {**state, "decisions": decisions}