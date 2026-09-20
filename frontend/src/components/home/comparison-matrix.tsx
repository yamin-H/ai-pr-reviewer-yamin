import { Check, X, Sparkles } from "lucide-react";

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
    <div className="w-full">
      {/* Section header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-800/40 bg-violet-50 dark:bg-violet-950/40 px-3 py-1 text-[11px] font-semibold text-[#6D28D9] dark:text-[#A78BFA] mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          Architectural Differentiation
        </div>
        <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0F0F0F] dark:text-white mb-4">
          Why Standard AI Bots<br />Fail at Code Review
        </h2>
        <div className="accent-line mb-4" />
        <p className="text-[15px] text-[#4B5563] dark:text-zinc-400 max-w-xl leading-relaxed">
          Generic LLMs don&apos;t know your company&apos;s internal conventions. Powerful pairs high-throughput models with persistent vector memory and declarative rule sets.
        </p>

        <div className="flex items-center gap-6 mt-5 text-[13px] font-semibold">
          <div className="flex items-center gap-2 text-[#9CA3AF] dark:text-zinc-400">
            <span className="h-2.5 w-2.5 rounded-full bg-[#D1D5DB] dark:bg-zinc-700" />
            Generic LLM Bots
          </div>
          <div className="flex items-center gap-2 text-[#6D28D9] dark:text-[#A78BFA] font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-[#6D28D9] dark:bg-[#A78BFA] shadow-sm shadow-violet-300 dark:shadow-violet-900" />
            Powerful Agent
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bevel-card overflow-hidden">
        <div className="bevel-chamfer-rail" />
        {/* Table header */}
        <div className="grid grid-cols-12 bg-[#F8FAFC] dark:bg-[#080C14] border-b border-[#E2E8F0] dark:border-white/10 px-5 py-3 transition-colors duration-300">
          <div className="col-span-4 text-[11px] font-bold text-[#9CA3AF] dark:text-zinc-400 uppercase tracking-wider">
            Capability
          </div>
          <div className="col-span-4 text-[11px] font-bold text-[#9CA3AF] dark:text-zinc-400 uppercase tracking-wider hidden sm:block">
            Generic PR Bot
          </div>
          <div className="col-span-4 text-[11px] font-bold text-[#6D28D9] dark:text-[#A78BFA] uppercase tracking-wider hidden sm:block">
            Powerful Agent
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#E5E7EB] dark:divide-white/10">
          {COMPARISONS.map((row, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-12 px-5 py-4 gap-4 items-start transition-colors duration-200 hover:bg-[#FAFAFA] dark:hover:bg-white/[0.03] ${
                row.isHero
                  ? "bg-violet-50/40 dark:bg-violet-950/20"
                  : idx % 2 === 0
                  ? "bg-white dark:bg-[#0D1322]"
                  : "bg-[#FAFAFA]/60 dark:bg-[#080C14]"
              }`}
            >
              {/* Capability label */}
              <div className="col-span-12 sm:col-span-4 flex items-start gap-2.5">
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    row.isHero
                      ? "bg-[#6D28D9] text-white"
                      : "bg-[#F3F4F6] dark:bg-white/10 text-[#9CA3AF] dark:text-zinc-400"
                  }`}
                >
                  {row.isHero ? (
                    <Sparkles className="h-2.5 w-2.5" />
                  ) : (
                    <span className="text-[9px] font-mono font-bold">{idx + 1}</span>
                  )}
                </div>
                <p className="text-[13px] font-bold text-[#0F0F0F] dark:text-white tracking-tight leading-snug">
                  {row.capability}
                </p>
              </div>

              {/* Generic bots column */}
              <div className="col-span-12 sm:col-span-4 sm:pt-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#9CA3AF] dark:text-zinc-400 uppercase tracking-wider mb-1.5 sm:hidden">
                  <X className="h-3 w-3 text-red-400" />
                  Generic PR Bot
                </div>
                <p className="text-[12px] text-[#4B5563] dark:text-zinc-400 leading-relaxed">{row.genericBots}</p>
              </div>

              {/* Powerful column */}
              <div
                className={`col-span-12 sm:col-span-4 p-3 rounded-xl sm:pt-0.5 sm:p-0 ${
                  row.isHero ? "sm:pl-3 border-l-2 border-[#6D28D9] dark:border-[#A78BFA]" : "sm:pl-3 border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6D28D9] dark:text-[#A78BFA] uppercase tracking-wider mb-1.5 sm:hidden">
                  <Check className="h-3 w-3 text-emerald-500 stroke-[3]" />
                  Powerful Engine
                </div>
                <p className={`text-[12px] leading-relaxed font-medium ${row.isHero ? "text-[#0F0F0F] dark:text-white" : "text-[#4B5563] dark:text-zinc-300"}`}>
                  {row.powerful}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
