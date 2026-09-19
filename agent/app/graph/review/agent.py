from langgraph.graph import StateGraph, END
from app.graph.review.state import ReviewState
from app.graph.review.nodes.fetch_pr import fetch_pr
from app.graph.review.nodes.fetch_config import fetch_config
from app.graph.review.nodes.chunk import chunk_changes
from app.graph.review.nodes.search import search_memory_for_chunks
from app.graph.review.nodes.score_risk import score_risk
from app.graph.review.nodes.llm_review import llm_review
from app.graph.review.nodes.post_comments import post_comments
from app.graph.review.nodes.notify import notify_complete

def build_review_graph():
    graph = StateGraph(ReviewState)

    graph.add_node("fetch_pr", fetch_pr)
    graph.add_node("fetch_config", fetch_config)
    graph.add_node("chunk_changes", chunk_changes)
    graph.add_node("search_memory", search_memory_for_chunks)
    graph.add_node("score_risk", score_risk)
    graph.add_node("llm_review", llm_review)
    graph.add_node("post_comments", post_comments)
    graph.add_node("notify_complete", notify_complete)

    graph.set_entry_point("fetch_pr")
    graph.add_edge("fetch_pr", "fetch_config")
    graph.add_edge("fetch_config", "chunk_changes")
    graph.add_edge("chunk_changes", "search_memory")
    graph.add_edge("search_memory", "score_risk")
    graph.add_edge("score_risk", "llm_review")
    graph.add_edge("llm_review", "post_comments")
    graph.add_edge("post_comments", "notify_complete")
    graph.add_edge("notify_complete", END)

    return graph.compile()

review_graph = build_review_graph()