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
            className="group flex items-center gap-4 rounded-xl border border-transparent p-3 transition-all hover:border-white/[0.06] hover:bg-white/[0.03]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <GitPullRequest className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-white group-hover:text-indigo-200 transition-colors">
                  {review.prTitle || `PR #${review.prNumber}`}
                </p>
                <StatusBadge status={review.status} />
              </div>
              <p className="truncate text-xs text-zinc-500">
                {review.repo.fullName} · {review.commentsCount} comments ·{" "}
                {formatRelativeDate(review.createdAt)}
              </p>
            </div>
            {review.commentUrl && (
              <a
                href={review.commentUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-zinc-600 hover:text-indigo-400 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
