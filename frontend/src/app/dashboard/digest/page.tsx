"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DigestCard } from "@/components/dashboard/digest-card";
import { BookOpen, Mail, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import type { WeeklyDigest } from "@/lib/types";

export default function WeeklyDigestPage() {
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getDigests()
      .then((res) => {
        if (active) {
          setDigests(res.digests);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Failed to load digests", err);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshDigests = async () => {
    try {
      const res = await api.getDigests();
      setDigests(res.digests);
    } catch (err) {
      console.error("Failed to refresh digests", err);
    }
  };

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
        <ButtonSyncDigest onCompiled={refreshDigests} />
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#080C14]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Total PRs Summarized</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{totalReviewed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#080C14]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Critical Flags Highlighted</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{totalFlags}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#080C14]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Team Patterns Reinforced</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{totalPatterns}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Digest Cards List */}
      {digests.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-zinc-300 dark:border-white/10 bg-white/50 dark:bg-white/[0.02]">
          <Mail className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">No digests published yet</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            Weekly digests are synthesized automatically at the end of each week from resolved pull request telemetry.
          </p>
          <ButtonSyncDigest onCompiled={refreshDigests} />
        </div>
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

function ButtonSyncDigest({ onCompiled }: { onCompiled?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerDigestCompilation = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await api.compileDigest();
      setSuccess(true);
      if (onCompiled) {
        onCompiled();
      }
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error("Failed to compile digest:", err);
      const msg = err instanceof Error ? err.message : "Compilation failed";
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={triggerDigestCompilation}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
      >
        <Mail className="h-4 w-4" />
        {loading ? "Compiling with AI..." : success ? "Digest Generated!" : "Compile Latest Digest"}
      </button>
      {errorMessage && (
        <span className="text-[11px] text-red-500 font-medium">{errorMessage}</span>
      )}
    </div>
  );
}
