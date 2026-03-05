import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { GripHorizontal } from 'lucide-react';
import type { Element, Point, ThemeMode } from '../types';
import type { DynamicBlockData } from '../utils/dynamicBlocks';
import { markdownToHtml } from '../utils/markdown';

interface Props {
  element: Element;
  siblingElements: Element[];
  pageId: string;
  themeMode: ThemeMode;
  selected: boolean;
  dimmed: boolean;
  onSelect: (append: boolean) => void;
  onUpdate: (updates: Partial<Element>) => void;
  onSetEditingText: (v: boolean) => void;
  onTransformStatusChange: (status: { id: string; x: number; y: number; w: number; h: number; rotation: number } | null) => void;
  onGuideChange: (payload: { pageId: string | null; vertical: number[]; horizontal: number[] }) => void;
  dynamicData: DynamicBlockData;
  snapToGrid: boolean;
  gridSize: number;
}

interface StartState {
  x: number;
  y: number;
  elX: number;
  elY: number;
  elW: number;
  elH: number;
  cx: number;
  cy: number;
  basePathPoints: Point[];
  baseConnectorControls: Point[];
  pointIndex: number;
  controlIndex: number;
  mode: 'point' | 'control' | null;
}

export default function DraggableElement({
  element,
  siblingElements,
  pageId,
  themeMode,
  selected,
  dimmed,
  onSelect,
  onUpdate,
  onSetEditingText,
  onTransformStatusChange,
  onGuideChange,
  dynamicData,
  snapToGrid,
  gridSize,
}: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState(false);
  const [editingMath, setEditingMath] = useState(false);
  const [editingMarkdown, setEditingMarkdown] = useState(false);
  const darkPageMode = themeMode === 'dark';
  const displayColor = getReadableColorOnDarkPage(element.color, darkPageMode);
  const displayBgColor = element.bgColor === 'transparent'
    ? 'transparent'
    : getReadableColorOnDarkPage(element.bgColor, darkPageMode);
  const displayFrameColor = getReadableColorOnDarkPage(element.frameColor, darkPageMode);
  const startRef = useRef<StartState>({
    x: 0, y: 0, elX: 0, elY: 0, elW: 0, elH: 0, cx: 0, cy: 0,
    basePathPoints: [],
    baseConnectorControls: [],
    pointIndex: -1, controlIndex: -1, mode: null,
  });

  const snap = useCallback((v: number) => (snapToGrid ? Math.round(v / gridSize) * gridSize : v), [snapToGrid, gridSize]);
  const otherElements = useMemo(() => siblingElements.filter((el) => el.id !== element.id), [siblingElements, element.id]);
  const connectorPoints = element.pathPoints || [{ x: 0, y: element.h / 2 }, { x: element.w, y: element.h / 2 }];
  const connectorControls = element.connectorControls || Array.from({ length: Math.max(0, connectorPoints.length - 1) }).map((_, i) => ({
    x: (connectorPoints[i].x + connectorPoints[i + 1].x) / 2,
    y: (connectorPoints[i].y + connectorPoints[i + 1].y) / 2 - 24,
  }));

  const reportTransform = useCallback((partial: Partial<Element>) => {
    onTransformStatusChange({
      id: element.id,
      x: partial.x ?? element.x,
      y: partial.y ?? element.y,
      w: partial.w ?? element.w,
      h: partial.h ?? element.h,
      rotation: partial.rotation ?? element.rotation,
    });
  }, [element, onTransformStatusChange]);

  const stopTransform = useCallback(() => {
    setDragging(false);
    setResizing(false);
    setRotating(false);
    setDraggingHandle(false);
    onGuideChange({ pageId: null, vertical: [], horizontal: [] });
    onTransformStatusChange(null);
  }, [onGuideChange, onTransformStatusChange]);

  const alignPosition = useCallback((x: number, y: number) => {
    const threshold = 4;
    let nextX = x;
    let nextY = y;
    const vertical: number[] = [];
    const horizontal: number[] = [];
    const ownX = [x, x + element.w / 2, x + element.w];
    const ownY = [y, y + element.h / 2, y + element.h];

    for (const other of otherElements) {
      const tx = [other.x, other.x + other.w / 2, other.x + other.w];
      const ty = [other.y, other.y + other.h / 2, other.y + other.h];
      for (const ox of ownX) {
        for (const target of tx) {
          const diff = target - ox;
          if (Math.abs(diff) <= threshold) {
            nextX += diff;
            vertical.push(target);
          }
        }
      }
      for (const oy of ownY) {
        for (const target of ty) {
          const diff = target - oy;
          if (Math.abs(diff) <= threshold) {
            nextY += diff;
            horizontal.push(target);
          }
        }
      }
    }

    return { x: nextX, y: nextY, vertical, horizontal };
  }, [element.w, element.h, otherElements]);

  const onDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.dataset.handle) return;
    e.stopPropagation();
    const append = e.ctrlKey || e.metaKey;
    if (append || !selected) onSelect(append);
    if (editingMath || editingMarkdown) return;
    if (target.isContentEditable || target.closest('[data-editable-content="true"]')) return;
    setDragging(true);
    startRef.current = { ...startRef.current, x: e.clientX, y: e.clientY, elX: element.x, elY: element.y };
  };

  const onResizeStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(false);
    setResizing(true);
    const base = getConnectorGeometry(element);
    startRef.current = {
      ...startRef.current,
      x: e.clientX,
      y: e.clientY,
      elW: element.w,
      elH: element.h,
      basePathPoints: base.points,
      baseConnectorControls: base.controls,
    };
  };

  const onRotateStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(false);
    setRotating(true);
    const rect = elRef.current?.getBoundingClientRect();
    if (rect) {
      startRef.current.cx = rect.left + rect.width / 2;
      startRef.current.cy = rect.top + rect.height / 2;
    }
  };

  const onConnectorHandleStart = (e: React.MouseEvent, mode: 'point' | 'control', index: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingHandle(true);
    startRef.current = {
      ...startRef.current,
      x: e.clientX,
      y: e.clientY,
      pointIndex: mode === 'point' ? index : -1,
      controlIndex: mode === 'control' ? index : -1,
      mode,
    };
  };

  useEffect(() => {
    if (!dragging && !resizing && !rotating && !draggingHandle) return;
    const onMove = (e: MouseEvent) => {
      // Safety: if mouseup was missed, stop stale transforms instead of dragging on simple hover.
      if ((e.buttons & 1) === 0) {
        stopTransform();
        return;
      }
      const s = startRef.current;
      if (dragging) {
        const draftX = snap(s.elX + (e.clientX - s.x));
        const draftY = snap(s.elY + (e.clientY - s.y));
        const aligned = alignPosition(draftX, draftY);
        onGuideChange({ pageId, vertical: aligned.vertical, horizontal: aligned.horizontal });
        const updates = { x: Math.round(aligned.x), y: Math.round(aligned.y) };
        onUpdate(updates);
        reportTransform(updates);
      } else if (resizing) {
        const newW = Math.max(30, snap(s.elW + (e.clientX - s.x)));
        const newH = Math.max(20, snap(s.elH + (e.clientY - s.y)));
        const ratio = s.elW / s.elH;
        const lockByDefault = element.type === 'image' || element.type === 'shape';
        const modHeld = e.shiftKey || e.ctrlKey;
        const lockRatio = lockByDefault ? !modHeld : modHeld;
        const baseUpdates: Partial<Element> = {};

        if (lockRatio && ratio > 0) {
          const dxAbs = Math.abs(e.clientX - s.x);
          const dyAbs = Math.abs(e.clientY - s.y);
          if (dxAbs > dyAbs) {
            baseUpdates.w = newW;
            baseUpdates.h = Math.max(20, Math.round(newW / ratio));
          } else {
            baseUpdates.w = Math.max(30, Math.round(newH * ratio));
            baseUpdates.h = newH;
          }
        } else {
          baseUpdates.w = newW;
          baseUpdates.h = newH;
        }

        if (element.type === 'connector') {
          const targetW = Math.max(10, baseUpdates.w || newW);
          const targetH = Math.max(10, baseUpdates.h || newH);
          const sx = targetW / Math.max(1, s.elW);
          const sy = targetH / Math.max(1, s.elH);

          // Always scale from geometry captured at resize start to avoid cumulative collapse.
          const sourcePoints = s.basePathPoints.length ? s.basePathPoints : connectorPoints;
          const sourceControls = s.baseConnectorControls.length ? s.baseConnectorControls : connectorControls;
          baseUpdates.pathPoints = sourcePoints.map((p) => ({
            x: clamp(Math.round(p.x * sx), 0, targetW),
            y: clamp(Math.round(p.y * sy), 0, targetH),
          }));
          baseUpdates.connectorControls = sourceControls.map((p) => ({
            x: clamp(Math.round(p.x * sx), 0, targetW),
            y: clamp(Math.round(p.y * sy), 0, targetH),
          }));
        }
        onUpdate(baseUpdates);
        reportTransform(baseUpdates);
      } else if (rotating) {
        const rawAngle = Math.atan2(e.clientY - s.cy, e.clientX - s.cx) * (180 / Math.PI) + 90;
        let angle = rawAngle;
        if (e.ctrlKey) angle = Math.round(angle);
        else if (e.shiftKey) angle = Math.round(angle / 5) * 5;
        else angle = Math.round(angle / 15) * 15;
        const normalized = ((angle % 360) + 360) % 360;
        onUpdate({ rotation: normalized });
        reportTransform({ rotation: normalized });
      } else if (draggingHandle && element.type === 'connector') {
        const rect = elRef.current?.getBoundingClientRect();
        if (!rect) return;
        const px = Math.max(0, Math.min(element.w, e.clientX - rect.left));
        const py = Math.max(0, Math.min(element.h, e.clientY - rect.top));

        if (s.mode === 'point' && s.pointIndex >= 0) {
          const points = connectorPoints.map((p, idx) => (idx === s.pointIndex ? { x: px, y: py } : p));
          onUpdate({ pathPoints: points });
        } else if (s.mode === 'control' && s.controlIndex >= 0) {
          const controls = connectorControls.map((p, idx) => (idx === s.controlIndex ? { x: px, y: py } : p));
          onUpdate({ connectorControls: controls });
        }
      }
    };

    const onUp = () => stopTransform();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('blur', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, [
    dragging,
    resizing,
    rotating,
    draggingHandle,
    alignPosition,
    onGuideChange,
    onUpdate,
    pageId,
    snap,
    reportTransform,
    stopTransform,
    element.type,
    element.w,
    element.h,
    connectorPoints,
    connectorControls,
  ]);

  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        updateImageRatio(src, (ratio) => onUpdate({ content: src, originalRatio: ratio }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (element.type === 'image') {
      openFilePicker();
      return;
    }
    if (element.type === 'math') {
      setEditingMath(true);
      onSelect(false);
      onSetEditingText(true);
      return;
    }
    if (element.type === 'markdownobs') {
      setEditingMarkdown(true);
      onSelect(false);
      onSetEditingText(true);
      return;
    }
    if (element.type === 'connector') {
      const rect = elRef.current?.getBoundingClientRect();
      if (!rect) return;
      const px = clamp(e.clientX - rect.left, 0, element.w);
      const py = clamp(e.clientY - rect.top, 0, element.h);
      const points = [...connectorPoints];
      const controls = [...connectorControls];
      points.splice(Math.max(1, points.length - 1), 0, { x: px, y: py });
      controls.splice(Math.max(0, controls.length - 1), 0, { x: px, y: clamp(py - 24, 0, element.h) });
      onUpdate({ pathPoints: points, connectorControls: controls });
    }
  };

  const connectorPath = useMemo(() => {
    if (connectorPoints.length < 2) return '';
    if (!element.connectorCurved) return `M ${connectorPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
    let d = `M ${connectorPoints[0].x} ${connectorPoints[0].y}`;
    for (let i = 0; i < connectorPoints.length - 1; i += 1) {
      const c = connectorControls[i] || {
        x: (connectorPoints[i].x + connectorPoints[i + 1].x) / 2,
        y: (connectorPoints[i].y + connectorPoints[i + 1].y) / 2 - 24,
      };
      d += ` Q ${c.x} ${c.y} ${connectorPoints[i + 1].x} ${connectorPoints[i + 1].y}`;
    }
    return d;
  }, [connectorPoints, connectorControls, element.connectorCurved]);

  const mathSrc = useMemo(
    () => `https://latex.codecogs.com/svg.image?${encodeURIComponent(colorizeLatex(element.content, displayColor))}`,
    [element.content, displayColor]
  );

  useEffect(() => {
    if (element.type !== 'text') return;
    const node = textRef.current;
    if (!node) return;
    // Keep browser native selection stable by only syncing HTML when actually changed.
    if (node.innerHTML !== element.content) node.innerHTML = element.content;
  }, [element.type, element.content]);

  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
            ref={textRef}
            data-editable-content="true"
            contentEditable
            suppressContentEditableWarning
            className="w-full h-full outline-none overflow-auto"
            style={{
              fontSize: element.fontSize,
              fontFamily: element.fontFamily,
              textAlign: element.textAlign,
              lineHeight: element.lineHeight,
              letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
              writingMode: element.verticalText ? (element.mirrorVertical ? 'vertical-lr' : 'vertical-rl') : 'horizontal-tb',
              direction: 'ltr',
              unicodeBidi: 'plaintext',
              transform: element.textInverted ? 'rotate(180deg)' : undefined,
              padding: element.padding,
              color: displayColor,
              cursor: 'text',
            }}
            dir="ltr"
            onMouseDown={(e) => {
              e.stopPropagation();
              const append = e.ctrlKey || e.metaKey;
              if (append) onSelect(true);
            }}
            onFocus={() => {
              onSetEditingText(true);
              if (!selected) onSelect(false);
            }}
            onBlur={(e) => {
              onSetEditingText(false);
              onUpdate({ content: e.currentTarget.innerHTML });
            }}
          />
        );
      case 'markdownobs':
        if (editingMarkdown) {
          return (
            <textarea
              autoFocus
              wrap="soft"
              value={element.content}
              onChange={(e) => onUpdate({ content: e.target.value, renderedMarkdownHtml: undefined })}
              onBlur={(e) => {
                onUpdate({ content: e.target.value, renderedMarkdownHtml: undefined });
                setEditingMarkdown(false);
                onSetEditingText(false);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full h-full resize-none outline-none border-0 p-2"
              style={{
                fontSize: element.fontSize,
                fontFamily: element.fontFamily,
                lineHeight: element.lineHeight,
                letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
                background: 'var(--hover-bg)',
                color: 'var(--text-primary)',
              }}
            />
          );
        }
        return (
          <div
            className="w-full h-full overflow-auto markdown-obs"
            style={{
              fontSize: element.fontSize,
              fontFamily: element.fontFamily,
              lineHeight: element.lineHeight,
              letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
              padding: element.padding + 4,
              color: displayColor,
              wordBreak: 'break-word',
            }}
            dangerouslySetInnerHTML={{ __html: element.renderedMarkdownHtml || markdownToHtml(element.content) }}
          />
        );
      case 'image':
        return (
          <img
            src={element.content}
            alt=""
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'fill' }}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (!element.originalRatio && img.naturalWidth > 0 && img.naturalHeight > 0) {
                onUpdate({ originalRatio: img.naturalWidth / img.naturalHeight });
              }
            }}
            onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
          />
        );
      case 'math':
        if (editingMath) {
          return (
            <textarea
              autoFocus
              value={element.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              onBlur={() => {
                setEditingMath(false);
                onSetEditingText(false);
              }}
              className="w-full h-full resize-none outline-none border-0 p-2 font-mono text-xs"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}
            />
          );
        }
        return (
          <div className="w-full h-full flex items-center justify-center" style={{ padding: element.padding }}>
            <img
              src={mathSrc}
              alt={element.content}
              className="max-w-full max-h-full"
              draggable={false}
            />
          </div>
        );
      case 'table':
        return (
          <div className="w-full h-full overflow-auto" style={{ fontSize: element.fontSize, padding: element.padding, fontFamily: element.fontFamily }}>
            <table className="w-full border-collapse" style={{ color: displayColor }}>
              <tbody>
                {(element.tableData || []).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border px-1.5 py-1" style={{ borderColor: 'var(--panel-border)' }}>
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => {
                            const newData = (element.tableData || []).map((r) => [...r]);
                            newData[ri][ci] = e.target.value;
                            onUpdate({ tableData: newData });
                          }}
                          className="w-full bg-transparent outline-none text-inherit"
                          style={{ fontSize: 'inherit' }}
                          onFocus={() => onSetEditingText(true)}
                          onBlur={() => onSetEditingText(false)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'line':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div
              style={{
                width: element.orientation === 'horizontal' ? '100%' : element.thickness,
                height: element.orientation === 'horizontal' ? element.thickness : '100%',
                background: displayColor,
              }}
            />
          </div>
        );
      case 'shape':
        return (
          <div
            className="w-full h-full"
            style={{
              background: displayBgColor,
              borderRadius: element.isCircle ? '50%' : `${Math.max(0, element.cornerRadius || 0)}px`,
              border: `${Math.max(1, element.thickness)}px solid ${displayColor}`,
            }}
          />
        );
      case 'connector':
        return (
          <svg className="w-full h-full" viewBox={`0 0 ${element.w} ${element.h}`} preserveAspectRatio="none">
            <defs>
              <marker id={`arr-end-${element.id}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 z" fill={displayColor} />
              </marker>
              <marker id={`arr-start-${element.id}`} markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M8,0 L0,4 L8,8 z" fill={displayColor} />
              </marker>
            </defs>
            <path
              d={connectorPath}
              fill="none"
              stroke={displayColor}
              strokeWidth={Math.max(1, element.thickness)}
              markerStart={element.connectorArrowStart ? `url(#arr-start-${element.id})` : undefined}
              markerEnd={element.connectorArrowEnd !== false ? `url(#arr-end-${element.id})` : undefined}
            />
          </svg>
        );
      case 'toc':
      case 'glossary':
      case 'references': {
        const lines = element.type === 'toc'
          ? dynamicData.toc
          : element.type === 'glossary'
            ? dynamicData.glossary
            : dynamicData.references;
        const title = element.content?.trim() || (element.type === 'toc' ? 'Table of Contents' : element.type === 'glossary' ? 'Glossary' : 'References');
        return (
          <div
            className="w-full h-full overflow-auto"
            style={{
              padding: element.padding + 6,
              color: displayColor,
              fontFamily: element.fontFamily,
              fontSize: element.fontSize,
              lineHeight: element.lineHeight,
              letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : undefined,
              textAlign: element.textAlign,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{lines.join('\n')}</div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      ref={elRef}
      className="absolute group"
      style={{
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        opacity: dimmed ? 0.4 : element.opacity,
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={onDragStart}
      onDoubleClick={onDoubleClick}
    >
      {element.frameEnabled && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: -element.framePadding,
            left: -element.framePadding,
            right: -element.framePadding,
            bottom: -element.framePadding,
            border: `${Math.max(1, element.frameThickness)}px solid ${displayFrameColor}`,
            borderRadius: Math.max(0, element.frameRadius),
          }}
        />
      )}
      <div
        className={`w-full h-full overflow-hidden${selected ? ' element-selected-outline' : ''}`}
        style={{
          background: element.type !== 'shape' && element.type !== 'line' && element.type !== 'connector'
            ? (element.bgColor === 'transparent' ? undefined : displayBgColor)
            : undefined,
          outline: selected ? '2px solid var(--selected-border)' : undefined,
          outlineOffset: selected ? 2 : undefined,
        }}
      >
        {renderContent()}
      </div>

      {selected && (
        <div className="no-print">
          {(element.type === 'text' || element.type === 'table') && (
            <div
              data-handle="move"
              className="absolute -top-0.5 left-0 right-0 h-5 flex items-center justify-center cursor-grab active:cursor-grabbing rounded-t-sm opacity-70 hover:opacity-100 transition-opacity"
              style={{ background: 'var(--selected-border)', transform: 'translateY(-100%)' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelect(false);
                setDragging(true);
                startRef.current = { ...startRef.current, x: e.clientX, y: e.clientY, elX: element.x, elY: element.y };
              }}
            >
              <GripHorizontal className="w-4 h-4 text-white/80" />
            </div>
          )}

          {element.type === 'connector' && connectorPoints.map((point, idx) => (
            <div
              key={`pt-${idx}`}
              data-handle="point"
              className="absolute w-3 h-3 rounded-full border-2 cursor-pointer"
              style={{ left: point.x - 6, top: point.y - 6, borderColor: 'var(--selected-border)', background: 'var(--page-bg)' }}
              onMouseDown={(e) => onConnectorHandleStart(e, 'point', idx)}
              title="Drag point"
            />
          ))}
          {element.type === 'connector' && element.connectorCurved && connectorControls.map((control, idx) => (
            <div key={`ctl-${idx}`}>
              <svg className="absolute inset-0 pointer-events-none">
                <line
                  x1={connectorPoints[idx]?.x || 0}
                  y1={connectorPoints[idx]?.y || 0}
                  x2={control.x}
                  y2={control.y}
                  stroke="#f59e0b"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
                <line
                  x1={connectorPoints[idx + 1]?.x || 0}
                  y1={connectorPoints[idx + 1]?.y || 0}
                  x2={control.x}
                  y2={control.y}
                  stroke="#f59e0b"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
              </svg>
              <div
                data-handle="control"
                className="absolute w-3 h-3 rounded-sm border-2 cursor-pointer"
                style={{ left: control.x - 6, top: control.y - 6, borderColor: '#f59e0b', background: 'var(--page-bg)' }}
                onMouseDown={(e) => onConnectorHandleStart(e, 'control', idx)}
                title="Bezier control"
              />
            </div>
          ))}

          <div
            data-handle="resize"
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-sm cursor-se-resize"
            style={{ background: 'var(--selected-border)' }}
            onMouseDown={onResizeStart}
          />

          <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div
              data-handle="rotate"
              className="w-4 h-4 rounded-full cursor-crosshair border-2 flex items-center justify-center"
              style={{ borderColor: '#f59e0b', background: 'var(--page-bg)' }}
              onMouseDown={onRotateStart}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="w-px h-3" style={{ background: '#f59e0b' }} />
          </div>

          {element.isMaster && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shadow">
              *
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function updateImageRatio(src: string, onDone: (ratio: number) => void) {
  const img = new Image();
  img.onload = () => {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) onDone(img.naturalWidth / img.naturalHeight);
  };
  img.src = src;
}

function colorizeLatex(content: string, color: string) {
  if (!content.trim()) return content;
  const rgb = hexToRgb01(color);
  if (!rgb) return content;
  const [r, g, b] = rgb;
  return `\\color[rgb]{${r},${g},${b}}{${content}}`;
}

function hexToRgb01(hex: string): [string, string, string] | null {
  const rgb = parseColorToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return [(r / 255).toFixed(3), (g / 255).toFixed(3), (b / 255).toFixed(3)];
}

function getReadableColorOnDarkPage(color: string, darkPageMode: boolean) {
  if (!darkPageMode) return color;
  const rgb = parseColorToRgb(color);
  if (!rgb) return color;
  const [r, g, b] = rgb;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const minLuminance = 0.72;
  if (luminance >= minLuminance) return color;
  const factor = Math.min(1, Math.max(0, (minLuminance - luminance) / Math.max(0.001, 1 - luminance)));
  const nr = Math.round(r + (255 - r) * factor);
  const ng = Math.round(g + (255 - g) * factor);
  const nb = Math.round(b + (255 - b) * factor);
  return rgbToHex(nr, ng, nb);
}

function parseColorToRgb(color: string): [number, number, number] | null {
  const value = color.trim();
  const hex = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    const raw = hex[1];
    const full = raw.length === 3
      ? `${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`
      : raw;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }
  const rgb = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+\s*)?\)$/i);
  if (rgb) {
    return [
      clamp(parseInt(rgb[1], 10), 0, 255),
      clamp(parseInt(rgb[2], 10), 0, 255),
      clamp(parseInt(rgb[3], 10), 0, 255),
    ];
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(v: number) {
  return clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getConnectorGeometry(element: Element): { points: Point[]; controls: Point[] } {
  const points = (element.pathPoints && element.pathPoints.length >= 2
    ? element.pathPoints
    : [{ x: 0, y: element.h / 2 }, { x: element.w, y: element.h / 2 }]
  ).map((p) => ({
    x: clamp(Math.round(p.x), 0, Math.max(1, element.w)),
    y: clamp(Math.round(p.y), 0, Math.max(1, element.h)),
  }));

  const controls = Array.from({ length: Math.max(0, points.length - 1) }).map((_, i) => {
    const fallback = {
      x: Math.round((points[i].x + points[i + 1].x) / 2),
      y: clamp(Math.round((points[i].y + points[i + 1].y) / 2 - 24), 0, Math.max(1, element.h)),
    };
    const given = element.connectorControls?.[i];
    return {
      x: clamp(Math.round(given?.x ?? fallback.x), 0, Math.max(1, element.w)),
      y: clamp(Math.round(given?.y ?? fallback.y), 0, Math.max(1, element.h)),
    };
  });

  return { points, controls };
}
