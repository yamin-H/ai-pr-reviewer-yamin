"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitPullRequest,
  FileCode,
  Layers,
  Brain,
  ShieldAlert,
  Sparkles,
  MessageSquareCode,
  CheckCircle2,
  ChevronRight,
  ArrowDown,
  Terminal,
  Cpu,
  Clock,
  Zap,
} from "lucide-react";

interface PipelineNode {
  id: string;
  name: string;
  stepNumber: number;
  icon: any;
  latency: string;
  category: "ingestion" | "analysis" | "synthesis" | "dispatch";
  description: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  logicDetail: string;
}

const NODES: PipelineNode[] = [
  {
    id: "fetch_pr",
    name: "fetch_pr",
    stepNumber: 1,
    icon: GitPullRequest,
    latency: "140ms",
    category: "ingestion",
    description: "Fetches PR metadata, commit tree, unified git patch, and author identity via GitHub App Installation Octokit token.",
    inputs: {
      repo: "acme/payment-service",
      pull_number: 142,
      installation_id: "inst_884920",
    },
    outputs: {
      title: "Add stripe checkout intent idempotency key",
      author: "dev-alex",
      files_changed: 4,
      additions: 128,
      deletions: 34,
    },
    logicDetail: "Authenticates via RS256 JWT, claims temporary installation token, extracts base and head commit SHAs, and validates repo access.",
  },
  {
    id: "fetch_config",
    name: "fetch_config",
    stepNumber: 2,
    icon: FileCode,
    latency: "60ms",
    category: "ingestion",
    description: "Discovers and parses .powerful.yml or .powerful.yaml from the repository root to load repo-specific standards.",
    inputs: {
      paths: [".powerful.yml", ".powerful.yaml"],
      branch: "main",
    },
    outputs: {
      custom_rules_found: 3,
      rules: [
        "Require HMAC signature on webhook endpoints",
        "Enforce timeout on external HTTP fetch calls",
        "Disallow console.log in src/auth/*",
      ],
    },
    logicDetail: "PyYAML safe-loader extracts declarative team guidelines. Handled gracefully with zero failure if no config file exists.",
  },
  {
    id: "chunk_changes",
    name: "chunk_changes",
    stepNumber: 3,
    icon: Layers,
    latency: "35ms",
    category: "analysis",
    description: "Splits raw git unified diffs into semantic AST code chunks with surrounding context window headers.",
    inputs: {
      raw_patch_bytes: "18.4 KB",
      max_chunk_tokens: 1500,
    },
    outputs: {
      chunks_generated: 3,
      hunks: [
        { file: "src/auth/session.ts", lines: "98-103", ast: "FunctionDeclaration" },
        { file: "src/db/queries.ts", lines: "44-48", ast: "AsyncFunction" },
      ],
    },
    logicDetail: "Preserves function boundaries and avoids mid-statement cuts, allowing the LLM to inspect full lexical scopes.",
  },
  {
    id: "search_memory",
    name: "search_memory",
    stepNumber: 4,
    icon: Brain,
    latency: "85ms",
    category: "analysis",
    description: "Queries PostgreSQL pgvector memory bank using OpenAI/FastEmbed cosine distance for previously approved team conventions.",
    inputs: {
      embedding_dimension: 1536,
      top_k: 5,
      similarity_threshold: 0.82,
    },
    outputs: {
      matches_retrieved: 2,
      top_conventions: [
        { id: "mem_91", similarity: 0.93, rule: "Never print raw tokens in logs..." },
        { id: "mem_43", similarity: 0.88, rule: "Enforce parameterized Prisma queries..." },
      ],
    },
    logicDetail: "Transforms diff semantics into embeddings, queries HNSW index in PostgreSQL, and filters out previously dismissed false-positive patterns.",
  },
  {
    id: "score_risk",
    name: "score_risk",
    stepNumber: 5,
    icon: ShieldAlert,
    latency: "15ms",
    category: "analysis",
    description: "Autonomous multi-factor algorithmic risk scoring engine calculating 0-100 hazard rating.",
    inputs: {
      diff_size_weight: "30 pts (162 loc -> 12 pts)",
      file_count_weight: "20 pts (4 files -> 6 pts)",
      criticality_weight: "35 pts (auth & db files -> 35 pts)",
      dismissal_rate_weight: "15 pts (9% dismissal -> 2 pts)",
    },
    outputs: {
      composite_risk_score: 55,
      risk_level: "MEDIUM",
      github_commit_status: "PENDING_REVIEW_REQUIRED",
    },
    logicDetail: "Evaluates regex path rules (auth, billing, migrations) and posts an instantaneous commit status check to GitHub.",
  },
  {
    id: "llm_review",
    name: "llm_review",
    stepNumber: 6,
    icon: Sparkles,
    latency: "620ms",
    category: "synthesis",
    description: "Groq llama-3.3-70b-versatile streaming inference with combined AST context, pgvector memory conventions, and custom rules.",
    inputs: {
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      injected_memory_rules: 2,
      custom_yaml_rules: 3,
    },
    outputs: {
      annotations_count: 2,
      findings: [
        { file: "src/auth/session.ts", line: 100, severity: "CRITICAL" },
        { file: "src/db/queries.ts", line: 45, severity: "HIGH" },
      ],
    },
    logicDetail: "Strict system prompts prevent hallucination. Model is penalized for generic lint comments and instructed to cite specific team memory conventions.",
  },
  {
    id: "post_comments",
    name: "post_comments",
    stepNumber: 7,
    icon: MessageSquareCode,
    latency: "180ms",
    category: "dispatch",
    description: "Publishes batch review annotations directly to GitHub Pull Request lines and updates repository commit status to success/neutral.",
    inputs: {
      github_review_event: "COMMENT",
      inline_comments_count: 2,
    },
    outputs: {
      review_id: "gh_rev_991823",
      published_url: "https://github.com/acme/payment-service/pull/142#pullrequestreview-991823",
      status_check: "SUCCESS",
    },
    logicDetail: "Batch posts single atomic review payload to GitHub API v3, minimizing webhook chatter and notification spam.",
  },
  {
    id: "notify_complete",
    name: "notify_complete",
    stepNumber: 8,
    icon: CheckCircle2,
    latency: "20ms",
    category: "dispatch",
    description: "Dispatches internal BullMQ completion events, records audit telemetry in PostgreSQL, and delivers optional Slack alerts.",
    inputs: {
      job_id: "bull_rev_142_complete",
      total_pipeline_time_ms: 1075,
    },
    outputs: {
      audit_logged: true,
      socket_broadcast: true,
      ready_for_feedback: true,
    },
    logicDetail: "Closes LangGraph execution cycle, frees memory resources, and unlocks real-time dashboard updates via WebSockets.",
  },
];

