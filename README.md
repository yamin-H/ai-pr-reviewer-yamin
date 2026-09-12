# 🤖 AI PR Review Agent

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.0.60-blue)](https://github.com/langchain-ai/langgraph)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20pgvector-336791?logo=postgresql)](https://github.com/pgvector/pgvector)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.7-red?logo=redis)](https://bullmq.io/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An autonomous, production-grade Pull Request Review engine that integrates directly into GitHub workflows. Combining a Next.js real-time analytics dashboard, a resilient Node.js API orchestrator, and a stateful Python LangGraph AI agent, this system reviews diffs with true inline comments and **continuously adapts to your engineering team's conventions through vector similarity search (RAG)**.

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [How Vector Memory & Learning Works](#-how-vector-memory--continuous-learning-works)
- [GitHub App Setup & Permissions](#-github-app-setup--permissions)
- [Getting Started](#-getting-started)
  - [Option A: One-Command Docker Compose (Recommended)](#option-a-one-command-docker-compose-recommended)
  - [Option B: Bare-Metal Local Development](#option-b-bare-metal-local-development)
- [Environment Configuration](#-environment-configuration)
- [API Reference](#-api-reference)
- [Production Deployment Guide](#-production-deployment-guide)
- [Contributing](#-contributing)

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph GitHub ["GitHub Cloud"]
        PR["Developer opens / updates PR"]
        GH_API["GitHub REST API"]
    end

    subgraph Node_API ["Node.js API Orchestrator (Port 3000)"]
        WH["Webhook Ingress\n(HMAC-SHA256 Verified)"]
        BullQueue["BullMQ Queue\n(reviewQueue)"]
        InternalAPI["Internal Auth Guard\n(/internal/*)"]
        UserAPI["Tenant Scoped API\n(/api/*)"]
    end

    subgraph Storage ["Data & Messaging Layer"]
        Redis[("Redis 7\nJob Broker & SSE")]
        PG[("PostgreSQL 16 + pgvector\nTenant DB & Vector Store")]
    end

    subgraph Python_Agent ["Python LangGraph Agent (Port 8000)"]
        Router["FastAPI Ingress\n(Token Authenticated)"]
        Graph["LangGraph Workflow"]
        FetchDiff["1. Fetch PR Diff"]
        RAG["2. Retrieve Context (pgvector)"]
        Analyze["3. LLM Code Analysis (Groq)"]
        PostReview["4. Post PR Review with Inlines"]
    end

    subgraph Frontend ["Next.js 14 Dashboard (Port 3001)"]
        UI["Real-time UI\n(Pipeline, Memory, Reviews)"]
        SSE["SSE Stream Client"]
    end

    PR -->|Webhook: pull_request| WH
    WH --> BullQueue
    BullQueue <--> Redis
    BullQueue -->|Worker triggers job| Router
    Router --> Graph
    Graph --> FetchDiff --> RAG --> Analyze --> PostReview
    RAG <-->|Cosine similarity query| PG
    PostReview -->|Create review & inline comments| GH_API
    PostReview -->|Progress SSE updates| InternalAPI
    InternalAPI --> Redis
    Redis --> SSE --> UI
    UserAPI <--> PG
    UI <--> UserAPI
```

---

## 🚀 Key Features

* **True GitHub Pull Request Reviews**: Submits reviews directly via GitHub's Pull Request Review API (`create_review`) featuring precise inline diff annotations (`path`, `line`, `side`, and formatted markdown). Automatically approves clean PRs, adds comments for suggestions, and requests changes when critical errors or vulnerabilities are detected.
* **Continuous Team Learning (RAG)**: Learns from your team's feedback. When developers approve or dismiss AI suggestions in the dashboard, decisions are embedded into a 384-dimensional vector space (`all-MiniLM-L6-v2`) in `pgvector` and recalled on future PRs.
* **Enterprise Multi-Tenancy**: Complete tenant isolation across organizations. User sessions, repositories, review records, weekly digests, and vector memories are scoped strictly to the authenticated organization.
* **Live SSE Pipeline Visualizer**: Real-time visualization of the AI agent's internal reasoning nodes (diff fetching, chunking, memory recall, inference, review submission) streamed to the dashboard via Server-Sent Events.
* **On-Demand Repository Onboarding**: One-click historical PR scanner that analyzes past PR discussions and seeds the vector memory bank with established team conventions.
* **Weekly Engineering Digests**: Automated digests summarizing PRs reviewed, flags raised, top dismissed issues, and patterns learned.

---

## 🧠 How Vector Memory & Continuous Learning Works

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Tech Lead
    participant Dashboard as Next.js Dashboard
    participant API as Node.js API Orchestrator
    participant Agent as Python AI Agent
    participant DB as PostgreSQL (pgvector)

    Note over Dev,DB: 1. Continuous Feedback Loop
    Dev->>Dashboard: Clicks "Approve" or "Dismiss" on AI Comment
    Dashboard->>API: POST /api/reviews/:id/comments/:id/feedback
    API->>DB: Record FeedbackAction
    API->>Agent: POST /memory/learn (internal secret authenticated)
    Agent->>Agent: Generate 384-dim embedding (sentence-transformers)
    Agent->>DB: Store MemoryEntry with vector embedding

    Note over Dev,DB: 2. Subsequent PR Review Recall
    Agent->>DB: Query cosine similarity <=> embedding (< 0.6 distance)
    DB-->>Agent: Return past approved/dismissed precedents
    Agent->>Agent: Inject team conventions into LLM prompt
    Agent->>Dev: Posts review respecting established conventions
```

1. **Embedding Generation**: When feedback is recorded, the Python agent embeds the decision content using `all-MiniLM-L6-v2`.
2. **Vector Storage**: The entry is stored in the `MemoryEntry` table with its 384-dimensional embedding, scoped by `orgId` and `repoId`.
3. **Similarity Search**: On future PRs, code diff hunks are compared against past decisions using cosine distance (`embedding <=> query_vector`).
4. **Context Injection**: Relevant decisions are fed directly into the LLM system prompt, eliminating false positives and enforcing team-specific standards.

---

## 🔑 GitHub App Setup & Permissions

To connect the agent with your GitHub repositories, create a GitHub App in your organization settings:

### 1. General Settings
- **Homepage URL**: `http://localhost:3001` (or your production frontend URL)
- **Callback URL**: `http://localhost:3000/auth/github/callback`
- **Setup URL (redirect on install)**: `http://localhost:3000/auth/github/installed`
- **Webhook URL**: `https://<your-public-url>/webhooks/github` (use [Smee.io](https://smee.io) or ngrok for local development)
- **Webhook Secret**: Generate a secure random secret and paste it in `GITHUB_WEBHOOK_SECRET`.

### 2. Repository Permissions
| Permission | Access | Purpose |
| :--- | :--- | :--- |
| **Pull Requests** | Read & Write | Inspect PR diffs and publish native PR reviews with inline comments |
| **Issues** | Read & Write | Fallback review comments and status notifications |
| **Contents** | Read-only | Fetch file contents and repository configuration files |
| **Metadata** | Read-only | Resolve repository identifiers and ownership |

### 3. Webhook Events
Subscribe to the following event:
- `[x] Pull request` (triggers when pull requests are opened or synchronized)

---

## ⚡ Getting Started

### Option A: One-Command Docker Compose (Recommended)

Docker Compose provisions all services including PostgreSQL with `pgvector`, Redis, Node API, Python Agent, and Next.js Frontend.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yamin-H/ai-pr-reviewer-yamin.git
   cd ai-pr-reviewer-yamin
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your GitHub App credentials, `GROQ_API_KEY`, and `SESSION_SECRET`.

3. **Start the stack**:
   ```bash
   docker compose up -d --build
   ```

4. **Initialize database schema**:
   ```bash
   docker compose exec api npx prisma db push
   ```

5. **Access the application**:
   - **Dashboard**: [http://localhost:3001](http://localhost:3001)
   - **API Orchestrator**: [http://localhost:3000](http://localhost:3000)
   - **Python Agent Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option B: Bare-Metal Local Development

#### Prerequisites
- Node.js 20+
- Python 3.11+
- Redis 7+
- PostgreSQL 16+ with `pgvector` extension installed (`CREATE EXTENSION IF NOT EXISTS vector;`)

#### 1. Database Setup
```sql
CREATE DATABASE pr_reviewer;
\c pr_reviewer
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 2. Node.js API Orchestrator (`/api`)
```bash
cd api
npm install
npx prisma generate
npx prisma db push
npm run dev
```

#### 3. Python Agent (`/agent`)
```bash
cd agent
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 4. Next.js Frontend (`/frontend`)
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Environment Configuration

| Variable | Description | Example |
| :--- | :--- | :--- |
| `GITHUB_APP_ID` | Numeric App ID from GitHub App settings | `123456` |
| `GITHUB_PRIVATE_KEY` | RSA Private Key downloaded from GitHub App | `"-----BEGIN RSA PRIVATE KEY-----\n..."` |
| `GITHUB_WEBHOOK_SECRET` | Secret token configured in GitHub App webhooks | `super_secure_webhook_secret` |
| `GITHUB_CLIENT_ID` | OAuth Client ID from GitHub App | `Iv1.xxxxxxxxxxxx` |
| `GITHUB_CLIENT_SECRET` | OAuth Client Secret from GitHub App | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `GROQ_API_KEY` | API Key for Groq LLM inference | `gsk_xxxxxxxxxxxxxxxxxxxx` |
| `DATABASE_URL` | PostgreSQL connection URL (with pgvector) | `postgresql://postgres:postgres@localhost:5432/pr_reviewer?schema=public` |
| `SESSION_SECRET` | 32+ character random string for iron-session | `32_character_random_string_here!` |
| `INTERNAL_SERVICE_KEY` | Shared secret authenticating API <-> Agent calls | `internal_secret_token_change_in_prod` |
| `FRONTEND_URL` | Web dashboard origin | `http://localhost:3001` |
| `AGENT_URL` | Internal URL to Python agent service | `http://localhost:8000` |
| `NODE_API_URL` | Internal URL to Node.js API service | `http://localhost:3000` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `NEXT_PUBLIC_API_URL`| Browser-facing API endpoint for frontend | `http://localhost:3000` |

---

## 📡 API Reference

### User-Facing Endpoints (Session Authenticated)
- `GET /auth/github` — Initiates GitHub App OAuth login.
- `GET /auth/me` — Returns current authenticated user and organization.
- `GET /api/repos` — Lists tenant repositories and review counts.
- `POST /api/repos/:id/sync` — Triggers on-demand historical PR scanning and memory seeding.
- `GET /api/reviews` — Lists recent pull request reviews for the active tenant.
- `GET /api/reviews/:id` — Detailed review report including file annotations and developer actions.
- `POST /api/reviews/:id/comments/:commentId/feedback` — Approves or dismisses an AI comment, updating vector memory.
- `GET /api/memory/stats` — Summary of learned conventions, categories, and recent entries.
- `GET /api/digest/preview` — Weekly digests and pattern summaries.
- `GET /api/pipeline/stream/:job_id` — Live SSE stream visualizing active PR review progression.

### Ingress & Machine-to-Machine Endpoints
- `POST /webhooks/github` — Verified GitHub webhook ingestion endpoint.
- `POST /internal/installation-token` — Secure GitHub App token broker for the Python agent.
- `POST /internal/review-complete` — Callback updating review status and comments.
- `POST /internal/pipeline-update` — Dispatches SSE progress events to Redis pub/sub.

---

## 🌐 Production Deployment Guide

| Service | Recommended Platform | Configuration Notes |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | Set `NEXT_PUBLIC_API_URL` to your production API URL. |
| **API Orchestrator** | [Render](https://render.com) / [Fly.io](https://fly.io) | Deploy using `api/Dockerfile`. Set all `.env` secrets. |
| **Python Agent** | [Render](https://render.com) / [Fly.io](https://fly.io) | Deploy using `agent/Dockerfile`. Ensure 1GB+ RAM for embedding model. |
| **Database** | [Neon](https://neon.tech) / [Supabase](https://supabase.com) | Enable `vector` extension (`CREATE EXTENSION IF NOT EXISTS vector;`). |
| **Redis** | [Upstash](https://upstash.com) / [Render Redis](https://render.com) | Set `REDIS_URL` with SSL/TLS support. |

---

## 🤝 Contributing

We welcome contributions! Please open an issue or submit a pull request:
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.