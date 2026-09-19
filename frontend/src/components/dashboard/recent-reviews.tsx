"use client";

import Link from "next/link";
import { ExternalLink, GitPullRequest } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, RiskBadge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";
import type { PRReview } from "@/lib/types";

export function RecentReviews({
  reviews,
  primaryRepo,
}: {
  reviews: PRReview[];
  primaryRepo?: string;
}) {
  if (reviews.length === 0) {
    return (
      <Card className="border border-white/[0.08] bg-[#0A0E18]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-white">Recent Reviews</CardTitle>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Listening for Webhooks
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
              <GitPullRequest className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-white">No Pull Requests Reviewed Yet</p>
            <p className="mt-1.5 text-xs text-zinc-400 max-w-sm leading-relaxed">
              Open a Pull Request on any connected GitHub repository. Powerful will automatically detect the changes, query your memory bank, and post inline comments.
            </p>
            {primaryRepo && (
              <a
                href={`https://github.com/${primaryRepo}/pulls`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white transition-all shadow-sm"
              >
                <span>Open {primaryRepo} on GitHub</span>
                <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>Recent Reviews</CardTitle>
        <Link
          href="/dashboard/reviews"
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {reviews.slice(0, 6).map((review) => (
          <Link
            key={review.id}
            href={`/dashboard/reviews/${review.id}`}
            className="group flex items-center gap-4 rounded-xl border border-white/[0.04] p-3.5 transition-all hover:border-white/[0.1] hover:bg-white/[0.04] hover:-translate-y-0.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
              <GitPullRequest className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  {review.prTitle || `PR #${review.prNumber}`}
                </p>
                <StatusBadge status={review.status} />
                <RiskBadge score={review.riskScore} />
              </div>
              <p className="truncate text-xs text-zinc-400 mt-0.5">
                <span className="font-mono text-zinc-300">{review.repo.fullName}</span> · {review.commentsCount} comments ·{" "}
                {formatRelativeDate(review.createdAt)}
              </p>
            </div>
            {review.commentUrl && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(review.commentUrl!, "_blank");
                }}
                className="shrink-0 p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                title="View on GitHub"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
