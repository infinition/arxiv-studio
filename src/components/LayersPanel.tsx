import { useRef, useState } from 'react';
import type { Element, EditingContext, ElementGroup } from '../types';
import {
  Type, Image, Sigma, Table2, Minus, Square, GripVertical, Star, Waypoints,
  ChevronUp, ChevronDown, Trash2, FolderTree, FolderOpen, Pencil, Link, Unlink, ListTree, BookDashed, BookText,
} from 'lucide-react';

interface Props {
  elements: Element[];
  groups: ElementGroup[];
  selectedIds: string[];
  selectedGroupId: string | null;
  onSelectElement: (id: string, append: boolean) => void;
  onSelectGroup: (id: string) => void;
  onCreateGroup: () => void;
  onUngroup: (id: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onDeleteElement: (id: string) => void;
  onRenameElement: (id: string, name: string) => void;
  onMoveLayer: (id: string, dir: 'up' | 'down') => void;
  onReorder: (from: number, to: number) => void;
  editingContext: EditingContext;
}

const typeIcons: Record<string, { icon: typeof Type; color: string }> = {
  text: { icon: Type, color: '#3b82f6' },
  markdownobs: { icon: Type, color: '#14b8a6' },
  image: { icon: Image, color: '#10b981' },
  math: { icon: Sigma, color: '#f59e0b' },
  table: { icon: Table2, color: '#8b5cf6' },
  line: { icon: Minus, color: '#6b7280' },
  shape: { icon: Square, color: '#ec4899' },
  connector: { icon: Waypoints, color: '#f97316' },
  toc: { icon: ListTree, color: '#0ea5e9' },
  glossary: { icon: BookDashed, color: '#22c55e' },
  references: { icon: BookText, color: '#f59e0b' },
};

export default function LayersPanel({
  elements,
  groups,
  selectedIds,
  selectedGroupId,
  onSelectElement,
  onSelectGroup,
  onCreateGroup,
  onUngroup,
  onRenameGroup,
  onDeleteElement,
  onRenameElement,
  onMoveLayer,
  onReorder,
  editingContext,
}: Props) {
  const dragFrom = useRef<number>(-1);
  const dragTo = useRef<number>(-1);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [elementNameDraft, setElementNameDraft] = useState('');

  const contextLabel = editingContext === 'header' ? 'Header' : editingContext === 'footer' ? 'Footer' : 'Page';
  const canGroup = editingContext === 'page';
  const groupMembers = new Set(groups.flatMap((g) => g.elementIds));

  return (
    <div className="p-2">
      <div className="text-xs font-medium mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>
        {contextLabel} Layers ({elements.length})
      </div>

      {canGroup && (
        <div className="mb-2 border rounded-md p-1.5" style={{ borderColor: 'var(--panel-border)', background: 'var(--hover-bg)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <FolderTree className="w-3 h-3" /> Groups ({groups.length})
            </div>
            <button
              onClick={onCreateGroup}
              disabled={selectedIds.length < 2}
              className="px-1.5 py-0.5 rounded text-[10px] cursor-pointer disabled:opacity-40"
              style={{ background: 'var(--panel-bg)', color: 'var(--text-secondary)' }}
              title="Group selected elements"
            >
              <Link className="w-3 h-3" />
            </button>
          </div>
          {groups.length === 0 && (
            <div className="text-[10px] px-1" style={{ color: 'var(--text-secondary)' }}>
              No groups
            </div>
          )}
          <div className="space-y-1">
            {groups.map((group) => {
              const active = selectedGroupId === group.id;
              return (
                <div
                  key={group.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('application/arxiv-entity', JSON.stringify({ type: 'group', id: group.id }));
                  }}
                  className="px-1.5 py-1 rounded border"
                  style={{
                    borderColor: active ? 'var(--selected-border)' : 'var(--panel-border)',
                    background: active ? 'var(--selected-bg)' : 'var(--panel-bg)',
                  }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectGroup(group.id)}
                      className="flex-1 text-left text-[11px] truncate cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                      title={group.name}
                    >
                      <FolderOpen className="inline w-3 h-3 mr-1" />
                      {group.name}
                    </button>
                    <button
                      onClick={() => {
                        const next = prompt('Rename group', group.name);
                        if (next && next.trim()) onRenameGroup(group.id, next.trim());
                      }}
                      className="p-0.5 rounded cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onUngroup(group.id)}
                      className="p-0.5 rounded cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Ungroup"
                    >
                      <Unlink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {group.elementIds.length} element(s)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {elements.length === 0 && (
        <div className="text-xs px-1 py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
          No elements yet
        </div>
      )}

      {[...elements].reverse().map((el, revIdx) => {
        const realIdx = elements.length - 1 - revIdx;
        const { icon: Icon, color } = typeIcons[el.type] || typeIcons.text;
        const isSelected = selectedIds.includes(el.id);
        const inGroup = groupMembers.has(el.id);

        return (
          <div
            key={el.id}
            draggable
            onDragStart={(e) => {
              dragFrom.current = realIdx;
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('application/arxiv-entity', JSON.stringify({ type: 'element', id: el.id }));
            }}
            onDragOver={(e) => { e.preventDefault(); dragTo.current = realIdx; }}
            onDrop={() => {
              if (dragFrom.current !== dragTo.current && dragFrom.current >= 0) {
                onReorder(dragFrom.current, dragTo.current);
              }
              dragFrom.current = -1;
            }}
            onClick={(e) => onSelectElement(el.id, e.ctrlKey || e.metaKey)}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded-md cursor-pointer group text-xs transition-colors"
            style={{
              background: isSelected ? 'var(--selected-bg)' : 'transparent',
              border: isSelected ? '1px solid var(--selected-border)' : '1px solid transparent',
            }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
          >
            <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50 cursor-grab shrink-0" style={{ color: 'var(--text-secondary)' }} />
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            {editingElementId === el.id ? (
              <input
                autoFocus
                value={elementNameDraft}
                onChange={(e) => setElementNameDraft(e.target.value)}
                onBlur={() => {
                  const next = elementNameDraft.trim();
                  if (next) onRenameElement(el.id, next);
                  setEditingElementId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                  if (e.key === 'Escape') setEditingElementId(null);
                }}
                className="truncate flex-1 text-xs px-1 py-0.5 rounded border outline-none"
                style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
              />
            ) : (
              <span
                className="truncate flex-1"
                style={{ color: 'var(--text-primary)' }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingElementId(el.id);
                  const fallback = el.type === 'text'
                    ? (el.content.replace(/<[^>]*>/g, '').slice(0, 20) || 'Text')
                    : el.type;
                  setElementNameDraft(el.name || fallback);
                }}
              >
                {el.name || (el.type === 'text' ? (el.content.replace(/<[^>]*>/g, '').slice(0, 20) || 'Text') : el.type)}
              </span>
            )}
            {inGroup && <FolderOpen className="w-3 h-3 shrink-0" style={{ color: 'var(--text-secondary)' }} />}
            {el.isMaster && <Star className="w-3 h-3 text-amber-500 shrink-0" />}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); onMoveLayer(el.id, 'up'); }} className="p-0.5 rounded cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <ChevronUp className="w-3 h-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onMoveLayer(el.id, 'down'); }} className="p-0.5 rounded cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <ChevronDown className="w-3 h-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDeleteElement(el.id); }} className="p-0.5 rounded cursor-pointer" style={{ color: '#ef4444' }}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
