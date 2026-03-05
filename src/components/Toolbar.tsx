import type { ElementType, Settings } from '../types';
import { TEXT_PRESETS } from '../utils/constants';
import {
  Type, Image, Sigma, Table2, Minus, Square, Circle, Waypoints,
  ZoomIn, ZoomOut, Grid3x3, LayoutList, LayoutGrid, Grid2x2,
  Heading1, Heading2, User, Ruler, ListTree, BookDashed, BookText, Maximize2,
} from 'lucide-react';

interface Props {
  onAdd: (type: ElementType, overrides?: Record<string, unknown>) => void;
  onAddPreset: (preset: keyof typeof TEXT_PRESETS) => void;
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  onFitPage: () => void;
}

const insertButtons: { type: ElementType; icon: typeof Type; label: string; overrides?: Record<string, unknown> }[] = [
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'image', icon: Image, label: 'Image' },
  { type: 'math', icon: Sigma, label: 'Math' },
  { type: 'table', icon: Table2, label: 'Table' },
  { type: 'line', icon: Minus, label: 'Line' },
  { type: 'connector', icon: Waypoints, label: 'Arrow' },
  { type: 'toc', icon: ListTree, label: 'TOC' },
  { type: 'glossary', icon: BookDashed, label: 'Glossary' },
  { type: 'references', icon: BookText, label: 'Refs' },
  { type: 'shape', icon: Square, label: 'Rect' },
  { type: 'shape', icon: Circle, label: 'Circle', overrides: { isCircle: true, bgColor: '#8b5cf6' } },
];

export default function Toolbar({ onAdd, onAddPreset, settings, onUpdateSettings, onFitPage }: Props) {
  const btnClass = "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors";
  const boostGridVisibility = () => {
    if (settings.gridOpacity < 35) {
      onUpdateSettings({ gridOpacity: 50, gridThickness: Math.max(1.5, settings.gridThickness), snapToGrid: true });
      return;
    }
    if (settings.gridOpacity < 70) {
      onUpdateSettings({ gridOpacity: 80, gridThickness: Math.max(2.5, settings.gridThickness), snapToGrid: true });
      return;
    }
    onUpdateSettings({ gridOpacity: 18, gridThickness: 1 });
  };

  return (
    <div
      className="flex items-center gap-1 px-3 py-1 border-b overflow-x-auto shrink-0 no-print"
      style={{ background: 'var(--toolbar-bg)', borderColor: 'var(--panel-border)' }}
    >
      {/* Insert buttons */}
      <div className="flex items-center gap-0.5 pr-2 mr-2 border-r" style={{ borderColor: 'var(--panel-border)' }}>
        {insertButtons.map((btn, i) => (
          <button
            key={i}
            onClick={() => onAdd(btn.type, btn.overrides)}
            className={btnClass}
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title={btn.label}
          >
            <btn.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Presets */}
      <div className="flex items-center gap-0.5 pr-2 mr-2 border-r" style={{ borderColor: 'var(--panel-border)' }}>
        <button onClick={() => onAddPreset('title')} className={btnClass} style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Heading1 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Title</span>
        </button>
        <button onClick={() => onAddPreset('author')} className={btnClass} style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <User className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Author</span>
        </button>
        <button onClick={() => onAddPreset('heading')} className={btnClass} style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Heading2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Heading</span>
        </button>
      </div>

      {/* View controls */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onUpdateSettings({ snapToGrid: !settings.snapToGrid })}
          className={`${btnClass} ${settings.snapToGrid ? 'ring-1' : ''}`}
          style={{
            color: settings.snapToGrid ? 'var(--selected-border)' : 'var(--text-secondary)',
            outline: settings.snapToGrid ? '1px solid var(--selected-border)' : undefined,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Grid3x3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onUpdateSettings({ gridStyle: settings.gridStyle === 'dots' ? 'squares' : 'dots' })}
          className={btnClass}
          style={{ color: settings.snapToGrid ? 'var(--selected-border)' : 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          title={`Grid style: ${settings.gridStyle}`}
        >
          <Grid2x2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={boostGridVisibility}
          className={btnClass}
          style={{ color: settings.snapToGrid ? 'var(--selected-border)' : 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          title={`Boost grid visibility (opacity ${settings.gridOpacity}%, thickness ${settings.gridThickness}px)`}
        >
          <Grid3x3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Grid+</span>
        </button>

        <button
          onClick={() => onUpdateSettings({ viewMode: settings.viewMode === 'vertical' ? 'horizontal' : 'vertical' })}
          className={btnClass}
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          {settings.viewMode === 'vertical' ? <LayoutList className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => onUpdateSettings({ showGuides: !settings.showGuides })}
          className={`${btnClass} ${settings.showGuides ? 'ring-1' : ''}`}
          style={{
            color: settings.showGuides ? 'var(--selected-border)' : 'var(--text-secondary)',
            outline: settings.showGuides ? '1px solid var(--selected-border)' : undefined,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          title="Toggle guides (margins/rulers/header/footer)"
        >
          <Ruler className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-0.5 rounded-md" style={{ background: 'var(--hover-bg)' }}>
          <button
            onClick={() => onUpdateSettings({ zoom: Math.max(25, settings.zoom - 10) })}
            className="p-1 rounded-md cursor-pointer transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateSettings({ zoom: 100 })}
            className="text-xs w-10 text-center cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
          >
            {settings.zoom}%
          </button>
          <button
            onClick={() => onUpdateSettings({ zoom: Math.min(200, settings.zoom + 10) })}
            className="p-1 rounded-md cursor-pointer transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFitPage}
            className="p-1 rounded-md cursor-pointer transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Fit page"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
