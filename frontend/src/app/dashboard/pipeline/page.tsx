"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitPullRequest,
  Brain,
  Sparkles,
  MessageSquareCode,
  Bell,
  Code2,
  Database,
  Cpu,
  ArrowDown,
  Play,
  RotateCcw,
  CheckCircle2,
  Zap,
  Info,
  ChevronRight,
  Search,
  FileCode2,
  GitBranch,
} from "lucide-react";

const PIPELINE_NODES = [
  {
    id: "webhook",
    label: "GitHub Webhook",
    sublabel: "pull_request • opened/synchronized",
    icon: GitPullRequest,
    color: "indigo",
    phase: "trigger",
    code: `// api/src/routes/webhooks.ts
router.post('/github', verifyWebhookSignature, async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = JSON.parse(req.body.toString());
  
  if (event === 'pull_request' && 
     (payload.action === 'opened' || payload.action === 'synchronize')) {
    await reviewQueue.add('review-pr', {
      job_id: review.id,
      repo: payload.repository.full_name,
      pr_number: payload.pull_request.number,
      installation_id: payload.installation.id
    });
  }
  res.status(200).json({ received: true });
});`,
    detail: "GitHub App sends a signed webhook event. The signature is verified using HMAC-SHA256 before any processing begins.",
  },
  {
    id: "queue",
    label: "BullMQ Queue",
    sublabel: "reviewQueue → reviewWorker",
    icon: Zap,
    color: "amber",
    phase: "orchestration",
    code: `// api/src/workers/reviewWorker.ts
const worker = new Worker('review', async (job) => {
  const { repo, pr_number, installation_id, job_id } = job.data;
  await triggerAgentReview({ repo, pr_number, installation_id, job_id });
  await prisma.pRReview.update({
    where: { id: job_id },
    data: { status: 'completed' }
  });
}, { connection: redis });`,
    detail: "Jobs are queued in Redis via BullMQ. This decouples webhook receipt from processing and enables retries on failure.",
  },
  {
    id: "fetch_pr",
    label: "fetch_pr",
    sublabel: "Node 1 • Fetches PR diff via GitHub App token",
    icon: FileCode2,
    color: "sky",
    phase: "agent",
    code: `# agent/app/graph/review/nodes/fetch_pr.py
async def fetch_pr(state: ReviewState) -> ReviewState:
    token = await get_installation_token(state['installation_id'])
    diff = await get_pr_diff(
        repo=state['repo'],
        pr_number=state['pr_number'],
        token=token
    )
    return {**state, "diff": diff, "token": token}`,
    detail: "Uses GitHub App installation token (not a personal token!) to fetch the PR diff.",
  },
  {
    id: "chunk_changes",
    label: "chunk_changes",
    sublabel: "Node 2 • Splits diff into reviewable chunks",
    icon: Code2,
    color: "sky",
    phase: "agent",
    code: `# agent/app/graph/review/nodes/chunk.py
async def chunk_changes(state: ReviewState) -> ReviewState:
    chunks = []
    for file in parse_diff(state['diff']):
        for chunk in split_into_chunks(file.hunks, window=50, overlap=10):
            chunks.append({
                'filename': file.path,
                'content': chunk.content,
                'start_line': chunk.start,
                'end_line': chunk.end,
            })
    return {**state, "chunks": chunks}`,
    detail: "Diffs are parsed and split into overlapping chunks so no code context is lost at chunk boundaries.",
  },
  {
    id: "search_memory",
    label: "search_memory",
    sublabel: "Node 3 • pgvector cosine similarity search",
    icon: Search,
    color: "violet",
    phase: "agent",
    code: `# agent/app/graph/review/nodes/search.py
async def search_memory_for_chunks(state):
    for chunk in state['chunks']:
        results = await search_memory(
            repo_id=state['repo'],
            query=chunk['content'],
            limit=3
        )
        relevant = [r for r in results if r['similarity'] > 0.4]
        chunk['memory'] = relevant
    return state`,
    detail: "Each code chunk is embedded and compared against the team's Memory Bank using pgvector cosine similarity.",
  },
  {
    id: "llm_review",
    label: "llm_review",
    sublabel: "Node 4 • llama-3.3-70b via Groq",
    icon: Cpu,
    color: "emerald",
    phase: "agent",
    code: `# agent/app/graph/review/nodes/llm_review.py
async def llm_review(state: ReviewState) -> ReviewState:
    for chunk in state['chunks_with_memory']:
        memory_context = ""
        for m in chunk['memory']:
            memory_context += f"""
- PR #{m['pr_number']} | outcome: {m['outcome']}
  {m['content']}  (similarity: {m['similarity']:.2f})
"""
        response = llm.invoke([
            SystemMessage("You are a precise code reviewer."),
            HumanMessage(f"Review:\\n{chunk['content']}\\n{memory_context}")
        ])`,
    detail: "The LLM receives code diffs + relevant team memory as context. Returns structured JSON with per-line comments.",
  },
  {
    id: "post_comments",
    label: "post_comments",
    sublabel: "Node 5 • Posts inline review to GitHub PR",
    icon: MessageSquareCode,
    color: "teal",
    phase: "agent",
    code: `# agent/app/graph/review/nodes/post_comments.py
async def post_comments(state: ReviewState):
    comment_body = "## 🤖 PR Review Agent\\n\\n"
    for filename, comments in group_by_file(state['comments']):
        comment_body += f"### \`{filename}\`\\n\\n"
        for c in comments:
            icon = {"error":"🔴","warning":"⚠️","suggestion":"💡"}[c.severity]
            comment_body += (
                f"{icon} **Line {c.line}** — {c.comment}\\n"
                f"  *Confidence: {c.confidence:.0%}*\\n\\n"
            )
    await post_review_comment(state['repo'], state['pr_number'],
                              comment_body, state['installation_id'])`,
    detail: "Comments are grouped by file and posted as a single structured GitHub PR comment.",
  },
  {
    id: "notify_complete",
    label: "notify_complete",
    sublabel: "Node 6 • Notifies API server, updates DB",
    icon: Bell,
    color: "rose",
    phase: "agent",
    code: `# agent/app/graph/review/nodes/notify.py
async def notify_complete(state: ReviewState):
    await httpx.post(f"{API_URL}/internal/review-complete", json={
        "job_id": state['job_id'],
        "comments_count": len(state['comments']),
        "posted_urls": state['posted_urls'],
        "status": "completed"
    })
    return state`,
    detail: "After posting to GitHub, the agent calls back to the Node.js API to mark the review as complete in the database.",
  },
];

