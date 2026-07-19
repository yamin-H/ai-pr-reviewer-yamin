from app.services.memory import store_decision
from app.graph.onboard.state import OnboardState

async def embed_and_store(state: OnboardState) -> OnboardState:
    decisions = state.get('decisions', [])
    print(f"Storing {len(decisions)} decisions in memory...")
    stored = 0

    for d in decisions:
        try:
            await store_decision(
                org_id=state['org_id'],
                repo_id=state['repo'],
                content=d['content'],
                decision_type=d['decision_type'],
                outcome=d['outcome'],
                pr_number=d['pr_number'],
                file_path=d.get('file_path')
            )
            stored += 1
        except Exception as e:
            print(f"Failed to store decision: {e}")
            continue

    print(f"Stored {stored} decisions")
    return {**state, "stored_count": stored}