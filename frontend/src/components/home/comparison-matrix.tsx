"use client";

import { Check, X, Brain, Zap, Shield, Sparkles, Sliders } from "lucide-react";

interface ComparisonRow {
  capability: string;
  genericBots: string;
  powerful: string;
  isHero?: boolean;
}

const COMPARISONS: ComparisonRow[] = [
  {
    capability: "Persistent Team Memory",
    genericBots: "Zero memory. Reviews every PR in complete isolation, repeating the same dismissed comments.",
    powerful: "pgvector RAG Memory Bank: learns team approvals and merge decisions, improving permanently over time.",
    isHero: true,
  },
  {
    capability: "Custom Repo Rules",
    genericBots: "Hardcoded prompts or cumbersome external web consoles.",
    powerful: "Native .powerful.yml in repository root with declarative rule sets and zero configuration drift.",
  },
  {
    capability: "PR Risk Scoring & GitHub Statuses",
    genericBots: "Binary or non-existent. No context on diff size, blast radius, or critical file paths.",
    powerful: "Autonomous 4-factor risk scoring (0-100) with automatic GitHub Commit Checks (Green/Yellow/Red).",
    isHero: true,
  },
  {
    capability: "Review Noise & Dismissal Feedback",
    genericBots: "High false-positive rate. Developers end up muting or ignoring bot notifications.",
    powerful: "Continuous feedback loop: Dismissed comments teach the agent to suppress noise on that specific pattern.",
  },
  {
    capability: "Pipeline Architecture",
    genericBots: "Single prompt pass. Subject to token truncations, hallucinations, and mid-file context loss.",
    powerful: "Linear LangGraph state machine with AST chunking, vector similarity, and isolated node execution.",
  },
  {
    capability: "Latency & Speed",
    genericBots: "30s to 2min waiting on slow non-specialized reasoning models.",
    powerful: "Sub-second AST chunking + Groq llama-3.3-70b-versatile inference in under 1.5 seconds.",
  },
];

export function ComparisonMatrix() {
  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#0A0D17]/85 backdrop-blur-xl overflow-hidden shadow-2xl">
      <div className="p-6 sm:p-8 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Architectural Differentiation
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Why Standard AI Bots Fail at Code Review
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Generic LLMs don't know your company's internal conventions. Powerful pairs high-throughput models with persistent vector memory and declarative rule sets.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            Generic LLM Bots
          </div>
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
            Powerful Agent
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/[0.06] overflow-x-auto">
        {COMPARISONS.map((row, idx) => (
          <div
            key={idx}
            className={`grid grid-cols-12 p-4 sm:p-5 gap-4 items-center transition-colors ${
              row.isHero ? "bg-indigo-500/[0.02]" : ""
            }`}
          >
            {/* Capability */}
            <div className="col-span-12 md:col-span-4 flex items-start gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
                {row.isHero ? (
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                ) : (
                  <span className="text-[10px] font-mono text-zinc-500">{idx + 1}</span>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-tight">
                  {row.capability}
                </p>
              </div>
            </div>

            {/* Generic Bots */}
            <div className="col-span-12 sm:col-span-6 md:col-span-4 p-3 rounded-xl bg-white/[0.01] border border-white/[0.04]">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                <X className="h-3 w-3 text-red-400/80" />
                Generic PR Bot
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {row.genericBots}
              </p>
            </div>

            {/* Powerful */}
            <div className="col-span-12 sm:col-span-6 md:col-span-4 p-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 shadow-inner">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                <Check className="h-3 w-3 text-emerald-400 stroke-[3]" />
                Powerful Engine
              </div>
              <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                {row.powerful}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
