# Application Specification

## Product
**Markdown Preview Lab v1.0.3**

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

## Editor keyboard behavior
- Plain Tab replaces the selected range with two spaces in both editors and records an undoable change.
- Shift+Tab keeps native focus navigation; other modified Tab shortcuts are not intercepted.
- Ctrl/Cmd+B and Ctrl/Cmd+I insert the existing bold and italic wrappers in the focused main or expanded editor, preserving selected text and selecting placeholder text when no range is selected.
- Formatting shortcuts ignore Alt/Shift combinations and composition events; recognized repeated keydown events are consumed without repeated wrapping.
- All six formatting helpers preserve an immediate pre-format undo state, including pending typed text; expanded formatting synchronizes the main value before history and autosave.
