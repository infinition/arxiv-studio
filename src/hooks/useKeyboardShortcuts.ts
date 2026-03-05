import { useEffect, useRef } from 'react';
import type { Element } from '../types';

interface ShortcutHandlers {
  selectedId: string | null;
  selectedIds: string[];
  getElements: () => Element[];
  updateElements: (fn: (els: Element[]) => Element[]) => void;
  clipboard: React.MutableRefObject<Element | null>;
  setSelectedId: (id: string | null) => void;
  onDeleteElements?: (ids: string[]) => void;
}

export function useKeyboardShortcuts({
  selectedId,
  selectedIds,
  getElements,
  updateElements,
  clipboard,
  setSelectedId,
  onDeleteElements,
}: ShortcutHandlers) {
  const handlers = useRef({ selectedId, selectedIds, getElements, updateElements, clipboard, setSelectedId, onDeleteElements });
  handlers.current = { selectedId, selectedIds, getElements, updateElements, clipboard, setSelectedId, onDeleteElements };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInputTarget = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      const isEditableTarget = !!target?.isContentEditable;

      const { selectedId, selectedIds, getElements, updateElements, clipboard, setSelectedId, onDeleteElements } = handlers.current;
      const effectiveIds = selectedIds.length ? selectedIds : (selectedId ? [selectedId] : []);

      const step = e.shiftKey ? 10 : 1;
      const isDeleteKey = e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Del' || e.key === 'Suppr' || e.code === 'Delete';

      if (isDeleteKey) {
        if (effectiveIds.length === 0) return;
        const selectedPrimary = selectedId ? getElements().find((el) => el.id === selectedId) : null;
        // Keep native deletion behavior when actively editing text/inputs.
        if (isInputTarget) return;
        if (isEditableTarget && selectedPrimary?.type === 'text') return;
        e.preventDefault();
        if (onDeleteElements) {
          onDeleteElements(effectiveIds);
          return;
        }
        const idSet = new Set(effectiveIds);
        updateElements((els) => els.filter((el) => !idSet.has(el.id)));
        setSelectedId(null);
        return;
      }

      if (isInputTarget || isEditableTarget) return;

      if (e.ctrlKey || e.metaKey) {
        const lower = e.key.toLowerCase();
        if (lower === 'c') {
          if (!selectedId) return;
          const el = getElements().find((el) => el.id === selectedId);
          if (el) {
            e.preventDefault();
            clipboard.current = { ...el };
          }
          return;
        }
        if (lower === 'x') {
          if (!selectedId) return;
          const el = getElements().find((el) => el.id === selectedId);
          if (el) {
            e.preventDefault();
            clipboard.current = { ...el };
            if (onDeleteElements) onDeleteElements(effectiveIds.length ? effectiveIds : [selectedId]);
            else {
              updateElements((els) => els.filter((el) => el.id !== selectedId));
              setSelectedId(null);
            }
          }
          return;
        }
        if (lower === 'v' && clipboard.current) {
          e.preventDefault();
          const pasted: Element = {
            ...clipboard.current,
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            x: clipboard.current.x + 20,
            y: clipboard.current.y + 20,
          };
          updateElements((els) => [...els, pasted]);
          setSelectedId(pasted.id);
          return;
        }
      }

      if (!selectedId) return;

      if (e.key === 'ArrowUp') { e.preventDefault(); updateElements((els) => els.map((el) => el.id === selectedId ? { ...el, y: el.y - step } : el)); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); updateElements((els) => els.map((el) => el.id === selectedId ? { ...el, y: el.y + step } : el)); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); updateElements((els) => els.map((el) => el.id === selectedId ? { ...el, x: el.x - step } : el)); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); updateElements((els) => els.map((el) => el.id === selectedId ? { ...el, x: el.x + step } : el)); return; }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
