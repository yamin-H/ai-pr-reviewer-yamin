"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Gauge,
  Cpu,
  Zap,
  Clock,
  GitPullRequest,
  FolderGit2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Database,
  Calendar,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UsageData } from "@/lib/types";

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsage() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getUsage();
        setData(res);
      } catch (err: any) {
        console.error("Failed to load usage statistics:", err);
        setError(err.message || "Failed to load usage statistics");
      } finally {
        setLoading(false);
      }
    }
    loadUsage();
  }, []);

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
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-card max-w-lg mx-auto mt-12 p-8 border border-red-500/10 bg-red-500/5">
        <AlertTriangle className="h-10 w-10 text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Failed to Load Usage Data</h3>
        <p className="text-sm text-zinc-400 mb-6">{error || "Usage telemetry missing"}</p>
        <Button onClick={() => window.location.reload()} size="sm">
          Retry Connection
        </Button>
      </div>
    );
  }

  const { overview, dailyUsage, byRepo, recentEvents } = data;
  const quotaPercent = Math.min(100, Math.round((overview.reviewsThisMonth / overview.monthlyQuota) * 100));

  const chartData = dailyUsage.map((d) => ({
    name: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    reviews: d.reviews,
    tokens: Math.round(d.tokens / 1000), // in k-tokens for readable scale
  }));

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Usage & Telemetry</h1>
            <Badge variant="default" className="text-[10px] uppercase font-semibold">
              Free Tier
            </Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Monitor review quotas, Groq llama-3.3-70b token utilization, and audit latencies.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
          <span>Billing cycle resets on the 1st</span>
        </div>
      </div>

      {/* Top 4 Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Monthly Quota */}
        <Card className="border border-white/[0.08] bg-[#0A0E18] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Monthly Reviews</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Gauge className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{overview.reviewsThisMonth}</span>
            <span className="text-xs text-zinc-500 font-medium">/ {overview.monthlyQuota} limit</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                quotaPercent > 80 ? "bg-amber-500" : "bg-indigo-500"
              }`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">{overview.totalReviews} total lifetime reviews</span>
            <Link href="/dashboard/billing" className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium">
              Manage Plan &rarr;
            </Link>
          </div>
        </Card>

        {/* Tokens Estimated */}
        <Card className="border border-white/[0.08] bg-[#0A0E18] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tokens Consumed</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Zap className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {overview.totalTokens > 1000 ? `${(overview.totalTokens / 1000).toFixed(1)}k` : overview.totalTokens}
            </span>
            <span className="text-xs text-zinc-500 font-medium">estimated</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400 font-mono">
            {overview.promptTokens.toLocaleString()} prompt · {overview.completionTokens.toLocaleString()} comp
          </p>
          <p className="mt-1 text-[10px] text-zinc-500">Fast tokenization via llama-3.3</p>
        </Card>

        {/* Inferences */}
        <Card className="border border-white/[0.08] bg-[#0A0E18] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">LLM Inferences</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Cpu className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{overview.totalLLMCalls}</span>
            <span className="text-xs text-zinc-500">model calls</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">Groq LPUs active</p>
          <p className="mt-1 text-[10px] text-zinc-500">llama-3.3-70b-versatile</p>
        </Card>

        {/* Audit Latency */}
        <Card className="border border-white/[0.08] bg-[#0A0E18] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Average Speed</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {(overview.avgLatencyMs / 1000).toFixed(1)}s
            </span>
            <span className="text-xs text-zinc-500">/ review</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-400">High-throughput execution</p>
          <p className="mt-1 text-[10px] text-zinc-500">Diff chunking + parallel RAG</p>
        </Card>
      </div>

      {/* Daily Review Volume Chart */}
      <Card className="border border-white/[0.08] bg-[#0A0E18]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-white">Daily Review Activity (Last 14 Days)</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Number of automated pull request audits performed daily
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl border border-white/10 bg-[#161B26] px-3.5 py-2 shadow-2xl">
                        <p className="text-xs font-semibold text-white">{label}</p>
                        <p className="text-xs text-indigo-400 mt-0.5">
                          {payload[0].value} Pull Request reviews
                        </p>
                      </div>
                    );
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="reviews" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Repository Utilization & Recent Events */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Per-Repo Usage */}
        <Card className="border border-white/[0.08] bg-[#0A0E18]">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-base font-bold text-white">Repository Utilization</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Token consumption and audit volume by repository
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {byRepo.length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center">No repository activity recorded yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {byRepo.map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="space-y-0.5 min-w-0 max-w-[200px] sm:max-w-xs">
                      <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                      <p className="text-xs font-mono text-zinc-500 truncate">{r.fullName}</p>
                    </div>

                    <div className="text-right space-y-0.5 shrink-0">
                      <p className="text-xs font-bold text-white">{r.reviewsCount} reviews</p>
                      <p className="text-[11px] font-mono text-zinc-400">
                        {r.totalTokens > 1000 ? `${(r.totalTokens / 1000).toFixed(1)}k tokens` : `${r.totalTokens} tokens`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Telemetry Log */}
        <Card className="border border-white/[0.08] bg-[#0A0E18]">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-base font-bold text-white">Recent Usage Events</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Audit log of recent LLM execution transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center">Usage events will log here after PR reviews.</p>
            ) : (
              <div className="divide-y divide-white/[0.06] max-h-[360px] overflow-y-auto">
                {recentEvents.map((ev) => (
                  <div key={ev.id} className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">{ev.repo}</span>
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 rounded">
                          {ev.eventType}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {new Date(ev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                        {ev.llmCalls} calls · {formatDuration(ev.durationMs)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-semibold text-emerald-400">
                        +{ev.totalTokens} tokens
                      </span>
                      {ev.reviewId && (
                        <div>
                          <Link
                            href={`/dashboard/reviews/${ev.reviewId}`}
                            className="text-[10px] text-zinc-400 hover:text-white inline-flex items-center gap-0.5"
                          >
                            Review →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
