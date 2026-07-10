'use client';

import * as React from 'react';

export function Sidebar() {
  return (
    <div className="p-4 space-y-4">
      <div className="font-bold text-lg">FlowPilot AI</div>
      <nav className="space-y-1">
        <a href="/dashboard" className="block px-3 py-2 rounded-md hover:bg-muted text-sm font-medium">Dashboard</a>
        <a href="/dashboard/documents" className="block px-3 py-2 rounded-md hover:bg-muted text-sm font-medium">Documents</a>
        <a href="/dashboard/analytics" className="block px-3 py-2 rounded-md hover:bg-muted text-sm font-medium">Analytics</a>
        <a href="/dashboard/history" className="block px-3 py-2 rounded-md hover:bg-muted text-sm font-medium">History</a>
      </nav>
    </div>
  );
}
