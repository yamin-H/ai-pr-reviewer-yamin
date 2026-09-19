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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorMsg = (body as { error?: string }).error || res.statusText;
    throw new ApiError(res.status, errorMsg);
  }

  return res.json() as Promise<T>;
}

export function getLoginUrl() {
  return `${API_URL}/auth/github`;
}

export function getInstallUrl() {
  const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "powerful-pr-agent";
  return `https://github.com/apps/${appName}/installations/new`;
}

export const api = {
  getMe: () => fetchApi<{ user: User }>("/auth/me"),

  logout: () =>
    fetchApi<{ success: boolean }>("/auth/logout", { method: "POST" }),

  getRepos: () => fetchApi<{ repos: Repo[] }>("/api/repos"),

  syncRepo: (id: string) =>
    fetchApi<{ success: boolean; stored_count: number; repo: Repo }>(`/api/repos/${id}/sync`, {
      method: "POST",
    }),

  syncRepoRules: (id: string) =>
    fetchApi<{ success: boolean; customRulesCount: number; rules: string[]; repo: Repo }>(`/api/repos/${id}/sync-rules`, {
      method: "POST",
    }),

  getReviews: (params?: {
    cursor?: string;
    limit?: number;
    repoId?: string;
    status?: string;
    from?: string;
    to?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.cursor) query.set("cursor", params.cursor);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.repoId && params.repoId !== "all") query.set("repoId", params.repoId);
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return fetchApi<ReviewsResponse>(qs ? `/api/reviews?${qs}` : "/api/reviews");
  },

  getReviewsExportUrl: (params?: {
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
    return `${API_URL}/api/reviews/export/csv${qs ? `?${qs}` : ""}`;
  },

  getReview: (id: string) =>
    fetchApi<{ review: PRReview }>(`/api/reviews/${id}`),

  submitCommentFeedback: (reviewId: string, commentId: string, action: "approve" | "dismiss") =>
    fetchApi<{ success: boolean; feedback: any }>(`/api/reviews/${reviewId}/comments/${commentId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  getMemoryStats: () => fetchApi<MemoryStats>("/api/memory/stats"),

  getDigests: () =>
    fetchApi<{ digests: WeeklyDigest[] }>("/api/digest/preview"),

  checkInstallStatus: (login: string) =>
    fetchApi<{ installed: boolean; installationId: number | null }>(`/auth/install/status?login=${login}`),
    
  checkOnboardStatus: (login: string) =>
    fetchApi<{ count: number; status: string }>(`/auth/install/onboard-status?login=${login}`),

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

  getUsage: () => fetchApi<UsageData>("/api/usage"),

  getBilling: () => fetchApi<BillingData>("/api/billing/subscription"),

  selectPlan: (plan: string) =>
    fetchApi<{ success: boolean; plan: string; message: string; quota: number }>("/api/billing/select-plan", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
};

export { ApiError };
