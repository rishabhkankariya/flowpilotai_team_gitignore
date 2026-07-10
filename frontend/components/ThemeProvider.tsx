'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/ui';

/**
 * Applies the theme class to the <html> element based on Zustand store value.
 * Also listens for system theme changes when theme = 'system'.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(t: 'light' | 'dark' | 'system') {
      const isDark =
        t === 'dark' ||
        (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
    }

    applyTheme(theme);

    // Listen for system preference changes when in 'system' mode
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  return <>{children}</>;
}
