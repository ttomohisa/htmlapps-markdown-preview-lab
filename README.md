# Markdown Preview Lab

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-markdown-preview-lab/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-markdown-preview-lab/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-markdown-preview-lab/)

[日本語版 README](README.ja.md)

A privacy-focused, single-HTML Markdown editor for writing locally, comparing GitHub / Qiita / Zenn-inspired previews, and spotting portability issues before publishing.

## 🚀 Live demo

### [Open Markdown Preview Lab on GitHub Pages](https://ttomohisa.github.io/htmlapps-markdown-preview-lab/)

GitHub Pages delivers only the initial HTML. After it loads, Markdown editing, rendering, compatibility checks, autosave, file import, and export are processed locally in your browser. Your Markdown is not uploaded by the app.

## Features

- Side-by-side Markdown editor and live preview
- GitHub / Qiita / Zenn-inspired preview styles
- Standard / Minimal / Print preview styles
- Custom CSS preview mode
- Compare two preview styles at the same time
- Three-way synchronized scrolling between the editor, Preview A, and Preview B
- Heuristic compatibility scores for GitHub, Qiita, and Zenn
- Warnings for syntax that may behave differently between platforms
- Click a compatibility warning to jump to the related Markdown line
- LocalStorage autosave and automatic draft restoration
- First-run sample with a contextual **New document** action
- Large focused editor dialog for longer documents
- Markdown formatting helpers for bold, italic, headings, links, code, and lists
- Undo and redo controls
- Open Markdown / text files by file picker or drag and drop
- Custom output filename with automatic `.md` extension
- Copy Markdown to the clipboard
- Japanese and English UI in the same HTML
- Mobile-specific Edit / Preview / Compare navigation
- Embedded SVG favicon
- No CDN and no runtime library dependency

## Quick start

### Use the web demo

