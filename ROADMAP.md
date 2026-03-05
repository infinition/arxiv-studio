# ArXiv Studio Roadmap

This roadmap reflects the current state of the project and next delivery targets.

## Done

- [x] Shared codebase for web app and Obsidian embedded runtime
- [x] Multi-page editor with page orientation (portrait/landscape)
- [x] Header/Page/Footer editing contexts
- [x] Element library including connectors, TOC, glossary, references, markdown blocks
- [x] Rich text toolbar (headings, inline style, lists, alignment)
- [x] Double-click editing for text, markdown, math, image import
- [x] Multi-select and grouping (group/ungroup/rename/select)
- [x] Move elements/groups across pages
- [x] Asset explorer with folders, drag/drop organization, rename, search
- [x] Font import and previews, default font, per-element font support
- [x] Grid modes (dots/squares), guides, rulers, alignment indicators
- [x] Undo/redo with keyboard shortcuts and toolbar actions
- [x] JSON import/export
- [x] LaTeX export
- [x] Save as PDF direct export (`html2canvas + jsPDF`)
- [x] Print/PDF output cleanup (no editor selection/handles in export)
- [x] Obsidian bridge for drag/drop and URI resolution
- [x] Optional vault/provider mirror with image link vs embedded mode
- [x] GitHub workflows for Pages deploy and Release packaging (BRAT assets)

## In Progress / Stabilization

- [ ] Obsidian print command reliability across desktop variants
- [ ] Cross-environment drag/drop normalization (all vault URI formats)
- [ ] Further PDF fidelity tuning (fonts, anti-aliasing, vector strategy)
- [ ] Expanded runtime diagnostics (bridge logs, mirror sync status panel)

## Next Priorities (Short Term)

- [ ] Multi-element clipboard (copy/cut/paste as a set, preserve relative offsets)
- [ ] Better markdown block parity with Obsidian renderer and embed handling
- [ ] Table and markdown editing UX refinements
- [ ] Auto-save status indicator in UI
- [ ] Project-level export/import validation and recovery flows
- [ ] Optional PDF quality presets (draft/standard/high)

## Mid Term

- [ ] Citation workflow (BibTeX import, cite insertion helpers)
- [ ] Template presets (IEEE, ACM, NeurIPS, arXiv defaults)
- [ ] Image crop and fit tools
- [ ] Find/replace across pages and contexts
- [ ] Improved accessibility and keyboard-only authoring

## Long Term

- [ ] Cloud auth flows and first-class provider connectors
- [ ] Real-time collaboration model
- [ ] Version history snapshots and restore
- [ ] Plugin extension API
- [ ] Optional backend sync service (self-hosted or managed)

