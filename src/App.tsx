import { useState, useCallback, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { getProject, saveProject } from './store/workspace';
import type { Project } from './types';
import ProjectGrid from './components/ProjectGrid';
import Editor from './components/Editor';

export default function App() {
  const { dark, mode, toggleTheme } = useTheme();
  const [project, setProject] = useState<Project | null>(null);
  const [view, setView] = useState<'grid' | 'editor'>('grid');

  const openProject = useCallback((id: string) => {
    const p = getProject(id);
    if (p) {
      setProject(p);
      setView('editor');
    }
  }, []);

  const handleBack = useCallback(() => {
    if (project) saveProject(project);
    setView('grid');
    setProject(null);
  }, [project]);

  const handleChange = useCallback((updated: Project) => {
    setProject(updated);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string };
      if (!data || data.type !== 'arxiv.obsidian.projects.request') return;
      const raw = localStorage.getItem('arxiv-studio-projects') || '[]';
      window.parent.postMessage(
        {
          type: 'arxiv.obsidian.projects.response',
          payload: { raw },
        },
        '*'
      );
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div>
      <div className="animate-fade-in">
        {view === 'grid' ? (
          <ProjectGrid onOpen={openProject} dark={dark} toggleTheme={toggleTheme} />
        ) : project ? (
          <Editor
            project={project}
            onChange={handleChange}
            onBack={handleBack}
            themeMode={mode}
            toggleTheme={toggleTheme}
          />
        ) : null}
      </div>
    </div>
  );
}
