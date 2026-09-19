"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  GitPullRequest,
  ArrowRight,
  ExternalLink,
  Activity,
  Timer,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import type { QueueStatusResponse, QueueJob } from "@/lib/types";

export default function QueuePage() {
  const [data, setData] = useState<QueueStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "waiting" | "completed" | "failed">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQueueData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsRefreshing(true);
      setError(null);
      const res = await api.getJobs();
      setData(res);
    } catch (err: any) {
      console.error("Failed to load queue status:", err);
      if (!isBackground) setError(err.message || "Failed to load queue status");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // Handle auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      pollIntervalRef.current = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          fetchQueueData(true);
        }
      }, 3500);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [autoRefresh, fetchQueueData]);

  const filteredJobs = (data?.jobs || []).filter((job) => {
    if (filter === "all") return true;
    return job.state === filter;
  });

  const formatDuration = (ms?: number | null) => {
    if (ms === undefined || ms === null) return "—";
    if (ms < 1000) return `${ms}ms`;
    const sec = (ms / 1000).toFixed(1);
    return `${sec}s`;
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-card max-w-lg mx-auto mt-12 p-8 border border-red-500/10 bg-red-500/5">
        <AlertTriangle className="h-10 w-10 text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Queue Monitoring Unavailable</h3>
        <p className="text-sm text-zinc-400 mb-6">{error}</p>
        <Button onClick={() => fetchQueueData()} size="sm">
          Retry Connection
        </Button>
      </div>
    );
  }

  const counts = data?.counts || { active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0 };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">PR Review Queue</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
              <Cpu className="h-3 w-3" />
              BullMQ Engine
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time background worker status, active queue concurrency, and audit latencies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              autoRefresh
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white"
            }`}
          >
            {autoRefresh ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Polling (3s)
              </>
            ) : (
              <>
                <PauseCircle className="h-3.5 w-3.5" />
                Polling Paused
              </>
            )}
          </button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchQueueData()}
            disabled={isRefreshing}
            className="h-8.5 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Jobs */}
        <Card className="border border-white/[0.08] bg-[#0A0E18] relative overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Executions</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Activity className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{counts.active}</span>
              {counts.active > 0 && (
                <span className="text-[11px] font-semibold text-emerald-400 animate-pulse">Running</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Worker concurrency limit: 3</p>
          </div>
        </Card>

        {/* Waiting Jobs */}
        <Card className="border border-white/[0.08] bg-[#0A0E18] relative overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending in Queue</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{counts.waiting}</span>
              <span className="text-[11px] text-zinc-500">jobs queued</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Awaiting available worker thread</p>
          </div>
        </Card>

        {/* Completed Jobs */}
        <Card className="border border-white/[0.08] bg-[#0A0E18] relative overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Completed</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400">{counts.completed}</span>
              <span className="text-[11px] text-zinc-500">in Redis buffer</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Recent completed queue tasks</p>
          </div>
        </Card>

        {/* Failed Jobs */}
        <Card className="border border-white/[0.08] bg-[#0A0E18] relative overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Failed</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold ${counts.failed > 0 ? "text-red-400" : "text-white"}`}>
                {counts.failed}
              </span>
              <span className="text-[11px] text-zinc-500">unresolved</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Auto-retry exponential backoff</p>
          </div>
        </Card>
      </div>

      {/* Main Jobs Section */}
      <Card className="border border-white/[0.08] bg-[#0A0E18]">
        <CardHeader className="border-b border-white/[0.06] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-white">Queue Tasks</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                PR review background jobs filtered by state
              </CardDescription>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
              {(["all", "active", "waiting", "completed", "failed"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-all cursor-pointer ${
                    filter === tab
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10">
                <Layers className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">Queue is Idle</p>
              <p className="mt-1 text-xs text-zinc-400 max-w-sm">
                No jobs currently match the &quot;{filter}&quot; filter. Background review workers are waiting for new Pull Request webhooks.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        job.state === "active"
                          ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 animate-pulse"
                          : job.state === "completed"
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : job.state === "failed"
                          ? "bg-red-500/15 border-red-500/30 text-red-400"
                          : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                      }`}
                    >
                      <GitPullRequest className="h-4.5 w-4.5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/reviews/${job.reviewId}`}
                          className="font-semibold text-sm text-white hover:text-indigo-300 transition-colors truncate max-w-md"
                        >
                          {job.prTitle || `PR #${job.prNumber}`}
                        </Link>
                        <Badge
                          variant={
                            job.state === "completed"
                              ? "success"
                              : job.state === "active"
                              ? "default"
                              : job.state === "failed"
                              ? "danger"
                              : "warning"
                          }
                          className="text-[10px] uppercase font-semibold tracking-wider"
                        >
                          {job.state}
                        </Badge>
                      </div>

                      <p className="text-xs text-zinc-400 font-mono flex items-center gap-2">
                        <span>{job.repo}</span>
                        <span>·</span>
                        <span className="text-zinc-500">Job #{job.id}</span>
                      </p>

                      {job.failedReason && (
                        <p className="text-xs text-red-400 mt-1 font-mono bg-red-950/30 border border-red-500/20 px-2.5 py-1 rounded-lg">
                          Error: {job.failedReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Latency telemetry & Actions */}
                  <div className="flex items-center gap-6 shrink-0 self-end sm:self-center">
                    <div className="text-right space-y-0.5">
                      <div className="flex items-center gap-1 text-xs text-zinc-300 font-medium justify-end">
                        <Timer className="h-3 w-3 text-zinc-500" />
                        <span>Duration: {formatDuration(job.durationMs)}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        Queue Wait: {formatDuration(job.waitMs)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {job.state === "active" ? (
                        <Link href="/dashboard/pipeline">
                          <Button size="sm" variant="secondary" className="h-8 text-xs gap-1.5">
                            <Activity className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                            Live Stream
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/dashboard/reviews/${job.reviewId}`}>
                          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1">
                            Review <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
