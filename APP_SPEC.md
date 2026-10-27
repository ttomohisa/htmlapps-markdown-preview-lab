# Application Specification

## Product
**Markdown Preview Lab v1.0.4**

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
- First-run sample document. While the untouched sample is shown, display a **New document** action instead of a destructive delete control. The action disappears after the user starts editing or opens a file. The editor header wraps its controls and statistics without overlapping, while the text input and drop area use the remaining pane height.

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

## Smartphone informational footer

Hide only the informational footer at the existing smartphone layout query `(max-width: 720px)`; preserve desktop visibility and functional controls. Both equivalent Japanese local-processing labels use Fully local processing in English.

## Header visibility

Restore the round bottom dot in the Help question-mark icon without changing layout or controls. Verify Japanese and English at 320px, 360px, 390px and desktop widths.


## Common UI retention and actions

The existing markdown-preview-lab:v1 JSON payload remains the single browser autosave domain for Markdown, applied CSS and view/filename settings. Startup reads it without saving or migrating. Missing/default/partial state is not presented as a confirmed complete save. Invalid JSON/shapes remain untouched; current work stays available for Markdown download and manual CSS copy. Retry revalidates reads, restores untouched recovered work without writes, or preserves both the stored draft and conflicting new tab work with explicit recovery guidance. Only confirmed writes advance saved time.

Save creates one UTF-8 .md file containing the entire current Markdown text, excluding preview HTML, CSS, settings and Undo history. Copy has the same text scope. Both capture data before native work; Download started reports browser handoff. Delivery failures remain separate from autosave errors and preserve editable text/filename. Clipboard fallback uses a temporary node with guaranteed cleanup and currently owned focus restoration. Successful download URLs retain the existing one-second handoff; throwing clicks clean immediately.

File reads keep existing content until successful owned completion, ignore obsolete reads after a newer file/current text edit, and preserve filename edits made during loading. Import records the immediate pre-import text as a real Undo step. Existing formatting/history limits/rendering and New document sample behavior remain.

Reset Custom CSS confirms removal of applied CSS and the unapplied CSS draft, with initial Cancel, Escape/backdrop cancellation, live translation and scoped focus. Markdown/filename/view choices/Undo remain. A failed write retains both CSS values. Source generations and a full transaction persistence lock prevent obsolete replacement or saves; already-running file work waits and resumes using the current CSS after the transaction. Unapplied CSS drafts survive closing/reopening the editor.

Language resolves URL, common preference, existing JSON lang, ordered browser languages, then English. Explicit switching alone writes the common key. Autosave preserves the existing legacy lang field so a failed common-key switch remains screen-only even after unrelated saves. Language refresh preserves main/expanded editor selection, unapplied CSS, filename, scroll/preview DOM and Undo history; known errors/progress/toasts update without starting persistence or rendering jobs.
