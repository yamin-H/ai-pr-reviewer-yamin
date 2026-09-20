"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  GitBranch,
  Brain,
  GitPullRequest,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInstallUrl, api } from "@/lib/api";
import type { Repo } from "@/lib/types";

interface OnboardingGuideProps {
  repos: Repo[];
  reviewsCount: number;
  memoryCount: number;
  hasFeedback?: boolean;
  onRefresh: () => Promise<void>;
}

export function OnboardingGuide({
  repos,
  reviewsCount,
  memoryCount,
  hasFeedback = false,
  onRefresh,
}: OnboardingGuideProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Determine step completion states
  const hasConnectedRepo = repos.length > 0;
  const hasIndexedMemory = memoryCount > 0;
  const hasReviewedPR = reviewsCount > 0;
  const hasTrainedMemory = hasFeedback;

  const completedStepsCount = [
    hasConnectedRepo,
    hasIndexedMemory,
    hasReviewedPR,
    hasTrainedMemory,
  ].filter(Boolean).length;

  const totalSteps = 4;
  const percentComplete = Math.round((completedStepsCount / totalSteps) * 100);
  const isFullyOnboarded = completedStepsCount === totalSteps;

  const handleScanPrimaryRepo = async () => {
    if (repos.length === 0) return;
    const targetRepo = repos[0];
    try {
      setIsScanning(true);
      setScanMessage(null);
      const res = await api.syncRepo(targetRepo.id);
      setScanMessage(`Scanned ${targetRepo.name}! Extracted ${res.stored_count} conventions.`);
      await onRefresh();
    } catch (err: any) {
      setScanMessage(err?.message || "Failed to complete historical scan");
    } finally {
      setIsScanning(false);
    }
  };

  if (isFullyOnboarded && isCollapsed) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-xs text-emerald-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">Setup Complete:</span>
          <span className="text-zinc-300">All onboarding milestones achieved. Powerful is actively auditing your code.</span>
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          View Guide
        </button>
      </div>
    );
  }

  return (
    <Card className="border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/40 dark:from-[#0B0F1A] dark:via-[#0E1324] dark:to-[#0A0D18] shadow-sm dark:shadow-2xl overflow-hidden relative">
      {/* Decorative top accent border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400" />

      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-3 w-3" />
              </span>
              <CardTitle className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                Quickstart Setup Guide
              </CardTitle>
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                {percentComplete}% Complete
              </span>
            </div>
            <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Follow these 4 steps to configure autonomous PR reviews and train your team&apos;s Memory Bank.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-36 h-2 rounded-full bg-zinc-200/80 dark:bg-white/[0.08] overflow-hidden hidden sm:block">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-white rounded-lg dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Step 1: Connect App */}
            <div className={`rounded-xl p-4 border transition-all ${
              hasConnectedRepo
                ? "bg-white/70 dark:bg-white/[0.02] border-emerald-500/30 dark:border-emerald-500/20 shadow-xs dark:shadow-none"
                : "bg-indigo-50/60 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/30 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                    hasConnectedRepo ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                  }`}>
                    <GitBranch className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">1. Connect App</span>
                </div>
                {hasConnectedRepo ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-zinc-400 dark:text-zinc-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 min-h-[36px]">
                {hasConnectedRepo
                  ? `${repos.length} repository${repos.length > 1 ? "ies" : ""} linked to Powerful.`
                  : "Install the GitHub App on your repositories to authorize reviews."}
              </p>
              {hasConnectedRepo ? (
                <Link
                  href="/dashboard/repos"
                  className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                >
                  View Repos <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <a
                  href={getInstallUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-all shadow-sm"
                >
                  Install App <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Step 2: Seed Memory */}
            <div className={`rounded-xl p-4 border transition-all ${
              hasIndexedMemory
                ? "bg-white/70 dark:bg-white/[0.02] border-emerald-500/30 dark:border-emerald-500/20 shadow-xs dark:shadow-none"
                : hasConnectedRepo
                ? "bg-indigo-50/60 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/30 shadow-xs"
                : "bg-zinc-50/50 dark:bg-white/[0.01] border-zinc-200/60 dark:border-white/[0.05] opacity-75"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                    hasIndexedMemory ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                  }`}>
                    <Brain className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">2. Seed Memory</span>
                </div>
                {hasIndexedMemory ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-zinc-400 dark:text-zinc-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 min-h-[36px]">
                {hasIndexedMemory
                  ? `${memoryCount} team convention rules indexed in vector bank.`
                  : "Scan past PR discussions to extract team coding guidelines."}
              </p>
              {hasIndexedMemory ? (
                <Link
                  href="/dashboard/memory"
                  className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                >
                  Explore Rules <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!hasConnectedRepo || isScanning}
                  onClick={handleScanPrimaryRepo}
                  className="h-7 text-xs gap-1.5 px-3"
                >
                  <RefreshCw className={`h-3 w-3 ${isScanning ? "animate-spin" : ""}`} />
                  {isScanning ? "Scanning..." : "Scan Repo"}
                </Button>
              )}
            </div>

            {/* Step 3: Trigger First PR Review */}
            <div className={`rounded-xl p-4 border transition-all ${
              hasReviewedPR
                ? "bg-white/70 dark:bg-white/[0.02] border-emerald-500/30 dark:border-emerald-500/20 shadow-xs dark:shadow-none"
                : hasConnectedRepo
                ? "bg-indigo-50/60 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/30 shadow-xs"
                : "bg-zinc-50/50 dark:bg-white/[0.01] border-zinc-200/60 dark:border-white/[0.05] opacity-75"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                    hasReviewedPR ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                  }`}>
                    <GitPullRequest className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">3. First Review</span>
                </div>
                {hasReviewedPR ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-zinc-400 dark:text-zinc-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 min-h-[36px]">
                {hasReviewedPR
                  ? `${reviewsCount} Pull Request reviews performed.`
                  : "Open a test PR on GitHub to watch the autonomous review run."}
              </p>
              {hasReviewedPR ? (
                <Link
                  href="/dashboard/reviews"
                  className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                >
                  View Reviews <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                hasConnectedRepo && repos[0] && (
                  <a
                    href={`https://github.com/${repos[0].fullName}/pulls`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1"
                  >
                    Open on GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                )
              )}
            </div>

            {/* Step 4: Train via Feedback */}
            <div className={`rounded-xl p-4 border transition-all ${
              hasTrainedMemory
                ? "bg-white/70 dark:bg-white/[0.02] border-emerald-500/30 dark:border-emerald-500/20 shadow-xs dark:shadow-none"
                : hasReviewedPR
                ? "bg-indigo-50/60 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/30 shadow-xs"
                : "bg-zinc-50/50 dark:bg-white/[0.01] border-zinc-200/60 dark:border-white/[0.05] opacity-75"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                    hasTrainedMemory ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white">4. Train Agent</span>
                </div>
                {hasTrainedMemory ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-zinc-400 dark:text-zinc-600 shrink-0" />
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 min-h-[36px]">
                {hasTrainedMemory
                  ? "Feedback loop active! The agent remembers your verdicts."
                  : "Click Approve or Dismiss on review comments to refine AI accuracy."}
              </p>
              <Link
                href="/dashboard/reviews"
                className="text-[11px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white inline-flex items-center gap-1"
              >
                Review Comments <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {scanMessage && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2.5 text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
              <span>{scanMessage}</span>
              <button
                onClick={() => setScanMessage(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xs ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