export function PipelineExplorer() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("score_risk");

  const selectedNode = NODES.find((n) => n.id === selectedNodeId) || NODES[4];

  return (
    <div className="w-full space-y-6">
      {/* Visual Pipeline Graph: Horizontal Flow */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0A0E1A]/80 backdrop-blur-xl p-4 sm:p-6 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Cpu className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Linear LangGraph Execution Graph
              </h3>
              <p className="text-xs text-zinc-400">
                Click any pipeline stage to inspect real inputs, schema contracts, and internal logic.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span>Avg Pipeline Latency: ~1.1s</span>
          </div>
        </div>

        {/* Nodes Grid / Flow Track */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 relative">
          {NODES.map((node, index) => {
            const isSelected = node.id === selectedNode.id;
            const Icon = node.icon;
            return (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`relative flex flex-col items-center p-3 rounded-xl border text-center transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-[1.03]"
                    : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.14] hover:bg-white/[0.04]"
                }`}
              >
                {/* Step badge */}
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-2 transition-colors ${
                    isSelected
                      ? "bg-indigo-500 text-white"
                      : "bg-white/[0.06] text-zinc-400 group-hover:text-white"
                  }`}
                >
                  {node.stepNumber}
                </div>

                <Icon
                  className={`h-5 w-5 mb-1.5 transition-transform group-hover:scale-110 ${
                    isSelected ? "text-indigo-300" : "text-zinc-400"
                  }`}
                />

                <span className="text-xs font-bold font-mono truncate max-w-full">
                  {node.name}
                </span>

                <span className="text-[10px] text-zinc-500 font-mono mt-1">
                  {node.latency}
                </span>

                {/* Arrow indicator */}
                {index < NODES.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-white/[0.15]">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Node Deep Inspector */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedNode.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-white/[0.08] bg-[#090C16] p-6 shadow-xl"
        >
          <div className="grid md:grid-cols-12 gap-6">
            {/* Left Col: Overview */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                  <selectedNode.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white font-mono">
                      {selectedNode.name}
                    </h4>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Step {selectedNode.stepNumber} of 8
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Execution Latency: <strong className="text-white font-mono">{selectedNode.latency}</strong>
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {selectedNode.description}
              </p>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 space-y-1.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                  LangGraph Logic Implementation
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selectedNode.logicDetail}
                </p>
              </div>
            </div>

            {/* Right Col: JSON State Contracts */}
            <div className="md:col-span-7 grid sm:grid-cols-2 gap-4">
              {/* Inputs */}
              <div className="rounded-xl border border-white/[0.06] bg-[#04060C] p-4 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="h-3 w-3 text-zinc-500" />
                    Node Inputs
                  </span>
                  <span className="text-[10px] text-zinc-600">ReviewState</span>
                </div>
                <pre className="text-indigo-300/90 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(selectedNode.inputs, null, 2)}
                </pre>
              </div>

              {/* Outputs */}
              <div className="rounded-xl border border-white/[0.06] bg-[#04060C] p-4 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-emerald-500" />
                    Node State Mutation
                  </span>
                  <span className="text-[10px] text-emerald-600">State Delta</span>
                </div>
                <pre className="text-emerald-300/90 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(selectedNode.outputs, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
