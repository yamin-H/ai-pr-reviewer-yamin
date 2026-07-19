from app.graph.review.state import ReviewState
from app.services.memory import search_memory
from app.services.progress import report_progress

async def search_memory_for_chunks(state: ReviewState) -> ReviewState:
    print(f"[Node 3] Searching memory for {len(state['chunks'])} chunks")
    await report_progress(state['job_id'], 'search_memory', 'running', f"Searching team memory bank for {len(state['chunks'])} code chunks...")

    chunks_with_memory = []
    for chunk in state['chunks']:
        results = await search_memory(
            repo_id=state['repo'],
            query=chunk['content'],
            limit=3
        )
        relevant = [r for r in results if r['similarity'] > 0.4]
        chunks_with_memory.append({**chunk, "memory": relevant})

    total_memory_hits = sum(1 for c in chunks_with_memory if c['memory'])
    print(f"[Node 3] Found memory context for {total_memory_hits}/{len(chunks_with_memory)} chunks")
    await report_progress(state['job_id'], 'search_memory', 'completed', f"Found {total_memory_hits} relevant past decisions", {"memory_hits": total_memory_hits})

    return {**state, "chunks_with_memory": chunks_with_memory}