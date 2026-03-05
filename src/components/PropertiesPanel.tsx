import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssetItem, Element, FontAsset, Page, Settings } from '../types';
import { PAGE_HEIGHT, PAGE_WIDTH } from '../utils/constants';

interface Props {
  element: Element | null;
  page: Page;
  projectAssets: AssetItem[];
  projectFonts: FontAsset[];
  onUpdate: (updates: Partial<Element>) => void;
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  onUpdatePage: (updates: Partial<Page>) => void;
}

interface InputRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function InputRow({ label, value, onChange, min, max, step }: InputRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step || 1}
        className="w-20 px-2 py-1 rounded text-xs text-right border outline-none focus:ring-1 focus:ring-blue-500/30"
        style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

function SliderRow({ label, value, onChange, min, max, step, suffix }: SliderRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{value}{suffix}</span>
      </div>
      <input
        type="range"
        value={value}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        min={min}
        max={max}
        step={step || 1}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: 'var(--hover-bg)', accentColor: 'var(--selected-border)' }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>{title}</div>
      <div className="space-y-2 px-1">{children}</div>
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  clearable?: boolean;
  onClear?: () => void;
}

function ColorField({ label, value, onChange, clearable, onClear }: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(normalizeHex(value) || '#000000');
  const rootRef = useRef<HTMLDivElement>(null);
  const rgb = hexToRgb(draft);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  useEffect(() => {
    const next = normalizeHex(value);
    if (next) setDraft(next);
  }, [value]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  const setHsl = (next: { h?: number; s?: number; l?: number }) => {
    const h = clamp(next.h ?? hsl.h, 0, 360);
    const s = clamp(next.s ?? hsl.s, 0, 100);
    const l = clamp(next.l ?? hsl.l, 0, 100);
    const hex = hslToHex(h, s, l);
    setDraft(hex);
    onChange(hex);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center justify-between">
        <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <div className="flex items-center gap-1.5">
          {clearable && onClear && (
            <button
              onClick={onClear}
              className="text-xs px-1.5 py-0.5 rounded cursor-pointer"
              style={{ color: 'var(--text-secondary)', background: 'var(--hover-bg)' }}
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-8 h-6 rounded border cursor-pointer"
            style={{ background: draft, borderColor: 'var(--panel-border)' }}
            title={draft}
          />
        </div>
      </div>

      {open && (
        <div
          className="mt-2 p-2 rounded border space-y-2"
          style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border shrink-0" style={{ background: draft, borderColor: 'var(--panel-border)' }} />
            <input
              type="text"
              value={draft}
              onChange={(e) => {
                const raw = e.target.value;
                setDraft(raw);
                const next = normalizeHex(raw);
                if (next) onChange(next);
              }}
              className="flex-1 px-2 py-1 rounded text-xs border outline-none"
              style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Hue</label>
              <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{Math.round(hsl.h)}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={Math.round(hsl.h)}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onInput={(e) => setHsl({ h: Number((e.target as HTMLInputElement).value) })}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Saturation</label>
              <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{Math.round(hsl.s)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(hsl.s)}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onInput={(e) => setHsl({ s: Number((e.target as HTMLInputElement).value) })}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, hsl(${hsl.h} 0% ${hsl.l}%), hsl(${hsl.h} 100% ${hsl.l}%))` }}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Lightness</label>
              <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{Math.round(hsl.l)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(hsl.l)}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onInput={(e) => setHsl({ l: Number((e.target as HTMLInputElement).value) })}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, hsl(${hsl.h} ${hsl.s}% 0%), hsl(${hsl.h} ${hsl.s}% 50%), hsl(${hsl.h} ${hsl.s}% 100%))` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PropertiesPanel({
  element,
  page,
  projectAssets,
  projectFonts,
  onUpdate,
  settings,
  onUpdateSettings,
  onUpdatePage,
}: Props) {
  const hasTypography = element
    ? (
      element.type === 'text' ||
      element.type === 'markdownobs' ||
      element.type === 'table' ||
      element.type === 'toc' ||
      element.type === 'glossary' ||
      element.type === 'references'
    )
    : false;
  const fontChoices = useMemo(() => {
    const base = [
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      'Georgia, serif',
      "'Courier New', monospace",
    ];
    const merged = [...base, ...projectFonts.map((f) => f.family)];
    return Array.from(new Set(merged));
  }, [projectFonts]);
  const textureAssets = projectAssets.filter((a) => a.mimeType.startsWith('image/'));
  const pageTexture = page.paperTexture || '';
  const globalTexture = settings.paperTextureGlobal || '';

  if (!element) {
    const globalMargin = Math.round((settings.margins.top + settings.margins.right + settings.margins.bottom + settings.margins.left) / 4);
    return (
      <div className="p-3">
        <Section title="Document Margins">
          <SliderRow
            label="Global"
            value={globalMargin}
            onChange={(v) => onUpdateSettings({ margins: { top: v, right: v, bottom: v, left: v } })}
            min={0}
            max={240}
            suffix="px"
          />
          <SliderRow label="Top" value={settings.margins.top} onChange={(v) => onUpdateSettings({ margins: { ...settings.margins, top: v } })} min={0} max={240} suffix="px" />
          <InputRow label="Top" value={settings.margins.top} onChange={(v) => onUpdateSettings({ margins: { ...settings.margins, top: v } })} min={0} max={240} />
          <SliderRow label="Right" value={settings.margins.right} onChange={(v) => onUpdateSettings({ margins: { ...settings.margins, right: v } })} min={0} max={240} suffix="px" />
          <InputRow label="Right" value={settings.margins.right} onChange={(v) => onUpdateSettings({ margins: { ...settings.margins, right: v } })} min={0} max={240} />
          <SliderRow label="Bottom" value={settings.margins.bottom} onChange={(v) => onUpdateSettings({ margins: { ...settings.margins, bottom: v } })} min={0} max={240} suffix="px" />
          <InputRow label="Bottom" value={settings.margins.bottom} onChange={(v) => onUpdateSettings({ margins: { ...settings.margins, bottom: v } })} min={0} max={240} />
          <SliderRow label="Left" value={settings.margins.left} onChange={(v) => onUpdateSettings({ margins: { ...settings.margins, left: v } })} min={0} max={240} suffix="px" />
          <InputRow label="Left" value={settings.margins.left} onChange={(v) => onUpdateSettings({ margins: { ...settings.margins, left: v } })} min={0} max={240} />
        </Section>

        <Section title="Page Orientation">
          <div className="flex gap-1">
            <button
              onClick={() => onUpdatePage({ orientation: 'portrait' })}
              className="flex-1 px-2 py-1 rounded text-xs cursor-pointer"
              style={{ background: page.orientation === 'portrait' ? 'var(--selected-border)' : 'var(--hover-bg)', color: page.orientation === 'portrait' ? '#fff' : 'var(--text-secondary)' }}
            >
              Portrait
            </button>
            <button
              onClick={() => onUpdatePage({ orientation: 'landscape' })}
              className="flex-1 px-2 py-1 rounded text-xs cursor-pointer"
              style={{ background: page.orientation === 'landscape' ? 'var(--selected-border)' : 'var(--hover-bg)', color: page.orientation === 'landscape' ? '#fff' : 'var(--text-secondary)' }}
            >
              Landscape
            </button>
          </div>
        </Section>

        <Section title="Default Font">
          <select
            value={settings.defaultFont}
            onChange={(e) => onUpdateSettings({ defaultFont: e.target.value })}
            className="w-full px-2 py-1 rounded text-xs border outline-none"
            style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
          >
            {fontChoices.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {fontPreviewLabel(font)}
              </option>
            ))}
          </select>
          <div
            className="text-xs rounded px-2 py-1 border"
            style={{ borderColor: 'var(--panel-border)', color: 'var(--text-primary)', fontFamily: settings.defaultFont }}
          >
            Lorem ipsum dolor sit amet, 12345.
          </div>
        </Section>

        <Section title="Paper Texture">
          <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Global texture</div>
          <select
            value={globalTexture}
            onChange={(e) => onUpdateSettings({ paperTextureGlobal: e.target.value || null })}
            className="w-full px-2 py-1 rounded text-xs border outline-none"
            style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
          >
            <option value="">None</option>
            {textureAssets.map((asset) => <option key={asset.id} value={asset.dataUrl}>{asset.name}</option>)}
          </select>

          <div className="text-xs mt-2 mb-1" style={{ color: 'var(--text-secondary)' }}>This page override</div>
          <select
            value={pageTexture}
            onChange={(e) => onUpdatePage({ paperTexture: e.target.value || null })}
            className="w-full px-2 py-1 rounded text-xs border outline-none"
            style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
          >
            <option value="">Use global</option>
            {textureAssets.map((asset) => <option key={asset.id} value={asset.dataUrl}>{asset.name}</option>)}
          </select>
        </Section>

        <Section title="Grid">
          <SliderRow label="Grid size" value={settings.gridSize} onChange={(v) => onUpdateSettings({ gridSize: v })} min={5} max={50} suffix="px" />
          <InputRow label="Grid size" value={settings.gridSize} onChange={(v) => onUpdateSettings({ gridSize: v })} min={5} max={50} />
          <SliderRow label="Opacity" value={settings.gridOpacity} onChange={(v) => onUpdateSettings({ gridOpacity: v })} min={0} max={100} suffix="%" />
          <InputRow label="Opacity" value={settings.gridOpacity} onChange={(v) => onUpdateSettings({ gridOpacity: v })} min={0} max={100} />
          <SliderRow label="Thickness" value={Math.round(settings.gridThickness * 10)} onChange={(v) => onUpdateSettings({ gridThickness: v / 10 })} min={5} max={60} suffix="px" />
          <InputRow label="Thickness" value={settings.gridThickness} onChange={(v) => onUpdateSettings({ gridThickness: v })} min={0.5} max={6} step={0.1} />
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Grid style</label>
            <button
              onClick={() => onUpdateSettings({ gridStyle: settings.gridStyle === 'dots' ? 'squares' : 'dots' })}
              className="px-2 py-1 rounded text-xs cursor-pointer"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
            >
              {settings.gridStyle}
            </button>
          </div>
        </Section>

        <Section title="Page">
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {page.orientation === 'portrait' ? `${PAGE_WIDTH} x ${PAGE_HEIGHT}` : `${PAGE_HEIGHT} x ${PAGE_WIDTH}`} px
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="p-3">
      <Section title="Position">
        <SliderRow label="X" value={element.x} onChange={(v) => onUpdate({ x: v })} min={-2000} max={2000} suffix="px" />
        <InputRow label="X" value={element.x} onChange={(v) => onUpdate({ x: v })} />
        <SliderRow label="Y" value={element.y} onChange={(v) => onUpdate({ y: v })} min={-2000} max={2000} suffix="px" />
        <InputRow label="Y" value={element.y} onChange={(v) => onUpdate({ y: v })} />
      </Section>
      <Section title="Size">
        <SliderRow label="Width" value={element.w} onChange={(v) => onUpdate({ w: Math.max(10, v) })} min={10} max={2000} suffix="px" />
        <InputRow label="Width" value={element.w} onChange={(v) => onUpdate({ w: Math.max(10, v) })} min={10} />
        <SliderRow label="Height" value={element.h} onChange={(v) => onUpdate({ h: Math.max(10, v) })} min={10} max={2000} suffix="px" />
        <InputRow label="Height" value={element.h} onChange={(v) => onUpdate({ h: Math.max(10, v) })} min={10} />
      </Section>
      <Section title="Transform">
        <SliderRow label="Rotation" value={element.rotation} onChange={(v) => onUpdate({ rotation: v })} min={-180} max={180} suffix="°" />
        <SliderRow label="Opacity" value={Math.round(element.opacity * 100)} onChange={(v) => onUpdate({ opacity: v / 100 })} min={10} max={100} suffix="%" />
        <SliderRow label="Padding" value={element.padding} onChange={(v) => onUpdate({ padding: v })} min={0} max={40} suffix="px" />
      </Section>
      {hasTypography && (
        <Section title="Typography">
          <SliderRow label="Font size" value={element.fontSize} onChange={(v) => onUpdate({ fontSize: v })} min={6} max={72} suffix="px" />
          <InputRow label="Font size" value={element.fontSize} onChange={(v) => onUpdate({ fontSize: v })} min={6} max={72} />
          <SliderRow label="Line height" value={Math.round(element.lineHeight * 100)} onChange={(v) => onUpdate({ lineHeight: v / 100 })} min={80} max={300} suffix="%" />
          <SliderRow label="Letter spacing" value={element.letterSpacing} onChange={(v) => onUpdate({ letterSpacing: v })} min={-5} max={20} suffix="px" />
          <select
            value={element.fontFamily}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            className="w-full px-2 py-1 rounded text-xs border outline-none"
            style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
          >
            {fontChoices.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {fontPreviewLabel(font)}
              </option>
            ))}
          </select>
          <div
            className="text-xs rounded px-2 py-1 border"
            style={{ borderColor: 'var(--panel-border)', color: 'var(--text-primary)', fontFamily: element.fontFamily }}
          >
            Lorem ipsum dolor sit amet, 12345.
          </div>
        </Section>
      )}
      {element.type === 'text' && element.verticalText && (
        <Section title="Vertical Text">
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Reading direction</label>
            <button
              onClick={() => onUpdate({ mirrorVertical: !element.mirrorVertical })}
              className="px-2 py-1 rounded text-xs cursor-pointer"
              style={{
                background: element.mirrorVertical ? 'var(--selected-border)' : 'var(--hover-bg)',
                color: element.mirrorVertical ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {element.mirrorVertical ? 'Left to right' : 'Right to left'}
            </button>
          </div>
        </Section>
      )}
      <Section title="Colors">
        <ColorField label="Color" value={element.color} onChange={(hex) => onUpdate({ color: hex })} />
        <ColorField
          label="Background"
          value={element.bgColor === 'transparent' ? '#ffffff' : element.bgColor}
          onChange={(hex) => onUpdate({ bgColor: hex })}
          clearable={element.bgColor !== 'transparent'}
          onClear={() => onUpdate({ bgColor: 'transparent' })}
        />
      </Section>
      <Section title="Frame">
        <div className="flex items-center justify-between">
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Enabled</label>
          <button
            onClick={() => onUpdate({ frameEnabled: !element.frameEnabled })}
            className="px-2 py-1 rounded text-xs cursor-pointer"
            style={{
              background: element.frameEnabled ? 'var(--selected-border)' : 'var(--hover-bg)',
              color: element.frameEnabled ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {element.frameEnabled ? 'On' : 'Off'}
          </button>
        </div>
        {element.frameEnabled && (
          <>
            <ColorField label="Color" value={element.frameColor} onChange={(hex) => onUpdate({ frameColor: hex })} />
            <SliderRow
              label="Thickness"
              value={element.frameThickness}
              onChange={(v) => onUpdate({ frameThickness: Math.max(1, v) })}
              min={1}
              max={20}
              suffix="px"
            />
            <SliderRow
              label="Padding"
              value={element.framePadding}
              onChange={(v) => onUpdate({ framePadding: Math.max(0, v) })}
              min={0}
              max={40}
              suffix="px"
            />
            <SliderRow
              label="Bevel (radius)"
              value={element.frameRadius}
              onChange={(v) => onUpdate({ frameRadius: Math.max(0, v) })}
              min={0}
              max={60}
              suffix="px"
            />
          </>
        )}
      </Section>
      {element.type === 'shape' && (
        <Section title="Shape">
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Circle</label>
            <button
              onClick={() => onUpdate({ isCircle: !element.isCircle })}
              className="px-2 py-1 rounded text-xs cursor-pointer"
              style={{ background: element.isCircle ? 'var(--selected-border)' : 'var(--hover-bg)', color: element.isCircle ? '#fff' : 'var(--text-secondary)' }}
            >
              {element.isCircle ? 'Yes' : 'No'}
            </button>
          </div>
          <SliderRow label="Border thickness" value={element.thickness} onChange={(v) => onUpdate({ thickness: Math.max(1, v) })} min={1} max={30} suffix="px" />
          {!element.isCircle && (
            <SliderRow label="Corner bevel" value={element.cornerRadius || 0} onChange={(v) => onUpdate({ cornerRadius: Math.max(0, v) })} min={0} max={60} suffix="px" />
          )}
        </Section>
      )}
      {element.type === 'line' && (
        <Section title="Line">
          <SliderRow label="Thickness" value={element.thickness} onChange={(v) => onUpdate({ thickness: Math.max(1, v) })} min={1} max={20} suffix="px" />
        </Section>
      )}
      {element.type === 'connector' && (
        <Section title="Connector">
          <SliderRow label="Thickness" value={element.thickness} onChange={(v) => onUpdate({ thickness: Math.max(1, v) })} min={1} max={20} suffix="px" />
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Curved (Bezier)</label>
            <button
              onClick={() => onUpdate({ connectorCurved: !element.connectorCurved })}
              className="px-2 py-1 rounded text-xs cursor-pointer"
              style={{ background: element.connectorCurved ? 'var(--selected-border)' : 'var(--hover-bg)', color: element.connectorCurved ? '#fff' : 'var(--text-secondary)' }}
            >
              {element.connectorCurved ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Arrow start</label>
            <button
              onClick={() => onUpdate({ connectorArrowStart: !element.connectorArrowStart })}
              className="px-2 py-1 rounded text-xs cursor-pointer"
              style={{ background: element.connectorArrowStart ? 'var(--selected-border)' : 'var(--hover-bg)', color: element.connectorArrowStart ? '#fff' : 'var(--text-secondary)' }}
            >
              {element.connectorArrowStart ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Arrow end</label>
            <button
              onClick={() => onUpdate({ connectorArrowEnd: !(element.connectorArrowEnd !== false) })}
              className="px-2 py-1 rounded text-xs cursor-pointer"
              style={{ background: element.connectorArrowEnd !== false ? 'var(--selected-border)' : 'var(--hover-bg)', color: element.connectorArrowEnd !== false ? '#fff' : 'var(--text-secondary)' }}
            >
              {element.connectorArrowEnd !== false ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const points = element.pathPoints || [{ x: 0, y: element.h / 2 }, { x: element.w, y: element.h / 2 }];
                const middle = { x: element.w / 2, y: element.h / 2 };
                const controls = element.connectorControls || [];
                onUpdate({
                  pathPoints: [...points.slice(0, -1), middle, points[points.length - 1]],
                  connectorControls: [...controls, { x: middle.x, y: middle.y - 30 }],
                });
              }}
              className="flex-1 px-2 py-1 rounded text-xs cursor-pointer"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
            >
              Add point
            </button>
            <button
              onClick={() => {
                const points = element.pathPoints || [];
                if (points.length <= 2) return;
                const controls = element.connectorControls || [];
                onUpdate({
                  pathPoints: [...points.slice(0, -2), points[points.length - 1]],
                  connectorControls: controls.slice(0, Math.max(1, controls.length - 1)),
                });
              }}
              className="flex-1 px-2 py-1 rounded text-xs cursor-pointer"
              style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
            >
              Remove point
            </button>
          </div>
        </Section>
      )}
      {element.type === 'image' && (
        <Section title="Image">
          <input
            type="text"
            value={element.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="w-full px-2 py-1 rounded text-xs border outline-none"
            style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
            placeholder="https://..."
          />
          <button
            onClick={() => {
              const ratio = element.originalRatio || (element.w / Math.max(1, element.h));
              onUpdate({ h: Math.round(element.w / ratio) });
            }}
            className="text-[11px] px-2 py-1 rounded cursor-pointer"
            style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
          >
            Reset ratio
          </button>
        </Section>
      )}
      {element.type === 'math' && (
        <Section title="LaTeX Expression">
          <textarea
            value={element.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="w-full px-2 py-1 rounded text-xs border outline-none resize-none h-16 font-mono"
            style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
            placeholder="E = mc^2"
          />
        </Section>
      )}
      {(element.type === 'toc' || element.type === 'glossary' || element.type === 'references') && (
        <Section title="Dynamic Block">
          <input
            type="text"
            value={element.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="w-full px-2 py-1 rounded text-xs border outline-none"
            style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
            placeholder={element.type === 'toc' ? 'Table of Contents' : element.type === 'glossary' ? 'Glossary' : 'References'}
          />
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {element.type === 'toc' && 'Auto from H1/H2/H3.'}
            {element.type === 'glossary' && 'Auto from lines: Term:: Definition.'}
            {element.type === 'references' && 'Auto from lines: [1] Reference text.'}
          </div>
        </Section>
      )}
    </div>
  );
}

function clamp255(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex) || '#000000';
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = clamp255(r) / 255;
  const gn = clamp255(g) / 255;
  const bn = clamp255(b) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number) {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs((hh / 60) % 2 - 1));
  const m = ll - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hh < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (hh < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (hh < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (hh < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (hh < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  return rgbToHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

function normalizeHex(value: string) {
  const s = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const p = s.slice(1).toLowerCase();
    return `#${p[0]}${p[0]}${p[1]}${p[1]}${p[2]}${p[2]}`;
  }
  return null;
}

function fontPreviewLabel(font: string) {
  const cleaned = font.replace(/['"]/g, '').split(',')[0].trim();
  return `${cleaned} - Lorem 123`;
}
