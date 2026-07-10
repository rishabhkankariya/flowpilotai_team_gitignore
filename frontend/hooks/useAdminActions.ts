'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/lib/toast';

export function useAdminActions() {
  const [isResetting, setIsResetting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const resetDemo = async () => {
    setIsResetting(true);
    try {
      const res = await api.post<{ deleted_rows: number }>('/admin/reset-demo');
      toast.success(`Demo reset: ${res.data.deleted_rows} submissions deleted`);
    } catch {
      toast.error('Failed to reset demo data');
    } finally {
      setIsResetting(false);
    }
  };

  const seedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await api.post<{ seeded_rows: number }>('/admin/seed-demo');
      toast.success(`Demo seeded: ${res.data.seeded_rows} submissions added`);
    } catch {
      toast.error('Failed to seed demo data');
    } finally {
      setIsSeeding(false);
    }
  };

  return { resetDemo, seedDemo, isResetting, isSeeding };
}
