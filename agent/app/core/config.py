from dotenv import load_dotenv
import os
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:3000")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
INTERNAL_SERVICE_KEY = os.getenv("INTERNAL_SERVICE_KEY", "powerful-internal-secret-change-in-prod")