from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="PR Review Agent",
    description="AI agent that reviews PRs using your team's history",
    version="0.1.0"
)

app.include_router(router)

@app.get("/health")
async def health():
    return {"status": "ok"}