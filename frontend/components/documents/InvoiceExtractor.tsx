'use client';

import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/FileUpload';
import { useInvoiceExtraction } from '@/hooks/useInvoiceExtraction';
import { InvoiceResultCard } from './InvoiceResultCard';

export function InvoiceExtractor() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const { extract, result, isLoading, error, reset } = useInvoiceExtraction();

  const handleExtract = async () => {
    if (!fileUrl) return;
    await extract(fileUrl);
  };

  const handleReset = () => {
    setFileUrl(null);
    reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Upload a PDF or image of an invoice, receipt, or purchase order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            onUploadComplete={(url) => setFileUrl(url)}
            onRemove={() => { setFileUrl(null); reset(); }}
            disabled={isLoading}
          />

          <div className="flex justify-end gap-3">
            {(fileUrl || result) && (
              <Button variant="outline" onClick={handleReset} disabled={isLoading}>
                Upload new document
              </Button>
            )}
            <Button
              onClick={handleExtract}
              disabled={!fileUrl || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Extracting… (up to 45s)
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Extract Data
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && <InvoiceResultCard result={result} />}
    </div>
  );
}
