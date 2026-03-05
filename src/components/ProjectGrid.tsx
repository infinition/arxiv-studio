import { useState } from 'react';
import { Plus, Copy, Trash2, FileText, Upload, FolderOpen, Moon, Sun } from 'lucide-react';
import type { Project } from '../types';
import { getProjects, createProject, deleteProject, duplicateProject, importProjectJson } from '../store/workspace';

interface Props {
  onOpen: (id: string) => void;
  dark: boolean;
  toggleTheme: () => void;
}

export default function ProjectGrid({ onOpen, dark, toggleTheme }: Props) {
  const [projects, setProjects] = useState<Project[]>(getProjects);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const refresh = () => setProjects(getProjects());

  const handleCreate = () => {
    if (!newName.trim()) return;
    const p = createProject(newName.trim());
    setShowNew(false);
    setNewName('');
    onOpen(p.id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this project?')) {
      deleteProject(id);
      refresh();
    }
  };

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    duplicateProject(id);
    refresh();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const p = importProjectJson(reader.result as string);
        if (p) {
          refresh();
          onOpen(p.id);
        } else {
          alert('Invalid project file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-sm border-b" style={{ background: 'var(--toolbar-bg)', borderColor: 'var(--panel-border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-7 h-7 text-blue-500" />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>ArXiv Studio</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Upload className="w-4 h-4" /> Import
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {dark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />}
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {/* New project card */}
          <button
            onClick={() => setShowNew(true)}
            className="project-card rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-8 min-h-[220px] cursor-pointer transition-colors"
            style={{ borderColor: 'var(--panel-border)', color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--selected-border)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--panel-border)'}
          >
            <Plus className="w-10 h-10" />
            <span className="text-sm font-medium">New Project</span>
          </button>

          {/* Project cards */}
          {projects.map((p, i) => (
            <div
              key={p.id}
              onClick={() => onOpen(p.id)}
              className="project-card rounded-xl overflow-hidden cursor-pointer animate-slide-up"
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                animationDelay: `${i * 50}ms`,
              }}
            >
              {/* Thumbnail */}
              <div className="h-32 relative overflow-hidden" style={{ background: 'var(--hover-bg)' }}>
                {p.thumbnail ? (
                  <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-16 h-22 rounded shadow-sm" style={{ background: 'var(--page-bg)', border: '1px solid var(--panel-border)' }}>
                      <div className="p-2 space-y-1">
                        <div className="h-1 rounded w-10" style={{ background: 'var(--text-secondary)', opacity: 0.3 }} />
                        <div className="h-1 rounded w-8" style={{ background: 'var(--text-secondary)', opacity: 0.2 }} />
                        <div className="h-1 rounded w-12" style={{ background: 'var(--text-secondary)', opacity: 0.2 }} />
                      </div>
                    </div>
                  </div>
                )}
                {/* Actions overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleDuplicate(e, p.id)}
                    className="p-1.5 rounded-md backdrop-blur-sm cursor-pointer"
                    style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, p.id)}
                    className="p-1.5 rounded-md backdrop-blur-sm cursor-pointer"
                    style={{ background: 'rgba(220,38,38,0.8)', color: '#fff' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(p.updatedAt)} &middot; {p.pages.length} page{p.pages.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New project dialog */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setShowNew(false)}>
          <div
            className="rounded-xl p-6 w-96 shadow-2xl animate-slide-up"
            style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>New Project</h2>
            </div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Project name..."
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-lg text-sm cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-lg text-sm bg-blue-500 text-white font-medium cursor-pointer hover:bg-blue-600 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
