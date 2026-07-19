from langgraph.graph import StateGraph, END
from app.graph.onboard.state import OnboardState
from app.graph.onboard.nodes.fetch_history import fetch_history
from app.graph.onboard.nodes.extract import extract_decisions
from app.graph.onboard.nodes.embed_store import embed_and_store

def build_onboard_graph():
    graph = StateGraph(OnboardState)

    graph.add_node("fetch_history", fetch_history)
    graph.add_node("extract_decisions", extract_decisions)
    graph.add_node("embed_and_store", embed_and_store)

    graph.set_entry_point("fetch_history")
    graph.add_edge("fetch_history", "extract_decisions")
    graph.add_edge("extract_decisions", "embed_and_store")
    graph.add_edge("embed_and_store", END)

    return graph.compile()

onboard_graph = build_onboard_graph()