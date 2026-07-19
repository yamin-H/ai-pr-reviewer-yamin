from app.graph.review.state import ReviewState, ReviewComment
from app.services.llm import llm
from app.services.progress import report_progress
from langchain_core.messages import HumanMessage, SystemMessage
import json

async def llm_review(state: ReviewState) -> ReviewState:
    print(f"[Node 4] Reviewing {len(state['chunks_with_memory'])} chunks with LLM")
    await report_progress(state['job_id'], 'llm_review', 'running', f"Sending {len(state['chunks_with_memory'])} chunks to Groq llama-3.3-70b...")

    all_comments = []

    for chunk in state['chunks_with_memory']:
        memory_text = ""
        if chunk['memory']:
            memory_text = "\n\nYour team's past decisions on similar code:\n"
            for m in chunk['memory']:
                memory_text += f"""
- PR #{m['pr_number']} | outcome: {m['outcome']} | similarity: {m['similarity']:.2f}
  {m['content']}
"""

        prompt = f"""You are reviewing a code diff for the file: {chunk['filename']}
Lines {chunk['start_line']} to {chunk['end_line']}.

Code change:
{chunk['content']}
{memory_text}

Should any part of this be flagged for review?

If YES — respond with a JSON array of issues found.
If NO issues — respond with an empty array [].

Respond ONLY with a JSON array, no markdown:
[
  {{
    "line": <line number where the issue is>,
    "severity": "error|warning|suggestion",
    "comment": "specific actionable comment, reference past PR if relevant",
    "confidence": <0.0 to 1.0>,
    "past_pr_number": <PR number if referencing past decision, or null>
  }}
]"""

        try:
            response = llm.invoke([
                SystemMessage(content="You are a precise code reviewer. Output only valid JSON arrays."),
                HumanMessage(content=prompt)
            ])

            raw = response.content.strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            issues = json.loads(raw)

            for issue in issues:
                if issue.get('confidence', 0) >= 0.5:
                    all_comments.append(ReviewComment(
                        filename=chunk['filename'],
                        line=issue.get('line', chunk['start_line']),
                        severity=issue.get('severity', 'warning'),
                        comment=issue.get('comment', ''),
                        confidence=issue.get('confidence', 0.5),
                        past_pr_number=issue.get('past_pr_number')
                    ))

        except Exception as e:
            print(f"[Node 4] Failed to review chunk in {chunk['filename']}: {e}")
            continue

    print(f"[Node 4] Generated {len(all_comments)} comments")
    await report_progress(state['job_id'], 'llm_review', 'completed', f"Generated {len(all_comments)} issues above confidence threshold", {"comments_count": len(all_comments)})

    return {**state, "comments": all_comments}