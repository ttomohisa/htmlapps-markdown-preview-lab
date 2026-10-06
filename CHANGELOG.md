# Changelog

## 1.0.1 — 2026-10-06
- Ignore fenced and inline code in compatibility warnings while preserving real HTML warnings, scores, and source-line navigation. Share code boundaries with the preview renderer.
- Translate all compatibility messages and Help accessibility labels when switching between Japanese and English.
- Use 完全ローカル処理 / Completely local processing on desktop and mobile, and keep the target-language label and accessible name aligned.
- Normalize the previous 1.0 release to a three-part version and increment the patch to 1.0.1 in configuration, header, and help.
- Add dependency-free scanner, localization, and release regressions to the canonical repository check.

## Formatting shortcuts and undo — 2026-10-05
- Add Ctrl/Cmd+B and Ctrl/Cmd+I in the main and expanded editors, reusing existing wrappers, placeholders, selection, and focus behavior.
- Preserve the exact pre-format text for all six formatting helpers so immediate typing is not lost on Undo.
- Synchronize expanded-editor formatting before history and autosave; ignore composition and Alt/Shift combinations, and prevent repeated keydown events from nesting markup.
- Add Japanese/English shortcut hints and help, plus dependency-free editor regression coverage in the canonical check.

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

## Link rendering follow-up — 2026-10-05
- Preserve link query ampersands, underscore paths, and supported label formatting without rewriting generated attributes.
- Keep remote image placeholders and autolink destinations outside the text-formatting pass.
- Add dependency-free renderer regressions to the canonical check and rebuild the root downloadable HTML alongside both distributions, retaining the existing Tab editing/history fix.
