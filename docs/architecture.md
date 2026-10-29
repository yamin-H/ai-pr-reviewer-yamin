# Architecture

End-to-end architecture of the AI PR Review Agent: from the GitHub webhook to the
review posted back on the pull request, including the control plane, the Python
LangGraph pipeline, persistence, live progress, the feedback loop and the weekly
digest.

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Segoe UI, Helvetica, Arial, sans-serif",
    "fontSize": "14px",
    "lineColor": "#64748b",
    "edgeLabelBackground": "#ffffff",
    "clusterBkg": "#ffffff",
    "clusterBorder": "#cbd5e1"
  },
  "flowchart": {
    "curve": "basis",
    "nodeSpacing": 32,
    "rankSpacing": 48,
    "padding": 10,
    "htmlLabels": true
  }
}}%%
flowchart TB
  accTitle: AI PR Review Agent end-to-end architecture
  accDescr: GitHub webhook to the Node control plane, through the Python LangGraph review pipeline, back to GitHub, with Postgres, Redis, Groq and the dashboard.

  subgraph GH["GitHub"]
    DEV(["Developer opens or updates a PR"])
    WH["pull_request webhook"]
    GHAPI["GitHub REST API<br/>files · diff · reviews · statuses"]
    OUT(["PR review + inline comments<br/>+ risk status"])
  end

  subgraph NODE["Node.js control plane · :3000"]
    WEB["/webhooks/github<br/>HMAC + guards"]
    Q[("review-queue<br/>BullMQ")]
    WK["reviewWorker<br/>concurrency 3"]
    INT["/internal/* + SSE<br/>token · progress · stream"]
    OCT["octokit.ts<br/>App JWT → token cache"]
    API["/api/*<br/>session auth"]
    CRON["cron<br/>Mon 09:00 digest<br/>1st 00:00 quota"]
    DQ[("digest-queue<br/>BullMQ")]
    DW["digestWorker"]
  end

  subgraph AG["Python agent · FastAPI :8000"]
    AUTH["verify_internal_secret<br/>/review · /onboard · /memory · /digest"]
    G1["1 · fetch_pr<br/>diff + head SHA"]
    G2["2 · fetch_config<br/>.powerful.yml rules"]
    G3["3 · chunk_changes<br/>≤30-line chunks"]
    G4["4 · search_memory<br/>pgvector cosine"]
    G5["5 · score_risk<br/>0–100"]
    G6["6 · llm_review<br/>Groq JSON findings"]
    G7["7 · post_comments<br/>create_review"]
    G8["8 · notify_complete"]
    PROG["report_progress()"]
    LEARN["/memory/learn<br/>feedback → vector"]
    ONB["/onboard<br/>fetch → extract → embed"]
    DIG["/digest<br/>weekly summary"]
  end

  subgraph DATA["State"]
    PG[("PostgreSQL 16<br/>pgvector")]
    RDS[("Redis 7<br/>queues · cache · pub/sub")]
  end

  subgraph MODELS["Models"]
    GROQ["Groq<br/>llama-3.3-70b-versatile"]
    EMB["fastembed<br/>BAAI/bge-small-en-v1.5"]
  end

  subgraph UI["Dashboard"]
    FE["Next.js · :3001<br/>reviews · pipeline · settings"]
  end

  %% ── Primary review path ──────────────────────────────────────────────────
  DEV ==>|"opened / synchronize"| WH
  WH ==>|"POST"| WEB
  WEB ==>|"create PRReview + enqueue"| Q
  Q ==>|"job"| WK
  WK ==>|"POST /review"| AUTH
  AUTH ==>|"x-internal-secret"| G1
  G1 ==> G2 ==> G3 ==> G4 ==> G5 ==> G6 ==> G7 ==> G8

  %% ── GitHub reads and writes ─────────────────────────────────────────────
  G1 -->|"GET files + patches"| GHAPI
  G2 -->|"GET .powerful.yml"| GHAPI
  G5 -->|"POST risk status"| GHAPI
  G7 ==>|"POST review + inline"| GHAPI
  WK -.->|"POST final status"| GHAPI
  GHAPI ==> OUT

  %% ── Token broker (the agent never holds the App private key) ─────────────
  G1 -.->|"token for G1 / G2 / G5 / G7"| INT
  INT --> OCT
  OCT -->|"App JWT → installation token"| GHAPI
  OCT -.->|"55-min token cache"| RDS

  %% ── Progress and live stream ────────────────────────────────────────────
  G1 -.->|"called by every node"| PROG
  PROG -.->|"POST /internal/pipeline-update"| INT
  INT -->|"publish + history"| RDS
  RDS -.->|"fan-out"| INT
  INT -->|"SSE /api/pipeline/stream/:job_id"| FE

  %% ── Completion and persistence ──────────────────────────────────────────
  G8 -->|"POST /internal/review-complete"| INT
  WEB -->|"pending PRReview"| PG
  WK -->|"comments · risk · usage"| PG
  INT -->|"status = completed"| PG
  API -->|"tenant-scoped reads"| PG

  %% ── Dashboard and feedback loop ────────────────────────────────────────
  FE -->|"reviews · settings · usage"| API
  FE -->|"approve / dismiss"| API
  API -.->|"feedback + onboarding"| AUTH
  AUTH -.-> LEARN
  AUTH -.-> ONB
  LEARN -->|"embed + upsert"| PG
  LEARN --> EMB
  ONB -->|"embed + upsert"| PG
  ONB --> EMB

  %% ── Memory retrieval ────────────────────────────────────────────────────
  G4 -->|"cosine search"| PG
  G4 --> EMB

  %% ── Weekly digest ───────────────────────────────────────────────────────
  CRON -->|"enqueue"| DQ
  CRON -.->|"reset monthly count"| PG
  DQ --> DW
  DW -->|"POST /digest"| AUTH
  AUTH -.-> DIG
  DIG --> GROQ
  DW -->|"WeeklyDigest"| PG

  %% ── LLM ─────────────────────────────────────────────────────────────────
  G6 -->|"chat completions"| GROQ

  %% ── Styling ─────────────────────────────────────────────────────────────
  classDef gh fill:#0d1117,stroke:#0d1117,color:#ffffff,stroke-width:1px
  classDef actor fill:#f1f5f9,stroke:#334155,stroke-width:1.5px,color:#0f172a
  classDef outcome fill:#dcfce7,stroke:#16a34a,stroke-width:1.5px,color:#14532d
  classDef api fill:#eef2ff,stroke:#4f46e5,stroke-width:1.5px,color:#1e1b4b
  classDef agent fill:#ecfdf5,stroke:#059669,stroke-width:1.5px,color:#064e3b
  classDef gate fill:#ffffff,stroke:#4f46e5,stroke-width:1.5px,color:#1e1b4b
  classDef data fill:#fffbeb,stroke:#d97706,stroke-width:1.5px,color:#78350f
  classDef model fill:#f5f3ff,stroke:#7c3aed,stroke-width:1.5px,color:#4c1d95
  classDef ui fill:#fdf2f8,stroke:#db2777,stroke-width:1.5px,color:#831843

  class DEV actor
  class WH,GHAPI gh
  class OUT outcome
  class WEB,Q,WK,INT,OCT,API,CRON,DQ,DW api
  class G1,G2,G3,G4,G5,G6,G7,G8,PROG,LEARN,ONB,DIG agent
  class AUTH gate
  class PG,RDS data
  class GROQ,EMB model
  class FE ui

  style GH fill:#f6f8fa,stroke:#d0d7de,stroke-width:1px
  style NODE fill:#f8faff,stroke:#c7d2fe,stroke-width:1px
  style AG fill:#f7fefb,stroke:#a7f3d0,stroke-width:1px
  style DATA fill:#fffdf5,stroke:#fde68a,stroke-width:1px
  style MODELS fill:#fbfaff,stroke:#ddd6fe,stroke-width:1px
  style UI fill:#fff7fb,stroke:#fbcfe8,stroke-width:1px
