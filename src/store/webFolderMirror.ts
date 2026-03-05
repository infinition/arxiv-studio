import type { Project } from '../types';

const ENABLE_KEY = 'arxiv-studio-web-folder-mirror-enabled';
const FOLDER_NAME_KEY = 'arxiv-studio-web-folder-mirror-name';

type PermissionMode = 'read' | 'readwrite';
type PermissionState = 'granted' | 'denied' | 'prompt';

interface FileHandleLike {
  createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
}

interface DirectoryHandleLike {
  name?: string;
  requestPermission?: (options?: { mode?: PermissionMode }) => Promise<PermissionState>;
  queryPermission?: (options?: { mode?: PermissionMode }) => Promise<PermissionState>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileHandleLike>;
}

let selectedDirHandle: DirectoryHandleLike | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function getWindowSafe(): (Window & typeof globalThis) | null {
  return typeof window === 'undefined' ? null : window;
}

export function isWebFolderMirrorSupported() {
  const win = getWindowSafe();
  if (!win) return false;
  if (win.parent !== win) return false; // avoid embedded runtimes (obsidian iframe)
  return typeof (win as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';
}

export function getWebFolderMirrorEnabled() {
  const win = getWindowSafe();
  if (!win) return false;
  const wanted = win.localStorage.getItem(ENABLE_KEY) === '1';
  if (!wanted) return false;
  return Boolean(selectedDirHandle);
}

export function setWebFolderMirrorEnabled(value: boolean) {
  const win = getWindowSafe();
  if (!win) return;
  win.localStorage.setItem(ENABLE_KEY, value ? '1' : '0');
  if (!value) selectedDirHandle = null;
}

export function getWebFolderMirrorFolderName() {
  const win = getWindowSafe();
  if (!win) return '';
  return win.localStorage.getItem(FOLDER_NAME_KEY) || '';
}

async function ensureWritePermission(handle: DirectoryHandleLike) {
  const query = await handle.queryPermission?.({ mode: 'readwrite' });
  if (query === 'granted') return true;
  const requested = await handle.requestPermission?.({ mode: 'readwrite' });
  return requested === 'granted';
}

export async function pickWebFolderMirrorDirectory() {
  const win = getWindowSafe();
  if (!win || !isWebFolderMirrorSupported()) {
    return { ok: false as const, message: 'Local folder mirror is not supported in this runtime.' };
  }

  try {
    const picker = (win as unknown as { showDirectoryPicker: () => Promise<DirectoryHandleLike> }).showDirectoryPicker;
    const handle = await picker();
    const granted = await ensureWritePermission(handle);
    if (!granted) {
      return { ok: false as const, message: 'Write permission denied for selected folder.' };
    }
    selectedDirHandle = handle;
    win.localStorage.setItem(FOLDER_NAME_KEY, handle.name || 'selected-folder');
    return { ok: true as const, folderName: handle.name || 'selected-folder' };
  } catch {
    return { ok: false as const, message: 'Folder selection canceled or failed.' };
  }
}

async function writeProjectsJson(payload: string) {
  if (!selectedDirHandle) return;
  const file = await selectedDirHandle.getFileHandle('projects.json', { create: true });
  const writable = await file.createWritable();
  await writable.write(payload);
  await writable.close();
}

export function queueWebFolderMirrorWrite(projects: Project[]) {
  if (!isWebFolderMirrorSupported()) return;
  if (!getWebFolderMirrorEnabled()) return;
  if (!selectedDirHandle) return;
  const payload = JSON.stringify(projects, null, 2);
  writeQueue = writeQueue
    .then(() => writeProjectsJson(payload))
    .catch(() => undefined);
}
