"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Brain, FolderGit2, AlertTriangle, ShieldCheck, Zap, BookOpen } from "lucide-react";
import type { MemoryStats, MemoryEntry } from "@/lib/types";

export default function TeamMemoryPage() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await api.getMemoryStats();
        setStats(res);
      } catch (err) {
        console.error("Failed to load memory stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-6 sm:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const entries = stats?.recentEntries || [];
  
  // Get unique categories for filters
  const categories = Array.from(new Set(entries.map((e) => e.decisionType)));

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.content.toLowerCase().includes(search.toLowerCase()) ||
      (entry.filePath || "").toLowerCase().includes(search.toLowerCase()) ||
      entry.repo.fullName.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || entry.decisionType === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculate statistics for breakdown cards
  const categoryCounts = entries.reduce((acc, entry) => {
    acc[entry.decisionType] = (acc[entry.decisionType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Brain className="h-6 w-6 text-indigo-400" />
          Team Memory
        </h1>
        <p className="text-sm text-zinc-400">Rules and conventions learned from pull request reviews and developer decisions.</p>
      </div>

      {/* Category Stats Breakdown Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase tracking-wider">
            <span>Security Rules</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">{categoryCounts["Security"] || 0}</p>
          <p className="text-[10px] text-zinc-500">Learned credential leak prevention</p>
        </div>

        <div className="glass-card p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase tracking-wider">
            <span>Performance</span>
            <Zap className="h-4 w-4 text-violet-400" />
          </div>
          <p className="text-3xl font-bold text-white">{categoryCounts["Performance"] || 0}</p>
          <p className="text-[10px] text-zinc-500">Avoided rendering bottlenecks</p>
        </div>

        <div className="glass-card p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase tracking-wider">
            <span>Code Smells</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-white">{categoryCounts["Code Smell"] || 0}</p>
          <p className="text-[10px] text-zinc-500">Anticipated parsing discrepancies</p>
        </div>

        <div className="glass-card p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase tracking-wider">
            <span>Active Rules</span>
            <Brain className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-indigo-400">{stats?.totalEntries || 0}</p>
          <p className="text-[10px] text-zinc-500">Total verified team conventions</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/[0.06] pb-6">
        {/* Category Tabs */}
        <div className="flex flex-wrap rounded-xl bg-white/[0.03] p-1 border border-white/[0.05] self-start gap-1">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              categoryFilter === "all"
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search rules, files, repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Memory Rules List */}
      {filteredEntries.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center">
          <Brain className="h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-sm font-semibold text-white mb-1">No memory rules found</h3>
          <p className="text-xs text-zinc-500 max-w-xs">
            Conventions are learned and stored once review findings are approved on PRs.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="relative overflow-hidden hover:border-white/[0.12] transition-colors">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/20">
                    {entry.decisionType}
                  </span>
                  <span className="rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    {entry.outcome}
                  </span>
                  <span className="ml-auto text-xs text-zinc-500 font-medium">
                    PR #{entry.prNumber}
                  </span>
                </div>

                <p className="text-sm text-zinc-200 leading-relaxed font-medium">
                  {entry.content}
                </p>

                <div className="flex items-center gap-6 text-[11px] text-zinc-500 border-t border-white/[0.04] pt-4">
                  <div className="flex items-center gap-1.5">
                    <FolderGit2 className="h-3.5 w-3.5" />
                    <span>{entry.repo.fullName}</span>
                  </div>
                  {entry.filePath && (
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="font-mono text-zinc-400">{entry.filePath}</span>
                    </div>
                  )}
                  <span className="ml-auto">
                    Learned {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