```

## Legend

| Visual | Meaning |
| --- | --- |
| **Thick arrow** | Primary review path: webhook → queue → worker → agent → GitHub. |
| **Thin arrow** | Read or write against GitHub, Postgres or a model. |
| **Dashed arrow** | Control plane: token exchange, progress events, completion, feedback. |
| **Cylinder** | Redis queue/data store or Postgres. |
| **Dark node** | GitHub. |
| **Indigo node** | Node.js control plane. |
| **Green node** | Python agent / LangGraph node. |
| **Amber node** | Shared state (Postgres, Redis). |
| **Violet node** | Model runtime (Groq, fastembed). |
| **Pink node** | Next.js dashboard. |

## End-to-end in one pass

1. GitHub sends a `pull_request` event (`opened` or `synchronize`) to
   `POST /webhooks/github`. The handler verifies the HMAC signature, deduplicates
   on `repo + PR + action + head SHA`, checks the installation, quota, sync
   setting and repo toggle.
2. The handler upserts the organization and repo, creates a `PRReview` row
   (`status: pending`) and enqueues a BullMQ job whose `job_id` is the row id.
3. `reviewWorker` loads the row, computes the team's past dismissal rate and calls
   the Python agent at `POST /review` with `x-internal-secret`.
4. The agent runs the eight-node LangGraph pipeline:
   `fetch_pr → fetch_config → chunk_changes → search_memory → score_risk →
   llm_review → post_comments → notify_complete`.
5. GitHub calls fetch the diff and `.powerful.yml`, post the risk commit status,
   and publish the review with inline comments. The agent gets its installation
   token from the Node API; it never holds the GitHub App private key.
6. Every node calls `report_progress()`, which posts to
   `/internal/pipeline-update`. The Node API publishes the event to Redis,
   keeps a short history, and streams it to the dashboard over SSE at
   `/api/pipeline/stream/:job_id`.
7. Persistence: the worker writes comments, risk score and usage telemetry; the
   agent's `notify_complete` marks the review completed. The dashboard reads
   tenant-scoped data through `/api/*`.
8. Side loops: approve/dismiss feedback goes to `/memory/learn`, historical sync
   goes to `/onboard`, and the Monday cron produces a weekly digest through
   `/digest`, stored in `WeeklyDigest`.

## Details worth calling out

- **Two commit statuses, one context.** `score_risk` posts a status during the
  pipeline, then `reviewWorker` posts a final status after the agent returns,
  using the same `Powerful AI / PR Risk` context. The worker's value is the one
  that wins. The diagram shows both on purpose.
- **Inline-comment fallback.** If GitHub rejects the inline line numbers,
  `post_pull_request_review()` falls back to a plain issue comment. The review is
  still posted, but the inline comments are lost.
- **Memory is repo-scoped.** `search_memory()` filters by `repoId`, not by
  organization, even though entries carry both IDs.
- **Worker concurrency is fixed at 3.** The plan values (1/3/10) shown in the
  dashboard are display-only; the BullMQ worker is constructed with
  `concurrency: 3`.
- **Digest delivery stops at the database.** `digestWorker` stores a
  `WeeklyDigest`; there is no email or Slack client in the dependencies.
- **SSE is mounted outside `/internal`.** The endpoint is
  `/api/pipeline/stream/:job_id`, but it is implemented by the same
  `handlePipelineStream` function that lives in `api/src/routes/internal.ts`.
