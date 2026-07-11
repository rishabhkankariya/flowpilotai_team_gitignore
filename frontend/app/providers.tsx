'use client';

import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { TokenCookieSync } from '@/components/auth/TokenCookieSync';
import { useUIStore } from '@/store/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    
    function applyTheme(t: 'light' | 'dark' | 'system') {
      root.classList.remove('light', 'dark');
      
      let actualTheme: 'light' | 'dark' = 'light';
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        actualTheme = systemTheme;
      } else {
        actualTheme = t;
      }
      
      root.classList.add(actualTheme);
      root.style.colorScheme = actualTheme;
    }

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => {
        applyTheme('system');
      };
      
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  }, [theme]);

  return (
    <>
      <TokenCookieSync />
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: 'font-sans',
          },
        }}
      />
    </>
  );
}
