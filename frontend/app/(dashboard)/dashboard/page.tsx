import { MetricsRow } from '@/components/dashboard/MetricsRow';
import { ActivitySparkline } from '@/components/dashboard/ActivitySparkline';
import { AgentUtilizationBar } from '@/components/dashboard/AgentUtilizationBar';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your AI workflow overview at a glance.
        </p>
      </div>
      <MetricsRow />
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivitySparkline />
        <AgentUtilizationBar />
      </div>
    </div>
  );
}
