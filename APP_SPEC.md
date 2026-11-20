# Application Specification

## Product
**Markdown Preview Lab v1.1.0**

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

## Data safety and recovery (v1.0.5)

- Read autosaved JSON without writing during initial setup. Corrupt or unreadable saved data is never silently overwritten.
- Show a persistent autosave warning on desktop and smartphones. Users can retry storage, or explicitly confirm overwriting unreadable stored data after downloading current Markdown.
- Do not apply file reads that complete after newer edits or file selections. Successful file import records the immediately preceding text for Undo and keeps filenames edited during loading.
- Markdown download and clipboard copy use the complete current editor text. They do not include Custom CSS, history, or preview HTML.
- Custom CSS reset requires confirmation, defaults to Cancel, and does not drop applied or draft CSS when storage fails.
- Existing unmodified sample text changes with the app language; edited user documents are never translated.

## Approximate renderer

The built-in renderer handles nested basic lists, escaped inline Markdown markers, URLs containing one level of balanced parentheses, and pipe characters within inline code in tables. It is still not a CommonMark/GFM-complete implementation.

## Mobile layout

In compare mode, two preview cells fill the available vertical space without double-halving their scroll regions. Visible tool controls have accessible names and larger touch targets.

## Mobile presentation and compatibility panel (v1.0.5)

At viewport widths up to 720px, the top site header scrolls normally instead of sticking. The introductory description remains visible with no additional top margin, an 8px horizontal inset, and a 16px gap before the workspace; only the heading and informational local-processing badge are hidden; at the existing narrow-phone breakpoint, the unused intro space is removed. The Sync scroll label must stay on one horizontal line even when the style selector overflows horizontally. Copy, Undo and Redo controls have centered SVG icons and usable tap targets. Desktop layout and actual scroll synchronization remain unchanged.

The compatibility section's title and the three percentage scores remain visible at all times. The diagnostic list and explanatory note are inside an initially collapsed, keyboard-operable details section. Expanding it shows the current live check results; closing and reopening does not reset the Markdown or scores.

## Release (v1.0.5 onward)

Merging a PR into main triggers the repository release workflow. The job runs the complete standalone build/check before creating an annotated `v<version>` tag and publishing a GitHub Release with both standalone HTML files. It skips versions already released. A manual workflow dispatch from a non-main branch cannot create a tag or release. The user still performs PR merges.

## Layout spacing and restrained surfaces (v1.0.5)

Use 8px increments for the application chrome's fixed padding, margin, and gaps, including desktop and mobile controls, dialogs, and compatibility area. Preserve the theme-specific rendered Markdown spacing, which deliberately approximates distinct publishing platforms. Keep only a restrained outer boundary for the main workspace and compatibility section. Score summaries share a muted strip with lightweight dividers instead of three outlined cards; segmented navigation and toolbar controls avoid redundant nested outlines. The percentages, actions, focus states, keyboard access, and editing behavior must stay available.

## Responsive file / editing toolbar (v1.0.5)

At smartphone widths of 375–720px, arrange Open, filename, Save, Copy, Undo and Redo in a single nonwrapping row. File-name input flexes within a constrained maximum width, action buttons are 40px squares, and labels are visually hidden where icon-only buttons are necessary (accessible button names are retained). At 374px and below, deliberately split into two compact groups: Open / filename / Save, then Copy / Undo / Redo aligned together at the end. Do not allow an individual button to wrap away from its group, overlap the filename, or cause page-wide horizontal scrolling. Desktop behavior remains unchanged apart from grouping Copy with editing actions.

## Document outline and find / replace (v1.1.0)

- The Document tools icon in the desktop editor formatting header, or beside the Edit / Preview / Compare switch on phones, toggles an optional, inline document panel. It has Outline and Find & Replace tabs; the editor panel uses a separate flexible grid row. The document and its panel do not become separate nested cards.
- Outline lists up to 500 non-empty ATX Markdown headings (`#` through `######`) with levels and clickable source-line navigation. Ignore fenced code blocks, leading front matter, math blocks, Zenn message blocks, and escaped hash markers. Do not claim Setext headings are supported when the preview renderer does not parse them.
- Find uses literal text (no regular expressions), supports case-sensitive matching, next/previous wraparound, an accessible result count, and a 5,000-match cap. If the result count exceeds the cap, disable Replace all rather than silently changing only part of the document.
- Replace current and Replace all are undoable, capture pending edits before modifying source, and update preview and compatibility checks. Empty replacement deletes matches. Literal replacement text including `$&` is inserted unchanged.
- Keyboard Ctrl/Command+F opens the app's Find tab. A modal expanded editor closes first, retaining the same source text before searching. Escape closes the panel, while native shortcuts for Bold, Italic, Save and Undo remain.
- The tool panel is initially hidden. Search terms and replacement terms are not stored or uploaded; only the actual Markdown source changes participate in LocalStorage autosave and .md downloads. Labels and placeholders are localized in Japanese and English.
