![diapo — Fast presentations in the browser](banner.svg)

A fast, lightweight, fully client-side alternative to heavy presentation suites.
Create, edit, present and export **real `.pptx` files** — with **no account,
no backend, no build step and zero dependencies** (`index.html` + `styles.css` + `app.js`).

© 2026 salim-slimani. All rights reserved.

## Run

```bash
cd diapo
python run.py --open        # opens http://localhost:8080/index.html
# or simply double-click index.html (also works over file://)
```

## Features

- 📚 **Deck library** (`#/home`): search, open, duplicate, rename, delete, one-click PPTX download
- ✏️ **Editor**: Title / Title+Content / Two-column / Section / Picture+Caption / Blank layouts; drag to reorder, hide, duplicate slides
- 🧩 **Objects**: text boxes, 10 shapes, lines, drag-and-drop images, in-place editable tables, hyperlinks
- 🎨 **Formatting**: font family & size, bold / italic / underline, color, alignment, fill, stroke, rotation, align & distribute, bring forward / send backward
- 🧲 **Smart snapping** to edges and centers (`Alt` drags freely) + arrow-key nudging
- 🎭 **8 themes** + 3 slide sizes (16:9 / 16:10 / 4:3) + light / dark / system appearance
- ✨ **Transitions** (fade / slide / zoom) + fullscreen **present mode** with notes, timer and B/W blackout keys
- 📝 Speaker notes • ↩↪ Undo/redo (80 steps) • 🔍 Find & replace • 🔍 Zoom 25–400%
- 💾 Local autosave (IndexedDB) + real `.pptx` export & import (text + images) + PNG export (single or ZIP) + print-to-PDF
- 🌍 English / Français / عربي (RTL) • 📱 Responsive down to phones

## Why fast?

| Heavy suites | diapo |
|---|---|
| Framework + dozen libraries + cloud SDK | Zero dependencies, ~90 KB of JS |
| Requires Node 22+ and a build | A static file that opens instantly |
| Bulky external PPTX engines | Tiny built-in PPTX reader/writer (native deflate) |
| Complex cloud sync | Instant local IndexedDB + file download |

## Known limits (by design, for speed)

- PPTX import extracts text, layout basics and images; complex charts/SmartArt become plain text boxes.
- PPTX export targets PowerPoint/LibreOffice compatibility: text, shapes, images, tables, backgrounds, notes.
- No real-time collaboration.

## Shortcuts

`Ctrl+Z/Y` undo/redo • `Ctrl+S` save • `Ctrl+D` duplicate slide • `Ctrl+X/C/V` cut/copy/paste • `F5` present • `Del` delete • `Ctrl+A` select all • arrows move/navigate • `Esc` deselect/exit.

---
© 2026 salim-slimani
