"use client";

import { useEffect, useState } from "react";
import { api, getInstallUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Sliders,
  Zap,
  FolderGit2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Globe,
  RefreshCw,
  Sparkles,
  Shield,
  Clock,
  FileCode2,
  Code2,
  BookOpen,
} from "lucide-react";
import type { SettingsData, Repo } from "@/lib/types";

const SENSITIVITY_PRESETS = [
  {
    label: "Lenient",
    value: 0.35,
    tag: "High Volume",
    description: "Flags minor style patterns, suggestions, and stylistic preferences along with errors.",
  },
  {
    label: "Balanced",
    value: 0.5,
    tag: "Recommended",
    description: "Standard production threshold. Flags actionable issues, security smells, and validated rules.",
  },
  {
    label: "Strict",
    value: 0.75,
    tag: "Low Noise",
    description: "High-confidence only. Restricts comments to critical defects, security risks, and breaking changes.",
  },
];

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Org settings local state
  const [sensitivity, setSensitivity] = useState<number>(0.5);
  const [triggerOnSync, setTriggerOnSync] = useState<boolean>(true);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [orgSaveSuccess, setOrgSaveSuccess] = useState(false);

  // Per-repo toggling state: repoId -> boolean
  const [togglingRepoId, setTogglingRepoId] = useState<string | null>(null);
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);
  const [scanSuccessId, setScanSuccessId] = useState<string | null>(null);

  const handleScanRules = async (repo: Repo) => {
    try {
      setScanningRepoId(repo.id);
      const res = await api.syncRepoRules(repo.id);
      if (res.success) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            repos: prev.repos.map((r) =>
              r.id === repo.id ? { ...r, customRulesCount: res.customRulesCount } : r
            ),
          };
        });
        setScanSuccessId(repo.id);
        setTimeout(() => setScanSuccessId(null), 3500);
      }
    } catch (err: any) {
      alert("Failed to scan custom rules: " + (err.message || "Unknown error"));
    } finally {
      setScanningRepoId(null);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getSettings();
        setData(res);
        setSensitivity(res.org.reviewSensitivity ?? 0.5);
        setTriggerOnSync(res.org.triggerOnSync ?? true);
      } catch (err: any) {
        console.error("Failed to load settings:", err);
        setError(err.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveOrgSettings = async () => {
    try {
      setIsSavingOrg(true);
      setOrgSaveSuccess(false);
      const res = await api.updateOrgSettings({
        reviewSensitivity: sensitivity,
        triggerOnSync,
      });
      if (res.success) {
        setOrgSaveSuccess(true);
        setTimeout(() => setOrgSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert("Failed to update organization settings: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleToggleRepo = async (repo: Repo) => {
    const nextState = repo.enabled === false ? true : false;
    setTogglingRepoId(repo.id);

    try {
      const res = await api.updateRepoSettings(repo.id, { enabled: nextState });
      if (res.success) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            repos: prev.repos.map((r) => (r.id === repo.id ? { ...r, enabled: nextState } : r)),
          };
        });
      }
    } catch (err: any) {
      alert("Failed to update repo setting: " + (err.message || "Unknown error"));
    } finally {
      setTogglingRepoId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-8 w-48 bg-white/5" />
        <Skeleton className="h-32 w-full bg-white/5 rounded-2xl" />
        <Skeleton className="h-64 w-full bg-white/5 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center glass-card max-w-lg mx-auto mt-12 p-8 border border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
        <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Error Loading Settings</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{error || "Could not retrieve settings data."}</p>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  const { org, repos } = data;

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Organization Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure autonomous code review behavior, AI sensitivity thresholds, and repository permissions.
        </p>
      </div>

      {/* Uninstalled Alert Banner */}
      {org.isInstalled === false && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-700 dark:text-red-200 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">GitHub App is Uninstalled</h3>
                <p className="text-xs text-red-700/80 dark:text-red-200/80 mt-1 leading-relaxed">
                  The GitHub App was uninstalled from @{org.login}
                  {org.uninstalledAt ? ` on ${new Date(org.uninstalledAt).toLocaleDateString()}` : ""}.
                  Autonomous code reviews and webhook events are paused until re-installed.
                </p>
              </div>
            </div>
            <a
              href={getInstallUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500 transition-colors"
            >
              Reinstall GitHub App
            </a>
          </div>
        </div>
      )}

      {/* Section 1: Organization Profile */}
      <Card className="border border-zinc-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#0A0E18] shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-zinc-900 dark:text-white">Organization Profile</CardTitle>
                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                  GitHub App installation credentials and workspace identity
                </CardDescription>
              </div>
            </div>
            <Badge variant={org.isInstalled === false ? "danger" : "success"}>
              {org.isInstalled === false ? "App Uninstalled" : "App Active"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid gap-4 sm:grid-cols-4 border border-zinc-200/80 dark:border-white/[0.06] rounded-xl p-4 bg-zinc-50/50 dark:bg-white/[0.01]">
            <div>
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">GitHub Organization</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white mt-1">@{org.login}</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">App Installation ID</p>
              <p className="text-sm font-mono text-indigo-600 dark:text-indigo-300 mt-1">{org.installationId}</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">App Status</p>
              <p className={`text-sm font-semibold mt-1 ${org.isInstalled === false ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {org.isInstalled === false ? "Uninstalled" : "Active"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">
                {org.isInstalled === false ? "Uninstalled At" : "Connected Since"}
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                {new Date(org.isInstalled === false && org.uninstalledAt ? org.uninstalledAt : org.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Review Sensitivity & Webhook Triggers */}
      <Card className="border border-zinc-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#0A0E18] shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-zinc-900 dark:text-white">Review Sensitivity & Automation</CardTitle>
                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                  Control comment filtering thresholds and webhook execution conditions
                </CardDescription>
              </div>
            </div>

            {orgSaveSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 rounded-lg">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Settings Saved
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-2">
          {/* Sensitivity Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                  AI Confidence Threshold ({sensitivity.toFixed(2)})
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Comments below this confidence score are automatically dropped to eliminate noise.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 pt-1">
              {SENSITIVITY_PRESETS.map((preset) => {
                const isSelected = Math.abs(sensitivity - preset.value) < 0.05;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSensitivity(preset.value)}
                    className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/10 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                        : "border-zinc-200 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] hover:bg-zinc-100/60 dark:hover:bg-white/[0.04] hover:border-zinc-300 dark:hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{preset.label}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? "bg-indigo-100 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300"
                            : "bg-zinc-100 dark:bg-white/[0.04] border-zinc-200 dark:border-white/[0.08] text-zinc-500"
                        }`}
                      >
                        {preset.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">{preset.description}</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-2">Score ≥ {preset.value}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Webhook Preferences */}
          <div className="border-t border-zinc-200/80 dark:border-white/[0.06] pt-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                Pull Request Webhook Events
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Choose when the autonomous review agent triggers on your Pull Requests.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Re-audit on Commit Updates (<code className="font-mono text-[11px] text-amber-300">synchronize</code>)
                  </p>
                </div>
                <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                  When enabled, pushing new commits to an open PR automatically re-evaluates changed files. When disabled, only the initial PR opening will trigger a review.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTriggerOnSync(!triggerOnSync)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  triggerOnSync ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    triggerOnSync ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveOrgSettings}
              disabled={isSavingOrg}
              className="gap-2 shadow-md shadow-indigo-500/20"
            >
              {isSavingOrg ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving Preferences...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Save Organization Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Repository Review Controls */}
      <Card className="border border-zinc-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#0A0E18] shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <FolderGit2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-zinc-900 dark:text-white">Repository Controls</CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Enable or pause AI reviews per connected repository without uninstalling the app
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {repos.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">
              No repositories connected yet. Visit the Repositories tab to link repositories.
            </p>
          ) : (
            <div className="divide-y divide-zinc-200/70 dark:divide-white/[0.06] border border-zinc-200/80 dark:border-white/[0.06] rounded-xl overflow-hidden bg-white/60 dark:bg-white/[0.01]">
              {repos.map((repo) => {
                const isEnabled = repo.enabled !== false;
                const isToggling = togglingRepoId === repo.id;

                return (
                  <div
                    key={repo.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">{repo.name}</span>
                        <Badge variant={repo.private ? "warning" : "default"} className="text-[10px] px-1.5 py-0.2">
                          {repo.private ? (
                            <span className="flex items-center gap-1">
                              <Lock className="h-2.5 w-2.5" />
                              Private
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Globe className="h-2.5 w-2.5" />
                              Public
                            </span>
                          )}
                        </Badge>

                        {/* Active Custom Rules Count Badge */}
                        {typeof repo.customRulesCount === "number" && repo.customRulesCount > 0 ? (
                          <Badge variant="info" className="text-[10px] gap-1 px-2">
                            <FileCode2 className="h-3 w-3" />
                            {repo.customRulesCount} {repo.customRulesCount === 1 ? "Custom Rule" : "Custom Rules"}
                          </Badge>
                        ) : (
                          <Badge variant="muted" className="text-[10px] gap-1 px-2">
                            Standard Rules
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-mono text-zinc-500">{repo.fullName}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={scanningRepoId === repo.id}
                        onClick={() => handleScanRules(repo)}
                        className="h-7 text-[11px] gap-1.5 px-2.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border-zinc-200 dark:border-white/[0.08]"
                      >
                        {scanningRepoId === repo.id ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                            Scanning .powerful.yml...
                          </>
                        ) : scanSuccessId === repo.id ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            Rules Updated
                          </>
                        ) : (
                          <>
                            <Code2 className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            Scan Rules
                          </>
                        )}
                      </Button>

                      <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-white/[0.08]">
                        <span
                          className={`text-[11px] font-medium ${
                            isEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"
                          }`}
                        >
                          {isEnabled ? "Reviews Active" : "Reviews Paused"}
                        </span>

                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleRepo(repo)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isEnabled ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
                          } ${isToggling ? "opacity-50" : ""}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              isEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Custom Rules Documentation (.powerful.yml) */}
      <Card className="border border-zinc-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#0A0E18] shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-zinc-900 dark:text-white">Custom Rule Sets (.powerful.yml)</CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Teach the autonomous review agent your engineering team&apos;s unique guidelines and architectural rules
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Commit a <code className="font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20">.powerful.yml</code> file in the root directory of any connected repository. The LangGraph agent parses these instructions during the review pipeline and strictly enforces them across every code chunk.
          </p>

          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-900 dark:bg-black/40 p-4 font-mono text-xs text-zinc-300 space-y-1 overflow-x-auto shadow-inner">
            <p className="text-zinc-500"># .powerful.yml in repository root</p>
            <p className="text-indigo-400">rules:</p>
            <p className="text-emerald-300">  - &quot;Ensure all API endpoints validate request schemas with Zod or Pydantic&quot;</p>
            <p className="text-emerald-300">  - &quot;No raw SQL statements; always query via Prisma ORM or parameterized builders&quot;</p>
            <p className="text-emerald-300">  - &quot;TypeScript interfaces must be exported from types.ts&quot;</p>
            <p className="text-emerald-300">  - &quot;React components must avoid inline styles and use Tailwind CSS tokens&quot;</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
