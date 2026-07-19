"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge, SeverityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  GitPullRequest,
  Check,
  X,
  MessageSquare,
  FileCode2,
  Brain,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import type { PRReview, ReviewComment, FeedbackAction } from "@/lib/types";

export default function ReviewDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const id = params.id;
  const router = useRouter();

  const [review, setReview] = useState<PRReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Local state to track which comments have had feedback submitted
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "approve" | "dismiss">>({});
  const [submittingFeedbackId, setSubmittingFeedbackId] = useState<string | null>(null);

  useEffect(() => {
    async function loadReviewDetail() {
      try {
        setLoading(true);
        const res = await api.getReview(id);
        setReview(res.review);
        
        // Initialize feedbackMap from existing feedbackActions in DB
        const fMap: Record<string, "approve" | "dismiss"> = {};
        res.review.feedbackActions?.forEach((act) => {
          if (act.commentId) {
            fMap[act.commentId] = act.action as "approve" | "dismiss";
          }
        });
        setFeedbackMap(fMap);
      } catch (err: any) {
        console.error("Failed to load review details:", err);
        setError(err.message || "Failed to load review details");
      } finally {
        setLoading(false);
      }
    }
    loadReviewDetail();
  }, [id]);

  const handleFeedback = async (commentId: string, action: "approve" | "dismiss") => {
    if (!review) return;
    setSubmittingFeedbackId(commentId);
    
    try {
      await api.submitCommentFeedback(review.id, commentId, action);
      
      // Update local state to reflect change immediately
      setFeedbackMap((prev) => ({
        ...prev,
        [commentId]: action,
      }));
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setSubmittingFeedbackId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-card max-w-lg mx-auto mt-12 p-8">
        <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Review Not Found</h3>
        <p className="text-sm text-zinc-400 mb-6">{error || "The review you are looking for does not exist."}</p>
        <Link href="/dashboard/reviews">
          <Button size="sm">Back to Reviews</Button>
        </Link>
      </div>
    );
  }

  const comments = review.comments || [];
  
  // Group comments by filename
  const commentsByFile = comments.reduce((acc, comment) => {
    acc[comment.filename] = acc[comment.filename] || [];
    acc[comment.filename].push(comment);
    return acc;
  }, {} as Record<string, ReviewComment[]>);

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        href="/dashboard/reviews"
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reviews
      </Link>

      {/* Review Header Banner */}
      <Card className="overflow-hidden border border-white/[0.08] bg-[#0E1321]/60">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-violet-600" />
        <CardContent className="p-6 pl-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{review.repo.fullName}</span>
              <StatusBadge status={review.status} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-snug">
              {review.prTitle || `PR #${review.prNumber}`}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
              <span>PR #{review.prNumber}</span>
              <span>•</span>
              <span>Scanned {formatDate(review.createdAt)}</span>
              {review.completedAt && (
                <>
                  <span>•</span>
                  <span>Completed in {Math.round((new Date(review.completedAt).getTime() - new Date(review.createdAt).getTime()) / 1000)}s</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {review.commentUrl && (
              <a
                href={review.commentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" size="sm" className="gap-2">
                  View Pull Request
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick stats details */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <FileCode2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{review.filesReviewed}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Files Audited</p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{comments.length}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">AI Flags Raised</p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-400">
              {Object.values(feedbackMap).filter((v) => v === "approve").length}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Approved Patterns</p>
          </div>
        </div>
      </div>

      {/* Comments section */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white tracking-tight">AI Review Findings</h2>

        {comments.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-16 text-center border-emerald-500/10 bg-emerald-500/5">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
              <Check className="h-6 w-6 animate-pulse" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Codebase Verified Clean</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              Powerful reviewed all modified lines and found no issues violating security, style, or performance patterns.
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(commentsByFile).map(([filename, fileComments]) => (
              <div key={filename} className="space-y-4">
                {/* File Header */}
                <div className="flex items-center gap-2 border-b border-white/[0.05] pb-2">
                  <FileCode2 className="h-4.5 w-4.5 text-indigo-400" />
                  <span className="text-xs font-mono font-medium text-white">{filename}</span>
                  <span className="text-[10px] text-zinc-500">({fileComments.length} items)</span>
                </div>

                {/* File Comments Grid */}
                <div className="space-y-4">
                  {fileComments.map((comment) => {
                    const feedback = feedbackMap[comment.id];
                    const isSubmitting = submittingFeedbackId === comment.id;

                    return (
                      <div
                        key={comment.id}
                        className={`glass-card p-5 border transition-all duration-300 ${
                          feedback === "approve"
                            ? "border-emerald-500/20 bg-emerald-950/5"
                            : feedback === "dismiss"
                            ? "border-zinc-500/10 opacity-60"
                            : "border-white/[0.08]"
                        }`}
                      >
                        {/* Title bar */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-mono text-zinc-500 bg-white/5 px-2 py-0.5 rounded border border-white/[0.04]">
                              Line {comment.line}
                            </span>
                            <SeverityBadge severity={comment.severity} />
                            <span className="text-[10px] text-zinc-500">
                              {Math.round(comment.confidence * 100)}% confidence
                            </span>
                          </div>
                          
                          {comment.pastPrNumber && (
                            <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                              <Brain className="h-3 w-3" />
                              Learned from PR #{comment.pastPrNumber}
                            </span>
                          )}
                        </div>

                        {/* Comment Content */}
                        <p className="text-sm text-zinc-300 leading-relaxed mb-5">
                          {comment.comment}
                        </p>

                        {/* Actions / Feedback results */}
                        <div className="flex items-center justify-between border-t border-white/[0.05] pt-4">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                            Evaluate Feedback
                          </span>

                          <div className="flex items-center gap-2">
                            {feedback ? (
                              feedback === "approve" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                                  <Check className="h-3.5 w-3.5" />
                                  Approved & Remembered
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-500/10 px-3 py-1 text-xs font-semibold text-zinc-400 border border-white/5">
                                  <X className="h-3.5 w-3.5" />
                                  Dismissed
                                </span>
                              )
                            ) : (
                              <>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={!!submittingFeedbackId}
                                  onClick={() => handleFeedback(comment.id, "dismiss")}
                                  className="h-8 text-xs gap-1.5 px-3"
                                >
                                  <X className="h-3 w-3" />
                                  Dismiss
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!!submittingFeedbackId}
                                  onClick={() => handleFeedback(comment.id, "approve")}
                                  className="h-8 text-xs gap-1.5 px-3 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 shadow-none"
                                >
                                  <Check className="h-3 w-3" />
                                  Approve & Save
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
