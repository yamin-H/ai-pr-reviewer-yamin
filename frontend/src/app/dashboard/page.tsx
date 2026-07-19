"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentReviews } from "@/components/dashboard/recent-reviews";
import { DigestCard } from "@/components/dashboard/digest-card";
import { MemoryCharts, RecentMemoryEntries } from "@/components/dashboard/memory-charts";
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

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
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
    }

    fetchData();
  }, []);

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
          onClick={() => window.location.reload()}
          className="text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-xl transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const latestDigest = digests[0];
  const totalReviewsCount = reviews.length;
  
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-400">Activity monitor and analytical metrics for pull request audits.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total PR Reviews"
          value={totalReviewsCount}
          subtitle="All connected repos"
          icon={GitPullRequest}
          accent="indigo"
        />
        <StatCard
          title="Monitored Repos"
          value={repos.length}
          subtitle="Connected to GitHub"
          icon={FolderGit2}
          accent="violet"
        />
        <StatCard
          title="AI Memory Rules"
          value={memoryStats?.totalEntries || 0}
          subtitle="Learned conventions"
          icon={Brain}
          accent="emerald"
        />
        <StatCard
          title="Weekly Volume"
          value={latestDigest ? `${latestDigest.prsReviewed} PRs` : "0 PRs"}
          subtitle={latestDigest ? `Week of ${new Date(latestDigest.weekOf).toLocaleDateString(undefined, {month:'short', day:'numeric'})}` : "No digests yet"}
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
          <RecentReviews reviews={reviews} />
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
