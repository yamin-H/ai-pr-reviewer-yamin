"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Brain,
  Sparkles,
  ShieldAlert,
  Database,
  FileCode,
  Check,
  Play,
  RotateCcw,
  Zap,
  Code2,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Scenario {
  id: string;
  title: string;
  file: string;
  category: "Security" | "Performance" | "Convention";
  diff: Array<{
    type: "normal" | "remove" | "add";
    numOld?: number;
    numNew?: number;
    code: string;
  }>;
  comment: {
    line: number;
    severity: "CRITICAL" | "HIGH" | "WARNING";
    confidence: number;
    title: string;
    description: string;
    suggestedFix: string;
    ruleToExtract: string;
  };
  riskScore: number;
}

const SCENARIOS: Scenario[] = [
  {
    id: "security",
    title: "Auth Token Leak",
    file: "src/auth/session.ts",
    category: "Security",
    diff: [
      { type: "normal", numOld: 98, numNew: 98, code: "export function verifySession(token: string) {" },
      { type: "normal", numOld: 99, numNew: 99, code: "  if (!token) return null;" },
      { type: "remove", numOld: 100, code: "-  console.log(`Verifying user session: ${token}`);" },
      { type: "add", numNew: 100, code: "+  logger.debug({ hash: hashToken(token) }, 'Validating session');" },
      { type: "normal", numOld: 101, numNew: 101, code: "  const user = decryptPayload(token);" },
      { type: "normal", numOld: 102, numNew: 102, code: "  return user;" },
      { type: "normal", numOld: 103, numNew: 103, code: "}" },
    ],
    comment: {
      line: 100,
      severity: "CRITICAL",
      confidence: 99,
      title: "Credential Exposure in Telemetry Stream",
      description: "Raw authorization tokens must never be written to stdout or unmasked log drains. Ensure cryptographic token masking is enforced.",
      suggestedFix: "Use hashToken(token) or omit sensitive bearer payloads entirely.",
      ruleToExtract: "Never log raw bearer tokens or authorization headers in plain text",
    },
    riskScore: 84,
  },
  {
    id: "performance",
    title: "SQL Injection & Missing Index",
    file: "src/db/queries.ts",
    category: "Performance",
    diff: [
      { type: "normal", numOld: 44, numNew: 44, code: "export async function searchTransactions(tenantId: string, q: string) {" },
      { type: "remove", numOld: 45, code: "-  return db.$queryRawUnsafe(`SELECT * FROM tx WHERE tenant='${tenantId}' AND query LIKE '%${q}%'`);" },
      { type: "add", numNew: 45, code: "+  return db.$queryRaw`SELECT * FROM tx WHERE tenant_id = ${tenantId} AND query ILIKE ${'%' + q + '%'} LIMIT 50`;" },
      { type: "normal", numOld: 46, numNew: 46, code: "}" },
    ],
    comment: {
      line: 45,
      severity: "HIGH",
      confidence: 97,
      title: "Unparameterized Raw Query & Unbounded Scan",
      description: "String interpolation into $queryRawUnsafe allows direct SQL injection. Query also lacks LIMIT pagination, causing full-table locks under high concurrency.",
      suggestedFix: "Bind parameters via Prisma.sql tagged template literal and enforce LIMIT <= 50.",
      ruleToExtract: "Always use parameterized Prisma.sql template tags for raw database queries",
    },
    riskScore: 76,
  },
  {
    id: "convention",
    title: ".powerful.yml Rule Violation",
    file: "src/api/webhooks.ts",
    category: "Convention",
    diff: [
      { type: "normal", numOld: 12, numNew: 12, code: "export async function handleWebhook(req: Request, res: Response) {" },
      { type: "remove", numOld: 13, code: "-  processWebhookPayload(req.body);" },
      { type: "remove", numOld: 14, code: "-  return res.status(200).json({ ok: true });" },
      { type: "add", numNew: 13, code: "+  await verifyHmacSignature(req);" },
      { type: "add", numNew: 14, code: "+  await webhookQueue.add('event', req.body);" },
      { type: "add", numNew: 15, code: "+  return res.status(202).json({ accepted: true });" },
      { type: "normal", numOld: 15, numNew: 16, code: "}" },
    ],
    comment: {
      line: 13,
      severity: "WARNING",
      confidence: 94,
      title: "Custom Rule Violation (rule: require-signature-check)",
      description: "Repository rule specified in .powerful.yml mandates cryptographic webhook verification prior to payload queuing or execution.",
      suggestedFix: "Include verifyHmacSignature before returning acknowledgment.",
      ruleToExtract: "Webhooks must verify HMAC signatures before queueing payload to BullMQ",
    },
    riskScore: 42,
  },
];

