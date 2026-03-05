import { useMemo, useState } from 'react';
import type { AssetItem, FontAsset } from '../types';
import { FolderPlus, ImagePlus, Search, Trash2, Type, X } from 'lucide-react';

interface Props {
  assets: AssetItem[];
  assetFolders: string[];
  fonts: FontAsset[];
  onImportAssets: () => void;
  onImportFonts: () => void;
  onMoveAsset: (id: string, folder: string) => void;
  onMoveFont: (id: string, folder: string) => void;
  onDeleteAsset: (id: string) => void;
  onDeleteFont: (id: string) => void;
  onCreateFolder: (folder: string) => void;
  onRenameFolder: (from: string, to: string) => void;
  onRenameAsset: (id: string, name: string) => void;
  onRenameFont: (id: string, name: string) => void;
}

function folderName(folder: string) {
  const chunks = folder.split('/');
  return chunks[chunks.length - 1] || folder;
}

function normalizeFolderLeaf(name: string) {
  return name.trim().replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
}

function renameFolderPath(folder: string, nextLeaf: string) {
  const chunks = folder.split('/').filter(Boolean);
  if (chunks.length === 0) return folder;
  chunks[chunks.length - 1] = nextLeaf;
  return chunks.join('/');
}

export default function AssetsPanel({
  assets,
  assetFolders,
  fonts,
  onImportAssets,
  onImportFonts,
  onMoveAsset,
  onMoveFont,
  onDeleteAsset,
  onDeleteFont,
  onCreateFolder,
  onRenameFolder,
  onRenameAsset,
  onRenameFont,
}: Props) {
  const [selectedFolder, setSelectedFolder] = useState('assets/images');
  const [newFolderName, setNewFolderName] = useState('');
  const [search, setSearch] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [editingFont, setEditingFont] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const folders = useMemo(() => {
    const all = new Set<string>(['assets/images', 'assets/textures', 'assets/fonts']);
    assetFolders.forEach((f) => all.add(f));
    assets.forEach((a) => all.add(a.folder));
    fonts.forEach((f) => all.add(f.folder));
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [assetFolders, assets, fonts]);

  const q = search.trim().toLowerCase();
  const filteredFolders = folders.filter((folder) => !q || folder.toLowerCase().includes(q) || folderName(folder).toLowerCase().includes(q));
  const inFolderAssets = assets.filter((a) => a.folder === selectedFolder && (!q || a.name.toLowerCase().includes(q)));
  const inFolderFonts = fonts.filter((f) => f.folder === selectedFolder && (!q || f.name.toLowerCase().includes(q) || f.family.toLowerCase().includes(q)));

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Assets Library
        </span>
        <div className="flex items-center gap-1">
          <button onClick={onImportAssets} className="p-1 rounded cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Import images/svg">
            <ImagePlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={onImportFonts} className="p-1 rounded cursor-pointer" style={{ color: 'var(--text-secondary)' }} title="Import fonts to assets/fonts">
            <Type className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-1 flex gap-1">
        <input
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="new-folder"
          className="flex-1 px-2 py-1 rounded text-xs border outline-none"
          style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
        />
        <button
          onClick={() => {
            const slug = normalizeFolderLeaf(newFolderName);
            if (!slug) return;
            onCreateFolder(`assets/${slug}`);
            setSelectedFolder(`assets/${slug}`);
            setNewFolderName('');
          }}
          className="px-2 py-1 rounded text-xs cursor-pointer"
          style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}
          title="Create folder"
        >
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-1 relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets, fonts, folders..."
          className="w-full pl-8 pr-7 py-1 rounded text-xs border outline-none"
          style={{ background: 'var(--hover-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-28 overflow-y-auto space-y-1 px-1">
        {filteredFolders.map((folder) => {
          const active = selectedFolder === folder;
          const isEditing = editingFolder === folder;
          return (
            <div
              key={folder}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const raw = e.dataTransfer.getData('application/arxiv-asset');
                if (!raw) return;
                try {
                  const payload = JSON.parse(raw) as { type: 'asset' | 'font'; id: string };
                  if (payload.type === 'asset') onMoveAsset(payload.id, folder);
                  if (payload.type === 'font') onMoveFont(payload.id, folder);
                } catch {
                  // ignore malformed payloads
                }
              }}
              className="w-full px-2 py-1 rounded text-xs transition-colors"
              style={{
                background: active ? 'var(--selected-bg)' : 'transparent',
                border: active ? '1px solid var(--selected-border)' : '1px solid transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
              onDoubleClick={() => {
                setEditingFolder(folder);
                setRenameDraft(folderName(folder));
              }}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  className="w-full text-xs px-1 py-0.5 rounded border outline-none"
                  style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
                  onBlur={() => {
                    const leaf = normalizeFolderLeaf(renameDraft);
                    if (leaf && leaf !== folderName(folder)) {
                      const next = renameFolderPath(folder, leaf);
                      onRenameFolder(folder, next);
                      if (selectedFolder === folder) setSelectedFolder(next);
                    }
                    setEditingFolder(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                    if (e.key === 'Escape') setEditingFolder(null);
                  }}
                />
              ) : (
                <button
                  onClick={() => setSelectedFolder(folder)}
                  className="w-full text-left cursor-pointer"
                >
                  {folderName(folder)}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t pt-2" style={{ borderColor: 'var(--panel-border)' }}>
        <div className="text-xs mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>
          {folderName(selectedFolder)} ({inFolderAssets.length + inFolderFonts.length})
        </div>

        {inFolderAssets.length === 0 && inFolderFonts.length === 0 && (
          <div className="text-xs px-1 py-2" style={{ color: 'var(--text-secondary)' }}>
            Empty folder
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {inFolderAssets.map((asset) => {
            const isEditing = editingAsset === asset.id;
            return (
              <div
                key={asset.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copyMove';
                  e.dataTransfer.setData('application/arxiv-asset', JSON.stringify({ type: 'asset', id: asset.id }));
                }}
                className="rounded-md border p-1 group"
                style={{ borderColor: 'var(--panel-border)', background: 'var(--hover-bg)' }}
              >
                <div className="aspect-square rounded overflow-hidden mb-1" style={{ background: 'var(--page-bg)' }}>
                  <img src={asset.dataUrl} alt={asset.name} className="w-full h-full object-cover" draggable={false} />
                </div>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      className="text-[10px] px-1 py-0.5 rounded border outline-none flex-1"
                      style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
                      onBlur={() => {
                        const value = renameDraft.trim();
                        if (value && value !== asset.name) onRenameAsset(asset.id, value);
                        setEditingAsset(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingAsset(null);
                      }}
                    />
                  ) : (
                    <span
                      className="text-[10px] truncate flex-1"
                      style={{ color: 'var(--text-secondary)' }}
                      onDoubleClick={() => {
                        setEditingAsset(asset.id);
                        setRenameDraft(asset.name);
                      }}
                    >
                      {asset.name}
                    </span>
                  )}
                  <button
                    onClick={() => onDeleteAsset(asset.id)}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Delete asset"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1 mt-2">
          {inFolderFonts.map((font) => {
            const isEditing = editingFont === font.id;
            return (
              <div
                key={font.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('application/arxiv-asset', JSON.stringify({ type: 'font', id: font.id }));
                }}
                className="rounded border px-2 py-1.5 group"
                style={{ borderColor: 'var(--panel-border)', background: 'var(--hover-bg)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                  {isEditing ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      className="text-[11px] px-1 py-0.5 rounded border outline-none flex-1"
                      style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-primary)' }}
                      onBlur={() => {
                        const value = renameDraft.trim();
                        if (value && value !== font.name) onRenameFont(font.id, value);
                        setEditingFont(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingFont(null);
                      }}
                    />
                  ) : (
                    <span
                      className="text-[11px] truncate flex-1"
                      style={{ color: 'var(--text-primary)', fontFamily: font.family }}
                      onDoubleClick={() => {
                        setEditingFont(font.id);
                        setRenameDraft(font.name);
                      }}
                    >
                      {font.name}
                    </span>
                  )}
                  <button
                    onClick={() => onDeleteFont(font.id)}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Delete font"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-[10px] truncate mt-1" style={{ color: 'var(--text-primary)', fontFamily: font.family }}>
                  Lorem ipsum dolor sit amet 123
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
