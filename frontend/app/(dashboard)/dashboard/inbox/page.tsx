import { InboxForm } from '@/components/inbox/InboxForm';
import { ResultPanel } from '@/components/inbox/ResultPanel';
import { SubmissionHistory } from '@/components/inbox/SubmissionHistory';

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Inbox</h1>
        <p className="text-muted-foreground mt-1">
          Submit text queries or upload business documents. The AI orchestration engine will detect intent, score confidence, and route tasks to specialized agents.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <InboxForm />
          <SubmissionHistory />
        </div>
        <ResultPanel />
      </div>
    </div>
  );
}
