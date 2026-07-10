export type WorkflowStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface InboxSubmission {
  id: string;
  user_id: string;
  content: string;
  file_url?: string | null;
  detected_intent?: string | null;
  confidence_score?: number | null;
  assigned_agent?: string | null;
  status: WorkflowStatus;
  result?: {
    agent_response?: any;
    steps?: Array<{
      step_name: string;
      status: 'completed' | 'failed' | 'started';
      data: Record<string, any>;
      error?: string | null;
    }>;
  } | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
