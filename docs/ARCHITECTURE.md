# Architecture

The application is intentionally a single HTML document containing its CSS, JavaScript, SVG icons, renderer, compatibility rules, and UI text.

`src/index.template.html` is the source of truth. `build-standalone.ps1` copies the source into `dist/index.html`, creates manifests, and produces the self-extract artifact. Because this project has zero external dependencies, the self-extract artifact is byte-equivalent to the normal standalone artifact.

## State
Editor content and preferences are stored in LocalStorage. The bundled sample is tracked with a `samplePristine` state so the New document affordance is only shown before the sample is modified.

## Scroll synchronization
Compare mode treats the editor, preview A, and preview B as one scroll group. The active pane's normalized scroll ratio is propagated to every other visible pane while a reentrancy lock prevents scroll-event loops.


## Common UI v1 adapters

The builder expands two declared placeholders with fixed components/ui-conventions.js and CSS before generating all three identical release copies. The lock and explicit LF attributes keep those component bytes pinned. The Markdown renderer/parser and compatibility input helpers are unchanged.

The single legacy JSON storage domain uses a read block, confirmed write status/time and strict retry validation. UI-only status/generation/transaction records remain outside serialized state. JSON lang is read as the legacy preference and retained on normal autosave; explicit language choices write only the common key.

Document/file/name generations own asynchronous import and clipboard fallback. Import commits a pre-change Undo snapshot and retains previous text on error. CSS reset captures its source and locks persistence through confirmation and write; pending file completion waits for transaction release and uses current CSS. Clipboard and download finalizers clean native boundaries; successful URL handoff retains its one-second lifetime.

The new UI harness executes the entire app, including startup and listener wiring, against actual source-derived IDs (missing IDs return null). Controlled storage/Clipboard/anchor/FileReader seams support meaningful failures and races across source/readable/identity-copy/root. Partial renderer/formatting fixtures retain their original purpose with explicit adapter seams. Browser geometry, native focus/IME, permissions and OS delivery are not claimed by Node tests.
