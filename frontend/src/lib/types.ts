export interface User {
  id: string;
  githubId: string;
  login: string;
  avatarUrl: string;
}

export interface Organization {
  id: string;
  githubId: string;
  login: string;
  installationId: number;
  isInstalled?: boolean;
  uninstalledAt?: string | null;
  plan?: string;
  monthlyReviewCount?: number;
  lastQuotaResetAt?: string;
  planExpiresAt?: string | null;
  reviewSensitivity?: number;
  triggerOnSync?: boolean;
  createdAt: string;
}

export interface Repo {
  id: string;
  githubId: string;
  name: string;
  fullName: string;
  private: boolean;
  enabled?: boolean;
  customRulesCount?: number;
  orgId: string;
  createdAt: string;
  org?: Organization;
  _count: {
    reviews: number;
    memoryEntries: number;
  };
}

export interface SettingsData {
  org: Organization;
  repos: Repo[];
}


export interface ReviewComment {
  id: string;
  filename: string;
  line: number;
  severity: string;
  comment: string;
  confidence: number;
  pastPrNumber?: number | null;
  reviewId: string;
  createdAt: string;
}

export interface FeedbackAction {
  id: string;
  action: string;
  createdAt: string;
  userId: string;
  reviewId: string;
  commentId?: string | null;
}

export interface PRReview {
  id: string;
  prNumber: number;
  prTitle: string | null;
  status: "pending" | "completed" | "failed";
  riskScore?: number | null;
  commentUrl: string | null;
  filesReviewed: number;
  commentsCount: number;
  createdAt: string;
  completedAt: string | null;
  repoId: string;
  orgId: string;
  repo: Repo;
  comments?: ReviewComment[];
  feedbackActions?: FeedbackAction[];
}

export interface ReviewsResponse {
  reviews: PRReview[];
  nextCursor: string | null;
  totalCount: number;
}

export interface MemoryEntry {
  id: string;
  content: string;
  decisionType: string;
  outcome: string;
  prNumber: number;
  filePath: string | null;
  createdAt: string;
  repo: Repo;
}

export interface MemoryStats {
  totalEntries: number;
  byDecisionType: Array<{
    decisionType: string;
    _count: { decisionType: number };
  }>;
  byOutcome: Array<{
    outcome: string;
    _count: { outcome: number };
  }>;
  recentEntries: MemoryEntry[];
}

export interface WeeklyDigest {
  id: string;
  weekOf: string;
  prsReviewed: number;
  flagsRaised: number;
  flagsApproved: number;
  flagsDismissed: number;
  topIssue: string | null;
  topDismissed: string | null;
  patternsLearned: number;
  sentAt: string | null;
  createdAt: string;
  orgId: string;
  org: Organization;
}

export interface QueueJob {
  id: string;
  reviewId: string;
  repo: string;
  prNumber: number;
  prTitle?: string | null;
  state: "active" | "waiting" | "completed" | "failed";
  createdAt: string;
  processedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  waitMs?: number | null;
  failedReason?: string | null;
  attemptsMade: number;
}

export interface QueueCounts {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface QueueStatusResponse {
  counts: QueueCounts;
  jobs: QueueJob[];
}

export interface UsageOverview {
  plan?: string;
  reviewsThisMonth: number;
  totalReviews: number;
  monthlyQuota: number;
  monthlyReviewCount?: number;
  totalLLMCalls: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  monthTokens: number;
  avgLatencyMs: number;
  monthStart: string;
}

export interface DailyUsage {
  date: string;
  reviews: number;
  tokens: number;
  llmCalls: number;
}

export interface RepoUsage {
  id: string;
  name: string;
  fullName: string;
  private: boolean;
  reviewsCount: number;
  totalTokens: number;
  llmCalls: number;
  avgDurationMs: number;
}

export interface UsageAuditRecord {
  id: string;
  eventType: string;
  model: string;
  llmCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  createdAt: string;
  repo: string;
  reviewId?: string | null;
}

export interface UsageData {
  overview: UsageOverview;
  dailyUsage: DailyUsage[];
  byRepo: RepoUsage[];
  recentEvents: UsageAuditRecord[];
}

export interface BillingSubscription {
  plan: "free" | "pro" | "enterprise";
  planName: string;
  status: string;
  price: number;
  billingPeriod: string;
  monthlyReviewCount: number;
  monthlyQuota: number;
  quotaUsedPercent: number;
  lastQuotaResetAt: string;
  nextQuotaResetAt: string;
  planExpiresAt?: string | null;
}

export interface BillingTier {
  id: "free" | "pro" | "enterprise";
  name: string;
  price: number;
  billingPeriod: string;
  quota: number;
  concurrency: number;
  features: string[];
  description: string;
  isCurrent: boolean;
}

export interface BillingData {
  organization: {
    id: string;
    login: string;
  };
  subscription: BillingSubscription;
  tiers: BillingTier[];
}

