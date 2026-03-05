import { useEffect, useRef } from 'react';
import type { Project } from '../types';
import { saveProject } from '../store/workspace';

export function useAutoSave(project: Project | null, debounceMs = 2000) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!project) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveProject(project);
    }, debounceMs);
    return () => clearTimeout(timer.current);
  }, [project, debounceMs]);
}
