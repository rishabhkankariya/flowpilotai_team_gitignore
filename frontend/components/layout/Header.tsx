'use client';

import * as React from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6 bg-card">
      <div className="text-sm font-semibold">Workspace</div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">U</div>
      </div>
    </header>
  );
}
