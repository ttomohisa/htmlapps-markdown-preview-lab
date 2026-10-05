# Editor formatting shortcuts and undo boundaries

## Scope

Add editor-local Ctrl/Cmd+B and Ctrl/Cmd+I in the main and expanded textareas. Keep existing wrapping, placeholder text, selection, and focus behavior. Preserve the exact text immediately before any of the six formatting helpers as a separate undo state, even during the typing debounce. No parser, security, Tab, save-shortcut, or deployment changes.

## Implementation

1. Add dependency-free `tests/editor-formatting.cjs` regressions using the real editor functions and registered handlers in a Node VM. First demonstrate the six pre-format undo failures and missing shortcuts. Cover both textareas, cursor and selection ranges, expanded synchronization, autosave, redo-branch invalidation, 100-state limit, repeat/modifier/composition guards, and existing Tab/save behavior.
2. In `src/index.template.html`, let `formatSelection` use the event's editor while toolbar calls retain the main editor default. Synchronize expanded text to the main value before the pre-format snapshot and synchronize the result before post-format history and render/autosave. Add a shared editor-only shortcut helper. Consume recognized repeats without wrapping again. Preserve the existing parser and Tab implementation byte-for-byte.
3. Add localized shortcut hints/help, document keyboard behavior in both READMEs and APP_SPEC, and record the bug fix in CHANGELOG. Register the new Node tests in `scripts/check-repository.ps1`.
4. Run the canonical PowerShell build/check, all dependency-free suites, byte-identity and upstream-preservation checks. Do not run browser/CUA/Playwright tests. Rebuild all four HTML artifacts and manifests through the existing build.
5. Obtain an independent review, address any material findings with a failing regression first, recheck the current remote main/branches/open PRs, and publish an English draft PR. Verify its exact remote head and CI outcome. Do not merge, mark ready, edit main, or manually deploy.

## Verification limits

The Node harness checks application logic, event wiring, local autosave data, and generated-file parity. It does not establish real-browser focus, native keyboard behavior, layout, or IME behavior. The pre-existing Playwright test remains unrun under the browser restriction.
