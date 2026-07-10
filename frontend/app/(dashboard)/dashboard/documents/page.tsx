import { InvoiceExtractor } from '@/components/documents/InvoiceExtractor';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Document Intelligence</h1>
        <p className="text-muted-foreground">
          Upload invoices and financial documents for AI-powered data extraction.
        </p>
      </div>
      <InvoiceExtractor />
    </div>
  );
}
