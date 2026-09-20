"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge, SeverityBadge, RiskBadge } from "@/components/ui/badge";
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
  ShieldAlert,
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
        <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Review Not Found</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{error || "The review you are looking for does not exist."}</p>
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
      {/* Navigation & Branch Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/dashboard/reviews"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reviews
        </Link>

        {review.commentUrl && (
          <a
            href={review.commentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-white/[0.05] hover:bg-zinc-200 dark:hover:bg-white/[0.1] border border-zinc-200 dark:border-white/[0.1] px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-white transition-all shadow-sm self-start sm:self-auto"
          >
            <span>View on GitHub</span>
            <ExternalLink className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </a>
        )}
      </div>

      {/* Review Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-gradient-to-br dark:from-[#0B0F1A] dark:via-[#0D1222] dark:to-[#070A14] p-6 md:p-8 backdrop-blur-xl shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-1 text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
              <GitPullRequest className="h-3.5 w-3.5" />
              {review.repo.fullName}
            </span>
            <span className="inline-flex items-center rounded-lg bg-zinc-100 dark:bg-white/[0.05] px-2.5 py-1 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-white/[0.07]">
              PR #{review.prNumber}
            </span>
            <StatusBadge status={review.status} />
            <RiskBadge score={review.riskScore} />
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
            {review.prTitle || `Pull Request #${review.prNumber}`}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Created {formatDate(review.createdAt)}</span>
            {review.completedAt && (
              <>
                <span className="text-zinc-400 dark:text-zinc-600">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Execution completed in {Math.max(1, Math.round((new Date(review.completedAt).getTime() - new Date(review.createdAt).getTime()) / 1000))}s
                </span>
              </>
            )}
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span>RAG Model: Llama-3.3-70b (Groq)</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Risk Assessment */}
        <div className="glass-card p-5 flex items-center gap-4">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
            review.riskScore !== null && review.riskScore !== undefined
              ? review.riskScore < 30
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : review.riskScore <= 70
                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
              : "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400"
          }`}>
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                {review.riskScore !== null && review.riskScore !== undefined ? review.riskScore : "—"}
              </p>
              {review.riskScore !== null && review.riskScore !== undefined && (
                <span className="text-xs text-zinc-500 font-medium">/ 100</span>
              )}
            </div>
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {review.riskScore !== null && review.riskScore !== undefined
                ? review.riskScore < 30
                  ? "Low Risk Level"
                  : review.riskScore <= 70
                  ? "Moderate Risk"
                  : "High Risk Level"
                : "Risk Score Pending"}
            </p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <FileCode2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">{review.filesReviewed || 1}</p>
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Changed Files Audited</p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">{comments.length}</p>
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Review Findings Raised</p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {Object.values(feedbackMap).filter((v) => v === "approve").length}
            </p>
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Learned Team Rules</p>
          </div>
        </div>
      </div>

      {/* Review Findings Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-white/[0.08] pb-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Inline Code Annotations</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Approve or dismiss findings to train the agent on your team conventions.</p>
          </div>
          <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/[0.04] px-2.5 py-1 rounded-lg border border-zinc-200/70 dark:border-white/[0.07]">
            {comments.length} annotations
          </span>
        </div>

        {comments.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 p-12 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-[0_0_16px_rgba(52,211,153,0.3)]">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">Pull Request Verified Clean</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md">
              The AI review agent parsed all changed hunks and found no issues violating security rules, performance thresholds, or learned team conventions.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(commentsByFile).map(([filename, fileComments]) => (
              <div key={filename} className="rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#070A12]/90 overflow-hidden shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                {/* File Header Bar */}
                <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-white/[0.07] bg-zinc-50/80 dark:bg-white/[0.02] px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <FileCode2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200">{filename}</span>
                  </div>
                  <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/[0.05] px-2 py-0.5 rounded border border-zinc-200 dark:border-white/[0.06]">
                    {fileComments.length} {fileComments.length === 1 ? "flag" : "flags"}
                  </span>
                </div>

                {/* File Comments */}
                <div className="p-5 space-y-5 divide-y divide-zinc-200/70 dark:divide-white/[0.05]">
                  {fileComments.map((comment) => {
                    const feedback = feedbackMap[comment.id];

                    return (
                      <div
                        key={comment.id}
                        className={`pt-5 first:pt-0 space-y-4 transition-all duration-200 ${
                          feedback === "dismiss" ? "opacity-60" : ""
                        }`}
                      >
                        {/* Meta & Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20">
                              Line {comment.line}
                            </span>
                            <SeverityBadge severity={comment.severity} />
                            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                              {Math.round(comment.confidence * 100)}% confidence
                            </span>
                          </div>
                          
                          {comment.pastPrNumber && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/30 px-3 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                              <Brain className="h-3 w-3" />
                              Matched Team Precedent from PR #{comment.pastPrNumber}
                            </span>
                          )}
                        </div>

                        {/* Comment Finding Text */}
                        <div className="rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-zinc-50/70 dark:bg-black/30 p-4">
                          <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
                            {comment.comment}
                          </p>
                        </div>

                        {/* Human Feedback Controls */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                            {feedback === "approve"
                              ? "Decision committed to vector memory"
                              : feedback === "dismiss"
                              ? "Suppression recorded for future scans"
                              : "Did the AI get this right?"}
                          </span>

                          <div className="flex items-center gap-2">
                            {feedback ? (
                              feedback === "approve" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 shadow-xs dark:shadow-[0_0_12px_rgba(52,211,153,0.15)]">
                                  <Check className="h-3.5 w-3.5" />
                                  Approved & Remembered
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10">
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
                                  className="h-8 text-xs gap-1.5 px-3 rounded-lg"
                                >
                                  <X className="h-3 w-3" />
                                  Dismiss
                                </Button>
                                <Button
                                  variant="success"
                                  size="sm"
                                  disabled={!!submittingFeedbackId}
                                  onClick={() => handleFeedback(comment.id, "approve")}
                                  className="h-8 text-xs gap-1.5 px-3 rounded-lg font-semibold"
                                >
                                  <Check className="h-3 w-3" />
                                  Approve & Train
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
