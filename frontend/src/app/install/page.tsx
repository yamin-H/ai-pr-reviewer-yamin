"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  GitBranch,
  GitPullRequest,
  Brain,
  Zap,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Terminal,
  Shield,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl, api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const GITHUB_APP_NAME = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "powerful-pr-agent";

function InstallPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get("status"); // "success"
  const login = searchParams.get("login");
  const error = searchParams.get("error");

  // If install just succeeded, show success step
  const initialStep = status === "success" ? 2 : 0;
  const [step, setStep] = useState(initialStep);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [onboardStatus, setOnboardStatus] = useState<string>("running");
  const [memCount, setMemCount] = useState<number>(0);

  useEffect(() => {
    if (step === 2 && login && onboardStatus === "running") {
      const interval = setInterval(async () => {
        try {
          const res = await api.checkOnboardStatus(login);
          setMemCount(res.count);
          if (res.status === "completed") {
            setOnboardStatus("completed");
          }
        } catch (e) {
          // ignore
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [step, login, onboardStatus]);

  // Particle trail for ambient effect
  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 5,
    }))
  );

  const steps = [
    {
      id: 0,
      label: "Sign In",
      icon: GitBranch,
      color: "indigo",
    },
    {
      id: 1,
      label: "Install App",
      icon: Zap,
      color: "violet",
    },
    {
      id: 2,
      label: "Ready",
      icon: CheckCircle2,
      color: "emerald",
    },
  ];

  const handleInstallApp = () => {
    // Redirect to GitHub App install page
    // GitHub will call our /auth/github/installed callback after install
    const installUrl = `https://github.com/apps/${GITHUB_APP_NAME}/installations/new`;
    window.location.href = installUrl;
  };

  const handleCheckStatus = async () => {
    if (!login) {
      setCheckError("No GitHub login detected. Please start from step 1.");
      return;
    }
    setIsChecking(true);
    setCheckError(null);
    try {
      const res = await fetch(`${API_URL}/auth/install/status?login=${login}`);
      const data = await res.json();
      if (data.installed) {
        // Now redirect to OAuth sign in
        window.location.href = getLoginUrl();
      } else {
        setCheckError("App installation not detected yet. Please complete the GitHub install first.");
      }
    } catch {
      setCheckError("Could not reach API server. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#05070C] text-zinc-100 overflow-hidden font-sans flex flex-col">
      {/* Ambient particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-500/20 pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Background glows */}
      <div className="absolute top-[-15%] left-[-15%] w-[70%] h-[60%] rounded-full bg-gradient-to-br from-indigo-600/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full bg-gradient-to-br from-violet-600/8 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 h-16 border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-white text-sm">Powerful</span>
        </Link>
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Back to home
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl space-y-10">

          {/* Title */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300"
            >
              <GitBranch className="h-3.5 w-3.5" />
              GitHub App Setup
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-3xl font-extrabold tracking-tight text-white"
            >
              Connect Powerful to GitHub
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed"
            >
              Install the Powerful GitHub App on your repositories so the AI agent can automatically review every Pull Request.
            </motion.p>
          </div>

          {/* Step Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center justify-center gap-0"
          >
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isDone = step > s.id;
              const isActive = step === s.id;
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      animate={{
                        scale: isActive ? 1.1 : 1,
                      }}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                        isDone
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          : isActive
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/20"
                          : "border-white/10 bg-white/[0.03] text-zinc-600"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-4.5 w-4.5" />
                      )}
                    </motion.div>
                    <span className={`text-[11px] font-medium ${isActive ? "text-white" : isDone ? "text-emerald-400" : "text-zinc-600"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-24 h-px mx-2 mb-5 transition-all duration-500 ${step > i ? "bg-emerald-500/50" : "bg-white/[0.06]"}`} />
                  )}
                </div>
              );
            })}
          </motion.div>

          {/* Step Content Cards */}
          <AnimatePresence mode="wait">

            {/* STEP 0: Sign in with GitHub */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="border border-white/[0.08] bg-[#0B0F1A]/80 backdrop-blur-xl rounded-2xl p-8 space-y-6"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Step 1: Sign in with GitHub</h2>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                      First, authenticate your GitHub account so we know who you are. This only grants read access to your profile.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Shield, label: "Read-only profile access", color: "text-indigo-400" },
                    { icon: Terminal, label: "No repo write access yet", color: "text-violet-400" },
                    { icon: BookOpen, label: "Secure OAuth 2.0 flow", color: "text-emerald-400" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center space-y-2">
                      <item.icon className={`h-4 w-4 mx-auto ${item.color}`} />
                      <p className="text-[11px] text-zinc-400 leading-snug">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={getLoginUrl()}
                    className="flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-500 hover:to-violet-500 transition-all"
                  >
                    <GitBranch className="h-4.5 w-4.5" />
                    Sign in with GitHub
                    <ChevronRight className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    Already signed in? Skip →
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error === "auth_failed" ? "Authentication failed. Please try again." : error}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 1: Install App */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="border border-white/[0.08] bg-[#0B0F1A]/80 backdrop-blur-xl rounded-2xl p-8 space-y-6"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0 mt-0.5">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Step 2: Install the GitHub App</h2>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                      Install the Powerful GitHub App on your account or organization. Choose which repositories it can access.
                    </p>
                  </div>
                </div>

                {/* What happens after install */}
                <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-5 space-y-3">
                  <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">What happens after install</p>
                  <div className="space-y-2.5">
                    {[
                      { icon: GitPullRequest, text: "GitHub sends webhooks to Powerful on every PR event" },
                      { icon: Brain, text: "The agent scans your last 50 PRs to build your Memory Bank" },
                      { icon: Sparkles, text: "On the next PR, the AI posts context-aware inline comments" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                          <item.icon className="h-3.5 w-3.5 text-violet-400" />
                        </div>
                        <span className="text-xs text-zinc-300">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {login && (
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex items-center gap-2 text-sm">
                    <GitBranch className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-400">Installing for:</span>
                    <span className="font-semibold text-white">@{login}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleInstallApp}
                    className="flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:from-violet-500 hover:to-indigo-500 transition-all"
                  >
                    <GitBranch className="h-4.5 w-4.5" />
                    Install on GitHub
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setStep(0)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    ← Back
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Success */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="border border-emerald-500/20 bg-[#0B0F1A]/80 backdrop-blur-xl rounded-2xl p-8 space-y-6"
              >
                {/* Success badge */}
                <div className="flex flex-col items-center text-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
                  >
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {login ? `@${login} is connected!` : "App Installed!"}
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                      Powerful is now installed. The agent is seeding your Memory Bank with historical PR data in the background.
                    </p>
                  </div>
                </div>

                {/* What's happening now */}
                <div className="rounded-xl bg-[#0A0E18] border border-white/[0.05] p-5 space-y-3">
                  <p className="text-[11px] font-mono text-zinc-500">agent • onboarding pipeline</p>
                  <div className="space-y-2">
                    {[
                      { label: "fetch_historical_prs", status: onboardStatus === "running" ? "running" : "completed", color: onboardStatus === "running" ? "text-amber-400" : "text-emerald-400", bg: onboardStatus === "running" ? "bg-amber-500" : "bg-emerald-500" },
                      { label: "embed_and_store", status: memCount > 0 ? "completed" : (onboardStatus === "running" ? "queued" : "completed"), color: memCount > 0 ? "text-emerald-400" : "text-zinc-500", bg: memCount > 0 ? "bg-emerald-500" : "bg-zinc-600" },
                    ].map((node) => (
                      <div key={node.label} className="flex items-center gap-3">
                        <div className={`h-1.5 w-1.5 rounded-full ${node.bg} ${node.status === "running" ? "animate-pulse" : ""}`} />
                        <span className="font-mono text-xs text-zinc-300">{node.label}</span>
                        <span className={`ml-auto text-[10px] font-medium ${node.color}`}>{node.status === "completed" ? (node.label === "embed_and_store" ? `completed (${memCount} entries)` : "completed") : node.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {checkError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {checkError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={getLoginUrl()}
                    className="flex-1 flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
                  >
                    <GitBranch className="h-4.5 w-4.5" />
                    Sign In & Open Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flow explanation at the bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              {
                icon: GitPullRequest,
                title: "PR Opened",
                desc: "GitHub sends a webhook event to Powerful",
                color: "text-indigo-400",
                bg: "bg-indigo-500/10",
              },
              {
                icon: Brain,
                title: "Memory Search",
                desc: "Agent finds similar past decisions via pgvector",
                color: "text-violet-400",
                bg: "bg-violet-500/10",
              },
              {
                icon: Sparkles,
                title: "Smart Comment",
                desc: "LLM posts inline review with team context",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center space-y-2">
                <div className={`h-8 w-8 rounded-lg ${item.bg} flex items-center justify-center mx-auto`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-[11px] text-zinc-500 leading-snug">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function InstallPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#05070C]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    }>
      <InstallPageContent />
    </Suspense>
  );
}
