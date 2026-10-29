"""
Shared HTTP client with retry logic, connection pooling, and circuit breaker.
Used for all inter-service communication from the Python Agent.
"""
import httpx
import asyncio
import logging
from typing import Optional, Dict, Any
from app.core.config import NODE_API_URL, INTERNAL_SERVICE_KEY

logger = logging.getLogger(__name__)

# Circuit breaker state
_circuit_breaker = {
    "failures": 0,
    "last_failure": 0,
    "open": False,
    "threshold": 5,
    "timeout": 30,  # seconds
}

# Shared client with connection pooling
_shared_client: Optional[httpx.AsyncClient] = None


def get_shared_client() -> httpx.AsyncClient:
    """Get or create shared HTTP client with connection pooling."""
    global _shared_client
    if _shared_client is None or _shared_client.is_closed:
        _shared_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=5.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            headers={"x-internal-secret": INTERNAL_SERVICE_KEY}
        )
    return _shared_client


async def close_shared_client():
    """Close the shared HTTP client (call on shutdown)."""
    global _shared_client
    if _shared_client and not _shared_client.is_closed:
        await _shared_client.aclose()
        _shared_client = None


def _check_circuit_breaker() -> bool:
    """Check if circuit breaker allows requests. Returns True if allowed."""
    import time
    if _circuit_breaker["open"]:
        if time.time() - _circuit_breaker["last_failure"] > _circuit_breaker["timeout"]:
            # Half-open state - allow one request
            logger.info("Circuit breaker half-open, allowing request")
            return True
        return False
    return True


def _record_success():
    """Record successful request, reset circuit breaker."""
    _circuit_breaker["failures"] = 0
    _circuit_breaker["open"] = False


def _record_failure():
    """Record failed request, potentially open circuit breaker."""
    import time
    _circuit_breaker["failures"] += 1
    _circuit_breaker["last_failure"] = time.time()
    if _circuit_breaker["failures"] >= _circuit_breaker["threshold"]:
        _circuit_breaker["open"] = True
        logger.warning(f"Circuit breaker OPENED after {_circuit_breaker['failures']} failures")


async def post_with_retry(
    endpoint: str,
    payload: Dict[str, Any],
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    timeout: float = 30.0,
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    POST to Node API with exponential backoff retry and circuit breaker.
    
    Args:
        endpoint: API endpoint (e.g., "/internal/review-complete")
        payload: JSON payload
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay between retries (seconds)
        max_delay: Maximum delay between retries (seconds)
        timeout: Request timeout (seconds)
        idempotency_key: Optional key for idempotent requests
    
    Returns:
        Response JSON dict
    
    Raises:
        httpx.HTTPError: If all retries exhausted
    """
    if not _check_circuit_breaker():
        raise httpx.HTTPError("Circuit breaker open - service unavailable")
    
    client = get_shared_client()
    headers = {}
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    
    url = f"{NODE_API_URL}{endpoint}"
    delay = base_delay
    
    for attempt in range(max_retries + 1):
        try:
            response = await client.post(
                url,
                json=payload,
                headers=headers,
                timeout=timeout
            )
            response.raise_for_status()
            _record_success()
            return response.json()
            
        except (httpx.TimeoutException, httpx.ConnectError, httpx.ReadTimeout) as e:
            _record_failure()
            if attempt < max_retries:
                logger.warning(f"Attempt {attempt + 1} failed for {endpoint}: {e}. Retrying in {delay:.1f}s...")
                await asyncio.sleep(delay)
                delay = min(delay * 2, max_delay)  # Exponential backoff
            else:
                logger.error(f"All {max_retries + 1} attempts failed for {endpoint}")
                raise
                
        except httpx.HTTPStatusError as e:
            # Don't retry client errors (4xx), only server errors (5xx)
            if 400 <= e.response.status_code < 500:
                _record_failure()
                logger.error(f"Client error for {endpoint}: {e.response.status_code} - {e.response.text}")
                raise
            _record_failure()
            if attempt < max_retries:
                logger.warning(f"Server error {e.response.status_code} for {endpoint}. Retrying in {delay:.1f}s...")
                await asyncio.sleep(delay)
                delay = min(delay * 2, max_delay)
            else:
                logger.error(f"All retries exhausted for {endpoint}")
                raise


async def post_fire_and_forget(
    endpoint: str,
    payload: Dict[str, Any],
    max_retries: int = 2
) -> None:
    """
    Fire-and-forget POST with limited retries, logs errors but doesn't raise.
    Use for non-critical updates like progress reporting.
    """
    try:
        await post_with_retry(endpoint, payload, max_retries=max_retries, timeout=10.0)
    except Exception as e:
        logger.warning(f"Fire-and-forget failed for {endpoint} after retries: {e}")


# Token cache for GitHub installation tokens
_token_cache: Dict[int, tuple[str, float]] = {}  # installation_id -> (token, expires_at)
_token_cache_lock = asyncio.Lock()


async def get_installation_token(installation_id: int) -> str:
    """
    Get GitHub installation token with caching.
    Tokens are valid for 1 hour, cache for 50 minutes.
    """
    import time
    
    async with _token_cache_lock:
        if installation_id in _token_cache:
            token, expires_at = _token_cache[installation_id]
            if time.time() < expires_at:
                return token
        
        # Fetch new token
        result = await post_with_retry(
            "/internal/installation-token",
            {"installation_id": installation_id},
            max_retries=2,
            timeout=15.0,
            idempotency_key=f"install-token-{installation_id}"
        )
        
        token = result.get("token")
        if not token:
            raise Exception("No token in response from API")
        
        # Cache for 50 minutes (tokens valid for 1 hour)
        _token_cache[installation_id] = (token, time.time() + 3000)
        return token


def invalidate_token_cache(installation_id: int):
    """Invalidate cached token (call on webhook installation deleted)."""
    _token_cache.pop(installation_id, None)