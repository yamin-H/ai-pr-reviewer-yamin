"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, RiskBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeDate } from "@/lib/utils";
import {
  GitPullRequest,
  Search,
  MessageSquare,
  FileCode2,
  ExternalLink,
  Calendar,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  FolderGit2,
  SlidersHorizontal,
} from "lucide-react";
import type { PRReview, Repo } from "@/lib/types";

type StatusFilter = "all" | "completed" | "pending" | "failed";
type DateFilter = "all" | "7d" | "30d" | "90d";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<PRReview[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedRepoId, setSelectedRepoId] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  // Load connected repos for dropdown
  useEffect(() => {
    async function loadRepos() {
      try {
        const res = await api.getRepos();
        setRepos(res.repos);
      } catch (err) {
        console.error("Failed to load repos for filter:", err);
      }
    }
    loadRepos();
  }, []);

  const computeDateRange = (range: DateFilter): { from?: string; to?: string } => {
    if (range === "all") return {};
    const now = new Date();
    let days = 7;
    if (range === "30d") days = 30;
    if (range === "90d") days = 90;
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    return { from, to: now.toISOString() };
  };

  const fetchReviews = useCallback(
    async (cursor?: string, isAppend = false) => {
      try {
        if (isAppend) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const { from, to } = computeDateRange(dateFilter);
        const res = await api.getReviews({
          cursor,
          limit: 15,
          repoId: selectedRepoId,
          status: statusFilter,
          from,
          to,
          search: search.trim() || undefined,
        });

        if (isAppend) {
          setReviews((prev) => [...prev, ...res.reviews]);
        } else {
          setReviews(res.reviews);
        }
        setNextCursor(res.nextCursor);
        setTotalCount(res.totalCount);
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [dateFilter, selectedRepoId, statusFilter, search]
  );

  // Refetch when primary filters change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchReviews();
    }, 250); // debounce text search

    return () => clearTimeout(handler);
  }, [fetchReviews]);

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchReviews(nextCursor, true);
    }
  };

  const handleExportCsv = () => {
    const { from, to } = computeDateRange(dateFilter);
    const url = api.getReviewsExportUrl({
      repoId: selectedRepoId,
      status: statusFilter,
      from,
      to,
      search: search.trim() || undefined,
    });
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PR Reviews</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Browse automated pull request reviews, audit diffs, and inspect AI comments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCsv}
            className="gap-2 text-xs font-semibold h-8.5"
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="border border-white/[0.08] bg-[#0A0E18] rounded-2xl p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-12 items-center">
          {/* Search */}
          <div className="relative md:col-span-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by PR title, #number, or repo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9.5 pl-10 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Repo Selector */}
          <div className="md:col-span-4 relative">
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="w-full h-9.5 px-3.5 rounded-xl border border-white/[0.08] bg-[#0E1322] text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
            >
              <option value="all">All Repositories ({repos.length})</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="md:col-span-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="w-full h-9.5 px-3.5 rounded-xl border border-white/[0.08] bg-[#0E1322] text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
            >
              <option value="all">Date: All Time</option>
              <option value="7d">Date: Last 7 Days</option>
              <option value="30d">Date: Last 30 Days</option>
              <option value="90d">Date: Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs & Summary Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
          <div className="flex flex-wrap rounded-xl bg-white/[0.03] p-1 border border-white/[0.06] gap-1">
            {(["all", "completed", "pending", "failed"] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize tracking-wide transition-all cursor-pointer ${
                  statusFilter === status
                    ? "bg-gradient-to-r from-indigo-500/25 to-violet-500/20 text-white border border-indigo-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <span className="text-xs text-zinc-500 font-mono">
            Showing {reviews.length} of {totalCount} reviews
          </span>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-white/[0.08] bg-[#0A0E18]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3 shadow-lg shadow-indigo-500/10">
            <GitPullRequest className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">No reviews match your filters</h3>
          <p className="text-xs text-zinc-500 max-w-sm">
            Try adjusting your search query, repository dropdown, or date range filter.
          </p>
          {(search || selectedRepoId !== "all" || statusFilter !== "all" || dateFilter !== "all") && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedRepoId("all");
                setStatusFilter("all");
                setDateFilter("all");
              }}
              className="mt-4 text-xs"
            >
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3.5">
          {reviews.map((review) => {
            const statusBorder =
              review.status === "completed"
                ? "hover:border-emerald-500/40"
                : review.status === "failed"
                ? "hover:border-red-500/40"
                : "hover:border-amber-500/40";

            return (
              <Link
                key={review.id}
                href={`/dashboard/reviews/${review.id}`}
                className="block group"
              >
                <Card
                  className={`border-white/[0.08] bg-[#0A0E18] hover:bg-white/[0.03] transition-all duration-300 ${statusBorder} hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* PR Info */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
                        <GitPullRequest className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors truncate">
                            {review.prTitle || `PR #${review.prNumber}`}
                          </h3>
                          <StatusBadge status={review.status} />
                          <RiskBadge score={review.riskScore} />
                        </div>
                        <p className="text-xs text-zinc-400 truncate">
                          <span className="font-mono text-zinc-300">{review.repo.fullName}</span> · PR #{review.prNumber}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Stats & Dates */}
                    <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-500 md:self-center">
                      <div className="flex items-center gap-1.5">
                        <FileCode2 className="h-4 w-4 text-zinc-600" />
                        <span>{review.filesReviewed} files</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-zinc-600" />
                        <span>{review.commentsCount} comments</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-zinc-600" />
                        <span>{formatRelativeDate(review.createdAt)}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3">
                        {review.commentUrl && (
                          <span
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(review.commentUrl!, "_blank");
                            }}
                            className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                            title="View on GitHub"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </span>
                        )}
                        <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {/* Load More Pagination */}
          {nextCursor && (
            <div className="flex justify-center pt-4">
              <Button
                variant="secondary"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="gap-2 text-xs font-semibold px-6 h-9 rounded-xl shadow-sm"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Loading More Reviews...
                  </>
                ) : (
                  <>Load More Reviews ({totalCount - reviews.length} remaining)</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
