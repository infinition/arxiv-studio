import type { Element } from '../types';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, ArrowUpToLine, ArrowDownToLine,
  Trash2, Star, RotateCw, Minus, Plus, FlipVertical2,
  Columns3, Rows3, ChevronUp, ChevronDown,
  LibraryBig,
} from 'lucide-react';

interface Props {
  element: Element;
  onUpdate: (updates: Partial<Element>) => void;
  onMoveLayer: (dir: 'up' | 'down' | 'front' | 'back') => void;
  onDelete: () => void;
  onToggleMaster: () => void;
  onAddToLibrary?: () => void;
}

export default function FloatingBar({ element, onUpdate, onMoveLayer, onDelete, onToggleMaster, onAddToLibrary }: Props) {
  const syncEditable = () => {
    const active = document.activeElement as HTMLElement | null;
    if (active?.isContentEditable) {
      onUpdate({ content: active.innerHTML });
      return;
    }
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    const root = node instanceof HTMLElement ? node.closest('[contenteditable="true"]') : node?.parentElement?.closest('[contenteditable="true"]');
    if (root instanceof HTMLElement) onUpdate({ content: root.innerHTML });
  };

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    syncEditable();
  };

  const applyInlineHeading = (level: 1 | 2 | 3) => {
    execCmd('formatBlock', `<h${level}>`);
  };

  const Btn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="p-1.5 rounded cursor-pointer transition-colors"
      style={{
        color: active ? '#60a5fa' : 'var(--floating-text)',
        background: active ? 'rgba(96,165,250,0.15)' : 'transparent',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
      onMouseLeave={(e) => e.currentTarget.style.background = active ? 'rgba(96,165,250,0.15)' : 'transparent'}
    >
      {children}
    </button>
  );

  const Sep = () => <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.15)' }} />;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-3 py-1.5 rounded-xl shadow-2xl no-print animate-slide-up"
      style={{ background: 'var(--floating-bg)', backdropFilter: 'blur(12px)', zIndex: 9999 }}
    >
      {/* Text controls */}
      {element.type === 'text' && (
        <>
          <Btn onClick={() => applyInlineHeading(1)} title="H1">
            <span className="text-xs font-bold">H1</span>
          </Btn>
          <Btn onClick={() => applyInlineHeading(2)} title="H2">
            <span className="text-xs font-bold">H2</span>
          </Btn>
          <Btn onClick={() => applyInlineHeading(3)} title="H3">
            <span className="text-xs font-bold">H3</span>
          </Btn>
          <Sep />
          <Btn onClick={() => execCmd('bold')} title="Bold">
            <Bold className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => execCmd('italic')} title="Italic">
            <Italic className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => execCmd('underline')} title="Underline">
            <Underline className="w-3.5 h-3.5" />
          </Btn>
          <Sep />
          <Btn onClick={() => onUpdate({ textAlign: 'left' })} active={element.textAlign === 'left'}>
            <AlignLeft className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => onUpdate({ textAlign: 'center' })} active={element.textAlign === 'center'}>
            <AlignCenter className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => onUpdate({ textAlign: 'right' })} active={element.textAlign === 'right'}>
            <AlignRight className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => onUpdate({ textAlign: 'justify' })} active={element.textAlign === 'justify'}>
            <AlignJustify className="w-3.5 h-3.5" />
          </Btn>
          <Sep />
          <Btn onClick={() => execCmd('insertUnorderedList')} title="Bullet list">
            <List className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => execCmd('insertOrderedList')} title="Numbered list">
            <ListOrdered className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => execCmd('insertHTML', '<input type="checkbox"/> ')} title="Checkbox">
            <CheckSquare className="w-3.5 h-3.5" />
          </Btn>
          <Sep />
          <Btn onClick={() => onUpdate({ fontSize: Math.max(6, element.fontSize - 1) })} title="Decrease font">
            <Minus className="w-3.5 h-3.5" />
          </Btn>
          <span className="text-xs w-6 text-center" style={{ color: 'var(--floating-text)' }}>{element.fontSize}</span>
          <Btn onClick={() => onUpdate({ fontSize: element.fontSize + 1 })} title="Increase font">
            <Plus className="w-3.5 h-3.5" />
          </Btn>
          <Sep />
          <Btn onClick={() => onUpdate({ verticalText: !element.verticalText })} active={element.verticalText} title="Vertical text">
            <RotateCw className="w-3.5 h-3.5" />
          </Btn>
          {element.verticalText && (
            <Btn onClick={() => onUpdate({ mirrorVertical: !element.mirrorVertical })} active={element.mirrorVertical} title="Mirror vertical text">
              <FlipVertical2 className="w-3.5 h-3.5" />
            </Btn>
          )}
        </>
      )}

      {element.type === 'markdownobs' && (
        <>
          <Btn onClick={() => onUpdate({ fontSize: Math.max(6, element.fontSize - 1) })} title="Decrease font">
            <Minus className="w-3.5 h-3.5" />
          </Btn>
          <span className="text-xs w-6 text-center" style={{ color: 'var(--floating-text)' }}>{element.fontSize}</span>
          <Btn onClick={() => onUpdate({ fontSize: element.fontSize + 1 })} title="Increase font">
            <Plus className="w-3.5 h-3.5" />
          </Btn>
        </>
      )}

      {/* Table controls */}
      {element.type === 'table' && element.tableData && (
        <>
          <Btn onClick={() => {
            const d = element.tableData!;
            onUpdate({ tableData: [...d, Array(d[0]?.length || 1).fill('')] });
          }} title="Add row">
            <Rows3 className="w-3.5 h-3.5" /><Plus className="w-2.5 h-2.5" />
          </Btn>
          <Btn onClick={() => {
            const d = element.tableData!;
            if (d.length > 1) onUpdate({ tableData: d.slice(0, -1) });
          }} title="Remove row">
            <Rows3 className="w-3.5 h-3.5" /><Minus className="w-2.5 h-2.5" />
          </Btn>
          <Sep />
          <Btn onClick={() => {
            onUpdate({ tableData: element.tableData!.map((r) => [...r, '']) });
          }} title="Add column">
            <Columns3 className="w-3.5 h-3.5" /><Plus className="w-2.5 h-2.5" />
          </Btn>
          <Btn onClick={() => {
            const d = element.tableData!;
            if ((d[0]?.length || 0) > 1) onUpdate({ tableData: d.map((r) => r.slice(0, -1)) });
          }} title="Remove column">
            <Columns3 className="w-3.5 h-3.5" /><Minus className="w-2.5 h-2.5" />
          </Btn>
        </>
      )}

      {/* Line controls */}
      {element.type === 'line' && (
        <>
          <Btn onClick={() => onUpdate({ thickness: Math.max(1, element.thickness - 1) })} title="Thinner">
            <Minus className="w-3.5 h-3.5" />
          </Btn>
          <span className="text-xs w-6 text-center" style={{ color: 'var(--floating-text)' }}>{element.thickness}px</span>
          <Btn onClick={() => onUpdate({ thickness: element.thickness + 1 })} title="Thicker">
            <Plus className="w-3.5 h-3.5" />
          </Btn>
          <Sep />
          <Btn
            onClick={() => onUpdate({ orientation: element.orientation === 'horizontal' ? 'vertical' : 'horizontal' })}
            title="Toggle orientation"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Btn>
        </>
      )}

      {element.type === 'shape' && (
        <>
          <Btn onClick={() => onUpdate({ thickness: Math.max(1, element.thickness - 1) })} title="Thinner border">
            <Minus className="w-3.5 h-3.5" />
          </Btn>
          <span className="text-xs w-6 text-center" style={{ color: 'var(--floating-text)' }}>{element.thickness}px</span>
          <Btn onClick={() => onUpdate({ thickness: element.thickness + 1 })} title="Thicker border">
            <Plus className="w-3.5 h-3.5" />
          </Btn>
        </>
      )}

      {element.type === 'connector' && (
        <>
          <Btn onClick={() => onUpdate({ thickness: Math.max(1, element.thickness - 1) })} title="Thinner line">
            <Minus className="w-3.5 h-3.5" />
          </Btn>
          <span className="text-xs w-6 text-center" style={{ color: 'var(--floating-text)' }}>{element.thickness}px</span>
          <Btn onClick={() => onUpdate({ thickness: element.thickness + 1 })} title="Thicker line">
            <Plus className="w-3.5 h-3.5" />
          </Btn>
          <Sep />
          <Btn onClick={() => onUpdate({ connectorCurved: !element.connectorCurved })} active={element.connectorCurved} title="Bezier curve">
            <RotateCw className="w-3.5 h-3.5" />
          </Btn>
        </>
      )}

      {/* Common controls */}
      <Sep />
      <Btn onClick={() => onMoveLayer('front')} title="Bring to front">
        <ArrowUpToLine className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => onMoveLayer('back')} title="Send to back">
        <ArrowDownToLine className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => onMoveLayer('up')} title="Move up">
        <ChevronUp className="w-3.5 h-3.5" />
      </Btn>
      <Btn onClick={() => onMoveLayer('down')} title="Move down">
        <ChevronDown className="w-3.5 h-3.5" />
      </Btn>
      <Sep />
      <Btn onClick={onToggleMaster} active={element.isMaster} title="Master element (repeats on all pages)">
        <Star className="w-3.5 h-3.5" />
      </Btn>
      {onAddToLibrary && (
        <Btn onClick={onAddToLibrary} title="Add to asset library">
          <LibraryBig className="w-3.5 h-3.5" />
        </Btn>
      )}
      <Btn onClick={onDelete} title="Delete">
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </Btn>
    </div>
  );
}
