import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type {
  Project,
  Element,
  Page,
  EditingContext,
  LeftPanelTab,
  RightPanelTab,
  Settings,
  ThemeMode,
  AssetItem,
  FontAsset,
  ElementGroup,
} from '../types';
import { createId, createElement, getPageSize, TEXT_PRESETS } from '../utils/constants';
import { generateLatex } from '../utils/latex';
import { runLinter } from '../utils/linter';
import { isObsidianOpenUri, textToHtml } from '../utils/markdown';
import { useAutoSave } from '../hooks/useAutoSave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import Canvas from './Canvas';
import LayersPanel from './LayersPanel';
import PagesPanel from './PagesPanel';
import PropertiesPanel from './PropertiesPanel';
import ValidatorPanel from './ValidatorPanel';
import LatexPanel from './LatexPanel';
import Toolbar from './Toolbar';
import FloatingBar from './FloatingBar';
import AssetsPanel from './AssetsPanel';
import {
  ArrowLeft, Layers, FileText, Settings as SettingsIcon, AlertTriangle, Code,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Moon, Sun, Download, Upload, Printer, Circle, FolderOpen, Undo2, Redo2, Maximize2, Minimize2, FileDown,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { exportProjectJson, importProjectJson } from '../store/workspace';

interface Props {
  project: Project;
  onChange: (p: Project) => void;
  onBack: () => void;
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

interface TransformStatus {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

interface ObsidianBridgePayload {
  kind?: 'text' | 'markdown' | 'image';
  text?: string;
  html?: string;
  dataUrl?: string;
  sourcePath?: string;
  x?: number;
  y?: number;
  pageId?: string;
}

export default function Editor({ project, onChange, onBack, themeMode, toggleTheme }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingContext, setEditingContext] = useState<EditingContext>('page');
  const [activePageId, setActivePageId] = useState(project.pages[0]?.id || '');
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [leftTab, setLeftTab] = useState<LeftPanelTab>('layers');
  const [rightTab, setRightTab] = useState<RightPanelTab>('properties');
  const [transformStatus, setTransformStatus] = useState<TransformStatus | null>(null);
  const clipboard = useRef<Element | null>(null);
  const loadedFontsRef = useRef<Set<string>>(new Set());
  const historyRef = useRef<{ past: Project[]; future: Project[] }>({ past: [], future: [] });
  const latestProjectRef = useRef(project);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => Boolean(document.fullscreenElement));

  useAutoSave(project);

  const pages = project.pages;
  const settings = project.settings;
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const primarySelectedId = selectedIds[0] || null;

  useEffect(() => {
    latestProjectRef.current = project;
  }, [project]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const commitProject = useCallback((next: Project | ((current: Project) => Project), withHistory = true) => {
    const current = latestProjectRef.current;
    const resolved = typeof next === 'function'
      ? (next as (current: Project) => Project)(current)
      : next;
    if (withHistory) {
      historyRef.current.past.push(cloneProject(current));
      if (historyRef.current.past.length > 120) historyRef.current.past.shift();
      historyRef.current.future = [];
    }
    latestProjectRef.current = resolved;
    onChange(resolved);
  }, [onChange]);

  const undo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;
    const prev = historyRef.current.past.pop()!;
    historyRef.current.future.push(cloneProject(latestProjectRef.current));
    latestProjectRef.current = prev;
    onChange(prev);
    setSelectedIds([]);
    setSelectedGroupId(null);
  }, [onChange]);

  const redo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;
    const next = historyRef.current.future.pop()!;
    historyRef.current.past.push(cloneProject(latestProjectRef.current));
    latestProjectRef.current = next;
    onChange(next);
    setSelectedIds([]);
    setSelectedGroupId(null);
  }, [onChange]);

  useEffect(() => {
    for (const font of project.fonts) {
      if (loadedFontsRef.current.has(font.id)) continue;
      loadedFontsRef.current.add(font.id);
      const face = new FontFace(font.family, `url(${font.dataUrl})`);
      face.load().then((f) => document.fonts.add(f)).catch(() => undefined);
    }
  }, [project.fonts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const getCurrentElements = useCallback((): Element[] => {
    if (editingContext === 'header') return project.headerElements;
    if (editingContext === 'footer') return project.footerElements;
    return activePage?.elements || [];
  }, [editingContext, project.headerElements, project.footerElements, activePage]);

  const getCurrentGroups = useCallback((): ElementGroup[] => {
    if (editingContext !== 'page') return [];
    return activePage?.groups || [];
  }, [editingContext, activePage]);

  useEffect(() => {
    const ids = new Set(getCurrentElements().map((el) => el.id));
    setSelectedIds((prev) => prev.filter((id) => ids.has(id)));
  }, [getCurrentElements]);

  const updateCurrentElements = useCallback(
    (fn: (els: Element[]) => Element[]) => {
      if (editingContext === 'header') {
        commitProject({ ...project, headerElements: fn(project.headerElements) });
      } else if (editingContext === 'footer') {
        commitProject({ ...project, footerElements: fn(project.footerElements) });
      } else {
        commitProject({
          ...project,
          pages: project.pages.map((p) =>
            p.id === activePageId ? { ...p, elements: fn(p.elements) } : p
          ),
        });
      }
    },
    [editingContext, project, activePageId, commitProject]
  );

  const updateCurrentGroups = useCallback(
    (fn: (groups: ElementGroup[]) => ElementGroup[]) => {
      if (editingContext !== 'page') return;
      commitProject({
        ...project,
        pages: project.pages.map((p) =>
          p.id === activePageId ? { ...p, groups: fn(p.groups || []) } : p
        ),
      });
    },
    [editingContext, project, activePageId, commitProject]
  );

  const updatePage = useCallback((pageId: string, updates: Partial<Page>) => {
    commitProject({
      ...project,
      pages: project.pages.map((p) => (p.id === pageId ? { ...p, ...updates } : p)),
    });
  }, [project, commitProject]);

  const selectedElement = useMemo(
    () => (primarySelectedId ? getCurrentElements().find((el) => el.id === primarySelectedId) || null : null),
    [getCurrentElements, primarySelectedId]
  );

  const updateSettings = (partial: Partial<Settings>) => {
    commitProject({ ...project, settings: { ...settings, ...partial } });
  };

  const fitPageToViewport = useCallback(() => {
    if (!activePage) return;
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    const { width } = getPageSize(activePage);
    const reserved = 64 + 18 + 8;
    const availableWidth = Math.max(200, viewport.clientWidth - reserved);
    const nextZoom = Math.floor((availableWidth / width) * 100);
    updateSettings({ zoom: Math.max(25, Math.min(300, nextZoom)) });
  }, [activePage, updateSettings]);

  const toggleAppFullscreen = useCallback(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'arxiv.obsidian.toggle-fullscreen' }, '*');
      setIsFullscreen((v) => !v);
      return;
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  const runCleanPrint = useCallback(async () => {
    const prevSelected = [...selectedIds];
    const prevGroup = selectedGroupId;
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      document.body.classList.remove('printing-pdf');
      setSelectedIds(prevSelected);
      setSelectedGroupId(prevGroup);
    };

    try {
      setSelectedIds([]);
      setSelectedGroupId(null);
      document.body.classList.add('printing-pdf');
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      window.addEventListener('afterprint', restore, { once: true });
      const prevTitle = document.title;
      document.title = ' ';
      window.print();
      document.title = prevTitle;
    } finally {
      window.setTimeout(restore, 1200);
    }
  }, [selectedIds, selectedGroupId]);

  const printDocument = useCallback(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'arxiv.obsidian.print' }, '*');
    }
    runCleanPrint().catch(() => undefined);
  }, [runCleanPrint]);

  const saveAsPdf = useCallback(async () => {
    const prevSelected = [...selectedIds];
    const prevGroup = selectedGroupId;
    const waitFrames = async (count: number) => {
      for (let i = 0; i < count; i += 1) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    };

    try {
      setSelectedIds([]);
      setSelectedGroupId(null);
      document.body.classList.add('exporting-pdf');
      await waitFrames(2);

      const pageNodes = Array.from(document.querySelectorAll<HTMLDivElement>('.print-page'));
      if (pageNodes.length === 0) return;

      let pdf: InstanceType<typeof jsPDF> | null = null;
      for (let i = 0; i < pageNodes.length; i += 1) {
        const node = pageNodes[i];
        const rect = node.getBoundingClientRect();
        const pageW = Math.max(1, Math.round(rect.width));
        const pageH = Math.max(1, Math.round(rect.height));
        const orientation = pageW > pageH ? 'landscape' : 'portrait';

        const canvas = await html2canvas(node, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
        const img = canvas.toDataURL('image/png');

        if (!pdf) {
          pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [pageW, pageH],
            compress: true,
          });
        } else {
          pdf.addPage([pageW, pageH], orientation);
        }
        pdf.addImage(img, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
      }

      if (!pdf) return;
      const safeName = (project.name || 'arxiv-studio')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .trim() || 'arxiv-studio';
      pdf.save(`${safeName}.pdf`);
    } catch (error) {
      console.error('Save as PDF failed:', error);
      window.alert('Save as PDF failed. Check console for details.');
    } finally {
      document.body.classList.remove('exporting-pdf');
      setSelectedIds(prevSelected);
      setSelectedGroupId(prevGroup);
    }
  }, [project.name, selectedIds, selectedGroupId]);

  const updateElement = (id: string, updates: Partial<Element>) => {
    const current = getCurrentElements();
    const source = current.find((el) => el.id === id);
    if (!source) return;

    if (selectedIds.length > 1 && selectedIds.includes(id)) {
      const keys = Object.keys(updates);
      const movingOnly = keys.every((k) => k === 'x' || k === 'y');
      if (movingOnly) {
        const dx = (updates.x ?? source.x) - source.x;
        const dy = (updates.y ?? source.y) - source.y;
        updateCurrentElements((els) =>
          els.map((el) => selectedIds.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el)
        );
        return;
      }

      const resizing = 'w' in updates || 'h' in updates;
      if (resizing) {
        const sx = (updates.w ?? source.w) / Math.max(1, source.w);
        const sy = (updates.h ?? source.h) / Math.max(1, source.h);
        const nx = updates.x ?? source.x;
        const ny = updates.y ?? source.y;
        updateCurrentElements((els) =>
          els.map((el) => {
            if (!selectedIds.includes(el.id)) return el;
            if (el.id === id) return { ...el, ...updates };
            return {
              ...el,
              x: nx + (el.x - source.x) * sx,
              y: ny + (el.y - source.y) * sy,
              w: Math.max(10, el.w * sx),
              h: Math.max(10, el.h * sy),
            };
          })
        );
        return;
      }

      if ('rotation' in updates && keys.length === 1) {
        const delta = (updates.rotation ?? source.rotation) - source.rotation;
        updateCurrentElements((els) =>
          els.map((el) => selectedIds.includes(el.id)
            ? { ...el, rotation: ((el.rotation + delta) % 360 + 360) % 360 }
            : el
          )
        );
        return;
      }
    }

    updateCurrentElements((els) => els.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  const addElement = (type: Element['type'], overrides: Partial<Element> = {}) => {
    const defaultFont = (type === 'text' || type === 'markdownobs' || type === 'table' || type === 'toc' || type === 'glossary' || type === 'references')
      ? { fontFamily: settings.defaultFont }
      : {};
    const el = createElement(type, { ...defaultFont, ...overrides });
    updateCurrentElements((els) => [...els, el]);
    setSelectedIds([el.id]);
    setSelectedGroupId(null);
  };

  const addPreset = (preset: keyof typeof TEXT_PRESETS) => {
    const label = preset.charAt(0).toUpperCase() + preset.slice(1);
    const content = preset === 'title'
      ? `<h1>${label}</h1>`
      : preset === 'heading'
        ? `<h2>${label}</h2>`
        : label;
    addElement('text', {
      ...TEXT_PRESETS[preset],
      fontFamily: settings.defaultFont,
      content,
    });
  };

  const requestResolveObsidianUri = useCallback((uri: string, extra?: { x?: number; y?: number; pageId?: string; kindHint?: 'drop' | 'paste' }) => {
    if (!uri.trim()) return;
    window.parent.postMessage({
      type: 'arxiv.obsidian.resolve-uri',
      payload: {
        uri,
        ...extra,
      },
    }, '*');
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; payload?: ObsidianBridgePayload };
      if (!data || data.type !== 'arxiv.obsidian.drop' || !data.payload) return;
      const payload = data.payload;
      const position = (Number.isFinite(payload.x) && Number.isFinite(payload.y))
        ? { x: Number(payload.x), y: Number(payload.y) }
        : {};
      if (payload.pageId && payload.pageId !== activePageId) {
        setActivePageId(payload.pageId);
        setEditingContext('page');
      }

      if (payload.kind === 'image' && payload.dataUrl) {
        addElement('image', { content: payload.dataUrl, ...position, name: payload.sourcePath ? `obs:${payload.sourcePath}` : undefined });
        const sourceName = payload.sourcePath?.split('/').pop() || 'obsidian-image';
        commitProject((current) => ({
          ...current,
          assets: [
            ...current.assets,
            {
              id: createId(),
              name: sourceName,
              dataUrl: payload.dataUrl!,
              mimeType: 'image/*',
              folder: 'assets/images',
              kind: 'image',
            },
          ],
        }));
        return;
      }

      if (payload.kind === 'markdown' && payload.text) {
        addElement('markdownobs', {
          content: payload.text,
          renderedMarkdownHtml: payload.html || undefined,
          w: 520,
          h: 280,
          fontFamily: settings.defaultFont,
          ...position,
          name: payload.sourcePath ? `obs:${payload.sourcePath}` : 'obs:markdown',
        });
        return;
      }

      if (payload.kind === 'text' && payload.text) {
        addElement('text', {
          content: textToHtml(payload.text),
          w: 460,
          h: 140,
          ...position,
          name: payload.sourcePath ? `obs:${payload.sourcePath}` : 'obs:text',
        });
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [addElement, settings.defaultFont, activePageId, commitProject]);

  useEffect(() => {
    const onHostPrint = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null;
      if (!data || data.type !== 'arxiv.obsidian.host-print') return;
      runCleanPrint().catch(() => undefined);
    };
    window.addEventListener('message', onHostPrint);
    return () => window.removeEventListener('message', onHostPrint);
  }, [runCleanPrint]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      const md = e.clipboardData?.getData('text/markdown') || '';
      const text = e.clipboardData?.getData('text/plain') || '';
      const html = e.clipboardData?.getData('text/html') || '';
      const uri = extractObsidianUri(text);
      if (uri) {
        e.preventDefault();
        requestResolveObsidianUri(uri, { pageId: activePageId, kindHint: 'paste' });
        return;
      }
      const markdown = md.trim() ? md : text;
      if (!markdown.trim()) return;
      e.preventDefault();
      if (looksLikeMarkdown(markdown)) {
        addElement('markdownobs', {
          content: markdown,
          renderedMarkdownHtml: htmlWithTags(html) ? html : undefined,
          w: 520,
          h: 280,
          fontFamily: settings.defaultFont,
          name: 'obs:paste-markdown',
        });
        return;
      }
      addElement('text', {
        content: textToHtml(markdown),
        w: 460,
        h: 140,
        name: 'obs:paste-text',
      });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [requestResolveObsidianUri, activePageId, addElement, settings.defaultFont]);

  const addPage = () => {
    const newPage: Page = { id: createId(), orientation: 'portrait', paperTexture: null, groups: [], elements: [] };
    commitProject({ ...project, pages: [...pages, newPage] });
    setActivePageId(newPage.id);
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) return;
    const remaining = pages.filter((p) => p.id !== id);
    commitProject({ ...project, pages: remaining });
    if (activePageId === id) setActivePageId(remaining[0].id);
  };

  const reorderPages = (fromIdx: number, toIdx: number) => {
    const arr = [...pages];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    commitProject({ ...project, pages: arr });
  };

  const moveLayer = (id: string, direction: 'up' | 'down' | 'front' | 'back') => {
    updateCurrentElements((els) => {
      const arr = [...els];
      const idx = arr.findIndex((el) => el.id === id);
      if (idx < 0) return els;
      if (direction === 'front') { const [el] = arr.splice(idx, 1); arr.push(el); }
      else if (direction === 'back') { const [el] = arr.splice(idx, 1); arr.unshift(el); }
      else if (direction === 'up' && idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; }
      else if (direction === 'down' && idx > 0) { [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]; }
      return arr;
    });
  };

  const reorderLayers = (fromIdx: number, toIdx: number) => {
    updateCurrentElements((els) => {
      const arr = [...els];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };

  const removeElements = useCallback((ids: string[]) => {
    if (!ids.length) return;
    const removed = new Set(ids);

    commitProject((current) => {
      if (editingContext === 'header') {
        return {
          ...current,
          headerElements: current.headerElements.filter((el) => !removed.has(el.id)),
        };
      }

      if (editingContext === 'footer') {
        return {
          ...current,
          footerElements: current.footerElements.filter((el) => !removed.has(el.id)),
        };
      }

      return {
        ...current,
        pages: current.pages.map((p) => {
          if (p.id !== activePageId) return p;
          const groups = (p.groups || [])
            .map((g) => ({ ...g, elementIds: g.elementIds.filter((id) => !removed.has(id)) }))
            .filter((g) => g.elementIds.length > 0);
          return {
            ...p,
            elements: p.elements.filter((el) => !removed.has(el.id)),
            groups,
          };
        }),
      };
    });

    setSelectedIds((prev) => prev.filter((id) => !removed.has(id)));
    if (selectedGroupId) {
      const group = getCurrentGroups().find((g) => g.id === selectedGroupId);
      if (!group || group.elementIds.some((id) => removed.has(id))) setSelectedGroupId(null);
    }
  }, [commitProject, editingContext, activePageId, selectedGroupId, getCurrentGroups]);

  useKeyboardShortcuts({
    selectedId: primarySelectedId,
    selectedIds,
    getElements: getCurrentElements,
    updateElements: updateCurrentElements,
    clipboard,
    setSelectedId: (id) => setSelectedIds(id ? [id] : []),
    onDeleteElements: removeElements,
  });

  const createGroupFromSelection = () => {
    if (editingContext !== 'page' || selectedIds.length < 2) return;
    const existing = getCurrentGroups();
    const group: ElementGroup = {
      id: createId(),
      name: `Group ${existing.length + 1}`,
      elementIds: [...selectedIds],
    };
    updateCurrentGroups((groups) => [...groups, group]);
    setSelectedGroupId(group.id);
  };

  const selectGroup = (groupId: string) => {
    const group = getCurrentGroups().find((g) => g.id === groupId);
    if (!group) return;
    const valid = new Set(getCurrentElements().map((el) => el.id));
    setSelectedIds(group.elementIds.filter((id) => valid.has(id)));
    setSelectedGroupId(groupId);
  };

  const ungroup = (groupId: string) => {
    updateCurrentGroups((groups) => groups.filter((g) => g.id !== groupId));
    if (selectedGroupId === groupId) setSelectedGroupId(null);
  };

  const renameGroup = (groupId: string, name: string) => {
    updateCurrentGroups((groups) => groups.map((g) => (g.id === groupId ? { ...g, name } : g)));
  };

  const moveEntityToPage = useCallback(
    (payload: { type: 'element' | 'group'; id: string }, targetPageId: string) => {
      const snapshot = latestProjectRef.current;
      const targetExists = snapshot.pages.some((p) => p.id === targetPageId);
      if (!targetExists) return;

      if (payload.type === 'element') {
        const sourcePage = snapshot.pages.find((p) => p.elements.some((el) => el.id === payload.id));
        if (!sourcePage) return;

        setEditingContext('page');
        setActivePageId(targetPageId);
        setSelectedGroupId(null);
        setSelectedIds([payload.id]);

        if (sourcePage.id === targetPageId) return;

        commitProject((current) => {
          const src = current.pages.find((p) => p.elements.some((el) => el.id === payload.id));
          if (!src) return current;
          const moved = src.elements.find((el) => el.id === payload.id);
          if (!moved) return current;
          return {
            ...current,
            pages: current.pages.map((p) => {
              if (p.id === src.id) {
                return {
                  ...p,
                  elements: p.elements.filter((el) => el.id !== payload.id),
                  groups: (p.groups || [])
                    .map((g) => ({ ...g, elementIds: g.elementIds.filter((id) => id !== payload.id) }))
                    .filter((g) => g.elementIds.length > 0),
                };
              }
              if (p.id === targetPageId) {
                return { ...p, elements: [...p.elements, moved], groups: p.groups || [] };
              }
              return p;
            }),
          };
        });
        return;
      }

      const sourcePage = snapshot.pages.find((p) => (p.groups || []).some((g) => g.id === payload.id));
      if (!sourcePage) return;
      const sourceGroup = (sourcePage.groups || []).find((g) => g.id === payload.id);
      if (!sourceGroup) return;
      const memberSet = new Set(sourceGroup.elementIds);
      const movedElements = sourcePage.elements.filter((el) => memberSet.has(el.id));
      const movedIds = movedElements.map((el) => el.id);
      if (!movedIds.length) return;

      setEditingContext('page');
      setActivePageId(targetPageId);
      setSelectedGroupId(sourceGroup.id);
      setSelectedIds(movedIds);

      if (sourcePage.id === targetPageId) return;

      commitProject((current) => {
        const src = current.pages.find((p) => (p.groups || []).some((g) => g.id === payload.id));
        if (!src) return current;
        const grp = (src.groups || []).find((g) => g.id === payload.id);
        if (!grp) return current;
        const idsSet = new Set(grp.elementIds);
        const moving = src.elements.filter((el) => idsSet.has(el.id));
        const movingIds = moving.map((el) => el.id);
        if (!movingIds.length) return current;
        const movingIdSet = new Set(movingIds);

        return {
          ...current,
          pages: current.pages.map((p) => {
            if (p.id === src.id) {
              return {
                ...p,
                elements: p.elements.filter((el) => !movingIdSet.has(el.id)),
                groups: (p.groups || [])
                  .filter((g) => g.id !== grp.id)
                  .map((g) => ({ ...g, elementIds: g.elementIds.filter((id) => !movingIdSet.has(id)) }))
                  .filter((g) => g.elementIds.length > 0),
              };
            }
            if (p.id === targetPageId) {
              const groups = p.groups || [];
              const sanitized = groups.filter((g) => g.id !== grp.id);
              return {
                ...p,
                elements: [...p.elements, ...moving],
                groups: [...sanitized, { ...grp, elementIds: movingIds }],
              };
            }
            return p;
          }),
        };
      });
    },
    [commitProject]
  );

  const latex = useMemo(
    () => generateLatex(pages, project.headerElements, project.footerElements),
    [pages, project.headerElements, project.footerElements]
  );

  const warnings = useMemo(
    () => runLinter(pages, project.headerElements, project.footerElements, settings),
    [pages, project.headerElements, project.footerElements, settings]
  );

  const handleExportJson = () => {
    const blob = new Blob([exportProjectJson(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const p = importProjectJson(reader.result as string);
        if (p) window.location.reload();
        else alert('Invalid file');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDownloadLatex = () => {
    const blob = new Blob([latex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAssets = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.svg';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (!files.length) return;
      const newAssets = await Promise.all(files.map((file) => readFileAsAsset(file)));
      commitProject({ ...project, assets: [...project.assets, ...newAssets] });
    };
    input.click();
  };

  const handleImportFonts = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (!files.length) return;
      const newFonts = await Promise.all(files.map((file) => readFileAsFont(file)));
      commitProject({ ...project, fonts: [...project.fonts, ...newFonts] });
    };
    input.click();
  };

  const iconTheme = themeMode === 'light'
    ? <Moon className="w-4 h-4" />
    : themeMode === 'dark'
      ? <Circle className="w-4 h-4 text-sky-400" />
      : <Sun className="w-4 h-4 text-yellow-400" />;

  const handleSelect = (id: string | null, append = false) => {
    if (!id) {
      setSelectedIds([]);
      setSelectedGroupId(null);
      return;
    }

    // Keep group selection stable when interacting with one of its members.
    if (!append && selectedGroupId) {
      const group = getCurrentGroups().find((g) => g.id === selectedGroupId);
      if (group && group.elementIds.includes(id)) {
        const valid = new Set(getCurrentElements().map((el) => el.id));
        setSelectedIds(group.elementIds.filter((elId) => valid.has(elId)));
        return;
      }
    }

    setSelectedGroupId(null);
    if (!append) {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const panelElement = selectedIds.length === 1 ? selectedElement : null;
  const canAddAsAsset = panelElement && ['image', 'shape', 'line', 'connector', 'math', 'text', 'markdownobs', 'toc', 'glossary', 'references'].includes(panelElement.type);

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--canvas-bg)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b shrink-0 no-print" style={{ background: 'var(--toolbar-bg)', borderColor: 'var(--panel-border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 rounded-md cursor-pointer transition-colors" style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{project.name}</span>
        </div>

        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'var(--hover-bg)' }}>
          {(['header', 'page', 'footer'] as EditingContext[]).map((ctx) => (
            <button
              key={ctx}
              onClick={() => { setEditingContext(ctx); setSelectedIds([]); setSelectedGroupId(null); }}
              className="px-3 py-1 text-xs rounded-md font-medium cursor-pointer transition-colors"
              style={{
                background: editingContext === ctx ? 'var(--selected-border)' : 'transparent',
                color: editingContext === ctx ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {ctx === 'header' ? 'Header' : ctx === 'footer' ? 'Footer' : `Page ${pages.findIndex((p) => p.id === activePageId) + 1}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={undo} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-4 h-4" />
          </button>
          <button onClick={handleImportJson} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Import JSON">
            <Upload className="w-4 h-4" />
          </button>
          <button onClick={handleExportJson} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Export JSON">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={saveAsPdf} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Save as PDF">
            <FileDown className="w-4 h-4" />
          </button>
          <button onClick={printDocument} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Print PDF">
            <Printer className="w-4 h-4" />
          </button>
          <button onClick={toggleTheme} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Theme cycle: Light -> Dark -> Dark + White paper">
            {iconTheme}
          </button>
          <button
            onClick={toggleAppFullscreen}
            className="p-1.5 rounded-md cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            title="Toggle fullscreen view"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setShowLeft((v) => !v)} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            {showLeft ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <button onClick={() => setShowRight((v) => !v)} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            {showRight ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Toolbar
        onAdd={addElement}
        onAddPreset={addPreset}
        settings={settings}
        onUpdateSettings={updateSettings}
        onFitPage={fitPageToViewport}
      />

      <div className="flex flex-1 overflow-hidden">
        {showLeft && (
          <div className="w-64 border-r flex flex-col shrink-0 no-print" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="flex border-b" style={{ borderColor: 'var(--panel-border)' }}>
              {([['layers', Layers, 'Layers'], ['pages', FileText, 'Pages'], ['assets', FolderOpen, 'Assets']] as const).map(([tab, Icon, label]) => (
                <button
                  key={tab}
                  onClick={() => setLeftTab(tab as LeftPanelTab)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium cursor-pointer transition-colors"
                  style={{
                    color: leftTab === tab ? 'var(--selected-border)' : 'var(--text-secondary)',
                    borderBottom: leftTab === tab ? '2px solid var(--selected-border)' : '2px solid transparent',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {leftTab === 'layers' && (
                <LayersPanel
                  elements={getCurrentElements()}
                  groups={getCurrentGroups()}
                  selectedIds={selectedIds}
                  selectedGroupId={selectedGroupId}
                  onSelectElement={handleSelect}
                  onSelectGroup={selectGroup}
                  onCreateGroup={createGroupFromSelection}
                  onUngroup={ungroup}
                  onRenameGroup={renameGroup}
                  onDeleteElement={(id) => removeElements([id])}
                  onRenameElement={(id, name) => updateElement(id, { name })}
                  onMoveLayer={moveLayer}
                  onReorder={reorderLayers}
                  editingContext={editingContext}
                />
              )}
              {leftTab === 'pages' && (
                <PagesPanel
                  pages={pages}
                  activePageId={activePageId}
                  onSelect={(id) => { setActivePageId(id); setEditingContext('page'); setSelectedIds([]); setSelectedGroupId(null); }}
                  onAdd={addPage}
                  onDelete={deletePage}
                  onReorder={reorderPages}
                  onDropEntity={moveEntityToPage}
                />
              )}
              {leftTab === 'assets' && (
                <AssetsPanel
                  assets={project.assets}
                  assetFolders={project.assetFolders}
                  fonts={project.fonts}
                  onImportAssets={handleImportAssets}
                  onImportFonts={handleImportFonts}
                  onMoveAsset={(id, folder) => commitProject({
                    ...project,
                    assets: project.assets.map((a) => (a.id === id ? { ...a, folder } : a)),
                    assetFolders: project.assetFolders.includes(folder) ? project.assetFolders : [...project.assetFolders, folder],
                  })}
                  onMoveFont={(id, folder) => commitProject({
                    ...project,
                    fonts: project.fonts.map((f) => (f.id === id ? { ...f, folder } : f)),
                    assetFolders: project.assetFolders.includes(folder) ? project.assetFolders : [...project.assetFolders, folder],
                  })}
                  onDeleteAsset={(id) => commitProject({ ...project, assets: project.assets.filter((a) => a.id !== id) })}
                  onDeleteFont={(id) => commitProject({ ...project, fonts: project.fonts.filter((f) => f.id !== id) })}
                  onCreateFolder={(folder) => commitProject({
                    ...project,
                    assetFolders: project.assetFolders.includes(folder) ? project.assetFolders : [...project.assetFolders, folder],
                  })}
                  onRenameFolder={(from, to) => commitProject({
                    ...project,
                    assetFolders: project.assetFolders.map((folder) => replaceFolderPrefix(folder, from, to)),
                    assets: project.assets.map((asset) => ({ ...asset, folder: replaceFolderPrefix(asset.folder, from, to) })),
                    fonts: project.fonts.map((font) => ({ ...font, folder: replaceFolderPrefix(font.folder, from, to) })),
                  })}
                  onRenameAsset={(id, name) => commitProject({
                    ...project,
                    assets: project.assets.map((asset) => (asset.id === id ? { ...asset, name } : asset)),
                  })}
                  onRenameFont={(id, name) => commitProject({
                    ...project,
                    fonts: project.fonts.map((font) => (font.id === id ? { ...font, name } : font)),
                  })}
                />
              )}
            </div>
          </div>
        )}

        <div
          ref={canvasViewportRef}
          className="flex-1 overflow-auto relative"
          onWheel={(e) => {
            if (!e.shiftKey) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? -5 : 5;
            updateSettings({ zoom: Math.max(25, Math.min(300, settings.zoom + delta)) });
          }}
        >
              <Canvas
                pages={pages}
                headerElements={project.headerElements}
                footerElements={project.footerElements}
                assets={project.assets}
                themeMode={themeMode}
                activePageId={activePageId}
                editingContext={editingContext}
                selectedIds={selectedIds}
                settings={settings}
            onSelect={handleSelect}
            onUpdateElement={updateElement}
            onSetEditingText={() => undefined}
            onSetActivePageId={(id) => { setActivePageId(id); setEditingContext('page'); }}
            onAddElement={(el) => {
              updateCurrentElements((els) => [...els, el]);
              setSelectedIds([el.id]);
            }}
            onRequestResolveObsidianUri={requestResolveObsidianUri}
            onTransformStatusChange={setTransformStatus}
            showAlignmentGuides={Boolean(transformStatus)}
          />
        </div>

        {showRight && (
          <div className="w-72 border-l flex flex-col shrink-0 no-print" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <div className="flex border-b" style={{ borderColor: 'var(--panel-border)' }}>
              {([
                ['properties', SettingsIcon, 'Props'],
                ['validator', AlertTriangle, 'Lint'],
                ['latex', Code, 'LaTeX'],
              ] as const).map(([tab, Icon, label]) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab as RightPanelTab)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium cursor-pointer transition-colors"
                  style={{
                    color: rightTab === tab ? 'var(--selected-border)' : 'var(--text-secondary)',
                    borderBottom: rightTab === tab ? '2px solid var(--selected-border)' : '2px solid transparent',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {rightTab === 'properties' && (
                <PropertiesPanel
                  element={panelElement}
                  page={activePage}
                  projectAssets={project.assets}
                  projectFonts={project.fonts}
                  onUpdate={(updates) => panelElement && updateElement(panelElement.id, updates)}
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  onUpdatePage={(updates) => activePage && updatePage(activePage.id, updates)}
                />
              )}
              {rightTab === 'validator' && <ValidatorPanel warnings={warnings} />}
              {rightTab === 'latex' && <LatexPanel latex={latex} onDownload={handleDownloadLatex} />}
            </div>
          </div>
        )}
      </div>

      {panelElement && (
        <FloatingBar
          element={panelElement}
          onUpdate={(updates) => updateElement(panelElement.id, updates)}
          onMoveLayer={(dir) => moveLayer(panelElement.id, dir)}
          onDelete={() => removeElements([panelElement.id])}
          onToggleMaster={() => updateElement(panelElement.id, { isMaster: !panelElement.isMaster })}
          onAddToLibrary={canAddAsAsset ? () => {
            const asset = elementToAsset(panelElement);
            if (!asset) return;
            commitProject({ ...project, assets: [...project.assets, asset] });
          } : undefined}
        />
      )}

      <div className="h-6 px-3 flex items-center justify-between text-xs border-t no-print" style={{ background: 'var(--toolbar-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-secondary)' }}>
        {transformStatus ? (
          <span>
            {transformStatus.id.slice(0, 6)} | x:{Math.round(transformStatus.x)} y:{Math.round(transformStatus.y)} | w:{Math.round(transformStatus.w)} h:{Math.round(transformStatus.h)} | r:{Math.round(transformStatus.rotation)}°
          </span>
        ) : (
          <span>Shift + molette: zoom | Ctrl + clic: multi-select</span>
        )}
        <span>{selectedIds.length} selected</span>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

function cloneProject(project: Project): Project {
  return JSON.parse(JSON.stringify(project)) as Project;
}

async function readFileAsAsset(file: File): Promise<AssetItem> {
  const dataUrl = await readFileAsDataUrl(file);
  return {
    id: createId(),
    name: file.name,
    dataUrl,
    mimeType: file.type || 'image/*',
    folder: 'assets/images',
    kind: 'image',
  };
}

async function readFileAsFont(file: File): Promise<FontAsset> {
  const dataUrl = await readFileAsDataUrl(file);
  const family = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || `Font-${createId().slice(0, 6)}`;
  return {
    id: createId(),
    family,
    name: file.name,
    dataUrl,
    mimeType: file.type || 'font/ttf',
    folder: 'assets/fonts',
  };
}

function elementToAsset(element: Element): AssetItem | null {
  if (element.type === 'image' && element.content) {
    return {
      id: createId(),
      name: `asset-image-${createId().slice(0, 4)}.png`,
      dataUrl: element.content,
      mimeType: 'image/png',
      folder: 'assets/images',
      kind: 'image',
    };
  }

  if (element.type === 'shape') {
    const radius = element.isCircle ? '50%' : `${element.cornerRadius || 0}px`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${Math.round(element.w)}' height='${Math.round(element.h)}'>
      <rect x='1' y='1' width='${Math.max(1, Math.round(element.w - 2))}' height='${Math.max(1, Math.round(element.h - 2))}'
        rx='${radius === '50%' ? Math.round(Math.min(element.w, element.h) / 2) : element.cornerRadius || 0}'
        fill='${element.bgColor === 'transparent' ? 'none' : element.bgColor}' stroke='${element.color}' stroke-width='${Math.max(1, element.thickness)}'/>
    </svg>`;
    return svgAsset(svg, 'shape');
  }

  if (element.type === 'line') {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${Math.round(element.w)}' height='${Math.round(element.h)}'>
      <line x1='0' y1='${Math.round(element.h / 2)}' x2='${Math.round(element.w)}' y2='${Math.round(element.h / 2)}'
        stroke='${element.color}' stroke-width='${Math.max(1, element.thickness)}'/>
    </svg>`;
    return svgAsset(svg, 'line');
  }

  if (element.type === 'connector') {
    const points = element.pathPoints || [{ x: 0, y: element.h / 2 }, { x: element.w, y: element.h / 2 }];
    const controls = element.connectorControls || [];
    let d = `M ${points[0].x} ${points[0].y}`;
    if (element.connectorCurved) {
      for (let i = 0; i < points.length - 1; i += 1) {
        const c = controls[i] || { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
        d += ` Q ${c.x} ${c.y} ${points[i + 1].x} ${points[i + 1].y}`;
      }
    } else {
      d = `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
    }
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${Math.round(element.w)}' height='${Math.round(element.h)}'>
      <path d='${d}' fill='none' stroke='${element.color}' stroke-width='${Math.max(1, element.thickness)}'/>
    </svg>`;
    return svgAsset(svg, 'connector');
  }

  if (element.type === 'math') {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${Math.round(element.w)}' height='${Math.round(element.h)}'>
      <rect width='100%' height='100%' fill='white' stroke='#e5e7eb'/>
      <text x='10' y='${Math.round(element.h / 2)}' fill='black' font-family='monospace' font-size='14'>${escapeXml(element.content)}</text>
    </svg>`;
    return svgAsset(svg, 'math');
  }

  if (
    element.type === 'text' ||
    element.type === 'markdownobs' ||
    element.type === 'toc' ||
    element.type === 'glossary' ||
    element.type === 'references'
  ) {
    const plain = stripHtml(element.content);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${Math.round(element.w)}' height='${Math.round(element.h)}'>
      <rect width='100%' height='100%' fill='${element.bgColor === 'transparent' ? 'white' : element.bgColor}'/>
      <text x='8' y='${Math.max(16, Math.round(element.fontSize + 6))}' fill='${element.color}' font-size='${element.fontSize}' font-family='${escapeXml(element.fontFamily)}'>${escapeXml(plain)}</text>
    </svg>`;
    return svgAsset(svg, 'text');
  }

  return null;
}

function svgAsset(svg: string, name: string): AssetItem {
  return {
    id: createId(),
    name: `asset-${name}-${createId().slice(0, 4)}.svg`,
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    mimeType: 'image/svg+xml',
    folder: 'assets/images',
    kind: 'image',
  };
}

function stripHtml(html: string) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').slice(0, 80);
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function replaceFolderPrefix(path: string, from: string, to: string) {
  if (path === from) return to;
  if (path.startsWith(`${from}/`)) return `${to}${path.slice(from.length)}`;
  return path;
}

function extractObsidianUri(text: string) {
  const trimmed = text.trim();
  if (isObsidianOpenUri(trimmed)) return trimmed;
  const found = text.match(/obsidian:\/\/open\?[^\s"']+/i);
  return found ? found[0] : null;
}

function looksLikeMarkdown(text: string) {
  const value = text.trim();
  if (!value) return false;
  return (
    /^#{1,6}\s+/m.test(value) ||
    /^\s*[-*+]\s+/m.test(value) ||
    /^\s*\d+\.\s+/m.test(value) ||
    /```[\s\S]*```/m.test(value) ||
    /\[[^\]]+]\([^)]+\)/m.test(value) ||
    /!\[[^\]]*]\([^)]+\)/m.test(value) ||
    /(^|[\s])\*[^*\n]+\*/m.test(value) ||
    /(^|[\s])_[^_\n]+_/m.test(value)
  );
}

function htmlWithTags(value: string) {
  const text = value.trim();
  return /<\/?[a-z][\s\S]*>/i.test(text);
}
