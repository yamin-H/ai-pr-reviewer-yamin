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
  createdAt: string;
}

export interface Repo {
  id: string;
  githubId: string;
  name: string;
  fullName: string;
  private: boolean;
  orgId: string;
  createdAt: string;
  org: Organization;
  _count: {
    reviews: number;
    memoryEntries: number;
  };
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
