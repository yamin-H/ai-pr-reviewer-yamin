# AI PR Review Agent

An intelligent, autonomous Pull Request Review system that integrates directly into your GitHub workflow. By combining a Next.js dashboard, a scalable Node.js API orchestrator, and an advanced Python LangGraph agent, this system not only reviews code for bugs and security vulnerabilities but also **learns from past team decisions** using vector similarity search (RAG) to ensure consistent, context-aware code reviews.

## 🚀 Key Features

* **Autonomous Code Review**: Instantly reviews new PRs when they are opened, analyzing diffs and providing inline comments for potential bugs, performance issues, or architectural anti-patterns.
* **Contextual Memory (RAG)**: Learns from past PRs. When developers dismiss or approve the agent's comments, the agent stores the decision in a `pgvector` database and recalls it for future reviews, adapting to your team's unique coding style over time.
* **Live Agent Pipeline**: A sleek dashboard (Next.js) that visualizes the agent's real-time reasoning and progress as it fetches code, runs inference, and posts reviews via Server-Sent Events (SSE).
* **Weekly Digests**: Automatically aggregates the week's review metrics and sends out a summary of the top issues flagged and patterns learned.
* **Scalable Event-Driven Architecture**: Powered by BullMQ and Redis to reliably handle high volumes of concurrent webhook events from GitHub without dropping tasks.

## 🏗️ Architecture

The system is split into three primary microservices:

1. **Frontend (`/frontend`)**: A modern, responsive dashboard built with **Next.js**, Tailwind CSS, and shadcn/ui. Connects to the API via SSE for live status updates.
2. **API Orchestrator (`/api`)**: Built with **Node.js, Express, and Prisma**. Manages the PostgreSQL database, processes incoming GitHub webhooks, handles GitHub App OAuth, and queues review jobs in Redis via BullMQ.
3. **Agent (`/agent`)**: Built with **Python, FastAPI, and LangGraph**. Fetches code diffs, runs multi-step LLM inference pipelines (via Groq), performs vector similarity searches (`pgvector` via `asyncpg`), and posts feedback directly to GitHub.

## 🛠️ Tech Stack

* **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
* **Backend**: Node.js, Express, TypeScript, BullMQ, Prisma ORM
* **Agent**: Python, FastAPI, LangGraph, LangChain, asyncpg
* **Database & Caching**: PostgreSQL (with `pgvector` extension), Redis
* **AI / LLM**: Groq API
* **Infrastructure**: Docker, Docker Compose

## ⚡ Getting Started (Local Development)

The easiest way to run the entire stack locally is using Docker.

### 1. Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
* A GitHub App created and installed on your repository
* A Groq API Key

### 2. Environment Variables
Copy the `.env.example` file to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in the required secrets in `.env`:
* GitHub App credentials (`GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, etc.)
* `GROQ_API_KEY`
* `DATABASE_URL` (You can point this to the managed database in Docker or an external one)

### 3. Run with Docker Compose
Spin up the entire architecture (Frontend, API, Agent, and Redis) with a single command:
```bash
docker compose up -d --build
```

The services will be exposed at:
* **Dashboard**: `http://localhost:3001`
* **API**: `http://localhost:3000`
* **Agent**: `http://localhost:8000`

### 4. Database Migrations
Make sure your PostgreSQL database schema is up to date:
```bash
cd api
npx prisma db push
```

## 🌍 Deployment

The repository includes highly optimized, multi-stage Dockerfiles for all three services, making them production-ready for platforms like **Render**, **Vercel**, or **AWS ECS**.

* Deploy the **Frontend** on Vercel.
* Deploy the **API** and **Agent** as background web services on Render.
* Provision a managed Redis (Upstash) and PostgreSQL database (Neon or Render).

*Note: Ensure you update your GitHub App webhook URLs to point to your live API endpoint once deployed.*

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a Pull Request if you'd like to improve the agent's logic, add support for new Git providers (e.g., GitLab), or enhance the dashboard.