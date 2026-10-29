"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Building2, Check } from "lucide-react";

interface OrgOption {
  id: string;
  login: string;
}

interface GithubUser {
  id: number;
  login: string;
  avatar_url: string;
}

function SelectOrgContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    // Parse orgs from URL params
    const orgsParam = searchParams.get("orgs");
    const userParam = searchParams.get("github_user");

    if (orgsParam) {
      try {
        // orgs param is repeated, so we need to get all values
        const orgsList = searchParams.getAll("orgs").map((val) => JSON.parse(val));
        setOrgs(orgsList);
      } catch (e) {
        console.error("Failed to parse orgs:", e);
      }
    }

    if (userParam) {
      try {
        setGithubUser(JSON.parse(userParam));
      } catch (e) {
        console.error("Failed to parse github_user:", e);
      }
    }

    setLoading(false);
  }, [searchParams]);

  const handleSelectOrg = async (orgId: string) => {
    setSelecting(orgId);
    try {
      // Create a session for this org by calling the OAuth callback again
      // Actually, we need to complete the OAuth flow with the selected org
      // The session was already created during OAuth callback, we just need to switch
      await api.switchOrg(orgId);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to select org:", err);
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#080C14]">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading organizations...</p>
        </div>
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#080C14] px-4">
        <div className="max-w-md text-center glass-card p-8 border border-red-500/20 bg-red-500/5">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No Organizations Found</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            We couldn&apos;t find any organizations with the GitHub App installed.
          </p>
          <a
            href="/install"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            Install GitHub App
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#080C14] px-4">
      <div className="w-full max-w-md glass-card p-8 border border-zinc-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-3 mb-6">
          {githubUser?.avatar_url && (
            <img
              src={githubUser.avatar_url}
              alt={githubUser.login}
              className="h-10 w-10 rounded-full"
            />
          )}
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              Select Organization
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as <strong>@{githubUser?.login}</strong>
            </p>
          </div>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          The GitHub App is installed on multiple organizations you belong to.
          Choose which one to use for this session:
        </p>

        <div className="space-y-2">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSelectOrg(org.id)}
              disabled={selecting === org.id}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                <span className="font-medium text-zinc-900 dark:text-white">{org.login}</span>
              </div>
              {selecting === org.id ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              ) : (
                <Check className="h-5 w-5 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          ))}
        </div>

        <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500 text-center">
          You can switch organizations later from the dashboard header.
        </p>
      </div>
    </div>
  );
}

export default function SelectOrgPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#080C14]">
          <div className="space-y-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading organizations...</p>
          </div>
        </div>
      }
    >
      <SelectOrgContent />
    </Suspense>
  );
}
