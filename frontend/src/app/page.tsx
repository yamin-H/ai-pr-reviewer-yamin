"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, login } = useAuth();
  const router = useRouter();
  
  // Interactive diff states
  const [demoApproved, setDemoApproved] = useState(false);
  const [demoDismissed, setDemoDismissed] = useState(false);
  const [memoryCount, setMemoryCount] = useState(24);

  // If already logged in, redirect or show dashboard button
  useEffect(() => {
    // We do not auto-redirect so they can see the landing page first,
    // but we can offer a clear "Go to Dashboard" button.
  }, [user]);

  const handleApproveDemo = () => {
    if (demoApproved || demoDismissed) return;
    setDemoApproved(true);
    setMemoryCount((prev) => prev + 1);
  };

  const handleDismissDemo = () => {
    if (demoApproved || demoDismissed) return;
    setDemoDismissed(true);
  };

    return (
        <div className="relative min-h-screen bg-[#05070C] text-zinc-100 overflow-x-hidden font-sans">
            {/* Decorative Gradients */}
            <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full bg-gradient-to-br from-indigo-600/10 to-transparent blur-3xl glow-bg pointer-events-none" />
            <div className="absolute top-[20%] right-[-10%] w-[60%] h-[50%] rounded-full bg-gradient-to-br from-violet-600/10 to-transparent blur-3xl glow-bg pointer-events-none" />

            {/* Header / Nav */}
            <header className="relative z-10 mx-auto max-w-7xl px-6 h-20 flex items-center justify-between border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                        <Sparkles className="h-5.5 w-5.5 text-white" />
                    </div>
                    <div>
                        <span className="text-lg font-bold tracking-tight text-white">Powerful</span>
                        <span className="block text-[10px] text-zinc-500 font-medium uppercase tracking-wider">PR Review Agent</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {user ? (
                        <Link href="/dashboard">
                            <Button size="sm" className="gap-2">
                                Go to Dashboard
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    ) : (
                        <Link href="/install">
                            <Button size="sm" className="gap-2 shadow-indigo-500/20">
                                Sign In
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    )}
                </div>
            </header>

            {/* Main Hero & Content */}
            <main className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-24 md:pt-24">
                <div className="grid gap-12 lg:grid-cols-12 lg:gap-8 items-center">
          
                    {/* Left Column: Headline & Action */}
                    <div className="lg:col-span-6 space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300">
                            <Zap className="h-3.5 w-3.5" />
                            Prerelease v2.0 Available
                        </div>
            
                        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
                            AI Code Reviews that{" "}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400">
                                Learn
                            </span>{" "}
                            from your history.
                        </h1>

                        <p className="max-w-xl mx-auto lg:mx-0 text-lg text-zinc-400 leading-relaxed">
                            Powerful automatically audits every Pull Request on GitHub. Approved feedback is saved directly to your team’s shared Memory Bank, ensuring the agent learns your specific conventions.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            {user ? (
                                <Link href="/dashboard">
                                    <Button size="lg" className="w-full sm:w-auto gap-2">
                                        Enter Dashboard
                                        <ArrowRight className="h-5 w-5" />
                                    </Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href="/install" className="w-full sm:w-auto">
                                        <Button size="lg" className="w-full gap-2 shadow-indigo-500/30">
                                            Connect GitHub App
                                            <GitPullRequest className="h-5 w-5" />
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Trusted indicators */}
                        <div className="pt-6 border-t border-white/[0.05] flex items-center justify-center lg:justify-start gap-8">
                            <div>
                                <p className="text-2xl font-bold text-white">98%</p>
                                <p className="text-xs text-zinc-500">Developer Approval</p>
                            </div>
                            <div className="h-8 w-px bg-white/[0.08]" />
                            <div>
                                <p className="text-2xl font-bold text-white">&lt; 15s</p>
                                <p className="text-xs text-zinc-500">Scan Duration</p>
                            </div>
                            <div className="h-8 w-px bg-white/[0.08]" />
                            <div>
                                <p className="text-2xl font-bold text-white">100k+</p>
                                <p className="text-xs text-zinc-500">PRs Audited</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Interactive Code Review Mockup */}
                    <div className="lg:col-span-6 relative">
                        <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl blur-2xl pointer-events-none" />
            
                        <div className="relative border border-white/[0.08] bg-[#0B0F1A]/80 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-2xl">
                            {/* Mockup Header */}
                            <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#0E1321] px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <span className="h-3 w-3 rounded-full bg-red-500/60" />
                                        <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                                        <span className="h-3 w-3 rounded-full bg-green-500/60" />
                                    </div>
                                    <span className="ml-2 text-xs font-mono text-zinc-400">src/auth/session.ts</span>
                                </div>
                                {/* Memory count badge */}
                                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 border border-emerald-500/20">
                                    <Brain className="h-3.5 w-3.5" />
                                    <span>Memory Bank: <strong className="font-semibold">{memoryCount}</strong> rules</span>
                                </div>
                            </div>

                            {/* Code lines */}
                            <div className="p-6 font-mono text-xs overflow-x-auto space-y-1">
                                <div className="flex gap-4 opacity-50"><span className="w-4 text-right">98</span><span>export function verifySession(token: string) &#123;</span></div>
                                <div className="flex gap-4 opacity-50"><span className="w-4 text-right">99</span><span>  if (!token) return null;</span></div>
                                <div className="flex gap-4 bg-red-950/30 text-red-300 border-l-2 border-red-500/50"><span className="w-4 text-right bg-red-950/50 text-red-500 pl-1">100</span><span>-  console.log(`Verifying user session: $&#123;token&#125;`);</span></div>
                                <div className="flex gap-4 bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-500/50"><span className="w-4 text-right bg-emerald-950/50 text-emerald-500 pl-1">100</span><span>+  // Removed sensitive console dump of authorization token</span></div>
                
                                {/* Interactive Comment Bubble */}
                                <AnimatePresence>
                                    {!demoDismissed && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.3 }}
                                            className="my-4 border border-indigo-500/35 bg-[#141A2E] rounded-xl p-4 shadow-lg shadow-indigo-500/5"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-violet-600">
                                                        <Sparkles className="h-3 w-3 text-white" />
                                                    </span>
                                                    <span className="text-xs font-semibold text-white">Powerful AI</span>
                                                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.2 rounded font-sans uppercase">Critical</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-500 font-sans">99% confidence</span>
                                            </div>
                      
                                            <p className="text-xs text-zinc-300 leading-relaxed font-sans mb-4">
                                                Sensitive Data Leak: Logging raw authorization tokens to the console exposes credentials to server stdout dumps and log ingestion pipelines.
                                            </p>

                                            <div className="flex items-center justify-between font-sans">
                                                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                    <Code2 className="h-3 w-3" />
                                                    Matches security rule patterns
                                                </span>
                        
                                                <div className="flex gap-2">
                                                    {demoApproved ? (
                                                        <motion.span
                                                            initial={{ scale: 0.8 }}
                                                            animate={{ scale: 1 }}
                                                            className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                            Saved to Memory
                                                        </motion.span>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={handleDismissDemo}
                                                                className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                Dismiss
                                                            </button>
                                                            <button
                                                                onClick={handleApproveDemo}
                                                                className="text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-lg transition-all shadow-md shadow-indigo-600/20 cursor-pointer hover:scale-102"
                                                            >
                                                                Approve & Remember
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex gap-4 opacity-50"><span className="w-4 text-right">101</span><span>  const user = decryptPayload(token);</span></div>
                                <div className="flex gap-4 opacity-50"><span className="w-4 text-right">102</span><span>  return user;</span></div>
                                <div className="flex gap-4 opacity-50"><span className="w-4 text-right">103</span><span>&#125;</span></div>
                            </div>
                        </div>
            
                        {/* Context tag overlay */}
                        <div className="absolute -bottom-6 -left-6 border border-white/[0.08] bg-[#0E1321]/90 backdrop-blur-xl p-3.5 rounded-xl shadow-xl flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                                <Brain className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-white">Rule Extracted</p>
                                <p className="text-[10px] text-zinc-400">"Never print raw tokens in logs..."</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features grid section */}
                <section className="mt-32 pt-20 border-t border-white/[0.05]">
                    <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                        <h2 className="text-3xl font-bold tracking-tight text-white">Built for High-Velocity Teams</h2>
                        <p className="text-zinc-400 text-sm">
                            Standard linting checks rules; Powerful builds custom knowledge patterns tailored directly to your project context.
                        </p>
                    </div>

                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            
                        {/* Feature 1 */}
                        <div className="glass-card p-6 space-y-4 hover:border-white/[0.12] transition-colors group">
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                                <Brain className="h-5 w-5" />
                            </div>
                            <h3 className="text-base font-semibold text-white">Historical Memory</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Learns past review corrections, code comments, and approved merges to predict code requirements accurately.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="glass-card p-6 space-y-4 hover:border-white/[0.12] transition-colors group">
                            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/20 transition-all">
                                <GitPullRequest className="h-5 w-5" />
                            </div>
                            <h3 className="text-base font-semibold text-white">Automated PR Auditing</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Starts reviewing code blocks milliseconds after a Pull Request is opened. Delivers annotated line-specific reviews instantly.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="glass-card p-6 space-y-4 hover:border-white/[0.12] transition-colors group">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <h3 className="text-base font-semibold text-white">Feedback Actions</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Approve or dismiss suggestions in the dashboard or on GitHub. Every feedback loops updates the model's memory network.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="glass-card p-6 space-y-4 hover:border-white/[0.12] transition-colors group">
                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-all">
                                <Code2 className="h-5 w-5" />
                            </div>
                            <h3 className="text-base font-semibold text-white">Weekly Digests</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Aggregates review activity, charts approval rates, lists common violations, and reports new learned conventions.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="relative border-t border-white/[0.05] py-8 text-center text-xs text-zinc-600 bg-[#04060A]">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        <span className="font-semibold text-zinc-400">Powerful PR Review Agent</span>
                    </div>
                    <p>© 2026 Powerful. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
