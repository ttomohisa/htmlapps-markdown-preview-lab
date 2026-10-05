// Dependency-free application-logic checks. These do not launch a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const variants = ['src/index.template.html', 'dist/index.html', 'dist/index.self-extract.html', 'markdown-preview-lab.html'];
const formats = {
  bold: ['**fresh**', '**bold**', 2, 'bold'],
  italic: ['*fresh*', '*italic*', 1, 'italic'],
  heading: ['## fresh', '## Heading', 3, 'Heading'],
  link: ['[fresh](https://example.com)', '[link text](https://example.com)', 1, 'link text'],
  code: ['`fresh`', '`code`', 1, 'code'],
  list: ['- fresh', '- item', 2, 'item'],
};

function section(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `Application section exists: ${start}`);
  return source.slice(a, b);
}

function harness(source) {
  let now = 0, sequence = 0, focused = null;
  const timers = new Map(), storage = new Map(), downloads = [], renders = [];
  function element() {
    return {
      value: 'base', selectionStart: 0, selectionEnd: 0, listeners: {},
      focus() { focused = this; },
      setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
      setRangeText(text, start, end) {
        this.value = this.value.slice(0, start) + text + this.value.slice(end);
        this.setSelectionRange(start + text.length, start + text.length);
      },
      addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); },
      dispatch(type, event = {}) {
        const e = { currentTarget: this, target: this, ...event };
        for (const listener of this.listeners[type] || []) listener(e);
      },
    };
  }
  const editor = element(), expandedEditor = element();
  const buttons = Object.keys(formats).map(format => Object.assign(element(), { dataset: { format } }));
  const els = { editor, expandedEditor, saveStatus: {} };
  const context = vm.createContext({
    els,
    document: { querySelectorAll(selector) { assert.equal(selector, '[data-format]'); return buttons; } },
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { callback(); },
    localStorage: { setItem(key, value) { storage.set(key, value); } },
    t(key) { return key; },
    updateSampleStateUI() {},
    render() { renders.push(editor.value); context.scheduleSave(); },
    downloadMarkdown() { downloads.push(editor.value); },
  });
  const functions = section(source, '    function scheduleSave(', '    function loadState(')
    + section(source, '    function leaveSampleMode(', '    function newDocument(')
    + section(source, '    function pushHistory(', '    function setStyle(')
    + section(source, '    function formatSelection(', '    function scrollRatio(')
    + section(source, '    function syncExpandedEditor(', '    async function copyMarkdown(');
  const listeners = source.split('\n').filter(line =>
    /els\.(?:editor|expandedEditor)\.addEventListener\('(input|keydown)'/.test(line)
    || line.includes("document.querySelectorAll('[data-format]')"));
  assert.equal(listeners.length, 5, 'Both editor input/key handlers and toolbar listener are wired');
  vm.runInContext("const STORAGE_KEY='test'; let state={samplePristine:true}; let saveTimer=null; let history=['base'], historyIndex=0, historyTimer=null;\n" + functions + listeners.join('\n'), context);
  return {
    context, editor, expandedEditor, downloads, renders,
    type(value, start = 0, end = value.length, expanded = false) {
      const target = expanded ? expandedEditor : editor;
      target.value = value; target.setSelectionRange(start, end); target.dispatch('input');
      return target;
    },
    key(target, properties) {
      let prevented = false;
      target.dispatch('keydown', {
        key: '', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
        isComposing: false, keyCode: 0, repeat: false,
        ...properties, preventDefault() { prevented = true; },
      });
      return prevented;
    },
    toolbar(type) { buttons.find(button => button.dataset.format === type).dispatch('click'); },
    history() { return JSON.parse(vm.runInContext('JSON.stringify(history)', context)); },
    state() { return JSON.parse(vm.runInContext('JSON.stringify(state)', context)); },
    saved() { return JSON.parse(storage.get('test')); },
    focused() { return focused; },
    advance(ms) {
      now += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback(); }
    },
  };
}

