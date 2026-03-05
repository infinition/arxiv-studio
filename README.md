# ArXiv Studio

ArXiv Studio is a paper layout editor for academic content, built with one shared codebase for:

- Web app (Vite build)
- Obsidian embedded view (plugin webapp)

It focuses on fast visual editing, arXiv-oriented structure, and local-first persistence.

## Current Features

### Document editing
- Element types: `text`, `markdownobs`, `image`, `math`, `table`, `line`, `shape`, `connector`, `toc`, `glossary`, `references`
- Rich text tools: H1/H2/H3, bold, italic, underline, lists, checkboxes, alignment
- Double-click editing for text, markdown, math, and image frame import
- Per-element typography: font family, size, line height, letter spacing, vertical text, mirror mode
- Dynamic blocks:
  - TOC generated from headings
  - Glossary generated from `Term: Definition` patterns
  - References generated from citation patterns

### Layout and canvas
- Multi-page editor with per-page orientation (portrait/landscape)
- Header/Page/Footer editing contexts
- Global and per-side margin controls (inputs + sliders)
- Guides/rulers and grid styles (dots or squares)
- Zoom controls, fit page, and `Shift + wheel` zoom
- Real-time transform status (x/y/w/h/rotation)
- Alignment guides during drag

### Manipulation
- Drag, resize, rotate
- Ratio-aware resizing for images/shapes
- Incremental rotation with modifier keys
- Layer ordering (front/back/up/down)
- Multi-select (`Ctrl/Cmd + click`)
- Group / ungroup, group rename, group selection
- Move elements and groups between pages

### Assets and fonts
- Asset library with folders
- Drag and drop organization inside asset folders
- Rename folders/files with double click
- Search with clear button
- Add selected canvas element to asset library
- Font import and preview in selectors
- Default font + per-element font support on all text-based blocks
- Paper texture support (global or per page)

### Persistence and workspace
- Project grid with create/duplicate/delete/import
- Auto-save to local storage
- Optional web folder mirror (when supported) to also write `projects.json` into a user-selected local directory
- JSON import/export
- Undo/redo history (`Ctrl+Z`, `Ctrl+Shift+Z`)

### Export
- LaTeX export (`.tex`)
- Print mode
- Save as PDF button (recommended for Obsidian runtime)
- Selection highlights and editor handles excluded from print/PDF output

## Obsidian Integration

ArXiv Studio can run embedded inside Obsidian with the same app code.

### Build
```bash
npm run build:obsidian
```

Generated outputs:
- `obsidian-module/main.js`
- `obsidian-module/webapp/*`

### Plugin install (manual)
Copy into:

`<vault>/.obsidian/plugins/arxiv-studio-bridge/`

Required files:
- `obsidian-module/manifest.json`
- `obsidian-module/main.js`
- `obsidian-module/styles.css`
- `obsidian-module/webapp/` (full folder)

### Obsidian bridge capabilities
- Drag/drop from vault to canvas (images, markdown/text, links)
- URI resolution for `obsidian://open?...`
- Markdown payload support (`text`, `html`) for dedicated markdown block creation
- Optional project mirror to vault/provider target

### Vault mirror and provider options
- Local vault file mirror (`projects.json`)
- Optional image mode:
  - Embedded (base64)
  - Linked vault images (`vault-image://...`)
- Provider targets:
  - OneDrive
  - GitHub
  - iCloud Drive local path

## PDF Export Recommendation

Inside Obsidian, native print preview may be blank depending on host/runtime restrictions.

Use **Save as PDF** from the top bar for reliable exports.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Delete` / `Backspace` | Delete selected element(s) |
| `Ctrl/Cmd + C` | Copy selected element |
| `Ctrl/Cmd + X` | Cut selected element |
| `Ctrl/Cmd + V` | Paste element (also works across pages) |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Arrow keys` | Move selected element by 1px |
| `Shift + Arrow keys` | Move selected element by 10px |
| `Shift + Wheel` | Zoom in/out |
| `Ctrl/Cmd + Click` | Multi-select |

## Tech Stack

- React 19
- TypeScript 5
- Vite
- Tailwind CSS v4
- `lucide-react`
- `html2canvas` + `jspdf` for direct PDF export

## Local Development

### Requirements
- Node.js >= 18
- npm >= 9

### Install and run
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Build web + Obsidian package
```bash
npm run build:all
```

## CI/CD

- `deploy-pages.yml`
  - Deploys web build to GitHub Pages
- `release.yml`
  - Builds web + Obsidian artifacts
  - Supports tags with or without `v` prefix
  - Publishes BRAT-compatible plugin assets (`manifest.json`, `main.js`, `styles.css`, `versions.json`)

## Versioning Note

For Obsidian releases, `manifest.json` version must match the git tag version without `v`.

Example:
- Tag `v1.2.3`
- Manifest version `1.2.3`
