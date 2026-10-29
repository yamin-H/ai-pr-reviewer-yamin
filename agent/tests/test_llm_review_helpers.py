from app.graph.review.nodes.llm_review import sanitize_for_prompt, parse_llm_json

def test_sanitize_for_prompt():
    raw = "```python\nprint('hello')\n```"
    sanitized = sanitize_for_prompt(raw)
    assert "```python" not in sanitized
    assert "```" not in sanitized

def test_sanitize_truncates_long_input():
    long_text = "a" * 20000
    sanitized = sanitize_for_prompt(long_text)
    assert len(sanitized) < 16000
    assert "truncated" in sanitized

def test_parse_llm_json_standard_array():
    raw = '[{"line": 10, "severity": "error", "comment": "test comment"}]'
    parsed = parse_llm_json(raw)
    assert len(parsed) == 1
    assert parsed[0]["line"] == 10

def test_parse_llm_json_wrapped_in_markdown():
    raw = """Here is your review:
```json
[
  {
    "line": 42,
    "severity": "warning",
    "comment": "Check memory allocation"
  }
]
```
Hope this helps!"""
    parsed = parse_llm_json(raw)
    assert len(parsed) == 1
    assert parsed[0]["line"] == 42
    assert parsed[0]["severity"] == "warning"
