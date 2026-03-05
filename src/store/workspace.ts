import type { Element, ElementGroup, Page, Project } from '../types';
import { createId, DEFAULT_ELEMENT, DEFAULT_SETTINGS } from '../utils/constants';

const STORAGE_KEY = 'arxiv-studio-projects';

function loadAll(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeProject) : [];
  } catch {
    return [];
  }
}

function saveAll(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProjects(): Project[] {
  return loadAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | undefined {
  return loadAll().find((p) => p.id === id);
}

export function createProject(name: string): Project {
  const project: Project = {
    id: createId(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnail: '',
    pages: [{ id: createId(), orientation: 'portrait', paperTexture: null, groups: [], elements: [] }],
    headerElements: [],
    footerElements: [],
    assets: [],
    assetFolders: ['assets/images', 'assets/textures'],
    fonts: [],
    settings: { ...DEFAULT_SETTINGS },
  };
  const all = loadAll();
  all.push(project);
  saveAll(all);
  return project;
}

export function saveProject(project: Project) {
  const all = loadAll();
  const idx = all.findIndex((p) => p.id === project.id);
  const updated = { ...project, updatedAt: Date.now() };
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  saveAll(all);
}

export function deleteProject(id: string) {
  saveAll(loadAll().filter((p) => p.id !== id));
}

export function duplicateProject(id: string): Project | undefined {
  const source = getProject(id);
  if (!source) return undefined;
  const dup: Project = {
    ...normalizeProject(JSON.parse(JSON.stringify(source))),
    id: createId(),
    name: `${source.name} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const all = loadAll();
  all.push(dup);
  saveAll(all);
  return dup;
}

export function exportProjectJson(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectJson(json: string): Project | null {
  try {
    const p = normalizeProject(JSON.parse(json));
    if (p.pages && p.id) {
      p.id = createId();
      p.updatedAt = Date.now();
      const all = loadAll();
      all.push(p);
      saveAll(all);
      return p;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeElement(raw: Partial<Element> & { id?: string; type?: Element['type'] }): Element {
  const type = raw.type || 'text';
  const base = { ...DEFAULT_ELEMENT, ...raw, id: raw.id || createId(), type };
  return {
    ...base,
    w: Number.isFinite(base.w) ? Math.max(10, Number(base.w)) : 120,
    h: Number.isFinite(base.h) ? Math.max(10, Number(base.h)) : 40,
    x: Number.isFinite(base.x) ? Number(base.x) : 0,
    y: Number.isFinite(base.y) ? Number(base.y) : 0,
    content: typeof base.content === 'string' ? base.content : '',
    tableData: Array.isArray(base.tableData) ? base.tableData : undefined,
    pathPoints: Array.isArray(base.pathPoints)
      ? base.pathPoints
          .filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))
          .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
      : type === 'connector'
        ? [{ x: 0, y: Math.max(10, Number(base.h) / 2) }, { x: Math.max(10, Number(base.w)), y: Math.max(10, Number(base.h) / 2) }]
        : undefined,
    connectorControls: Array.isArray(base.connectorControls)
      ? base.connectorControls
          .filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))
          .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
      : type === 'connector'
        ? [{ x: Number(base.w) / 2, y: Number(base.h) / 3 }]
        : undefined,
  };
}

function normalizeGroup(raw: Partial<ElementGroup>): ElementGroup {
  return {
    id: raw.id || createId(),
    name: raw.name || 'Group',
    elementIds: Array.isArray(raw.elementIds) ? raw.elementIds.filter((id): id is string => typeof id === 'string') : [],
  };
}

function normalizePage(raw: Partial<Page> & { id?: string }): Page {
  return {
    id: raw.id || createId(),
    orientation: raw.orientation === 'landscape' ? 'landscape' : 'portrait',
    paperTexture: typeof raw.paperTexture === 'string' ? raw.paperTexture : null,
    groups: Array.isArray(raw.groups) ? raw.groups.map((g) => normalizeGroup(g)) : [],
    elements: Array.isArray(raw.elements) ? raw.elements.map((el) => normalizeElement(el)) : [],
  };
}

function normalizeProject(raw: Partial<Project>): Project {
  return {
    id: raw.id || createId(),
    name: raw.name || 'Untitled Project',
    createdAt: Number(raw.createdAt || Date.now()),
    updatedAt: Number(raw.updatedAt || Date.now()),
    thumbnail: raw.thumbnail || '',
    pages: Array.isArray(raw.pages) && raw.pages.length ? raw.pages.map((p) => normalizePage(p)) : [{ id: createId(), orientation: 'portrait', paperTexture: null, groups: [], elements: [] }],
    headerElements: Array.isArray(raw.headerElements) ? raw.headerElements.map((el) => normalizeElement(el)) : [],
    footerElements: Array.isArray(raw.footerElements) ? raw.footerElements.map((el) => normalizeElement(el)) : [],
    assets: Array.isArray(raw.assets) ? raw.assets : [],
    assetFolders: Array.isArray(raw.assetFolders) && raw.assetFolders.length ? raw.assetFolders : ['assets/images', 'assets/textures'],
    fonts: Array.isArray(raw.fonts) ? raw.fonts : [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...(raw.settings || {}),
      margins: { ...DEFAULT_SETTINGS.margins, ...(raw.settings?.margins || {}) },
      gridStyle: raw.settings?.gridStyle === 'squares' ? 'squares' : 'dots',
      showGuides: raw.settings?.showGuides !== false,
      defaultFont: typeof raw.settings?.defaultFont === 'string' ? raw.settings.defaultFont : DEFAULT_SETTINGS.defaultFont,
      paperTextureGlobal: raw.settings?.paperTextureGlobal || null,
    },
  };
}
