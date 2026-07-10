import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
  title?: string;
  message?: string;
  onReset?: () => void;
  showHomeButton?: boolean;
}

export function ErrorFallback({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onReset,
  showHomeButton = false,
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex gap-3">
        {onReset && (
          <Button onClick={onReset} variant="outline" className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Try again
          </Button>
        )}
        {showHomeButton && (
          <Button>
            <a href="/dashboard">Go to Dashboard</a>
          </Button>
        )}
      </div>
    </div>
  );
}
