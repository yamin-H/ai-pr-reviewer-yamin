import type {
  BillingData,
  MemoryStats,
  Organization,
  PRReview,
  QueueStatusResponse,
  Repo,
  ReviewsResponse,
  SettingsData,
  UsageData,
  User,
  WeeklyDigest,
} from "./types";

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      apiUrl?: string;
      apiUrlBrowser?: string;
    };
  }
}

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    return window.__RUNTIME_CONFIG__?.apiUrlBrowser || 
           process.env.NEXT_PUBLIC_API_URL_BROWSER || 
           "http://localhost:3000";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://api:3000";
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = getApiUrl();
  const url = `${base}${path}`;

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `API request failed: ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export function getLoginUrl(): string {
  const base = getApiUrl();
  return `${base}/auth/github`;
}

export function getLogoutUrl(): string {
  const base = getApiUrl();
  return `${base}/auth/logout`;
}

export const api = {
  getMe: () => fetchApi<{ user: User }>("/auth/me"),

  getOrgs: () =>
    fetchApi<{ orgs: Array<{ id: string; login: string }> }>("/auth/orgs"),

  switchOrg: (orgId: string) =>
    fetchApi<{ success: boolean; org: { id: string; login: string } }>(
      "/auth/switch-org",
      {
        method: "POST",
        body: JSON.stringify({ orgId }),
      },
    ),

  getRepos: () => fetchApi<{ repos: Repo[] }>("/api/repos"),

  toggleRepo: (repoId: string, enabled: boolean) =>
    fetchApi<{ repo: Repo }>(`/api/repos/${repoId}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),

  syncRepos: () =>
    fetchApi<{ synced: number; repos: Repo[] }>("/api/repos/sync", {
      method: "POST",
    }),

  getRepoRules: (repoId: string) =>
    fetchApi<{ repoId: string; rules: string }>(`/api/repos/${repoId}/rules`),

  saveRepoRules: (repoId: string, rules: string) =>
    fetchApi<{ repoId: string; rules: string }>(`/api/repos/${repoId}/rules`, {
      method: "PUT",
      body: JSON.stringify({ rules }),
    }),

  getReviews: (params?: {
    repoId?: string;
    status?: string;
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.repoId && params.repoId !== "all") query.set("repoId", params.repoId);
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.page) query.set("page", params.page.toString());
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.search) query.set("search", params.search);

    const qs = query.toString();
    return fetchApi<ReviewsResponse>(`/api/reviews${qs ? `?${qs}` : ""}`);
  },

  getExportCsvUrl: (params?: {
    repoId?: string;
    status?: string;
    from?: string;
    to?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.repoId && params.repoId !== "all") query.set("repoId", params.repoId);
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return `${getApiUrl()}/api/reviews/export/csv${qs ? `?${qs}` : ""}`;
  },

  getReview: (id: string) =>
    fetchApi<{ review: PRReview }>(`/api/reviews/${id}`),

  submitCommentFeedback: (reviewId: string, commentId: string, action: "approve" | "dismiss") =>
    fetchApi<{ success: boolean; feedback: Record<string, unknown> }>(`/api/reviews/${reviewId}/comments/${commentId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  getMemoryStats: () => fetchApi<MemoryStats>("/api/memory/stats"),

  getDigests: () =>
    fetchApi<{ digests: WeeklyDigest[] }>("/api/digest/preview"),

  compileDigest: () =>
    fetchApi<{ success: boolean; message: string; digest?: WeeklyDigest }>("/api/digest/compile", {
      method: "POST",
    }),

  checkInstallStatus: (login: string) =>
    fetchApi<{ installed: boolean }>(`/auth/install/status?login=${encodeURIComponent(login)}`),
    
  checkOnboardStatus: (login: string) =>
    fetchApi<{ count: number; status: string }>(`/auth/install/onboard-status?login=${encodeURIComponent(login)}`),

  getSettings: () => fetchApi<SettingsData>("/api/settings"),

  updateOrgSettings: (data: { reviewSensitivity?: number; triggerOnSync?: boolean }) =>
    fetchApi<{ success: boolean; org: Organization }>("/api/settings/org", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateRepoSettings: (repoId: string, data: { enabled: boolean }) =>
    fetchApi<{ success: boolean; repo: Repo }>(`/api/settings/repos/${repoId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getJobs: () => fetchApi<QueueStatusResponse>("/api/jobs"),

  getDeadLetterJobs: () =>
    fetchApi<{ jobs: Array<{ id: string; name?: string; failedReason?: string; timestamp?: number; data?: Record<string, unknown> }> }>("/api/jobs/dead-letter"),

  replayDeadLetterJob: (jobId: string) =>
    fetchApi<{ success: boolean; message: string }>(`/api/jobs/dead-letter/${jobId}/replay`, {
      method: "POST",
    }),

  getUsage: () => fetchApi<UsageData>("/api/usage"),

  getBilling: () => fetchApi<BillingData>("/api/billing/subscription"),

  selectPlan: (plan: string) =>
    fetchApi<{ success: boolean; plan: string; message: string; quota: number }>("/api/billing/select-plan", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
};

export { ApiError };
