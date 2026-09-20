"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DigestCard } from "@/components/dashboard/digest-card";
import { BookOpen, Calendar, Mail, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import type { WeeklyDigest } from "@/lib/types";

export default function WeeklyDigestPage() {
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDigests() {
      try {
        setLoading(true);
        const res = await api.getDigests();
        setDigests(res.digests);
      } catch (err) {
        console.error("Failed to load digests", err);
      } finally {
        setLoading(false);
      }
    }
    loadDigests();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Calculate aggregates
  const totalReviewed = digests.reduce((acc, d) => acc + d.prsReviewed, 0);
  const totalFlags = digests.reduce((acc, d) => acc + d.flagsRaised, 0);
  const totalPatterns = digests.reduce((acc, d) => acc + d.patternsLearned, 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Weekly Digests
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Summarized logs of pull requests reviewed, flags raised, and team patterns learned.</p>
        </div>
        <ButtonSyncDigest />
      </div>

      {/* Aggregate metrics */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="glass-card p-5 flex items-center gap-4 hover:border-zinc-300 dark:hover:border-white/[0.14] hover:-translate-y-0.5 transition-all">
          <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">{totalReviewed}</p>
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total PRs Analyzed</p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4 hover:border-zinc-300 dark:hover:border-white/[0.14] hover:-translate-y-0.5 transition-all">
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">{totalFlags}</p>
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">AI Flags Raised</p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4 hover:border-zinc-300 dark:hover:border-white/[0.14] hover:-translate-y-0.5 transition-all">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{totalPatterns}</p>
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Guidelines Extracted</p>
          </div>
        </div>
      </div>

      {/* Grid of digests */}
      {digests.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center">
          <BookOpen className="h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-4" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">No digests yet</h3>
          <p className="text-xs text-zinc-500 max-w-xs">
            Digests are compiled automatically at the end of every calendar week.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {digests.map((digest) => (
            <DigestCard key={digest.id} digest={digest} />
          ))}
        </div>
      )}
    </div>
  );
}

function ButtonSyncDigest() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const triggerDigestCompilation = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }, 1500);
  };

  return (
    <button
      onClick={triggerDigestCompilation}
      disabled={loading || success}
      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-900 dark:text-white cursor-pointer disabled:opacity-50 transition-all shadow-xs"
    >
      <Mail className="h-4 w-4" />
      {loading ? "Compiling..." : success ? "Digest Dispatched!" : "Compile Latest Digest"}
    </button>
  );
}
