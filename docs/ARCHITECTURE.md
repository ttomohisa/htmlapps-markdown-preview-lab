# Architecture

The application is intentionally a single HTML document containing its CSS, JavaScript, SVG icons, renderer, compatibility rules, and UI text.

`src/index.template.html` is the source of truth. `build-standalone.ps1` copies the source into `dist/index.html`, creates manifests, and produces the self-extract artifact. Because this project has zero external dependencies, the self-extract artifact is byte-equivalent to the normal standalone artifact.

## State
Editor content and preferences are stored in LocalStorage. The bundled sample is tracked with a `samplePristine` state so the New document affordance is only shown before the sample is modified.

## Scroll synchronization
Compare mode treats the editor, preview A, and preview B as one scroll group. The active pane's normalized scroll ratio is propagated to every other visible pane while a reentrancy lock prevents scroll-event loops.
