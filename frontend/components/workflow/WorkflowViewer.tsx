'use client';

import { WorkflowStep } from './WorkflowStep';
import { GitBranch } from 'lucide-react';

interface Step {
  step_name: string;
  status: 'completed' | 'failed' | 'started';
  data: Record<string, unknown>;
  error?: string | null;
}

interface WorkflowViewerProps {
  steps: Step[];
  className?: string;
}

export function WorkflowViewer({ steps, className }: WorkflowViewerProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <GitBranch className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No workflow steps recorded</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {steps.map((step, i) => (
        <WorkflowStep
          key={`${step.step_name}-${i}`}
          step={step}
          index={i}
          isLast={i === steps.length - 1}
        />
      ))}
    </div>
  );
}