for (const variant of variants) {
  const source = fs.readFileSync(path.join(__dirname, '..', variant), 'utf8');
  test(`${variant}: formatting shortcuts have localized help and toolbar hints`, () => {
    for (const format of ['bold', 'italic']) {
      assert.match(source, new RegExp(`data-format="${format}"[^>]*data-i18n-title="${format}Shortcut"`));
      assert.equal((source.match(new RegExp(`${format}Shortcut:`, 'g')) || []).length, 2);
    }
    assert.match(source, /helpShortcutsTitle:/);
    assert.match(source, /data-i18n="helpShortcuts"/);
  });
  for (const [format, [expected, placeholder, offset, word]] of Object.entries(formats)) {
    test(`${variant}: ${format} preserves immediate typing as a separate undo state`, () => {
      const h = harness(source);
      h.type('fresh'); h.toolbar(format);
      assert.equal(h.editor.value, expected);
      assert.equal(h.focused(), h.editor);
      assert.deepEqual([h.editor.selectionStart, h.editor.selectionEnd], [offset, offset + 5]);
      assert.deepEqual(h.history(), ['base', 'fresh', expected]);
      h.context.undo(); assert.equal(h.editor.value, 'fresh');
      h.context.redo(); assert.equal(h.editor.value, expected);
      h.advance(1000); assert.deepEqual(h.history(), ['base', 'fresh', expected]);
      assert.equal(h.saved().markdown, expected);
      assert.equal(h.state().samplePristine, false);
    });
    test(`${variant}: ${format} preserves empty-selection placeholders and settled history`, () => {
      const h = harness(source);
      h.type('', 0, 0); h.advance(350); h.toolbar(format);
      assert.equal(h.editor.value, placeholder);
      assert.deepEqual([h.editor.selectionStart, h.editor.selectionEnd], [offset, offset + word.length]);
      assert.deepEqual(h.history(), ['base', '', placeholder]);
      h.context.undo(); assert.equal(h.editor.value, '');
      h.context.redo(); assert.equal(h.editor.value, placeholder);
    });
  }

  for (const expanded of [false, true]) {
    for (const modifier of ['ctrlKey', 'metaKey']) {
      for (const [key, mark, word] of [['b', '**', 'bold'], ['i', '*', 'italic']]) {
        test(`${variant}: ${expanded ? 'expanded' : 'main'} ${modifier}+${key} wraps the active selection`, () => {
          for (const [value, start, end, selected] of [
            ['before fresh after', 7, 12, 'fresh'],
            ['日本語の編集', 0, 3, '日本語'],
            ['one\ntwo', 0, 7, 'one\ntwo'],
            ['', 0, 0, word],
            ['edge', 4, 4, word],
          ]) {
            const h = harness(source), target = h.type(value, start, end, expanded);
            assert.equal(h.key(target, { key, [modifier]: true }), true);
            const expected = value.slice(0, start) + mark + selected + mark + value.slice(end);
            assert.equal(target.value, expected);
            assert.equal(h.editor.value, expected, 'Main value is synchronized before history and saving');
            assert.equal(h.focused(), target);
            assert.deepEqual([target.selectionStart, target.selectionEnd], [start + mark.length, start + mark.length + selected.length]);
            if (expanded) assert.deepEqual([h.editor.selectionStart, h.editor.selectionEnd], [target.selectionStart, target.selectionEnd]);
            assert.deepEqual(h.history(), ['base', value, expected]);
            h.context.undo(); assert.equal(h.editor.value, value);
            h.context.redo(); assert.equal(h.editor.value, expected);
            h.advance(350); assert.equal(h.saved().markdown, expected);
          }
        });
      }
    }
    test(`${variant}: ${expanded ? 'expanded' : 'main'} consumes recognized repeats without formatting again`, () => {
      for (const key of ['b', 'I']) {
        const h = harness(source), target = h.type('fresh', 0, 5, expanded);
        assert.equal(h.key(target, { key, metaKey: true }), true);
        const before = target.value, history = h.history(), renders = h.renders.length;
        assert.equal(h.key(target, { key, metaKey: true, repeat: true }), true);
        assert.equal(target.value, before); assert.deepEqual(h.history(), history);
        assert.equal(h.renders.length, renders);
      }
    });
    test(`${variant}: ${expanded ? 'expanded' : 'main'} leaves unrelated modifiers and composition alone`, () => {
      for (const event of [
        { key: 'b' }, { key: 'i' }, { key: 'x', ctrlKey: true },
        { key: 'b', ctrlKey: true, altKey: true }, { key: 'i', metaKey: true, shiftKey: true },
        { key: 'b', ctrlKey: true, isComposing: true }, { key: 'i', metaKey: true, keyCode: 229 },
        { key: 'Dead', ctrlKey: true },
      ]) {
        const h = harness(source), target = h.type('fresh', 0, 5, expanded);
        assert.equal(h.key(target, event), false);
        assert.equal(target.value, 'fresh'); assert.deepEqual(h.history(), ['base']);
        assert.equal(h.downloads.length, 0);
      }
    });
    test(`${variant}: ${expanded ? 'expanded' : 'main'} keeps existing Tab and save shortcuts`, () => {
      const h = harness(source), target = h.type('fresh', 2, 4, expanded);
      assert.equal(h.key(target, { key: 'Tab' }), true);
      assert.equal(target.value, 'fr  h'); assert.equal(h.editor.value, 'fr  h');
      assert.deepEqual([target.selectionStart, target.selectionEnd], [4, 4]);
      h.context.undo(); assert.equal(h.editor.value, 'fresh');
      h.context.redo(); assert.equal(h.editor.value, 'fr  h');
      for (const modifier of ['shiftKey', 'ctrlKey', 'metaKey', 'altKey']) {
        assert.equal(h.key(target, { key: 'Tab', [modifier]: true }), false);
        assert.equal(target.value, 'fr  h');
      }
      for (const modifier of ['ctrlKey', 'metaKey']) assert.equal(h.key(target, { key: 'S', [modifier]: true }), true);
      assert.deepEqual(h.downloads, ['fr  h', 'fr  h']);
    });
  }

  test(`${variant}: expanded formatting snapshots its freshest text and survives closing the dialog`, () => {
    const h = harness(source);
    h.type('fresh', 0, 5);
    h.expandedEditor.value = 'newest'; h.expandedEditor.setSelectionRange(0, 6);
    assert.equal(h.key(h.expandedEditor, { key: 'b', ctrlKey: true }), true);
    assert.deepEqual(h.history(), ['base', 'newest', '**newest**']);
    h.context.closeExpandedEditorSync();
    assert.equal(h.editor.value, '**newest**'); assert.equal(h.focused(), h.editor);
    h.context.undo(); assert.equal(h.editor.value, 'newest');
    h.context.redo(); assert.equal(h.editor.value, '**newest**');
  });
  test(`${variant}: a new formatting edit after undo discards the old redo branch`, () => {
    const h = harness(source);
    h.type('first'); h.advance(350); h.type('second'); h.advance(350); h.context.undo();
    h.editor.setSelectionRange(0, 5); h.toolbar('bold');
    assert.deepEqual(h.history(), ['base', 'first', '**first**']);
    h.context.redo(); assert.equal(h.editor.value, '**first**');
  });
  test(`${variant}: typing retains its 350ms debounce and history stays bounded`, () => {
    const h = harness(source);
    h.type('one'); h.advance(349); assert.deepEqual(h.history(), ['base']);
    h.type('two'); h.advance(349); assert.deepEqual(h.history(), ['base']);
    h.advance(1); assert.deepEqual(h.history(), ['base', 'two']);
    for (let index = 0; index < 110; index++) { h.type(`text ${index}`); h.toolbar('bold'); }
    assert.equal(h.history().length, 100);
    h.context.undo(); assert.equal(h.editor.value, 'text 109');
    h.context.redo(); assert.equal(h.editor.value, '**text 109**');
  });
}
