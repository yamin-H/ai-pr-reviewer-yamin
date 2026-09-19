"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#0A0D17]/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
      {/* Simulator Top Bar */}
      <div className="border-b border-white/[0.06] bg-[#0D1220] px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-4">
        {/* Scenario Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
            {SCENARIOS.map((s) => {
              const isActive = s.id === scenario.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedScenarioId(s.id);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
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

        {/* Action Controls & Memory Count */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <Brain className="h-3.5 w-3.5" />
            <span>Memory Bank: {memoryBank.length} Rules</span>
          </div>

          <Button
            size="sm"
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="gap-1.5 text-xs font-semibold shadow-md shadow-indigo-500/20"
          >
            {isSimulating ? (
              <Zap className="h-3.5 w-3.5 animate-spin text-indigo-300" />
            ) : (
              <Play className="h-3.5 w-3.5 text-indigo-300" />
            )}
            {isSimulating ? "Analyzing Diff..." : "Simulate Review"}
          </Button>
        </div>
      </div>

      {/* Real-time LangGraph Step Progression Bar */}
      <AnimatePresence>
        {isSimulating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-950/40 border-b border-indigo-500/20 px-6 py-2.5 overflow-hidden"
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
                          ? "bg-emerald-500 text-black"
                          : isCurrent
                          ? "bg-indigo-500 text-white animate-pulse"
                          : "bg-white/10 text-zinc-500"
                      }`}
                    >
                      {isPast ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
                    </div>
                    <div className="hidden md:block">
                      <p
                        className={`text-xs font-medium leading-none ${
                          isCurrent ? "text-white" : "text-zinc-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-zinc-500 leading-tight">{step.desc}</p>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="h-px w-6 bg-white/[0.08] hidden lg:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulator Body: 2 Columns on desktop */}
      <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
        {/* Left Side: Interactive Code Diff */}
        <div className="lg:col-span-8 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-zinc-400" />
              <span className="font-mono text-xs text-zinc-300 font-semibold">{scenario.file}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 font-mono">git diff</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  scenario.riskScore > 70
                    ? "bg-red-500/15 text-red-400 border border-red-500/30"
                    : scenario.riskScore > 30
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                Risk: {scenario.riskScore}/100
              </span>
            </div>
          </div>

          {/* Diff Box */}
          <div className="rounded-xl border border-white/[0.06] bg-[#050811] p-4 font-mono text-xs overflow-x-auto">
            {scenario.diff.map((line, idx) => {
              if (line.type === "remove") {
                return (
                  <div
                    key={idx}
                    className="flex gap-3 bg-red-950/25 text-red-300 px-2 py-0.5 rounded border-l-2 border-red-500/60"
                  >
                    <span className="w-8 text-right text-red-500/70 select-none">{line.numOld}</span>
                    <span className="w-8 select-none"></span>
                    <span className="flex-1">{line.code}</span>
                  </div>
                );
              }
              if (line.type === "add") {
                return (
                  <div
                    key={idx}
                    className="flex gap-3 bg-emerald-950/25 text-emerald-300 px-2 py-0.5 rounded border-l-2 border-emerald-500/60"
                  >
                    <span className="w-8 select-none"></span>
                    <span className="w-8 text-right text-emerald-500/70 select-none">{line.numNew}</span>
                    <span className="flex-1">{line.code}</span>
                  </div>
                );
              }
              return (
                <div key={idx} className="flex gap-3 text-zinc-400 px-2 py-0.5">
                  <span className="w-8 text-right text-zinc-600 select-none">{line.numOld}</span>
                  <span className="w-8 text-right text-zinc-600 select-none">{line.numNew}</span>
                  <span className="flex-1">{line.code}</span>
                </div>
              );
            })}

            {/* Inline AI Comment Annotation */}
            <AnimatePresence>
              {decision !== "dismissed" && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="mt-4 rounded-xl border border-indigo-500/30 bg-[#12172A] p-4 shadow-xl shadow-indigo-950/30 font-sans"
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white tracking-tight">
                            Powerful Agent
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              scenario.comment.severity === "CRITICAL"
                                ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                : scenario.comment.severity === "HIGH"
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                            }`}
                          >
                            {scenario.comment.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {scenario.comment.confidence}% confidence
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-white mb-1.5">
                    {scenario.comment.title}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                    {scenario.comment.description}
                  </p>

                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-xs text-zinc-300 font-mono mb-4">
                    <span className="text-indigo-400 font-bold font-sans">Suggested fix: </span>
                    {scenario.comment.suggestedFix}
                  </div>

                  {/* Feedback Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Rule will sync to shared team memory bank</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {decision === "approved" ? (
                        <div className="flex items-center gap-2">
                          <motion.span
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-lg"
                          >
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            Rule Learned Forever
                          </motion.span>
                          <button
                            onClick={handleReset}
                            className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
                            title="Reset"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={handleDismiss}
                            className="text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={handleApprove}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg transition-all shadow-md shadow-indigo-600/30 hover:scale-[1.02] cursor-pointer"
                          >
                            <Brain className="h-3.5 w-3.5 text-indigo-200" />
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
                className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center"
              >
                <p className="text-xs text-zinc-400 mb-2">
                  Feedback dismissed. The agent noted this preference to reduce false positives for this pattern.
                </p>
                <Button size="sm" variant="secondary" onClick={handleReset} className="text-xs h-7">
                  Restore Suggestion
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Side: Live Memory Bank Feed */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-[#0B0F1B]/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Memory Bank
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              pgvector RAG
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Every approved feedback loop writes vector embeddings to PostgreSQL. When future PRs touch similar AST structures, the agent injects these exact rules.
          </p>

          <div className="space-y-2.5">
            {memoryBank.map((rule, idx) => {
              const isJustAdded = idx === 0 && decision === "approved";
              return (
                <motion.div
                  key={idx}
                  layout
                  initial={isJustAdded ? { scale: 0.95, opacity: 0, y: -10 } : false}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${
                    isJustAdded
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200 shadow-lg shadow-emerald-500/10"
                      : "bg-white/[0.02] border-white/[0.06] text-zinc-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 mt-0.5 shrink-0">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <p className="flex-1">{rule}</p>
                  </div>
                  {isJustAdded && (
                    <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[10px] text-emerald-400 font-semibold">
                      <span>Learned from current review</span>
                      <span className="font-mono">embed: 1536 dims</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Shared with whole team
            </span>
            <span className="font-mono text-[10px]">v2.0 pgvector</span>
          </div>
        </div>
      </div>
    </div>
  );
}
