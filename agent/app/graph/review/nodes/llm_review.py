from app.graph.review.state import ReviewState, ReviewComment
from app.services.llm import llm
from app.services.progress import report_progress
from langchain_core.messages import HumanMessage, SystemMessage
import json
import re

# Maximum characters for diff content to prevent token exhaustion
MAX_DIFF_CHARS = 15000

def sanitize_for_prompt(text: str) -> str:
    """Sanitize user-controlled content for safe inclusion in LLM prompt."""
    # Remove potential prompt injection patterns
    text = re.sub(r'```\w*\n', '', text)  # Remove code fence starts
    text = text.replace('```', '')  # Remove code fence ends
    text = re.sub(r'<<<.*?>>>', '', text, flags=re.DOTALL)  # Remove prompt injection markers
    text = re.sub(r'---BEGIN.*?END---', '', text, flags=re.DOTALL)  # Remove injection blocks
    
    # Limit length
    if len(text) > MAX_DIFF_CHARS:
        text = text[:MAX_DIFF_CHARS] + f"\n... [truncated, {len(text) - MAX_DIFF_CHARS} chars omitted]"
    
    return text

def parse_llm_json(raw: str) -> list[dict]:
    """Robustly parse JSON array output from LLM, handling markdown fences and conversational wrappers."""
    raw = raw.strip()
    match = re.search(r'\[[\s\S]*\]', raw)
    if match:
        target = match.group(0)
    else:
        target = raw.replace("```json", "").replace("```", "").strip()
    
    parsed = json.loads(target)
    if isinstance(parsed, list):
        return parsed
    elif isinstance(parsed, dict):
        return [parsed]
    return []

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
                # Sanitize memory content too
                safe_content = sanitize_for_prompt(m['content'])
                memory_text += f"""
- PR #{m['pr_number']} | outcome: {m['outcome']} | similarity: {m['similarity']:.2f}
  {safe_content}
"""

        # Determine line context for side detection
        old_start = chunk.get('old_start_line', 0)
        old_end = chunk.get('old_end_line', 0)
        new_start = chunk.get('start_line', 0)
        new_end = chunk.get('end_line', 0)

        # Sanitize user-controlled content
        safe_diff = sanitize_for_prompt(chunk['content'])
        safe_filename = sanitize_for_prompt(chunk['filename'])
        safe_custom_rules = sanitize_for_prompt(custom_rules_section)
        safe_memory = sanitize_for_prompt(memory_text)

        prompt = f"""You are reviewing a code diff for the file: {safe_filename}
New file lines {new_start} to {new_end}.
Old file lines {old_start} to {old_end}.

Code change:
{safe_diff}
{safe_custom_rules}
{safe_memory}

Should any part of this be flagged for review?
Verify that code changes adhere to standard engineering best practices AND all repository custom rules listed above.

If YES — respond with a JSON array of issues found.
If NO issues — respond with an empty array [].

For each issue, include "side": "LEFT" if the issue is on a REMOVED line (old file), or "RIGHT" if on an ADDED or CONTEXT line (new file).
If unsure, default to "RIGHT".

Respond ONLY with a JSON array, no markdown:
[
  {{
    "line": <line number in the NEW file where the issue is>,
    "old_line": <line number in the OLD file if applicable, or null>,
    "side": "LEFT|RIGHT",
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
            issues = parse_llm_json(raw)

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
                        past_pr_number=issue.get('past_pr_number'),
                        side=issue.get('side', 'RIGHT')
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
