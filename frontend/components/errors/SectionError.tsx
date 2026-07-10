import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SectionErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function SectionError({
  message = 'Failed to load this section',
  onRetry,
}: SectionErrorProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{message}</p>
      </div>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="gap-1.5 text-destructive hover:text-destructive">
          <RefreshCcw className="h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}
