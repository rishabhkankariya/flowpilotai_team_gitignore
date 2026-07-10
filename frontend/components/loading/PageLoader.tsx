import { Spinner } from '@/components/ui/spinner';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading…' }: PageLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background"
      role="status"
      aria-label={message}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">FlowPilot</span>
        <span className="text-xl font-bold text-primary">AI</span>
      </div>
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
