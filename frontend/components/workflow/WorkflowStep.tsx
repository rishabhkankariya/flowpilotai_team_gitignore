'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface StepData {
  step_name: string;
  status: 'completed' | 'failed' | 'started';
  data: Record<string, unknown>;
  error?: string | null;
}

interface WorkflowStepProps {
  step: StepData;
  index: number;
  isLast: boolean;
}

const NODE_LABELS: Record<string, string> = {
  ocr_node: 'Document OCR',
  intent_node: 'Intent Detection',
  confidence_node: 'Confidence Scoring',
  router_node: 'Agent Routing',
  sales_agent_node: 'Sales Agent',
  support_agent_node: 'Support Agent',
  finance_agent_node: 'Finance Agent',
  executive_agent_node: 'Executive Agent',
  persist_node: 'Result Saved',
};

export function WorkflowStep({ step, index, isLast }: WorkflowStepProps) {
  const [expanded, setExpanded] = useState(false);

  const label = NODE_LABELS[step.step_name] ?? step.step_name;
  const isCompleted = step.status === 'completed';
  const isFailed = step.status === 'failed';

  const dataEntries = Object.entries(step.data ?? {}).filter(
    ([, v]) => v !== null && v !== undefined,
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="flex gap-4"
    >
      {/* ── Connector line + icon ───────────────────────────────────────── */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2',
            isCompleted && 'border-green-500 bg-green-50 dark:bg-green-900/20',
            isFailed && 'border-destructive bg-destructive/10',
            !isCompleted && !isFailed && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
          )}
        >
          {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {isFailed && <XCircle className="h-4 w-4 text-destructive" />}
          {!isCompleted && !isFailed && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </div>
        {!isLast && <div className="mt-1 w-0.5 flex-1 bg-border" />}
      </div>

      {/* ── Step content ────────────────────────────────────────────────── */}
      <div className="mb-4 flex-1 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">{label}</p>
          {dataEntries.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Collapse step details' : 'Expand step details'}
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        {/* Compact data summary */}
        {dataEntries.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {dataEntries.slice(0, expanded ? undefined : 3).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                <span className="text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}:
                </span>
                <span className="font-medium">
                  {typeof value === 'number'
                    ? value.toFixed(2)
                    : String(value)}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Error display */}
        {isFailed && step.error && (
          <p className="mt-2 text-xs text-destructive">{step.error}</p>
        )}
      </div>
    </motion.div>
  );
}
