"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentReviews } from "@/components/dashboard/recent-reviews";
import { DigestCard } from "@/components/dashboard/digest-card";
import { MemoryCharts, RecentMemoryEntries } from "@/components/dashboard/memory-charts";
import { OnboardingGuide } from "@/components/dashboard/onboarding-guide";
import {
  GitPullRequest,
  FolderGit2,
  Brain,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import type { Repo, PRReview, MemoryStats, WeeklyDigest } from "@/lib/types";

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reviews, setReviews] = useState<PRReview[]>([]);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [digests, setDigests] = useState<WeeklyDigest[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      // Fetch all dependencies in parallel
      const [reposRes, reviewsRes, memoryStatsRes, digestsRes] = await Promise.all([
        api.getRepos(),
        api.getReviews(),
        api.getMemoryStats(),
        api.getDigests(),
      ]);

      setRepos(reposRes.repos);
      setReviews(reviewsRes.reviews);
      setMemoryStats(memoryStatsRes);
      setDigests(digestsRes.digests);
    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-card max-w-lg mx-auto mt-12 p-8 border border-red-500/10 bg-red-500/5">
        <AlertTriangle className="h-10 w-10 text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Error Loading Dashboard</h3>
        <p className="text-sm text-zinc-400 mb-6">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-xl transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const latestDigest = digests[0];
  const totalReviewsCount = reviews.length;
  const hasFeedback = reviews.some(
    (r) => r.feedbackActions && r.feedbackActions.length > 0
  );
  
  return (
    <div className="space-y-8">
      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/40 p-6 md:p-8 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/0 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Autonomous Review Engine Active
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Engineering Workspace
            </h1>
            <p className="text-sm text-zinc-400">
              Real-time code audit pipeline with continuous team convention learning.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="/dashboard/pipeline">
              <button className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.1] transition-all cursor-pointer">
                <Brain className="h-4 w-4 text-indigo-400" />
                Live Pipeline
              </button>
            </a>
            <a href="/dashboard/repos">
              <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110 transition-all cursor-pointer">
                <FolderGit2 className="h-4 w-4" />
                Manage Repos
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* Interactive Quickstart Onboarding Guide */}
      <OnboardingGuide
        repos={repos}
        reviewsCount={totalReviewsCount}
        memoryCount={memoryStats?.totalEntries || 0}
        hasFeedback={hasFeedback}
        onRefresh={fetchData}
      />

      {/* Stats Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total PR Reviews"
          value={totalReviewsCount}
          subtitle="All connected repos"
          trend={totalReviewsCount > 0 ? "Active" : "Ready"}
          icon={GitPullRequest}
          accent="indigo"
        />
        <StatCard
          title="Monitored Repos"
          value={repos.length}
          subtitle="Auto-sync active"
          trend="Live"
          icon={FolderGit2}
          accent="violet"
        />
        <StatCard
          title="AI Memory Rules"
          value={memoryStats?.totalEntries || 0}
          subtitle="Learned team conventions"
          trend="RAG Active"
          icon={Brain}
          accent="emerald"
        />
        <StatCard
          title="Weekly Volume"
          value={latestDigest ? `${latestDigest.prsReviewed} PRs` : "0 PRs"}
          subtitle={latestDigest ? `Week of ${new Date(latestDigest.weekOf).toLocaleDateString(undefined, {month:'short', day:'numeric'})}` : "Pending weekly run"}
          trend="Scheduled"
          icon={BookOpen}
          accent="amber"
        />
      </div>

      {/* Visual Analytics Grid */}
      {memoryStats && <MemoryCharts stats={memoryStats} />}

      {/* Feed Layout: Reviews & Memory/Digest */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Recent Reviews (spanning 2/3 cols) */}
        <div className="lg:col-span-2">
          <RecentReviews
            reviews={reviews}
            primaryRepo={repos[0]?.fullName}
          />
        </div>

        {/* Right Column: Digest Card & Recent Memory Entries (spanning 1/3 cols) */}
        <div className="space-y-8">
          {latestDigest && (
            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Latest Digest</h4>
              <DigestCard digest={latestDigest} />
            </div>
          )}
          
          {memoryStats?.recentEntries && (
            <RecentMemoryEntries entries={memoryStats.recentEntries.slice(0, 3)} />
          )}
        </div>
      </div>
    </div>
  );
}