// agent node ids that come from SSE events
const AGENT_NODE_IDS = ["fetch_pr", "chunk_changes", "search_memory", "llm_review", "post_comments", "notify_complete"];

const phaseColors = {
  trigger: { border: "border-indigo-500/30", glow: "shadow-indigo-500/10", badge: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" },
  orchestration: { border: "border-amber-500/30", glow: "shadow-amber-500/10", badge: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
  agent: { border: "border-violet-500/20", glow: "shadow-violet-500/10", badge: "bg-violet-500/10 text-violet-300 border-violet-500/20" },
};

const nodeColors: Record<string, { icon: string; ring: string; glow: string }> = {
  indigo: { icon: "text-indigo-400", ring: "border-indigo-500/40 bg-indigo-500/10", glow: "shadow-indigo-500/20" },
  amber: { icon: "text-amber-400", ring: "border-amber-500/40 bg-amber-500/10", glow: "shadow-amber-500/20" },
  sky: { icon: "text-sky-400", ring: "border-sky-500/40 bg-sky-500/10", glow: "shadow-sky-500/20" },
  violet: { icon: "text-violet-400", ring: "border-violet-500/40 bg-violet-500/10", glow: "shadow-violet-500/20" },
  emerald: { icon: "text-emerald-400", ring: "border-emerald-500/40 bg-emerald-500/10", glow: "shadow-emerald-500/20" },
  teal: { icon: "text-teal-400", ring: "border-teal-500/40 bg-teal-500/10", glow: "shadow-teal-500/20" },
  rose: { icon: "text-rose-400", ring: "border-rose-500/40 bg-rose-500/10", glow: "shadow-rose-500/20" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function PipelinePage() {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  // simulation mode (fake timer)
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedCompleted, setSimulatedCompleted] = useState<Set<string>>(new Set());
  const [currentRunIndex, setCurrentRunIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // real mode (SSE)
  const [isLive, setIsLive] = useState(false);
  const [liveCompleted, setLiveCompleted] = useState<Set<string>>(new Set());
  const [liveRunning, setLiveRunning] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<Record<string, string>>({});
  const [activeJob, setActiveJob] = useState<{
    id: string; prNumber: number; prTitle: string; repoFullName: string
  } | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const lastJobIdRef = useRef<string | null>(null);

  // derived — which set to use for "done" rendering
  const completedNodes = isLive ? liveCompleted : simulatedCompleted;
  const isRunning = isLive || isSimulating;

  // ── Simulation ──────────────────────────────────────────────────────────────
  const nodeIds = PIPELINE_NODES.map((n) => n.id);

  const runSimulation = () => {
    if (isRunning) return;
    setIsSimulating(true);
    setSimulatedCompleted(new Set());
    setCurrentRunIndex(0);
  };

  const resetAll = () => {
    // stop simulation
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSimulating(false);
    setSimulatedCompleted(new Set());
    setCurrentRunIndex(-1);
    // stop live
    if (esRef.current) esRef.current.close();
    setIsLive(false);
    setLiveCompleted(new Set());
    setLiveRunning(null);
    setLiveMessages({});
    setActiveNode(null);
  };

  useEffect(() => {
    if (!isSimulating || currentRunIndex < 0) return;
    if (currentRunIndex >= nodeIds.length) {
      setIsSimulating(false);
      setCurrentRunIndex(-1);
      return;
    }
    const nodeId = nodeIds[currentRunIndex];
    setActiveNode(nodeId);
    timerRef.current = setTimeout(() => {
      setSimulatedCompleted((prev) => new Set([...prev, nodeId]));
      setCurrentRunIndex((prev) => prev + 1);
    }, 1200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isSimulating, currentRunIndex]);

  // ── Live polling for latest job ──────────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/jobs/latest`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const job = data.job;
        if (!job) return;
        // new job appeared
        if (job.id !== lastJobIdRef.current) {
          lastJobIdRef.current = job.id;
          setActiveJob({
            id: job.id,
            prNumber: job.prNumber,
            prTitle: job.prTitle || `PR #${job.prNumber}`,
            repoFullName: job.repo?.fullName || ""
          });
          // reset live state for new job
          setLiveCompleted(new Set());
          setLiveRunning(null);
          setLiveMessages({});
          // mark webhook + queue as instantly done (they already finished by the time we poll)
          setLiveCompleted(new Set(["webhook", "queue"]));
          openSSEStream(job.id);
        }
      } catch (_) {}
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── SSE stream ───────────────────────────────────────────────────────────────
  const openSSEStream = (jobId: string) => {
    if (esRef.current) esRef.current.close();

    setIsLive(true);

    const es = new EventSource(
      `${API_URL}/internal/pipeline-stream/${jobId}`
    );

    es.onmessage = (event) => {
      // ignore heartbeat pings
      if (!event.data || event.data.trim() === "") return;
      try {
        const data = JSON.parse(event.data);
        const { node, status, message } = data;

        if (!node || node === "connected") return;

        // terminal event — review fully done
        if (node === "done") {
          setIsLive(false);
          setLiveRunning(null);
          es.close();
          return;
        }

        if (status === "running") {
          setLiveRunning(node);
          setActiveNode(node);
        }

        if (status === "completed" || status === "done") {
          setLiveCompleted((prev) => new Set([...prev, node]));
          setLiveRunning(null);
        }

        if (message) {
          setLiveMessages((prev) => ({ ...prev, [node]: message }));
        }
      } catch (_) {}
    };

    es.onerror = () => {
      setIsLive(false);
      es.close();
    };

    esRef.current = es;
  };

  // ── Render helpers ───────────────────────────────────────────────────────────
  const isNodeActive = (nodeId: string) => {
    if (isSimulating) return activeNode === nodeId && isSimulating;
    if (isLive) return liveRunning === nodeId;
    return false;
  };

  const isNodeDone = (nodeId: string) => completedNodes.has(nodeId);

  const selectedNode = activeNode ? PIPELINE_NODES.find((n) => n.id === activeNode) : null;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Agent Pipeline</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Live architecture of the LangGraph review agent — click any node to inspect its code.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* live badge */}
                    {isLive && activeJob && (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-emerald-300 font-medium">
                                Live — PR #{activeJob.prNumber}
                            </span>
                        </div>
                    )}

                    <button
                        onClick={resetAll}
                        disabled={!isRunning && completedNodes.size === 0}
                        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                    </button>

                    <button
                        onClick={runSimulation}
                        disabled={isRunning}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSimulating ? (
                            <>
                                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                Simulating...
                            </>
                        ) : isLive ? (
                            <>
                                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                Live review running...
                            </>
                        ) : (
                            <>
                                <Play className="h-3.5 w-3.5 fill-white" />
                                Simulate PR Review
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* active job banner */}
            {activeJob && !isSimulating && (
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <GitPullRequest className="h-4 w-4 text-zinc-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{activeJob.prTitle}</p>
                        <p className="text-xs text-zinc-500">{activeJob.repoFullName} · PR #{activeJob.prNumber}</p>
                    </div>
                    {isLive && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full font-medium animate-pulse">
                            reviewing
                        </span>
                    )}
                    {!isLive && liveCompleted.size > 2 && (
                        <span className="text-[10px] bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2 py-1 rounded-full font-medium">
                            completed
                        </span>
                    )}
                </div>
            )}

            {/* Main Layout — identical to your original */}
            <div className="grid grid-cols-12 gap-6">
                {/* Pipeline Column */}
                <div className="col-span-12 lg:col-span-5 space-y-0">
                    {(["trigger", "orchestration", "agent"] as const).map((phase) => {
                        const nodes = PIPELINE_NODES.filter((n) => n.phase === phase);
                        const phaseLabel = {
                            trigger: "① Trigger",
                            orchestration: "② Orchestration",
                            agent: "③ Agent Graph (LangGraph)",
                        }[phase];

                        return (
                            <div key={phase} className="mb-4">
                                <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest mb-3 ${phaseColors[phase].badge}`}>
                                    {phaseLabel}
                                </div>

                                {nodes.map((node, i) => {
                                    const Icon = node.icon;
                                    const colors = nodeColors[node.color];
                                    const isDone = isNodeDone(node.id);
                                    const isActive = isNodeActive(node.id);
                                    const isSelected = activeNode === node.id && !isActive;
                                    const isAgentNode = node.phase === "agent";

                                    return (
                                        <div key={node.id} className="flex flex-col items-center">
                                            <motion.button
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                                                className={`w-full text-left rounded-xl border p-4 transition-all duration-300 cursor-pointer ${isActive
                                                        ? `border-white/20 bg-white/[0.05] shadow-lg ${colors.glow}`
                                                        : isDone
                                                            ? "border-emerald-500/30 bg-emerald-500/5"
                                                            : isSelected
                                                                ? `border-white/15 bg-white/[0.04] shadow-md`
                                                                : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${isActive || isSelected ? colors.ring : "border-white/[0.06] bg-white/[0.03]"
                                                        } transition-all`}>
                                                        {isDone && !isActive ? (
                                                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                                                        ) : isActive ? (
                                                            <span className={`h-4 w-4 rounded-full border-2 ${colors.icon} border-current border-t-transparent animate-spin`} />
                                                        ) : (
                                                            <Icon className={`h-4 w-4 ${isSelected ? colors.icon : "text-zinc-500"}`} />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            {isAgentNode ? (
                                                                <span className="font-mono text-sm font-semibold text-white">{node.label}</span>
                                                            ) : (
                                                                <span className="text-sm font-semibold text-white">{node.label}</span>
                                                            )}
                                                            {isDone && (
                                                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">done</span>
                                                            )}
                                                            {isActive && (
                                                                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium animate-pulse">running</span>
                                                            )}
                                                        </div>
                                                        {/* show live message if available, else default sublabel */}
                                                        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                                                            {isLive && liveMessages[node.id] ? liveMessages[node.id] : node.sublabel}
                                                        </p>
                                                    </div>

                                                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${activeNode === node.id ? "rotate-90 text-zinc-300" : "text-zinc-600"}`} />
                                                </div>
                                            </motion.button>

                                            {i < nodes.length - 1 && (
                                                <div className="flex flex-col items-center my-0.5">
                                                    <div className="w-px h-3 bg-white/[0.08]" />
                                                    <ArrowDown className="h-3 w-3 text-zinc-700" />
                                                    <div className="w-px h-3 bg-white/[0.08]" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {phase !== "agent" && (
                                    <div className="flex flex-col items-center my-1">
                                        <div className="w-px h-4 bg-white/[0.06]" />
                                        <ArrowDown className="h-3.5 w-3.5 text-zinc-700" />
                                        <div className="w-px h-4 bg-white/[0.06]" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Detail Panel — identical to your original */}
                <div className="col-span-12 lg:col-span-7">
                    <AnimatePresence mode="wait">
                        {activeNode ? (() => {
                            const node = PIPELINE_NODES.find((n) => n.id === activeNode)!;
                            if (!node) return null;
                            const colors = nodeColors[node.color];
                            const Icon = node.icon;
                            return (
                                <motion.div
                                    key={node.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.25 }}
                                    className="sticky top-6 rounded-2xl border border-white/[0.08] bg-[#0B0F1A]/80 backdrop-blur-xl overflow-hidden"
                                >
                                    <div className="flex items-center gap-3 border-b border-white/[0.06] p-5">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colors.ring}`}>
                                            <Icon className={`h-5 w-5 ${colors.icon}`} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{node.label}</p>
                                            <p className="text-[11px] text-zinc-500">{node.sublabel}</p>
                                        </div>
                                        <div className="ml-auto">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${phaseColors[node.phase as keyof typeof phaseColors].badge}`}>
                                                {node.phase}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2.5 border-b border-white/[0.05] bg-white/[0.02] px-5 py-4">
                                        <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-zinc-300 leading-relaxed">{node.detail}</p>
                                    </div>

                                    <div className="p-0">
                                        <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#080B12] px-5 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1.5">
                                                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                                                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                                                    <span className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
                                                </div>
                                                <span className="font-mono text-[11px] text-zinc-500 ml-2">
                                                    {node.code.split("\n")[0].replace("// ", "").replace("# ", "")}
                                                </span>
                                            </div>
                                            <span className={`text-[10px] font-medium ${colors.icon}`}>
                                                {node.code.includes("#") ? "Python" : "TypeScript"}
                                            </span>
                                        </div>
                                        <pre className="overflow-x-auto p-5 text-[11.5px] leading-relaxed font-mono text-zinc-300 max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                                            <code>{node.code}</code>
                                        </pre>
                                    </div>
                                </motion.div>
                            );
                        })() : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center gap-4"
                            >
                                <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                                    <GitBranch className="h-6 w-6 text-zinc-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-400">Select a node to inspect</p>
                                    <p className="text-xs text-zinc-600 mt-1">
                                        Click any pipeline node to view its source code and details
                                    </p>
                                </div>
                                <button
                                    onClick={runSimulation}
                                    className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
                                >
                                    <Play className="h-3.5 w-3.5 fill-current" />
                                    Or simulate a full PR review run
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Memory Bank showcase — identical to your original */}
                    <div className="mt-6 rounded-2xl border border-violet-500/15 bg-violet-500/5 p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <Brain className="h-4.5 w-4.5 text-violet-400" />
                            <h3 className="text-sm font-semibold text-white">Why Memory Makes This Different</h3>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            Unlike generic AI tools, Powerful embeds every approved review decision into a{" "}
                            <span className="text-violet-300 font-medium">pgvector database</span>. When a similar code pattern
                            appears in a future PR, the agent retrieves past decisions via{" "}
                            <span className="text-violet-300 font-medium">cosine similarity search</span> and injects them as
                            context into the LLM prompt — making comments proprietary to your team's conventions.
                        </p>
                        <div className="grid grid-cols-3 gap-3 pt-1">
                            {[
                                { label: "Embedding Model", value: "pgvector + OpenAI", icon: Database },
                                { label: "LLM Model", value: "llama-3.3-70b", icon: Cpu },
                                { label: "Similarity Threshold", value: "> 0.40 cosine", icon: Search },
                            ].map((item) => (
                                <div key={item.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 space-y-1.5">
                                    <item.icon className="h-3.5 w-3.5 text-violet-400" />
                                    <p className="text-[11px] font-semibold text-white">{item.value}</p>
                                    <p className="text-[10px] text-zinc-500">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}