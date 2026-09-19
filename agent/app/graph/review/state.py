from typing import TypedDict, List, Optional
from dataclasses import dataclass, field

@dataclass
class ReviewComment:
    filename: str
    line: int
    severity: str
    comment: str
    confidence: float
    past_pr_number: Optional[int] = None

class ReviewState(TypedDict, total=False):
    job_id: str
    repo: str
    pr_number: int
    installation_id: int
    changed_files: List[dict]      
    chunks: List[dict]              
    chunks_with_memory: List[dict]  
    comments: List[ReviewComment]  
    posted_urls: List[str]          
    error: Optional[str]
    confidence_threshold: Optional[float]
    llm_calls: Optional[int]
    prompt_tokens: Optional[int]
    completion_tokens: Optional[int]
    total_tokens: Optional[int]
    head_sha: Optional[str]
    past_dismissal_rate: Optional[float]
    risk_score: Optional[int]
    risk_breakdown: Optional[dict]
    custom_rules: Optional[List[str]]