Just [open the demo](https://ttomohisa.github.io/htmlapps-markdown-preview-lab/). No installation or account is required.

### Use the downloaded HTML

1. Download [`index.html`](https://github.com/ttomohisa/htmlapps-markdown-preview-lab/blob/main/index.html) from this repository.
2. Open it in a current Chromium-based browser, Firefox, or Safari.
3. Start writing. Drafts are autosaved in that browser's LocalStorage.

The app does not require Python, Node.js, a local web server, or an external CDN at runtime.

### Build from the repository (advanced)

1. Download or clone this repository.
2. Double-click `build-standalone.bat` on Windows, or run `build-standalone.ps1` from PowerShell.
3. The generated standalone app is written to `dist/index.html`.
4. The optional self-extracting distribution is written to `dist/index.self-extract.html`.
5. Copy the generated HTML wherever you need it and open it directly in a browser.

Because this app has no external runtime dependencies, the build does not need to download third-party libraries.

## Usage

1. Write Markdown in the left editor.
2. Choose GitHub, Qiita, Zenn, or another preview style.
3. Switch **View** to **Compare** to show two preview styles at once.
4. Keep **Sync scroll** enabled to move the editor and both comparison previews together.
5. Review the compatibility scores and warnings below the editor.
6. Enter an output filename and choose **Save** to download the Markdown file.

### Starting from the sample

The first launch shows a sample document so the main Markdown features can be tried immediately.

- Choose **New document** while the untouched sample is still visible to start with a blank editor.
- If you begin editing the sample directly, the sample notice disappears automatically.
- Existing autosaved drafts are restored instead of replacing them with the sample.

### Compare mode

Compare mode is designed for checking how the same Markdown may look across publishing destinations.

- Preview A and Preview B can use different styles.
- Scrolling any of the three panes — editor, Preview A, or Preview B — synchronizes the other two by document progress.
- Turn off **Sync scroll** when you want to inspect each pane independently.

### Compatibility check

The checker looks for Markdown patterns that are often handled differently by GitHub, Qiita, and Zenn, such as platform-specific blocks, math, HTML, task lists, and other extended syntax.

The percentages are heuristic estimates intended to highlight areas worth reviewing. They are not official compatibility scores and do not guarantee identical rendering on each service.

### Large editor

Use the expand icon in the Markdown pane header to open a large focused editing dialog. Changes are synchronized with the main editor while you type, and the cursor position is restored when the dialog closes.

### Keyboard operations

| Shortcut | Action |
| --- | --- |
| `Tab` | Insert two spaces in the Markdown editor |
| `Ctrl` / `⌘` + `S` | Download the current Markdown using the output filename |
| `Esc` | Close an open dialog using the browser's native dialog behavior |

## Supported Markdown in v1.0

The built-in renderer covers commonly used Markdown syntax including:

- Headings
- Paragraphs and line breaks
- Bold and italic text
- Links
- Inline code and fenced code blocks
- Ordered and unordered lists
- Blockquotes
- Horizontal rules
- Tables
- Task lists
- Images as local-safe placeholders when the source is remote
- Selected extended syntax used for compatibility guidance

## GitHub / Qiita / Zenn preview note

The GitHub, Qiita, and Zenn modes are **inspired approximations**, not bundled copies of each platform's official renderer.

They are intended to help compare typography, spacing, common Markdown output, and portability concerns in one browser-only tool. Final appearance should still be confirmed on the target publishing service before publication when exact rendering matters.

## Publish with GitHub Pages

The repository includes a workflow that builds and verifies the standalone HTML and then deploys `dist/` to GitHub Pages.

1. Push the repository to GitHub as `htmlapps-markdown-preview-lab`.
2. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main`, or manually run the Pages workflow from the Actions tab.
4. After a successful deployment, the demo is available at `https://ttomohisa.github.io/htmlapps-markdown-preview-lab/`.

If GitHub Pages has not been enabled yet, the included workflow finishes the build without treating the missing Pages setting as a build failure and prints the setup steps in the workflow summary.

## Development and build layout

```text
.
├─ src/index.template.html       # Application source template
├─ index.html                    # Ready-to-open single HTML app
├─ app.config.json               # App metadata and build configuration
├─ dependencies.json             # Runtime dependency manifest (currently empty)
├─ build-standalone.bat          # Windows build entry point
├─ build-standalone.ps1          # Standalone HTML builder
├─ scripts/
│  ├─ check-repository.ps1       # Repository/build validation
│  ├─ build-self-extract.ps1     # Self-extract distribution builder
│  ├─ verify-standalone.ps1      # Standalone verification
│  └─ verify-self-extract.ps1    # Self-extract verification
├─ dist/
│  ├─ index.html                 # Generated deployment artifact
│  └─ index.self-extract.html    # Generated self-extract artifact
└─ .github/workflows/
   ├─ build-standalone.yml       # Build validation
   └─ deploy-pages.yml           # GitHub Pages deployment
```

After editing `src/index.template.html`, validate and rebuild with:

```powershell
./scripts/check-repository.ps1
```

The repository check verifies the required template files, rebuilds the standalone HTML, and runs the included standalone validation.

## Privacy and runtime network protection

The standalone HTML is designed to keep the document content on the device.

- A Content Security Policy includes `connect-src 'none'`.
- No CDN or external runtime JavaScript library is required.
- Markdown drafts are stored in LocalStorage in the current browser.
- Remote Markdown images are not fetched; they are represented as placeholders in the preview.
- Opening the GitHub Pages demo requires the initial HTML request, but the Markdown content itself is not uploaded by the app.

For use without any network connection, download `index.html` or open the generated `dist/index.html` locally.

## LocalStorage data

Autosave is browser-local. Keep the following in mind:

- Clearing site data or browser storage can remove the autosaved draft.
- LocalStorage is not a replacement for an important file backup.
- Use **Save** regularly when the Markdown should be kept as a normal `.md` file.
- A locally opened HTML file and the GitHub Pages version may use different browser storage origins, so their autosaved drafts are separate.

## Limitations

- GitHub / Qiita / Zenn previews are approximations and may differ from the official renderers.
- Compatibility scores are heuristic and can produce false positives or miss platform-specific behavior.
- The built-in renderer intentionally focuses on common Markdown rather than reproducing every extension supported by every service.
- Remote images are not loaded because runtime network access is blocked.
- Very large documents can use more browser memory and may make live rendering less responsive.
- LocalStorage capacity and persistence depend on the browser and browsing mode.

## Dependencies

There are currently **no external runtime library dependencies**.

| Library | Version | License | Purpose |
| --- | ---: | --- | --- |
| None | — | — | Markdown parsing, preview, comparison, compatibility checks, and UI are implemented in the single HTML app |

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for repository notices.

## Contributing

Bug reports and feature proposals are welcome through GitHub Issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## License

Copyright © 2026 ttomohisa

Licensed under the [MIT License](LICENSE).
