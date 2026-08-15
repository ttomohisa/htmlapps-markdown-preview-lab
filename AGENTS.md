# AGENTS.md

This repository follows the conventions of `ttomohisa/htmlapps-template`.

## Source of truth
- Edit `src/index.template.html`.
- Do not hand-edit generated `dist/index.html` except while debugging.
- Run `build-standalone.ps1` after source changes.

## Product constraints
- Single HTML app.
- No runtime network dependency.
- No CDN.
- Light UI only.
- Japanese and English UI.
- Mobile usability is a first-class requirement.
- User Markdown stays in the browser and is stored only in LocalStorage unless the user explicitly downloads it.

## Checks
- `scripts/check-repository.ps1` is the canonical repository check.
- Keep CSP with `connect-src 'none'`.
- Do not introduce remote scripts, stylesheets, fonts, workers, or analytics.
