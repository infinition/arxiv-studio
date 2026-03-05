export type ElementType = 'text' | 'markdownobs' | 'image' | 'math' | 'table' | 'line' | 'shape' | 'connector' | 'toc' | 'glossary' | 'references';
export type EditingContext = 'header' | 'page' | 'footer';
export type ViewMode = 'vertical' | 'horizontal';
export type RightPanelTab = 'properties' | 'validator' | 'latex';
export type LeftPanelTab = 'layers' | 'pages' | 'assets';
export type ThemeMode = 'light' | 'dark' | 'dark-paper';

export interface Point {
  x: number;
  y: number;
}

export interface ElementGroup {
  id: string;
  name: string;
  elementIds: string[];
}

export interface AssetItem {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  folder: string;
  kind: 'image' | 'texture';
}

export interface FontAsset {
  id: string;
  family: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  folder: string;
}

export interface Element {
  id: string;
  name?: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  fontSize: number;
  rotation: number;
  opacity: number;
  padding: number;
  color: string;
  bgColor: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  verticalText: boolean;
  textInverted: boolean;
  lineHeight: number;
  letterSpacing: number;
  mirrorVertical: boolean;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  isMaster: boolean;
  isCircle: boolean;
  cornerRadius: number;
  thickness: number;
  orientation: 'horizontal' | 'vertical';
  originalRatio?: number;
  pathPoints?: Point[];
  connectorControls?: Point[];
  connectorCurved?: boolean;
  connectorArrowStart?: boolean;
  connectorArrowEnd?: boolean;
  frameEnabled: boolean;
  frameColor: string;
  frameThickness: number;
  framePadding: number;
  frameRadius: number;
  renderedMarkdownHtml?: string;
  tableData?: string[][];
}

export interface Page {
  id: string;
  orientation: 'portrait' | 'landscape';
  paperTexture?: string | null;
  groups?: ElementGroup[];
  elements: Element[];
}

export interface Settings {
  viewMode: ViewMode;
  snapToGrid: boolean;
  showGuides: boolean;
  gridStyle: 'dots' | 'squares';
  gridSize: number;
  gridOpacity: number;
  gridThickness: number;
  zoom: number;
  paperTextureGlobal?: string | null;
  defaultFont: string;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail: string;
  pages: Page[];
  headerElements: Element[];
  footerElements: Element[];
  assets: AssetItem[];
  assetFolders: string[];
  fonts: FontAsset[];
  settings: Settings;
}

export interface LintWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  elementId?: string;
}
