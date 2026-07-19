"use client";

import { Calendar, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { WeeklyDigest } from "@/lib/types";

export function DigestCard({ digest }: { digest: WeeklyDigest }) {
  const approvalRate =
    digest.flagsRaised > 0
      ? Math.round((digest.flagsApproved / digest.flagsRaised) * 100)
      : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-white/[0.04] bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            Week of {formatDate(digest.weekOf)}
          </CardTitle>
          <span className="text-xs text-zinc-500">{digest.org.login}</span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStat label="PRs Reviewed" value={digest.prsReviewed} />
          <MiniStat label="Flags Raised" value={digest.flagsRaised} />
          <MiniStat label="Approved" value={digest.flagsApproved} accent="emerald" />
          <MiniStat label="Dismissed" value={digest.flagsDismissed} accent="amber" />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
              style={{ width: `${approvalRate}%` }}
            />
          </div>
          <span className="text-xs font-medium text-zinc-400">
            {approvalRate}% approval
          </span>
        </div>

        <div className="space-y-3">
          {digest.topIssue && (
            <InsightRow
              icon={TrendingUp}
              label="Top Issue"
              value={digest.topIssue}
              accent="text-red-400"
            />
          )}
          {digest.topDismissed && (
            <InsightRow
              icon={TrendingDown}
              label="Most Dismissed"
              value={digest.topDismissed}
              accent="text-amber-400"
            />
          )}
          {digest.patternsLearned > 0 && (
            <InsightRow
              icon={Zap}
              label="Patterns Learned"
              value={`${digest.patternsLearned} new patterns added to team memory`}
              accent="text-violet-400"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber";
}) {
  const valueColor =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "amber"
        ? "text-amber-400"
        : "text-white";

  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function InsightRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-white/[0.02] p-3">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${accent}`} />
      <div>
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="text-sm text-zinc-300">{value}</p>
      </div>
    </div>
  );
}
