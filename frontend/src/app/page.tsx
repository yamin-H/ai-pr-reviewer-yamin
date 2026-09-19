"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Brain,
  GitPullRequest,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Code2,
  Check,
  ChevronRight,
  Copy,
  Terminal,
  Activity,
  Layers,
  FileCode,
  Lock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { ReviewSimulator } from "@/components/home/review-simulator";
import { PipelineExplorer } from "@/components/home/pipeline-explorer";
import { RiskCalculator } from "@/components/home/risk-calculator";
import { ComparisonMatrix } from "@/components/home/comparison-matrix";
import { InteractiveBackground } from "@/components/home/interactive-background";

const SAMPLE_YAML = `# .powerful.yml — Declarative Repository Review Guidelines
rules:
  - "Never log raw bearer tokens or authorization headers in plain text"
  - "Always use parameterized Prisma.sql template tags for raw queries"
  - "Enforce limit pagination (max: 50) on public list endpoints"
  - "Require idempotent transaction wrappers on stripe webhook handlers"
`;

export default function Home() {
  const { user } = useAuth();
  const [copiedYaml, setCopiedYaml] = useState(false);

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(SAMPLE_YAML);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#04060B] text-zinc-100 overflow-x-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Interactive Neural Canvas with Smooth Mouse Interaction */}
      <InteractiveBackground />

      {/* Ambient background glow layers */}
      <div className="fixed inset-0 bg-dot-grid opacity-30 pointer-events-none" />
      <div className="fixed top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-indigo-600/15 via-violet-600/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="fixed top-[40%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-emerald-600/10 via-indigo-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-violet-600/15 to-transparent blur-[120px] pointer-events-none" />

      {/* Top Telemetry Ticker */}
      <div className="relative z-20 border-b border-white/[0.06] bg-[#070A14]/80 backdrop-blur-md px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-6 overflow-x-auto py-0.5 no-scrollbar">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Engine v2.0 Operational
            </span>
            <span className="hidden sm:inline-block text-zinc-600">|</span>
            <span className="shrink-0 flex items-center gap-1 text-zinc-300">
              <Activity className="h-3 w-3 text-indigo-400" />
              Avg Review Speed: <strong className="text-white">1.14s</strong>
            </span>
            <span className="hidden md:inline-block text-zinc-600">|</span>
            <span className="shrink-0 hidden md:flex items-center gap-1 text-zinc-300">
              <Brain className="h-3 w-3 text-violet-400" />
              Memory Recall Accuracy: <strong className="text-white">98.4%</strong>
            </span>
            <span className="hidden lg:inline-block text-zinc-600">|</span>
            <span className="shrink-0 hidden lg:flex items-center gap-1 text-zinc-300">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              Zero Hallucination AST Chunking
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase font-bold text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
              Groq Llama 3.3 70B
            </span>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="relative z-20 mx-auto max-w-7xl px-6 h-20 flex items-center justify-between border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Powerful
              <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded uppercase">
                Agent
              </span>
            </span>
            <span className="block text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
              Autonomous PR Reviewer
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
          <a href="#simulator" className="hover:text-white transition-colors">
            Interactive Playground
          </a>
          <a href="#pipeline" className="hover:text-white transition-colors">
            LangGraph Architecture
          </a>
          <a href="#risk" className="hover:text-white transition-colors">
            Risk Engine
          </a>
          <a href="#comparison" className="hover:text-white transition-colors">
            Why Powerful
          </a>
          <a href="#quickstart" className="hover:text-white transition-colors">
            Configuration
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard">
              <Button size="sm" className="gap-2 shadow-lg shadow-indigo-500/20">
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/install">
              <Button size="sm" className="gap-2 shadow-lg shadow-indigo-500/25">
                Connect GitHub
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 backdrop-blur-md shadow-inner">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <span>Autonomous PR Review with Vector Memory Bank</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            Code reviews that{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400">
              learn from your team&apos;s history
            </span>
            .
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
            Generic AI bots repeat the same dismissed nitpicks. Powerful stores approved feedback in an autonomous PostgreSQL pgvector Memory Bank, learns your codebase conventions, and scores pull requests before they merge.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-sm shadow-xl shadow-indigo-500/25">
                  Enter Engineering Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/install" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full gap-2 text-sm shadow-xl shadow-indigo-500/30">
                    Install GitHub App
                    <GitPullRequest className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#simulator" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" className="w-full gap-2 text-sm">
                    Try Interactive Playground
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </>
            )}
          </div>

          {/* Architecture Badge Strip */}
          <div className="pt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span>Linear LangGraph v0.2</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <Brain className="h-3.5 w-3.5 text-violet-400" />
              <span>PostgreSQL pgvector RAG</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Groq Llama 3.3 70B</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <FileCode className="h-3.5 w-3.5 text-amber-400" />
              <span>.powerful.yml Rule Engine</span>
            </div>
          </div>
        </div>
      </section>

      {/* Flagship Feature 1: Live Interactive Review Simulator */}
      <section id="simulator" className="relative z-10 mx-auto max-w-7xl px-6 py-16 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3 w-3" />
            Interactive Playground
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Experience the Agent in Action
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Choose a Pull Request diff below, click &quot;Simulate Review&quot;, and approve suggestions to see rules commit into the live memory bank.
          </p>
        </div>

        <ReviewSimulator />
      </section>

      {/* Flagship Feature 2: LangGraph Execution Pipeline Explorer */}
      <section id="pipeline" className="relative z-10 mx-auto max-w-7xl px-6 py-20 border-t border-white/[0.05] scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
            <Layers className="h-3 w-3" />
            Under the Hood
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Linear LangGraph Architecture
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Every pull request passes through an 8-stage state machine that isolates context extraction, AST segmenting, pgvector search, and atomic GitHub dispatching.
          </p>
        </div>

        <PipelineExplorer />
      </section>

      {/* Flagship Feature 3: PR Risk Scoring Engine */}
      <section id="risk" className="relative z-10 mx-auto max-w-7xl px-6 py-20 border-t border-white/[0.05] scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
            <ShieldCheck className="h-3 w-3" />
            Risk Prevention
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Autonomous PR Risk Scoring
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Adjust the diff size, file count, and historical team dismissal rates below to compute the live composite score and see the exact GitHub commit check status Powerful posts.
          </p>
        </div>

        <RiskCalculator />
      </section>

      {/* Flagship Feature 4: Generic AI vs Powerful Comparison */}
      <section id="comparison" className="relative z-10 mx-auto max-w-7xl px-6 py-20 border-t border-white/[0.05] scroll-mt-20">
        <ComparisonMatrix />
      </section>

      {/* Flagship Feature 5: Declarative YAML Rule Config & Quickstart */}
      <section id="quickstart" className="relative z-10 mx-auto max-w-7xl px-6 py-20 border-t border-white/[0.05] scroll-mt-20">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-400">
              <FileCode className="h-3 w-3" />
              Zero Configuration Drift
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Declare Custom Standards in <code className="text-indigo-400 font-mono">.powerful.yml</code>
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Store repository-specific guidelines right beside your code. Powerful reads your config on every Pull Request, merges them with historical team conventions from pgvector, and enforces them strictly.
            </p>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                  1
                </div>
                <span>Connect your GitHub personal account or team organization in one click.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                  2
                </div>
                <span>Add a <code className="font-mono text-indigo-300">.powerful.yml</code> file to your repository root for custom rules.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                  3
                </div>
                <span>Open Pull Requests. The agent reviews in ~1.1s and gets smarter with every approved comment.</span>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/install">
                <Button size="lg" className="gap-2 text-xs font-semibold shadow-lg shadow-indigo-500/25">
                  Get Started with GitHub
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Code Window */}
          <div className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-[#070A14] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0D1222] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/60" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <span className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <span className="ml-2 text-xs font-mono text-zinc-400">.powerful.yml</span>
              </div>

              <button
                onClick={handleCopyYaml}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer"
              >
                {copiedYaml ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Config</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-5 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
              <code>{SAMPLE_YAML}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-12 bg-[#030509]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">
                Powerful AI
              </span>
              <span className="block text-[10px] text-zinc-500 font-mono">
                Autonomous PR Review SaaS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
              Dashboard
            </Link>
            <Link href="/install" className="hover:text-zinc-300 transition-colors">
              GitHub App
            </Link>
            <a href="#pipeline" className="hover:text-zinc-300 transition-colors">
              Architecture
            </a>
            <a href="#simulator" className="hover:text-zinc-300 transition-colors">
              Simulator
            </a>
          </div>

          <p className="text-xs text-zinc-600 font-mono">
            &copy; 2026 Powerful. Production-Grade AI Engineering.
          </p>
        </div>
      </footer>
    </div>
  );
}
