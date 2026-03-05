import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AssetItem, Element, Page, EditingContext, Settings, ThemeMode } from '../types';
import { createElement, createId, getPageSize } from '../utils/constants';
import { buildDynamicBlockData } from '../utils/dynamicBlocks';
import { isObsidianOpenUri, textToHtml } from '../utils/markdown';
import DraggableElement from './DraggableElement';

interface Props {
  pages: Page[];
  headerElements: Element[];
  footerElements: Element[];
  assets: AssetItem[];
  themeMode: ThemeMode;
  activePageId: string;
  editingContext: EditingContext;
  selectedIds: string[];
  settings: Settings;
  onSelect: (id: string | null, append?: boolean) => void;
  onUpdateElement: (id: string, updates: Partial<Element>) => void;
  onSetEditingText: (v: boolean) => void;
  onSetActivePageId: (id: string) => void;
  onAddElement: (el: Element) => void;
  onRequestResolveObsidianUri: (uri: string, extra?: { x?: number; y?: number; pageId?: string; kindHint?: 'drop' | 'paste' }) => void;
  onTransformStatusChange: (status: { id: string; x: number; y: number; w: number; h: number; rotation: number } | null) => void;
  showAlignmentGuides: boolean;
}

interface GuideState {
  pageId: string | null;
  vertical: number[];
  horizontal: number[];
}

