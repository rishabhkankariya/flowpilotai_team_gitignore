'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';

interface LineItem {
  description?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
}

export interface InvoiceResult {
  document_type: string;
  vendor_name?: string;
  vendor_contact?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  payment_terms?: string;
  currency: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  line_items: LineItem[];
  payment_recommendation: 'approve' | 'hold' | 'review';
  anomalies: string[];
  action_items: string[];
  summary: string;
  confidence: number;
  raw_text_length: number;
}

interface UseInvoiceExtractionResult {
  extract: (fileUrl: string) => Promise<void>;
  result: InvoiceResult | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useInvoiceExtraction(): UseInvoiceExtractionResult {
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(async (fileUrl: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<InvoiceResult>('/documents/extract-invoice', {
        file_url: fileUrl,
      });
      setResult(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Extraction failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { extract, result, isLoading, error, reset };
}
