'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useInboxSubmit } from '@/hooks/useInboxSubmit';
import { useInboxStore } from '@/store/inbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FileUpload } from '@/components/ui/FileUpload';

const MAX_CHARS = 5000;
const MIN_CHARS = 3;

export function InboxForm() {
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { submit } = useInboxSubmit();
  const isPolling = useInboxStore((s) => s.isPolling);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const hasInput = charCount >= MIN_CHARS || !!fileUrl;
  const canSubmit = hasInput && !isOverLimit && !isSubmitting && !isPolling;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await submit(content.trim(), fileUrl);
      setContent('');
      setFileUrl(undefined);
      toast.success('Successfully submitted to AI workflow!');
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe your request, paste an email, or ask a question… (e.g., 'Draft a quotation for Acme Corp' or upload an invoice below)"
          className={cn(
            'min-h-[160px] resize-none pr-4 pb-8',
            isOverLimit && 'border-destructive focus-visible:ring-destructive',
          )}
          disabled={isSubmitting || isPolling}
          aria-label="Message input"
          aria-describedby="char-counter"
        />
        <span
          id="char-counter"
          className={cn(
            'absolute bottom-3 right-3 text-xs',
            isOverLimit ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {charCount}/{MAX_CHARS}
        </span>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Attachment (Optional)</label>
        <FileUpload
          onUploadComplete={(url) => setFileUrl(url)}
          onRemove={() => setFileUrl(undefined)}
          disabled={isSubmitting || isPolling}
        />
      </div>

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="gap-2"
        >
          {isSubmitting || isPolling ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send to AI
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
