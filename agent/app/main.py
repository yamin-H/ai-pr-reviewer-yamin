from contextlib import asynccontextmanager
import httpx

from fastapi import FastAPI

from app.api.routes import router
from app.core.config import validate_required_env, NODE_API_URL, REDIS_URL


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
    checks = {
        "redis": "unknown",
        "api": "unknown",
    }

    # Check Redis
    try:
        import redis.asyncio as redis
        client = redis.from_url(REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
        await client.ping()
        await client.close()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "failed"

    # Check API connectivity
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{NODE_API_URL}/health")
            if response.status_code == 200:
                checks["api"] = "ok"
            else:
                checks["api"] = "degraded"
    except Exception:
        checks["api"] = "failed"

    healthy = all(v == "ok" for v in checks.values())
    return {
        "status": "ok" if healthy else "degraded",
        "checks": checks,
    }