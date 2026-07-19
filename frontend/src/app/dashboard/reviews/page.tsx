"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeDate } from "@/lib/utils";
import { GitPullRequest, Search, MessageSquare, FileCode2, ExternalLink, Calendar, ChevronRight } from "lucide-react";
import type { PRReview } from "@/lib/types";

type StatusFilter = "all" | "completed" | "pending" | "failed";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<PRReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    async function loadReviews() {
      try {
        setLoading(true);
        const res = await api.getReviews();
        setReviews(res.reviews);
      } catch (err) {
        console.error("Failed to load reviews", err);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, []);

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      (review.prTitle || "").toLowerCase().includes(search.toLowerCase()) ||
      String(review.prNumber).includes(search) ||
      review.repo.fullName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || review.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">PR Reviews</h1>
        <p className="text-sm text-zinc-400">Track and view code reviews performed by the AI agent.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/[0.06] pb-6">
        {/* Status Filter Tabs */}
        <div className="flex rounded-xl bg-white/[0.03] p-1 border border-white/[0.05] self-start">
          {(["all", "completed", "pending", "failed"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                statusFilter === status
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by title, PR#, or repo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center">
          <GitPullRequest className="h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-sm font-semibold text-white mb-1">No reviews found</h3>
          <p className="text-xs text-zinc-500 max-w-xs">
            Reviews will appear once pull requests are opened on connected repositories.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Link
              key={review.id}
              href={`/dashboard/reviews/${review.id}`}
              className="block group"
            >
              <Card className="hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* PR Info */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                      <GitPullRequest className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors truncate">
                          {review.prTitle || `PR #${review.prNumber}`}
                        </h3>
                        <StatusBadge status={review.status} />
                      </div>
                      <p className="text-xs text-zinc-500 truncate">
                        {review.repo.fullName} · PR #{review.prNumber}
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
                        <a
                          href={review.commentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-all"
                          title="View on GitHub"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
