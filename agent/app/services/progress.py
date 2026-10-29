import asyncio
import json
import re
import time
import logging
from pathlib import Path
from app.core.config import NODE_API_URL, INTERNAL_SERVICE_KEY
from app.services.http_client import post_fire_and_forget

logger = logging.getLogger(__name__)

# Local persistence for progress events (survives API restarts)
_PROGRESS_DIR = Path("/tmp/pr-review-progress")
_PROGRESS_DIR.mkdir(exist_ok=True)
_pending_events: asyncio.Queue = asyncio.Queue()
_flush_task: asyncio.Task | None = None


async def _flush_pending_events():
    """Background task to flush pending events to API."""
    while True:
        try:
            event = await _pending_events.get()
            await _send_event_with_retry(event)
            _pending_events.task_done()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Progress flush error: {e}")
            await asyncio.sleep(1)


def _safe_job_id(job_id: str) -> str:
    """Restrict job ids to a safe filename charset (prevents path traversal)."""
    return re.sub(r"[^A-Za-z0-9_-]", "_", str(job_id))[:128]


def _get_event_file(job_id: str) -> Path:
    return _PROGRESS_DIR / f"{_safe_job_id(job_id)}.jsonl"


async def _persist_event_locally(job_id: str, event: dict):
    """Persist event to local file for durability."""
    try:
        file_path = _get_event_file(job_id)
        async with asyncio.Lock():
            with file_path.open("a") as f:
                f.write(json.dumps(event) + "\n")
    except Exception as e:
        logger.warning(f"Failed to persist progress event locally: {e}")


async def _send_event_with_retry(event: dict):
    """Send event to API with retry."""
    await post_fire_and_forget(
        "/internal/pipeline-update",
        event,
        max_retries=3
    )


async def report_progress(job_id: str, node: str, status: str, message: str = "", meta: dict = None):
    """Send a pipeline progress event to the Node API to be streamed to the frontend.
    
    Events are persisted locally and sent asynchronously with retry.
    """
    event = {
        "job_id": job_id,
        "node": node,
        "status": status,
        "message": message,
        "meta": meta or {},
        "timestamp": time.time()
    }
    
    # Persist locally first (durability)
    await _persist_event_locally(job_id, event)
    
    # Queue for async delivery
    await _pending_events.put(event)
    
    # Start flush task if not running
    global _flush_task
    if _flush_task is None or _flush_task.done():
        _flush_task = asyncio.create_task(_flush_pending_events())
    
    logger.debug(f"[Progress] {node}:{status} queued for {job_id}")


async def get_local_progress_history(job_id: str) -> list[dict]:
    """Get progress history from local storage (fallback when API unavailable)."""
    file_path = _get_event_file(job_id)
    if not file_path.exists():
        return []
    
    events = []
    try:
        with file_path.open("r") as f:
            for line in f:
                line = line.strip()
                if line:
                    events.append(json.loads(line))
    except Exception as e:
        logger.warning(f"Failed to read local progress history: {e}")
    
    return events


async def shutdown_progress_reporter():
    """Shutdown progress reporter, flush pending events."""
    global _flush_task
    if _flush_task:
        _flush_task.cancel()
        try:
            await _flush_task
        except asyncio.CancelledError:
            pass
    # Wait for queue to drain
    await _pending_events.join()