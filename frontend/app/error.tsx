'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Page Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">Page Error</h2>
        <p className="mt-2 text-muted-foreground">
          Something went wrong loading this page.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Try again
        </Button>
        <Button className="gap-2 inline-flex items-center">
          <a href="/dashboard" className="gap-2 inline-flex items-center">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </a>
        </Button>
      </div>
    </div>
  );
}
