"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Sparkles,
  Shield,
  Clock,
  ArrowRight,
  AlertTriangle,
  Layers,
  Building2,
  RefreshCw,
  Sliders,
  Check,
  Cpu,
  Info,
} from "lucide-react";
import type { BillingData, BillingTier } from "@/lib/types";

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switchingPlan, setSwitchingPlan] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);

  useEffect(() => {
    async function loadBilling() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getBilling();
        setData(res);
      } catch (err: any) {
        console.error("Failed to load billing subscription:", err);
        setError(err.message || "Failed to load billing information");
      } finally {
        setLoading(false);
      }
    }
    loadBilling();
  }, []);

  const handleSelectPlan = async (tierId: string) => {
    try {
      setSwitchingPlan(tierId);
      const res = await api.selectPlan(tierId);
      if (res.success) {
        // Refresh billing data
        const updated = await api.getBilling();
        setData(updated);
        setNotification({
          message: res.message || `Plan successfully updated to ${tierId.toUpperCase()}`,
          type: "success",
        });
        setTimeout(() => setNotification(null), 4500);
      }
    } catch (err: any) {
      alert("Failed to update subscription tier: " + (err.message || "Unknown error"));
    } finally {
      setSwitchingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-white/5" />
          <Skeleton className="h-4 w-96 bg-white/5" />
        </div>
        <Skeleton className="h-44 w-full bg-white/5 rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96 bg-white/5 rounded-2xl" />
          <Skeleton className="h-96 bg-white/5 rounded-2xl" />
          <Skeleton className="h-96 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-card max-w-lg mx-auto mt-12 p-8 border border-red-500/10 bg-red-500/5">
        <AlertTriangle className="h-10 w-10 text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Error Loading Billing Data</h3>
        <p className="text-sm text-zinc-400 mb-6">{error || "Could not retrieve organization subscription."}</p>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Retry Connection
        </Button>
      </div>
    );
  }

  const { subscription, tiers, organization } = data;
  const isHighUsage = subscription.quotaUsedPercent > 80;

  return (
    <div className="space-y-10 max-w-6xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Subscription</h1>
        </div>
        <p className="text-sm text-zinc-400">
          Manage organization tier, monthly review limits, and compute concurrency for @{organization.login}.
        </p>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300 flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            {notification.message}
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs text-emerald-400/80 hover:text-emerald-200 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Showcase Mode Disclaimer Card */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/30 via-purple-950/20 to-slate-900/40 p-5 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Interactive Showcase Mode</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live Demo
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Live credit card payments are mocked for portfolio review. You can switch between Free, Pro, and Enterprise tiers below to test rate-limiting quotas, BullMQ priority queue behavior, and platform permissions immediately.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/usage"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
          >
            View Usage Telemetry
            <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
          </Link>
        </div>
      </div>

      {/* Current Plan Overview Card */}
      <Card className="border border-white/[0.08] bg-[#0A0E18]">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-zinc-400" />
                <CardTitle className="text-base font-bold text-white">
                  Active Subscription: {subscription.planName}
                </CardTitle>
                <Badge variant={subscription.plan === "free" ? "default" : "success"} className="text-[10px]">
                  {subscription.status.toUpperCase()}
                </Badge>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Billing cycle resets automatically on the 1st of every month at 00:00 UTC.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right sm:block hidden">
                <p className="text-xs text-zinc-400">Current Plan Rate</p>
                <p className="text-lg font-bold text-white">
                  ${subscription.price}
                  <span className="text-xs text-zinc-500 font-normal"> / {subscription.billingPeriod}</span>
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 space-y-6">
          {/* Quota Progress Meter */}
          <div className="space-y-2.5 rounded-xl border border-white/[0.06] bg-white/[0.01] p-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300">Monthly Review Quota Usage</span>
              <span className="font-mono font-semibold text-white">
                {subscription.monthlyReviewCount} / {subscription.monthlyQuota} PRs ({subscription.quotaUsedPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isHighUsage ? "bg-amber-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"
                }`}
                style={{ width: `${subscription.quotaUsedPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
              <span>Cycle began: {new Date(subscription.lastQuotaResetAt).toLocaleDateString()}</span>
              <span>Next cycle reset: {new Date(subscription.nextQuotaResetAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Org Telemetry Summary */}
          <div className="grid gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-white/[0.06] p-3.5 bg-white/[0.01]">
              <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Worker Concurrency</span>
              <p className="text-sm font-semibold text-white mt-1 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                {subscription.plan === "enterprise" ? "10 parallel threads" : subscription.plan === "pro" ? "3 parallel threads" : "1 thread"}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] p-3.5 bg-white/[0.01]">
              <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Priority Lane</span>
              <p className="text-sm font-semibold text-white mt-1 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                {subscription.plan === "free" ? "Standard BullMQ Queue" : "Dedicated High-Priority Lane"}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] p-3.5 bg-white/[0.01]">
              <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium">Vector Memory</span>
              <p className="text-sm font-semibold text-white mt-1 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                {subscription.plan === "free" ? "Base AST Heuristics" : "Multi-PR Cross-Repository Memory"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Selection Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Available Subscription Tiers</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select any tier to instantly switch and test system behavior across quota thresholds.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => {
            const isCurrent = tier.isCurrent;
            const isPending = switchingPlan === tier.id;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 ${
                  isCurrent
                    ? "border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 via-[#0A0E18] to-[#0A0E18] shadow-[0_0_24px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30"
                    : "border-white/[0.08] bg-[#0A0E18] hover:border-white/[0.15] hover:bg-[#0c111e]"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="space-y-5">
                  {/* Tier Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-white">{tier.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 min-h-[32px] leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="border-t border-b border-white/[0.06] py-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white">${tier.price}</span>
                      <span className="text-xs text-zinc-400">/ {tier.billingPeriod}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-mono font-medium text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                        {tier.quota.toLocaleString()} PRs/month
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                        {tier.concurrency} concurrent
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 pt-1">
                    <p className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">Included Capabilities</p>
                    <ul className="space-y-2 text-xs text-zinc-400">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Switch Action */}
                <div className="pt-8 mt-4 border-t border-white/[0.06]">
                  {isCurrent ? (
                    <Button disabled variant="outline" className="w-full text-xs font-semibold cursor-default">
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                      Active Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSelectPlan(tier.id)}
                      disabled={isPending || switchingPlan !== null}
                      variant={tier.id === "pro" ? "default" : "outline"}
                      className="w-full text-xs font-semibold gap-1.5"
                    >
                      {isPending ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Activating {tier.name}...
                        </>
                      ) : (
                        <>
                          Switch to {tier.name}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise SLA Notice */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-5 text-xs text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Shield className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>Need custom VPC isolation, dedicated LLM API keys, or HIPAA/SOC2 enterprise addendums?</span>
        </div>
        <a
          href="mailto:sales@powerful-pr.io?subject=Enterprise%20Autonomous%20PR%20Review"
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline shrink-0"
        >
          Contact Solutions Team &rarr;
        </a>
      </div>
    </div>
  );
}
