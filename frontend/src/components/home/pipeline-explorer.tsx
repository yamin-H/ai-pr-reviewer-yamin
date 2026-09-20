"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
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

const CATEGORY_COLORS: Record<string, string> = {
  ingestion: "#0891B2",
  analysis: "#6D28D9",
  synthesis: "#7C3AED",
  dispatch: "#059669",
};

export function PipelineExplorer() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("score_risk");
  const pulseRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const gsapPulseAnimations = useRef<Record<string, gsap.core.Tween>>({});

  const selectedNode = NODES.find((n) => n.id === selectedNodeId) || NODES[4];

  useEffect(() => {
    // Kill previous pulse animations
    Object.values(gsapPulseAnimations.current).forEach((t) => t?.kill());
    gsapPulseAnimations.current = {};

    // Pulse only active node
    const pulseEl = pulseRefs.current[selectedNodeId];
    if (pulseEl) {
      const anim = gsap.to(pulseEl, {
        scale: 1.6,
        opacity: 0,
        duration: 1.1,
        ease: "power2.out",
        repeat: -1,
        transformOrigin: "center center",
      });
      gsapPulseAnimations.current[selectedNodeId] = anim;
    }

    return () => {
      Object.values(gsapPulseAnimations.current).forEach((t) => t?.kill());
    };
  }, [selectedNodeId]);

  return (
    <div className="w-full space-y-5">
      {/* Pipeline graph */}
      <div className="card-light-md p-5 sm:p-7 overflow-hidden transition-colors duration-300">
        <div className="flex items-center justify-between mb-6 pb-5 border-b border-[#E5E7EB] dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 flex items-center justify-center text-[#6D28D9] dark:text-[#A78BFA]">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#0F0F0F] dark:text-white tracking-tight">
                Linear LangGraph Execution Graph
              </h3>
              <p className="text-[12px] text-[#4B5563] dark:text-zinc-400">
                Click any pipeline stage to inspect real inputs, schema contracts, and internal logic.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[12px] font-mono text-[#4B5563] dark:text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-[#6D28D9] dark:text-[#A78BFA]" />
            <span>Avg Pipeline Latency: ~1.1s</span>
          </div>
        </div>

        {/* Node grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {NODES.map((node, index) => {
            const isSelected = node.id === selectedNode.id;
            const Icon = node.icon;
            const catColor = CATEGORY_COLORS[node.category];
            return (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`relative flex flex-col items-center p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer group ${
                  isSelected
                    ? "border-[#6D28D9] bg-violet-50 dark:bg-violet-950/40 shadow-sm shadow-violet-100 dark:shadow-none"
                    : "border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0D1322] hover:border-[#6D28D9]/40 hover:bg-violet-50/40 dark:hover:bg-white/[0.04]"
                }`}
              >
                {/* GSAP pulse ring behind active node */}
                {isSelected && (
                  <div
                    ref={(el) => { pulseRefs.current[node.id] = el; }}
                    className="absolute inset-0 rounded-xl border-2 border-[#6D28D9] dark:border-[#A78BFA] pointer-events-none"
                    style={{ opacity: 0.5 }}
                  />
                )}

                {/* Step badge */}
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold mb-2 transition-colors ${
                    isSelected
                      ? "text-white"
                      : "bg-[#F3F4F6] dark:bg-white/10 text-[#4B5563] dark:text-zinc-400 group-hover:bg-violet-100 group-hover:text-[#6D28D9]"
                  }`}
                  style={isSelected ? { background: catColor } : {}}
                >
                  {node.stepNumber}
                </div>

                <Icon
                  className={`h-4 w-4 mb-1.5 transition-all ${
                    isSelected ? "text-[#6D28D9] dark:text-[#A78BFA]" : "text-[#9CA3AF] dark:text-zinc-500 group-hover:text-[#6D28D9]"
                  }`}
                />

                <span className={`text-[11px] font-bold font-mono truncate max-w-full ${
                  isSelected ? "text-[#6D28D9] dark:text-[#A78BFA]" : "text-[#4B5563] dark:text-zinc-300"
                }`}>
                  {node.name}
                </span>

                <span className={`text-[10px] font-mono mt-1 ${
                  isSelected ? "text-[#6D28D9]/70 dark:text-[#A78BFA]/70" : "text-[#9CA3AF] dark:text-zinc-500"
                }`}>
                  {node.latency}
                </span>

                {/* Arrow connector */}
                {index < NODES.length - 1 && (
                  <div className="hidden lg:block absolute -right-1.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <ChevronRight className="h-3 w-3 text-[#D1D5DB] dark:text-zinc-700" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected node inspector */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedNode.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="card-light-md p-6 transition-colors duration-300"
        >
          <div className="grid md:grid-cols-12 gap-6">
            {/* Left: overview */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: CATEGORY_COLORS[selectedNode.category] + "15",
                    border: `1px solid ${CATEGORY_COLORS[selectedNode.category]}30`,
                  }}
                >
                  <selectedNode.icon
                    className="h-5 w-5"
                    style={{ color: CATEGORY_COLORS[selectedNode.category] }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[15px] font-bold text-[#0F0F0F] dark:text-white font-mono">
                      {selectedNode.name}
                    </h4>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-[#6D28D9] dark:text-[#A78BFA] border border-violet-200 dark:border-violet-800/40">
                      Step {selectedNode.stepNumber} of 8
                    </span>
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] dark:text-zinc-400 mt-0.5">
                    Execution Latency:{" "}
                    <strong className="text-[#0F0F0F] dark:text-white font-mono">{selectedNode.latency}</strong>
                  </p>
                </div>
              </div>

              <p className="text-[13px] text-[#4B5563] dark:text-zinc-300 leading-relaxed">
                {selectedNode.description}
              </p>

              <div className="p-3.5 rounded-xl bg-[#FAFAFA] dark:bg-[#080C14] border border-[#E5E7EB] dark:border-white/10 transition-colors duration-300">
                <span className="text-[10px] font-bold text-[#6D28D9] dark:text-[#A78BFA] uppercase tracking-wider block mb-1.5">
                  LangGraph Logic Implementation
                </span>
                <p className="text-[12px] text-[#4B5563] dark:text-zinc-400 leading-relaxed">
                  {selectedNode.logicDetail}
                </p>
              </div>
            </div>

            {/* Right: JSON state contracts */}
            <div className="md:col-span-7 grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E7EB] dark:border-white/10 bg-[#FAFAFA] dark:bg-[#080C14] transition-colors duration-300">
                  <span className="text-[10px] font-bold text-[#4B5563] dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="h-3 w-3 text-[#9CA3AF] dark:text-zinc-500" />
                    Node Inputs
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] dark:text-zinc-500 font-mono">ReviewState</span>
                </div>
                <div className="bg-[#1E1E2E] p-4">
                  <pre className="text-[#A6ACCD] text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                    {JSON.stringify(selectedNode.inputs, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E7EB] dark:border-white/10 bg-[#FAFAFA] dark:bg-[#080C14] transition-colors duration-300">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    Node State Mutation
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">State Delta</span>
                </div>
                <div className="bg-[#1E1E2E] p-4">
                  <pre className="text-emerald-400 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                    {JSON.stringify(selectedNode.outputs, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
