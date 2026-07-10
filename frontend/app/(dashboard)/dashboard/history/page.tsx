import { SubmissionTable } from '@/components/history/SubmissionTable';

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workflow History</h1>
        <p className="text-muted-foreground">
          Review all past AI-processed submissions and their outcomes.
        </p>
      </div>
      <SubmissionTable />
    </div>
  );
}
