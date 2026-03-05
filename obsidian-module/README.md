# ArXiv Studio Obsidian Module

This module runs the full ArXiv Studio app inside Obsidian (same web app codebase).

## Build

From project root:

```bash
npm run build:obsidian
```

This command:

1. builds the web app (`dist`)
2. copies it to `obsidian-module/webapp`
3. bundles `obsidian-module/main.ts` into `obsidian-module/main.js`

## Install in vault

Copy these into:

`<vault>/.obsidian/plugins/arxiv-studio-bridge/`

- `manifest.json`
- `main.js`
- `styles.css`
- `webapp/` (entire folder)

## Runtime modes

In plugin settings:

- `Embedded`: uses local packaged `webapp/index.html` (offline use)
- `Remote URL`: points to hosted app URL (GitHub Pages/local dev server)

## Vault interaction

- Drag text/markdown/images from Obsidian into the ArXiv view.
- The module forwards payloads to the app with `postMessage`.
- The app creates corresponding elements on the active page.

## Cloud provider metadata

Settings include provider metadata fields:

- Local
- Dropbox
- Google Drive
- OneDrive
- GitHub

Use these as sync configuration anchors for your vault storage strategy.
