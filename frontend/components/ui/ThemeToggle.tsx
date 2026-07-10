'use client';

import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { Button } from './button';

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEME_LABELS = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const Icon = THEME_ICONS[theme];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        aria-label={`Current theme: ${THEME_LABELS[theme]}`}
      >
        <Icon className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 origin-top-right rounded-md border bg-card p-1 shadow-lg ring-1 ring-black/5 z-50">
          {(['light', 'dark', 'system'] as const).map((t) => {
            const ThemeIcon = THEME_ICONS[t];
            return (
              <button
                key={t}
                onClick={() => {
                  setTheme(t);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-left hover:bg-muted font-medium transition-colors"
              >
                <ThemeIcon className="h-4 w-4 text-muted-foreground" />
                <span>{THEME_LABELS[t]}</span>
                {theme === t && (
                  <span className="ml-auto text-xs text-muted-foreground">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
