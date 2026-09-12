"use client";

import Link from "next/link";
import { ExternalLink, GitPullRequest } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";
import type { PRReview } from "@/lib/types";

export function RecentReviews({ reviews }: { reviews: PRReview[] }) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <GitPullRequest className="mb-3 h-10 w-10 text-zinc-600" />
            <p className="text-sm text-zinc-400">No reviews yet</p>
            <p className="mt-1 text-xs text-zinc-600">
              Reviews appear when PRs are opened on connected repos
            </p>
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
