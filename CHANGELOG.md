# Changelog

## 1.0
- Added local Markdown editing and realtime preview.
- Added GitHub, Qiita, Zenn, Standard, Minimal, Print, and Custom CSS styles.
- Added compare mode and compatibility checks.
- Fixed compare-mode scroll synchronization so editor, preview A, and preview B move together.
- Improved first-run sample UX with a contextual **New document** action that only appears while the sample remains untouched.
- Aligned repository layout, build scripts, validation, and GitHub Pages workflow with `htmlapps-template`.
- Replaced the link formatting glyph with a conventional chain-link icon.
- Added a large modal editor for focused Markdown input.
- Added a persistent output filename field with automatic `.md` extension handling.

## Audit follow-up — 2026-10-04
- Fix Tab handling to target the textarea rather than the KeyboardEvent. Preserve the pre-Tab text for undo, including immediately preceding edits and expanded-editor changes.
- Keep Shift+Tab and browser-modified Tab shortcuts available for keyboard navigation.
- Add generated-artifact browser regression coverage for ranges, caret, history, autosave and download.
