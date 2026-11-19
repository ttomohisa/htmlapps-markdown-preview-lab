// Audit regression checks using the exact application functions, without third-party packages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const variants = ['src/index.template.html', 'dist/index.html', 'dist/index.self-extract.html', 'markdown-preview-lab.html'];
function section(source, first, last) {
  const start = source.indexOf(first), end = source.indexOf(last, start);
  assert.ok(start >= 0 && end > start, 'Found source section: ' + first);
  return source.slice(start, end);
}
function storageHarness(source, stored) {
  const entries = new Map();
  if (stored !== null) entries.set('test', stored);
  const notices = [];
  const els = {
    editor: { value: 'working draft' },
    saveStatus: { textContent: '' },
    saveNotice: { hidden: true },
    saveNoticeMessage: { textContent: '' },
    retrySaveButton: { textContent: '' },
  };
  let writes = 0, confirmed = false;
  const context = vm.createContext({
    els,
    localStorage: {
      getItem: key => entries.has(key) ? entries.get(key) : null,
      setItem: (key, value) => { writes++; entries.set(key, value); },
    },
    window: { confirm: () => confirmed },
    t: key => key,
    setTimeout: () => 1,
    clearTimeout() {},
  });
  const code = "const STORAGE_KEY='test',defaultMarkdown='',defaultMarkdownEn='';let state={lang:'ja'};let initializing=true,storageBlocked='',saveError=false;let saveTimer=null;\n"
    + section(source, '    function updateStorageNotice()', '    function updateSampleStateUI()');
  vm.runInContext(code, context);
  return {
    context, els, writes: () => writes, raw: () => entries.get('test'),
    confirm() { confirmed = true; },
  };
}
function fileHarness(source) {
  const readers = [], messages = [];
  const editor = { value: 'old draft' }, filenameInput = { value: 'old' };
  const context = vm.createContext({
    els: { editor, filenameInput },
    FileReader: class {
      constructor() { readers.push(this); }
      readAsText(file) { this.file = file; }
    },
    t: key => key,
    render() {},
    showToast: value => messages.push(value),
    setTimeout: () => 1,
    clearTimeout() {},
  });
  vm.runInContext("let state={samplePristine:false,outputFilename:'old'};let history=['old draft'],historyIndex=0,historyTimer=null;let editRevision=0,fileRequestId=0,filenameRevision=0;\n"
    + section(source, '    function pushHistory(', '    function setStyle(')
    + section(source, '    function readFile(', "    els.retrySaveButton.addEventListener("), context);
  return {
    context, editor, filenameInput, readers, messages,
    history: () => JSON.parse(vm.runInContext('JSON.stringify(history)', context)),
    changeWhileLoading(value) { editor.value = value; vm.runInContext('editRevision++', context); },
  };
}
for (const variant of variants) {
  const source = fs.readFileSync(path.join(__dirname, '..', variant), 'utf8');
  test(variant + ': complete app JavaScript compiles', () => {
    const match = source.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(match);
    new vm.Script(match[1]);
  });
  test(variant + ': corrupt drafts are protected on startup and require confirmation', () => {
    const h = storageHarness(source, '{invalid JSON');
    assert.equal(h.context.loadState(), false);
    vm.runInContext('initializing=false', h.context);
    assert.equal(h.context.saveState(), false);
    assert.equal(h.raw(), '{invalid JSON');
    assert.equal(h.writes(), 0);
    h.context.updateStorageNotice();
    assert.equal(h.els.saveNotice.hidden, false);
    h.context.retryStorage(); // Cancel is the default.
    assert.equal(h.writes(), 0);
    h.confirm();
    h.context.retryStorage();
    assert.equal(h.writes(), 1);
    assert.equal(JSON.parse(h.raw()).markdown, 'working draft');
  });
  test(variant + ': initialization reads valid existing work without writing', () => {
    const input = JSON.stringify({ lang: 'en', markdown: '# keep me', style: 'github' });
    const h = storageHarness(source, input);
    assert.equal(h.context.loadState(), true);
    assert.equal(h.writes(), 0);
    assert.equal(h.raw(), input);
  });
  test(variant + ': importing a file preserves immediate typing for Undo', () => {
    const h = fileHarness(source);
    h.editor.value = 'typed just now';
    h.context.pushHistory(); // Timer has not fired yet.
    h.context.readFile({ name: 'new.md', type: 'text/markdown', size: 5 });
    h.readers[0].result = '# from disk';
    h.readers[0].onload();
    assert.deepEqual(h.history(), ['old draft', 'typed just now', '# from disk']);
    h.context.undo();
    assert.equal(h.editor.value, 'typed just now');
  });
  test(variant + ': older file reads do not clobber newer edits', () => {
    const h = fileHarness(source);
    h.context.readFile({ name: 'slow.md', type: 'text/markdown', size: 5 });
    h.changeWhileLoading('new typed text');
    h.readers[0].result = 'old imported text';
    h.readers[0].onload();
    assert.equal(h.editor.value, 'new typed text');
    assert.ok(h.messages.includes('fileReadCancelled'));
  });
  test(variant + ': nested lists, escaped Markdown, URL parentheses and code pipes', () => {
    const renderer = vm.createContext({});
    vm.runInContext(section(source, '    function escapeHtml(', '    function getThemeClass('), renderer);
    assert.match(renderer.markdownToHtml('- outer\n  - inner\n- next'), /<li>outer<ul><li>inner<\/li><\/ul><\/li>/);
    assert.equal(renderer.inlineMarkdown('\\*literal\\*'), '*literal*');
    assert.match(renderer.inlineMarkdown('[wiki](https://example.com/wiki_(format))'), /href="https:\/\/example.com\/wiki_\(format\)"/);
    assert.match(renderer.markdownToHtml('| A | B |\n| --- | --- |\n| ' + String.fromCharCode(96) + 'x|y' + String.fromCharCode(96) + ' | z |'), /<td><code>x\|y<\/code><\/td>/);
  });
  test(variant + ': mobile comparison and accessibly named controls', () => {
    assert.match(source, /\.workspace\.mobile-compare \.compare-cell \.preview-scroll \{ height:calc\(100% - 42px\)/);
    for (const id of ['openButton','downloadButton','copyButton']) {
      const tag = source.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>'))?.[0];
      assert.ok(tag && tag.includes('data-i18n-aria='), id);
    }
    assert.match(source, /id="cssResetDialog"/);
    assert.match(source, /id="saveNotice"[^>]*role="alert"/);
    assert.match(source, /const defaultMarkdownEn =/);
  });
}
test('Clipboard fallback reports failure if execCommand returns false', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/index.template.html'), 'utf8');
  const messages = [];
  const editor = { value: 'abc' };
  const context = vm.createContext({
    els: { editor },
    navigator: { clipboard: { writeText: async () => { throw Error('Denied'); } } },
    document: {
      activeElement: null,
      body: { appendChild() {} },
      createElement: () => ({ style: {}, setAttribute() {}, select() {}, remove() {} }),
      execCommand: () => false,
    },
    showToast: value => messages.push(value),
    t: key => key,
  });
  vm.runInContext(section(source, '    async function copyMarkdown()', '    function normalizedFilename()'), context);
  await context.copyMarkdown();
  assert.deepEqual(messages, ['copyFailed']);
});
