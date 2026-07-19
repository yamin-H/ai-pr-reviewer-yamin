from typing import TypedDict, List, Optional

class OnboardState(TypedDict, total=False):
    repo: str
    org_id: str
    months_back: int
    prs: List[dict]
    decisions: List[dict]
    stored_count: int
    error: Optional[str]