import { useRef } from 'react';
import type { Page } from '../types';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface Props {
  pages: Page[];
  activePageId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onDropEntity: (payload: { type: 'element' | 'group'; id: string }, targetPageId: string) => void;
}

export default function PagesPanel({ pages, activePageId, onSelect, onAdd, onDelete, onReorder, onDropEntity }: Props) {
  const dragFrom = useRef(-1);
  const dragTo = useRef(-1);

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Pages ({pages.length})
        </span>
        <button onClick={onAdd} className="p-1 rounded cursor-pointer transition-colors" style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {pages.map((page, idx) => {
        const isActive = page.id === activePageId;
        return (
          <div
            key={page.id}
            draggable
            onDragStart={(e) => {
              dragFrom.current = idx;
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('application/arxiv-page-index', String(idx));
            }}
            onDragOver={(e) => { e.preventDefault(); dragTo.current = idx; }}
            onDrop={(e) => {
              const rawEntity = e.dataTransfer.getData('application/arxiv-entity');
              if (rawEntity) {
                try {
                  const payload = JSON.parse(rawEntity) as { type: 'element' | 'group'; id: string };
                  if ((payload.type === 'element' || payload.type === 'group') && payload.id) {
                    onDropEntity(payload, page.id);
                    dragFrom.current = -1;
                    return;
                  }
                } catch {
                  // ignore malformed payload
                }
              }
              if (dragFrom.current !== dragTo.current && dragFrom.current >= 0) {
                onReorder(dragFrom.current, dragTo.current);
              }
              dragFrom.current = -1;
            }}
            onClick={() => onSelect(page.id)}
            className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer group text-xs mb-1 transition-colors"
            style={{
              background: isActive ? 'var(--selected-bg)' : 'transparent',
              border: isActive ? '1px solid var(--selected-border)' : '1px solid transparent',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50 cursor-grab shrink-0" style={{ color: 'var(--text-secondary)' }} />
            {/* Mini page preview */}
            <div
              className="rounded-sm shrink-0 flex items-center justify-center"
              style={{
                width: page.orientation === 'landscape' ? 44 : 32,
                height: page.orientation === 'landscape' ? 32 : 44,
                background: 'var(--page-bg)',
                border: isActive ? '1.5px solid var(--selected-border)' : '1px solid var(--panel-border)',
              }}
            >
              <div className="space-y-0.5 px-1">
                <div className="h-0.5 w-5 rounded" style={{ background: 'var(--text-secondary)', opacity: 0.3 }} />
                <div className="h-0.5 w-4 rounded" style={{ background: 'var(--text-secondary)', opacity: 0.2 }} />
                <div className="h-0.5 w-5 rounded" style={{ background: 'var(--text-secondary)', opacity: 0.2 }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Page {idx + 1}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{page.elements.length} elements · {page.orientation}</div>
            </div>
            {pages.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(page.id); }}
                className="p-1 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
