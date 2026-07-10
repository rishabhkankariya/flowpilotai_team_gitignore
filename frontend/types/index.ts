// ─── User / Auth ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: 'bearer';
}

// ─── Inbox / Workflow ─────────────────────────────────────────────────────────
export type AgentType = 'sales' | 'support' | 'finance' | 'executive';

export type WorkflowStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface InboxSubmission {
  id: string;
  user_id: string;
  content: string;
  file_url?: string | null;
  detected_intent: string | null;
  confidence_score: number | null;
  assigned_agent: AgentType | null;
  status: WorkflowStatus;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  total_submissions: number;
  completed: number;
  failed: number;
  avg_confidence: number;
  by_agent: Record<AgentType, number>;
  by_day: DayBucket[];
}

export interface DayBucket {
  date: string;
  count: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