export default function Canvas({
  pages,
  headerElements,
  footerElements,
  assets,
  themeMode,
  activePageId,
  editingContext,
  selectedIds,
  settings,
  onSelect,
  onUpdateElement,
  onSetEditingText,
  onSetActivePageId,
  onAddElement,
  onRequestResolveObsidianUri,
  onTransformStatusChange,
  showAlignmentGuides,
}: Props) {
  const zoom = settings.zoom / 100;
  const { margins } = settings;
  const gridOpacity = Math.max(0, Math.min(100, settings.gridOpacity)) / 100;
  const gridThickness = Math.max(0.5, Math.min(6, settings.gridThickness));
  const pageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [guides, setGuides] = useState<GuideState>({ pageId: null, vertical: [], horizontal: [] });
  const clearGuides = useCallback(() => {
    setGuides({ pageId: null, vertical: [], horizontal: [] });
  }, []);
  const dynamicData = useMemo(
    () => buildDynamicBlockData(pages, headerElements, footerElements),
    [pages, headerElements, footerElements]
  );

  useEffect(() => {
    const clear = () => clearGuides();
    window.addEventListener('mouseup', clear);
    window.addEventListener('pointerup', clear);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('mouseup', clear);
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('blur', clear);
    };
  }, [clearGuides]);

  useEffect(() => {
    if (!showAlignmentGuides && guides.pageId) clearGuides();
  }, [showAlignmentGuides, guides.pageId, clearGuides]);

  const dropImageElement = useCallback((pageId: string, x: number, y: number, content: string, ratio = 1.4) => {
    const width = 250;
    const el = createElement('image', {
      id: createId(),
      x,
      y,
      content,
      w: width,
      h: Math.round(width / ratio),
      originalRatio: ratio,
    });
    if (pageId !== activePageId) onSetActivePageId(pageId);
    onAddElement(el);
    onSelect(el.id, false);
  }, [activePageId, onSetActivePageId, onAddElement, onSelect]);

  const dropMarkdownElement = useCallback((pageId: string, x: number, y: number, markdown: string) => {
    const el = createElement('markdownobs', {
      id: createId(),
      x,
      y,
      w: 520,
      h: 280,
      content: markdown,
    });
    if (pageId !== activePageId) onSetActivePageId(pageId);
    onAddElement(el);
    onSelect(el.id, false);
  }, [activePageId, onSetActivePageId, onAddElement, onSelect]);

  const handleExternalDrop = useCallback((e: React.DragEvent, page: Page) => {
    e.preventDefault();
    e.stopPropagation();

    const pageEl = pageRefs.current.get(page.id);
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);

    const rawAsset = e.dataTransfer.getData('application/arxiv-asset');
    if (rawAsset) {
      try {
        const payload = JSON.parse(rawAsset) as { type: string; id: string };
        if (payload.type === 'asset') {
          const asset = assets.find((a) => a.id === payload.id);
          if (asset) dropImageElement(page.id, x, y, asset.dataUrl);
          return;
        }
      } catch {
        // ignore malformed payload
      }
    }

    if (e.dataTransfer.files.length > 0) {
      let handledFiles = false;
      for (const file of Array.from(e.dataTransfer.files)) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => dropImageElement(page.id, x, y, reader.result as string);
          reader.readAsDataURL(file);
          handledFiles = true;
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (ext === 'md' || ext === 'markdown') {
          const reader = new FileReader();
          reader.onload = () => dropMarkdownElement(page.id, x, y, String(reader.result || ''));
          reader.readAsText(file);
          handledFiles = true;
          continue;
        }
        if (file.type.startsWith('text/')) {
          const reader = new FileReader();
          reader.onload = () => {
            const content = String(reader.result || '');
            const el = createElement('text', { x, y, content: textToHtml(content), w: 460, h: 140 });
            if (page.id !== activePageId) onSetActivePageId(page.id);
            onAddElement(el);
            onSelect(el.id, false);
          };
          reader.readAsText(file);
          handledFiles = true;
        }
      }
      if (handledFiles) return;
    }

    const obsidianRef = firstObsidianReference(e.dataTransfer);
    if (obsidianRef) {
      onRequestResolveObsidianUri(obsidianRef, { x, y, pageId: page.id, kindHint: 'drop' });
      return;
    }

    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      if (isObsidianOpenUri(text)) {
        onRequestResolveObsidianUri(text, { x, y, pageId: page.id, kindHint: 'drop' });
        return;
      }
      const el = createElement('text', { x, y, content: textToHtml(text), w: Math.min(460, text.length * 8 + 40), h: 40 });
      if (page.id !== activePageId) onSetActivePageId(page.id);
      onAddElement(el);
      onSelect(el.id, false);
    }
  }, [zoom, assets, dropImageElement, dropMarkdownElement, activePageId, onSetActivePageId, onAddElement, onSelect, onRequestResolveObsidianUri]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const renderElements = (elements: Element[], isActive: boolean, pageId: string) =>
    elements.map((el) => (
      <DraggableElement
        key={el.id}
        element={el}
        siblingElements={elements}
        pageId={pageId}
        selected={selectedIds.includes(el.id)}
        dimmed={!isActive}
        onSelect={(append) => onSelect(el.id, append)}
        onUpdate={(updates) => onUpdateElement(el.id, updates)}
        onSetEditingText={onSetEditingText}
        onTransformStatusChange={onTransformStatusChange}
        onGuideChange={(payload) => setGuides(payload)}
        dynamicData={dynamicData}
        themeMode={themeMode}
        snapToGrid={settings.snapToGrid}
        gridSize={settings.gridSize}
      />
    ));

  const masterElements = pages.flatMap((p) => p.elements.filter((el) => el.isMaster));

  return (
    <div
      className="min-h-full p-8 flex justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onSelect(null, false);
          onTransformStatusChange(null);
          clearGuides();
        }
      }}
      style={{ background: 'var(--canvas-bg)' }}
    >
      <div className="canvas-zoom-layer" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
        <div className={`flex ${settings.viewMode === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'} gap-8 items-start`}>
          {pages.map((page, pageIdx) => {
            const { width, height } = getPageSize(page);
            const texture = page.paperTexture || settings.paperTextureGlobal || null;
            return (
              <div
                key={page.id}
                ref={(el) => { if (el) pageRefs.current.set(page.id, el); }}
                className={`relative print-page ${page.id === activePageId ? '' : 'cursor-pointer'}`}
                style={{
                  width,
                  height,
                  backgroundColor: 'var(--page-bg)',
                  backgroundImage: texture ? `url(${texture})` : undefined,
                  backgroundSize: texture ? 'cover' : undefined,
                  backgroundPosition: texture ? 'center' : undefined,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  borderRadius: 2,
                  border: page.id === activePageId ? '2px solid var(--selected-border)' : '1px solid var(--panel-border)',
                }}
                onMouseDown={(e) => {
                  if (page.id !== activePageId) onSetActivePageId(page.id);
                  if (e.target === e.currentTarget) {
                    onSelect(null, false);
                    onTransformStatusChange(null);
                    clearGuides();
                  }
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  handleExternalDrop(e, page);
                  clearGuides();
                }}
              >
                {settings.snapToGrid && (
                  <div
                    className="absolute inset-0 pointer-events-none no-print"
                    style={settings.gridStyle === 'dots'
                      ? {
                          backgroundImage: `radial-gradient(circle, var(--grid-dot) ${gridThickness}px, transparent ${gridThickness}px)`,
                          backgroundSize: `${settings.gridSize}px ${settings.gridSize}px`,
                          opacity: gridOpacity,
                        }
                      : {
                          backgroundImage: `
                            linear-gradient(to right, var(--grid-dot) ${gridThickness}px, transparent ${gridThickness}px),
                            linear-gradient(to bottom, var(--grid-dot) ${gridThickness}px, transparent ${gridThickness}px)
                          `,
                          backgroundSize: `${settings.gridSize}px ${settings.gridSize}px`,
                          opacity: gridOpacity,
                        }}
                  />
                )}

                <div
                  className="absolute pointer-events-none no-print"
                  style={{
                    top: margins.top,
                    left: margins.left,
                    right: margins.right,
                    bottom: margins.bottom,
                    border: '1px dashed rgba(59,130,246,0.2)',
                    display: settings.showGuides ? 'block' : 'none',
                  }}
                />

                {settings.showGuides && editingContext === 'header' && (
                  <div
                    className="absolute left-0 right-0 top-0 pointer-events-none border-b-2 border-dashed flex items-end justify-center no-print"
                    style={{ height: margins.top, borderColor: '#8b5cf6', background: 'rgba(139,92,246,0.05)' }}
                  >
                    <span className="text-xs px-2 py-0.5 rounded-t font-medium" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.1)' }}>
                      Header Zone
                    </span>
                  </div>
                )}

                {settings.showGuides && editingContext === 'footer' && (
                  <div
                    className="absolute left-0 right-0 bottom-0 pointer-events-none border-t-2 border-dashed flex items-start justify-center no-print"
                    style={{ height: margins.bottom, borderColor: '#10b981', background: 'rgba(16,185,129,0.05)' }}
                  >
                    <span className="text-xs px-2 py-0.5 rounded-b font-medium" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
                      Footer Zone
                    </span>
                  </div>
                )}

                {settings.showGuides && <TopRuler width={width} />}
                {settings.showGuides && <LeftRuler height={height} />}

                {settings.showGuides && (
                  <div className="absolute -top-6 left-0 text-xs font-medium no-print" style={{ color: 'var(--text-secondary)' }}>
                    Page {pageIdx + 1} ({page.orientation})
                  </div>
                )}

                {showAlignmentGuides && guides.pageId === page.id && guides.vertical.map((x) => (
                  <div key={`vx-${x}`} className="absolute pointer-events-none no-print" style={{ left: x, top: 0, bottom: 0, width: 1, background: '#f59e0b' }} />
                ))}
                {showAlignmentGuides && guides.pageId === page.id && guides.horizontal.map((y) => (
                  <div key={`hy-${y}`} className="absolute pointer-events-none no-print" style={{ top: y, left: 0, right: 0, height: 1, background: '#f59e0b' }} />
                ))}

                {page.id === activePageId && editingContext === 'page' && masterElements
                  .filter((m) => !page.elements.some((el) => el.id === m.id))
                  .map((m) => (
                    <div key={`master-${m.id}`} className="absolute pointer-events-none opacity-30" style={{ left: m.x, top: m.y, width: m.w, height: m.h }}>
                      <div className="w-full h-full border border-dashed border-amber-400" />
                    </div>
                  ))}

                {renderElements(headerElements, editingContext === 'header', page.id)}
                {renderElements(page.elements, editingContext === 'page' && page.id === activePageId, page.id)}
                {renderElements(footerElements, editingContext === 'footer', page.id)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function firstObsidianReference(dt: DataTransfer) {
  const read = (key: string) =>
    dt.getData(key)
      .split(/\r?\n/g)
      .map((v) => v.trim())
      .filter((v) => Boolean(v) && !v.startsWith('#'));

  const explicit = [
    ...read('obsidian://file'),
    ...read('text/x-obsidian-path'),
    ...read('text/uri-list'),
  ];
  if (explicit.length > 0) return explicit[0];

  const plain = read('text/plain');
  if (plain.length === 0) return null;
  const first = plain[0];
  if (isObsidianOpenUri(first)) return first;
  if (/\.(md|markdown|png|jpe?g|gif|webp|svg)$/i.test(first)) return first;
  return null;
}

function TopRuler({ width }: { width: number }) {
  const ticks = Math.floor(width / 10);
  return (
    <div
      className="absolute left-0 right-0 h-4 pointer-events-none no-print"
      style={{ top: -18, background: 'var(--ruler-bg)', opacity: 0.9 }}
    >
      {Array.from({ length: ticks + 1 }).map((_, idx) => {
        const x = idx * 10;
        const major = idx % 5 === 0;
        return (
          <div key={idx} className="absolute top-0" style={{ left: x }}>
            <div style={{ width: 1, height: major ? 8 : 4, background: 'var(--ruler-text)' }} />
            {major && <div className="ruler-label" style={{ transform: 'translateX(2px)' }}>{x}</div>}
          </div>
        );
      })}
    </div>
  );
}

function LeftRuler({ height }: { height: number }) {
  const ticks = Math.floor(height / 10);
  return (
    <div
      className="absolute top-0 bottom-0 w-4 pointer-events-none no-print"
      style={{ left: -18, background: 'var(--ruler-bg)', opacity: 0.9 }}
    >
      {Array.from({ length: ticks + 1 }).map((_, idx) => {
        const y = idx * 10;
        const major = idx % 5 === 0;
        return (
          <div key={idx} className="absolute left-0" style={{ top: y }}>
            <div style={{ width: major ? 8 : 4, height: 1, background: 'var(--ruler-text)' }} />
            {major && <div className="ruler-label" style={{ transform: 'translate(2px, 1px)' }}>{y}</div>}
          </div>
        );
      })}
    </div>
  );
}
