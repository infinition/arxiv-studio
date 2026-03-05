import type { Element, Page, Settings } from '../types';

export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;
export const RULER_SIZE = 20;
export const DEFAULT_FONT_STACK = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const DEFAULT_SETTINGS: Settings = {
  viewMode: 'vertical',
  snapToGrid: false,
  showGuides: true,
  gridStyle: 'dots',
  gridSize: 10,
  zoom: 100,
  paperTextureGlobal: null,
  defaultFont: DEFAULT_FONT_STACK,
  margins: { top: 72, right: 72, bottom: 72, left: 72 },
};

export function getPageSize(page: Pick<Page, 'orientation'>) {
  return page.orientation === 'landscape'
    ? { width: PAGE_HEIGHT, height: PAGE_WIDTH }
    : { width: PAGE_WIDTH, height: PAGE_HEIGHT };
}

export const DEFAULT_ELEMENT: Omit<Element, 'id' | 'type'> = {
  x: 100,
  y: 100,
  w: 200,
  h: 40,
  content: '',
  fontSize: 12,
  rotation: 0,
  opacity: 1,
  padding: 4,
  color: '#000000',
  bgColor: 'transparent',
  textAlign: 'left',
  verticalText: false,
  textInverted: false,
  lineHeight: 1.5,
  letterSpacing: 0,
  mirrorVertical: false,
  fontFamily: DEFAULT_FONT_STACK,
  isBold: false,
  isItalic: false,
  isMaster: false,
  isCircle: false,
  cornerRadius: 0,
  thickness: 2,
  orientation: 'horizontal',
  connectorControls: undefined,
  connectorCurved: false,
  connectorArrowStart: false,
  connectorArrowEnd: true,
  frameEnabled: false,
  frameColor: '#111827',
  frameThickness: 1,
  framePadding: 6,
  frameRadius: 0,
};

export const TEXT_PRESETS = {
  title: { fontSize: 28, isBold: true, textAlign: 'center' as const, w: 600, h: 50 },
  author: { fontSize: 14, textAlign: 'center' as const, w: 400, h: 30 },
  heading: { fontSize: 18, isBold: true, w: 500, h: 36 },
};

export function createId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function createElement(type: Element['type'], overrides: Partial<Element> = {}): Element {
  const defaults: Record<string, Partial<Element>> = {
    text: { w: 200, h: 40, content: 'Text' },
    markdownobs: { w: 460, h: 220, content: '# Markdown\n\nDropped from Obsidian' },
    image: { w: 200, h: 150, content: 'https://via.placeholder.com/200x150', originalRatio: 200 / 150 },
    math: { w: 250, h: 60, content: 'E = mc^2' },
    table: { w: 300, h: 120, tableData: [['Col 1', 'Col 2', 'Col 3'], ['', '', ''], ['', '', '']] },
    line: { w: 300, h: 4 },
    shape: { w: 150, h: 100, bgColor: '#3b82f6' },
    toc: { w: 360, h: 280, content: 'Table of Contents', bgColor: '#ffffff' },
    glossary: { w: 360, h: 260, content: 'Glossary', bgColor: '#ffffff' },
    references: { w: 360, h: 240, content: 'References', bgColor: '#ffffff' },
    connector: {
      w: 260,
      h: 120,
      pathPoints: [{ x: 0, y: 60 }, { x: 260, y: 60 }],
      connectorControls: [{ x: 130, y: 20 }],
      thickness: 2,
      color: '#111827',
      bgColor: 'transparent',
      connectorCurved: false,
      connectorArrowStart: false,
      connectorArrowEnd: true,
    },
  };

  return {
    ...DEFAULT_ELEMENT,
    id: createId(),
    type,
    ...defaults[type],
    ...overrides,
  };
}
