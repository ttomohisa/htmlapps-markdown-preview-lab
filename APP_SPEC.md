# Application Specification

## Product
**Markdown Preview Lab v1.0**

A browser-only Markdown editor that compares GitHub, Qiita, and Zenn-inspired rendering and highlights portability concerns.

## Core behavior
- Markdown editor and live preview.
- GitHub / Qiita / Zenn / Standard / Minimal / Print / Custom CSS styles.
- Compare mode with two preview panes.
- Three-way proportional scroll synchronization in compare mode: editor + preview A + preview B.
- LocalStorage autosave.
- Open and save `.md` files.
- Undo / redo and formatting helpers.
- Compatibility checker with heuristic scores.
- First-run sample document. While the untouched sample is shown, display a **New document** action instead of a destructive delete control. The action disappears after the user starts editing or opens a file.

## Privacy
- No runtime external requests.
- Remote Markdown images are represented as placeholders.
- CSP blocks network connections.

## Rendering note
GitHub, Qiita, and Zenn modes are approximations. This project does not bundle or claim to exactly reproduce each service's official renderer.
