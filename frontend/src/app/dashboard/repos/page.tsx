"use client";

import { useEffect, useState } from "react";
import { api, getInstallUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderGit2, GitFork, RefreshCw, Search, Sparkles, ExternalLink, Globe, Lock } from "lucide-react";
import type { Repo } from "@/lib/types";

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);

  useEffect(() => {
    async function loadRepos() {
      try {
        setLoading(true);
        const res = await api.getRepos();
        setRepos(res.repos);
      } catch (err) {
        console.error("Failed to load repositories", err);
      } finally {
        setLoading(false);
      }
    }
    loadRepos();
  }, []);

  const handleSyncRepo = (id: string) => {
    setSyncingRepoId(id);
    // Simulate repository scanning and indexing
    setTimeout(() => {
      setSyncingRepoId(null);
      // Increment reviews / memory counts slightly in visual simulation
      setRepos((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                _count: {
                  reviews: r._count.reviews + 1,
                  memoryEntries: r._count.memoryEntries + (Math.random() > 0.5 ? 1 : 0),
                },
              }
            : r
        )
      );
    }, 2000);
  };

  const filteredRepos = repos.filter((repo) =>
    repo.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Connected Repositories</h1>
          <p className="text-sm text-zinc-400">Manage which repositories Powerful reviews and extracts patterns from.</p>
        </div>
        <a href={getInstallUrl()} target="_blank" rel="noopener noreferrer">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Connect Repository
          </Button>
        </a>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-4 border-b border-white/[0.06] pb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search connected repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Grid of Repos */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredRepos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <FolderGit2 className="h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-sm font-semibold text-white mb-1">No repositories found</h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-4">
            Try adjusting your search filters or connect a new repository to get started.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRepos.map((repo) => {
            const isSyncing = syncingRepoId === repo.id;
            return (
              <Card key={repo.id} className="relative overflow-hidden group hover:border-white/[0.12] transition-colors">
                {/* Visual decoration overlay */}
                <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-full pointer-events-none" />
                
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="h-5 w-5 text-indigo-400" />
                      <Badge variant={repo.private ? "danger" : "default"} className="text-[10px] px-2 py-0">
                        {repo.private ? (
                          <span className="flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" />
                            Private
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Globe className="h-2.5 w-2.5" />
                            Public
                          </span>
                        )}
                      </Badge>
                    </div>
                    <a
                      href={`https://github.com/${repo.fullName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="mt-3">
                    <CardTitle className="text-base truncate">{repo.name}</CardTitle>
                    <CardDescription className="text-xs truncate">{repo.fullName}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  {/* Repo metrics */}
                  <div className="grid grid-cols-2 gap-4 border-t border-b border-white/[0.05] py-4">
                    <div>
                      <p className="text-lg font-bold text-white">{repo._count.reviews}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">PR Reviews</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-400">{repo._count.memoryEntries}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Rules Extracted</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">
                      Connected {new Date(repo.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isSyncing}
                      onClick={() => handleSyncRepo(repo.id)}
                      className="gap-2 text-xs"
                    >
                      <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "Syncing..." : "Scan Repo"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
