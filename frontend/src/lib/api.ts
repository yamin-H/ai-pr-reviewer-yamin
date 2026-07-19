import type {
  MemoryStats,
  PRReview,
  Repo,
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

  getReviews: () => fetchApi<{ reviews: PRReview[] }>("/api/reviews"),

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
};

export { ApiError };
