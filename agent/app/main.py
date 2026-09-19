from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.core.config import validate_required_env


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Run startup validation before the server begins accepting connections.
    If any required environment variables are missing, the process will
    raise a RuntimeError and uvicorn will exit with a non-zero code —
    making the misconfiguration immediately visible in logs and container
    orchestrators (Docker, Kubernetes, etc.).
    """
    validate_required_env()
    yield
    # (shutdown hooks go here when needed)


app = FastAPI(
    title="PR Review Agent",
    description="AI agent that reviews PRs using your team's history",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}