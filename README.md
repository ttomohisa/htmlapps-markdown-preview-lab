# Markdown Preview Lab

A privacy-friendly, single-HTML Markdown editor for comparing GitHub, Qiita, and Zenn-inspired previews.

[日本語 README](README.ja.md)

## Features
- Live Markdown editor and preview
- GitHub / Qiita / Zenn / Standard / Minimal / Print / Custom CSS
- Compare mode
- Three-way synchronized scrolling between editor, preview A, and preview B
- Heuristic compatibility checks
- LocalStorage autosave
- Large focused editor modal
- Custom output filename with automatic `.md` extension
- Open / save Markdown files
- First-run sample with a contextual **New document** action
- No CDN and no runtime network dependency

## Run
Open `dist/index.html`, or run `build-standalone.bat` on Windows.

## Development
Edit `src/index.template.html`, then run:

```powershell
./scripts/check-repository.ps1
```

## GitHub Pages
The included workflow builds `dist/` and deploys it when GitHub Pages is configured to use **GitHub Actions**.

## License
MIT
