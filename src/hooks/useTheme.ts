import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from '../types';

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('arxiv-studio-theme') as ThemeMode | null;
    return stored === 'dark' || stored === 'dark-paper' ? stored : 'light';
  });
  const [hasUserPreference, setHasUserPreference] = useState<boolean>(() => {
    const stored = localStorage.getItem('arxiv-studio-theme') as ThemeMode | null;
    return stored === 'light' || stored === 'dark' || stored === 'dark-paper';
  });
  const [hostMode, setHostMode] = useState<'light' | 'dark' | null>(null);
  const [hostVars, setHostVars] = useState<Record<string, string>>({});
  const dark = mode !== 'light';

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; payload?: { mode?: 'light' | 'dark'; vars?: Record<string, string> } };
      if (!data || data.type !== 'arxiv.obsidian.theme' || !data.payload) return;
      if (data.payload.mode === 'light' || data.payload.mode === 'dark') {
        setHostMode(data.payload.mode);
        if (!hasUserPreference) setMode(data.payload.mode);
      }
      if (data.payload.vars && typeof data.payload.vars === 'object') setHostVars(data.payload.vars);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [hasUserPreference]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('theme-dark-paper', mode === 'dark-paper');
    localStorage.setItem('arxiv-studio-theme', mode);
  }, [dark, mode]);

  useEffect(() => {
    if (!hostMode) return;
    for (const [key, value] of Object.entries(hostVars)) {
      if (typeof value === 'string' && value.trim()) {
        if (mode === 'dark-paper' && key === '--page-bg') continue;
        document.documentElement.style.setProperty(key, value);
      }
    }
    if (mode === 'dark-paper') {
      document.documentElement.style.setProperty('--page-bg', '#ffffff');
    }
  }, [hostVars, hostMode, mode]);

  const toggleTheme = useCallback(
    () => {
      setHasUserPreference(true);
      setMode((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'dark-paper' : 'light'));
    },
    []
  );

  return { dark, mode, toggleTheme };
}