const STEPS = [
  { label: "Diff Chunking", desc: "AST syntax trees" },
  { label: "Config Loading", desc: "Reading .powerful.yml" },
  { label: "Memory Retrieval", desc: "pgvector similarity" },
  { label: "Risk Evaluation", desc: "Multi-factor formula" },
  { label: "Synthesizing Review", desc: "Line-level comments" },
];

export function ReviewSimulator() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("security");
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(4);
  const [memoryBank, setMemoryBank] = useState<string[]>([
    "Never log raw bearer tokens or authorization headers in plain text",
    "Always use parameterized Prisma.sql template tags for raw database queries",
    "Require idempotent transaction wrappers around payment webhooks",
  ]);
  const [userDecisions, setUserDecisions] = useState<Record<string, "approved" | "dismissed">>({});

  const scenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];
  const decision = userDecisions[scenario.id];

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setCurrentStepIndex(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < STEPS.length) {
        setCurrentStepIndex(step);
      } else {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 400);
  };

  const handleApprove = () => {
    setUserDecisions((prev) => ({ ...prev, [scenario.id]: "approved" }));
    if (!memoryBank.includes(scenario.comment.ruleToExtract)) {
      setMemoryBank((prev) => [scenario.comment.ruleToExtract, ...prev]);
    }
  };

  const handleDismiss = () => {
    setUserDecisions((prev) => ({ ...prev, [scenario.id]: "dismissed" }));
  };

  const handleReset = () => {
    setUserDecisions((prev) => {
      const next = { ...prev };
      delete next[scenario.id];
      return next;
    });
  };

  const severityStyle = {
    CRITICAL: "bg-red-50 text-red-600 border-red-200",
    HIGH: "bg-amber-50 text-amber-600 border-amber-200",
    WARNING: "bg-violet-50 text-[#6D28D9] border-violet-200",
  }[scenario.comment.severity];

  const riskStyle =
    scenario.riskScore > 70
      ? "bg-red-50 text-red-600 border-red-200"
      : scenario.riskScore > 30
      ? "bg-amber-50 text-amber-600 border-amber-200"
      : "bg-emerald-50 text-emerald-600 border-emerald-200";

  return (
    <div className="w-full card-light-md overflow-hidden transition-colors duration-300">
      {/* Top bar */}
      <div className="border-b border-[#E5E7EB] dark:border-white/10 bg-[#FAFAFA] dark:bg-[#080C14] px-5 py-3 flex flex-wrap items-center justify-between gap-3 transition-colors duration-300">
        <div className="flex items-center gap-2">
          {/* Traffic light dots */}
          <div className="flex gap-1.5 mr-2">
            <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <span className="h-3 w-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex items-center bg-white dark:bg-white/[0.04] p-1 rounded-lg border border-[#E5E7EB] dark:border-white/10 transition-colors duration-300">
            {SCENARIOS.map((s) => {
              const isActive = s.id === scenario.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedScenarioId(s.id)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#6D28D9] text-white shadow-sm"
                      : "text-[#4B5563] dark:text-zinc-400 hover:text-[#0F0F0F] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-white/[0.05]"
                  }`}
                >
                  {s.category === "Security" && <ShieldAlert className="h-3 w-3" />}
                  {s.category === "Performance" && <Database className="h-3 w-3" />}
                  {s.category === "Convention" && <FileCode className="h-3 w-3" />}
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <Brain className="h-3.5 w-3.5" />
            <span>Memory Bank: {memoryBank.length} Rules</span>
          </div>
          <Button
            size="sm"
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="gap-1.5 text-[12px] font-semibold bg-[#6D28D9] hover:bg-[#5B21B6] text-white shadow-sm"
          >
            {isSimulating ? (
              <Zap className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {isSimulating ? "Analyzing Diff..." : "Simulate Review"}
          </Button>
        </div>
      </div>

      {/* Step progress bar */}
      <AnimatePresence>
        {isSimulating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-violet-50 dark:bg-violet-950/40 border-b border-violet-200 dark:border-violet-800/40 px-6 py-3 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4">
              {STEPS.map((step, idx) => {
                const isCurrent = idx === currentStepIndex;
                const isPast = idx < currentStepIndex;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        isPast
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-[#6D28D9] text-white animate-pulse"
                          : "bg-[#E5E7EB] dark:bg-white/10 text-[#9CA3AF] dark:text-zinc-500"
                      }`}
                    >
                      {isPast ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
                    </div>
                    <div className="hidden md:block">
                      <p className={`text-[11px] font-semibold leading-none ${isCurrent ? "text-[#6D28D9] dark:text-[#A78BFA]" : "text-[#9CA3AF] dark:text-zinc-400"}`}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF] dark:text-zinc-500">{step.desc}</p>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="h-px w-4 bg-[#E5E7EB] dark:bg-white/10 hidden lg:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body: split layout */}
      <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E7EB] dark:divide-white/10">
        {/* Left: diff viewer */}
        <div className="lg:col-span-8 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#9CA3AF] dark:text-zinc-500" />
              <span className="font-mono text-[12px] text-[#0F0F0F] dark:text-white font-semibold">{scenario.file}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#9CA3AF] dark:text-zinc-500 font-mono">git diff</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${riskStyle}`}>
                Risk: {scenario.riskScore}/100
              </span>
            </div>
          </div>

          {/* Diff viewer */}
          <div className="rounded-xl border border-[#E5E7EB] dark:border-white/10 overflow-hidden">
            <div className="bg-[#1E1E2E] p-4 font-mono text-[12px] overflow-x-auto">
              {scenario.diff.map((line, idx) => {
                if (line.type === "remove") {
                  return (
                    <div key={idx} className="flex gap-3 bg-red-500/10 text-red-400 px-2 py-0.5 rounded border-l-2 border-red-500/50">
                      <span className="w-7 text-right text-red-500/50 select-none">{line.numOld}</span>
                      <span className="w-7 select-none" />
                      <span className="flex-1">{line.code}</span>
                    </div>
                  );
                }
                if (line.type === "add") {
                  return (
                    <div key={idx} className="flex gap-3 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border-l-2 border-emerald-500/50">
                      <span className="w-7 select-none" />
                      <span className="w-7 text-right text-emerald-500/50 select-none">{line.numNew}</span>
                      <span className="flex-1">{line.code}</span>
                    </div>
                  );
                }
                return (
                  <div key={idx} className="flex gap-3 text-[#6B7280] px-2 py-0.5">
                    <span className="w-7 text-right text-[#4B5563]/50 select-none">{line.numOld}</span>
                    <span className="w-7 text-right text-[#4B5563]/50 select-none">{line.numNew}</span>
                    <span className="flex-1">{line.code}</span>
                  </div>
                );
              })}
            </div>

            {/* Inline AI comment */}
            <AnimatePresence>
              {decision !== "dismissed" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="border-t border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0D1322] p-4 font-sans transition-colors duration-300"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-[#6D28D9] to-[#0891B2] flex items-center justify-center shadow-sm shadow-violet-200 dark:shadow-violet-950/50">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#0F0F0F] dark:text-white tracking-tight">
                            Powerful Agent
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-px rounded uppercase border ${severityStyle}`}>
                            {scenario.comment.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#9CA3AF] dark:text-zinc-500">
                      {scenario.comment.confidence}% confidence
                    </span>
                  </div>

                  <h4 className="text-[13px] font-semibold text-[#0F0F0F] dark:text-white mb-1.5">
                    {scenario.comment.title}
                  </h4>
                  <p className="text-[12px] text-[#4B5563] dark:text-zinc-300 leading-relaxed mb-3">
                    {scenario.comment.description}
                  </p>

                  <div className="rounded-lg bg-[#FAFAFA] dark:bg-black/30 border border-[#E5E7EB] dark:border-white/10 p-2.5 text-[12px] text-[#4B5563] dark:text-zinc-300 font-mono mb-4 transition-colors duration-300">
                    <span className="text-[#6D28D9] dark:text-[#A78BFA] font-bold font-sans">Suggested fix: </span>
                    {scenario.comment.suggestedFix}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] dark:border-white/10">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563] dark:text-zinc-400">
                      <Code2 className="h-3.5 w-3.5 text-[#6D28D9] dark:text-[#A78BFA]" />
                      <span>Rule will sync to shared team memory bank</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {decision === "approved" ? (
                        <div className="flex items-center gap-2">
                          <motion.span
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 px-3 py-1 rounded-lg"
                          >
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            Rule Learned Forever
                          </motion.span>
                          <button
                            onClick={handleReset}
                            className="p-1 text-[#9CA3AF] hover:text-[#0F0F0F] dark:hover:text-white rounded transition-colors"
                            title="Reset"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={handleDismiss}
                            className="text-[12px] text-[#4B5563] dark:text-zinc-400 hover:text-[#0F0F0F] dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={handleApprove}
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] px-3.5 py-1.5 rounded-lg transition-all shadow-sm shadow-violet-200 dark:shadow-violet-950/50 hover:scale-[1.02] cursor-pointer"
                          >
                            <Brain className="h-3.5 w-3.5 text-violet-200" />
                            Approve & Save Rule
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {decision === "dismissed" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-t border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0D1322] p-4 text-center transition-colors duration-300"
              >
                <p className="text-[12px] text-[#4B5563] dark:text-zinc-400 mb-2">
                  Feedback dismissed. The agent noted this preference to reduce false positives for this pattern.
                </p>
                <Button size="sm" variant="secondary" onClick={handleReset} className="text-[12px] h-7 bg-[#F3F4F6] dark:bg-white/10 hover:bg-[#E5E7EB] dark:hover:bg-white/20 text-[#0F0F0F] dark:text-white">
                  Restore Suggestion
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right: live memory bank */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-[#FAFAFA] dark:bg-[#080C14] space-y-4 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-[#6D28D9] dark:text-[#A78BFA]" />
              <h3 className="text-[12px] font-bold text-[#0F0F0F] dark:text-white uppercase tracking-wider">
                Live Memory Bank
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#0891B2] dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 px-2 py-0.5 rounded">
              pgvector RAG
            </span>
          </div>

          <p className="text-[12px] text-[#4B5563] dark:text-zinc-400 leading-relaxed">
            Every approved feedback loop writes vector embeddings to PostgreSQL. When future PRs touch similar AST structures, the agent injects these exact rules.
          </p>

          <div className="space-y-2">
            {memoryBank.map((rule, idx) => {
              const isJustAdded = idx === 0 && decision === "approved";
              return (
                <motion.div
                  key={idx}
                  layout
                  initial={isJustAdded ? { scale: 0.96, opacity: 0, y: -8 } : false}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl border text-[12px] leading-relaxed transition-all duration-300 ${
                    isJustAdded
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-300 shadow-sm"
                      : "bg-white dark:bg-[#0D1322] border-[#E5E7EB] dark:border-white/10 text-[#4B5563] dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-[#9CA3AF] dark:text-zinc-500 mt-0.5 shrink-0">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <p className="flex-1">{rule}</p>
                  </div>
                  {isJustAdded && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/30 flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Learned from current review</span>
                      <span className="font-mono">embed: 1536 dims</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] dark:border-white/10 flex items-center justify-between text-[12px] text-[#9CA3AF] dark:text-zinc-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Shared with whole team
            </span>
            <span className="font-mono text-[10px]">v2.0 pgvector</span>
          </div>
        </div>
      </div>
    </div>
  );
}
