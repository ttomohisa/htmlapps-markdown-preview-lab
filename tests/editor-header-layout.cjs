// Proposed source contracts only. They do not prove native geometry or pointer hit testing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const variants = process.env.SOURCE_ONLY ? ['src/index.template.html'] : ['src/index.template.html','dist/index.html','dist/index.self-extract.html','markdown-preview-lab.html'];
for (const variant of variants) {
const source = fs.readFileSync(path.join(__dirname, '..', variant), 'utf8');
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const result = source.match(new RegExp('(?:^|\\n)\\s*' + escaped + '\\s*\\{([^}]+)\\}'));
  assert.ok(result, `CSS rule exists: ${selector}`);
  return result[1];
}
test(`${variant}: editor allocates a natural header and a shrinkable content row`, () => {
  const css = rule('.editor-pane');
  assert.match(css, /display\s*:\s*grid/);
  assert.match(css, /grid-template-rows\s*:\s*auto\s+minmax\(0,\s*1fr\)/);
});
test(`${variant}: only the editor header wraps without shrinking its controls into siblings`, () => {
  const css = rule('.editor-pane > .pane-head');
  assert.match(css, /height\s*:\s*auto/);
  assert.match(css, /flex-wrap\s*:\s*wrap/);
  assert.match(rule('.editor-pane > .pane-head > *'), /flex-shrink\s*:\s*0/);
  assert.match(rule('.pane-head'), /height\s*:\s*42px/);
});
test(`${variant}: textarea and drop overlay share the content row without a fixed header offset`, () => {
  const editor = rule('#editor'), overlay = rule('.drop-overlay');
  for (const css of [editor, overlay]) assert.match(css, /grid-area\s*:\s*2\s*\/\s*1/);
  assert.match(editor, /min-height\s*:\s*0/);
  assert.doesNotMatch(editor, /height\s*:\s*calc\(100%\s*-\s*42px\)/);
  assert.match(overlay, /inset\s*:\s*auto/);
});
test(`${variant}: active mobile editor retains the same two-row allocation`, () => {
  assert.match(rule('.workspace.mobile-editor .editor-pane'), /display\s*:\s*grid\s*!important/);
});
test(`${variant}: existing New document action still clears sample, resets filename and focuses editor`, () => {
  const start = source.indexOf('    function newDocument() {');
  const end = source.indexOf('    function pushHistory(', start);
  assert.ok(start >= 0 && end > start);
  const events = [], els = { filenameInput: { value: 'synthetic-name' }, editor: { value: 'synthetic sample', focus() { events.push('focus'); } } };
  const context = vm.createContext({ els, pushHistory(value) { events.push(['history', value]); }, render() { events.push('render'); }, showToast(value) { events.push(['toast', value]); }, t: x => x });
  vm.runInContext("const state={samplePristine:true,outputFilename:'synthetic-name'};" + source.slice(start, end), context);
  context.newDocument();
  assert.equal(els.editor.value, '');
  assert.equal(els.filenameInput.value, 'document');
  assert.equal(vm.runInContext('state.samplePristine', context), false);
  assert.deepEqual(events, [['history', true], 'render', 'focus', ['toast', 'newDocumentReady']]);
  assert.match(source, /els\.newDocumentButton\.addEventListener\('click',newDocument\)/);
});

 test(`${variant}: formatting controls retain their own scrollable width limit`, () => {
   const css=rule('.format-bar');
   assert.match(css,/max-width\s*:\s*100%/);
   assert.match(css,/overflow-x\s*:\s*auto/);
 });
}
