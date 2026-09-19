from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:3000")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# No default — must be explicitly set. The absence of this value is a
# hard startup error; see validate_required_env() below.
INTERNAL_SERVICE_KEY: str | None = os.getenv("INTERNAL_SERVICE_KEY")


_REQUIRED_ENV_VARS: list[tuple[str, str | None]] = [
    ("INTERNAL_SERVICE_KEY", INTERNAL_SERVICE_KEY),
    ("GROQ_API_KEY", GROQ_API_KEY),
    ("DATABASE_URL", DATABASE_URL),
]


def validate_required_env() -> None:
    """
    Assert that all secrets required for secure operation are present.
    Raises RuntimeError at startup if any are missing so the process
    fails loudly instead of running in a degraded/insecure state.
    """
    missing = [name for name, value in _REQUIRED_ENV_VARS if not value]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}. "
            "Set them in your .env file or container environment before starting."
        )