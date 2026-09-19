from app.graph.review.state import ReviewState, ReviewComment
from app.services.llm import llm
from app.services.progress import report_progress
from langchain_core.messages import HumanMessage, SystemMessage
import json

async def llm_review(state: ReviewState) -> ReviewState:
    print(f"[Node 4] Reviewing {len(state['chunks_with_memory'])} chunks with LLM")
    await report_progress(state['job_id'], 'llm_review', 'running', f"Sending {len(state['chunks_with_memory'])} chunks to Groq llama-3.3-70b...")

    all_comments = []
    total_llm_calls = 0
    total_prompt_tokens = 0
    total_completion_tokens = 0

    custom_rules = state.get("custom_rules") or []
    custom_rules_section = ""
    system_instructions = "You are a precise code reviewer. Output only valid JSON arrays."

    if custom_rules:
        custom_rules_section = "\n\nRepository Custom Rules (.powerful.yml - STRICT ENFORCEMENT):\n"
        for idx, rule in enumerate(custom_rules, 1):
            custom_rules_section += f"{idx}. {rule}\n"
        system_instructions += f"\nStrictly enforce the following {len(custom_rules)} repository custom rules:\n"
        for idx, rule in enumerate(custom_rules, 1):
            system_instructions += f"{idx}. {rule}\n"

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
{custom_rules_section}
{memory_text}

Should any part of this be flagged for review?
Verify that code changes adhere to standard engineering best practices AND all repository custom rules listed above.

If YES — respond with a JSON array of issues found.
If NO issues — respond with an empty array [].

Respond ONLY with a JSON array, no markdown:
[
  {{
    "line": <line number where the issue is>,
    "severity": "error|warning|suggestion",
    "comment": "specific actionable comment, reference past PR or custom rule if relevant",
    "confidence": <0.0 to 1.0>,
    "past_pr_number": <PR number if referencing past decision, or null>
  }}
]"""

        try:
            response = llm.invoke([
                SystemMessage(content=system_instructions),
                HumanMessage(content=prompt)
            ])

            raw = response.content.strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            issues = json.loads(raw)

            total_llm_calls += 1
            usage = getattr(response, "response_metadata", {}).get("token_usage", {})
            p_tokens = usage.get("prompt_tokens") or max(1, len(prompt) // 4)
            c_tokens = usage.get("completion_tokens") or max(1, len(raw) // 4)
            total_prompt_tokens += p_tokens
            total_completion_tokens += c_tokens

            threshold = state.get('confidence_threshold') or 0.5
            for issue in issues:
                if issue.get('confidence', 0) >= threshold:
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

    print(f"[Node 4] Generated {len(all_comments)} comments ({total_llm_calls} LLM calls, {total_prompt_tokens + total_completion_tokens} tokens)")
    await report_progress(state['job_id'], 'llm_review', 'completed', f"Generated {len(all_comments)} issues above confidence threshold", {"comments_count": len(all_comments)})

    return {
        **state,
        "comments": all_comments,
        "llm_calls": total_llm_calls,
        "prompt_tokens": total_prompt_tokens,
        "completion_tokens": total_completion_tokens,
        "total_tokens": total_prompt_tokens + total_completion_tokens,
    }