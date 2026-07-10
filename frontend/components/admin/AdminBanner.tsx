'use client';

import { useState } from 'react';
import { Shield, Trash2, Sparkles, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminActions } from '@/hooks/useAdminActions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function AdminBanner() {
  const { user } = useAuth();
  const { resetDemo, seedDemo, isResetting, isSeeding } = useAdminActions();
  const [dismissed, setDismissed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Only show for admin users
  if (!user || user.role !== 'admin' || dismissed) return null;

  const handleReset = async () => {
    setConfirmOpen(false);
    await resetDemo();
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800/50 dark:bg-orange-900/20">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 flex-shrink-0 text-orange-500" />
          <div>
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Admin Controls
            </p>
            <p className="text-xs text-orange-600/70 dark:text-orange-400/70">
              You have administrator access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={seedDemo}
            disabled={isSeeding || isResetting}
            className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300"
          >
            {isSeeding ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Seed Demo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={isResetting || isSeeding}
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
          >
            {isResetting ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Reset Demo
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-orange-500"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss admin banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Confirm Reset Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Demo Reset
            </DialogTitle>
            <DialogDescription>
              This will permanently delete ALL inbox submissions from the database.
              Users and their accounts will not be affected. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
              {isResetting ? 'Resetting…' : 'Yes, reset all submissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
