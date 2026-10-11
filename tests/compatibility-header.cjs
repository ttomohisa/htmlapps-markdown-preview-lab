// Dependency-free checks of the real scanner, renderer and language-switch functions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.join(__dirname, '..');
const variants = process.env.SOURCE_ONLY ? ['src/index.template.html'] : ['src/index.template.html', 'dist/index.html', 'dist/index.self-extract.html', 'markdown-preview-lab.html'];
function section(source, a, b) {
  const start = source.indexOf(a), end = source.indexOf(b, start);
  assert.ok(start >= 0 && end > start, a);
  return source.slice(start, end);
}
function harness(source) {
  const nodes = [...source.matchAll(/<[^/!][^>]*>/g)].map(([tag]) => {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    const dataset = Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
    return { attrs, dataset, style: {}, textContent: '', innerHTML: '', title: attrs.title, setAttribute(key, value) { this.attrs[key] = value; } };
  });
  const byId = id => nodes.find(node => node.attrs.id === id);
  const context = vm.createContext({
    document: { documentElement: {}, getElementById: byId, querySelectorAll: selector => nodes.filter(node => Object.hasOwn(node.attrs, selector.slice(1, -1))) },
    els: { issues: byId('issues') }, render() {}, saveState() {},
  });
  vm.runInContext(section(source, '    const I18N =', '    const els =')
    + "let state={lang:'ja'};\n" + section(source, '    function t(', '    function showToast(')
    + section(source, '    function escapeHtml(', '    function render(')
    + section(source, '    function capitalize(', '    function scheduleSave(')
    + section(source, '    function setLanguage(', '    function selectLine('), context);
  return { context, nodes, byId, scan: text => JSON.parse(JSON.stringify(context.analyzeCompatibility(text))) };
}
for (const variant of variants) {
  const source = fs.readFileSync(path.join(root, variant), 'utf8');
  for (const [label, input] of [
    ['browser fixture', '# QA 日本語 English\n\n**太字 bold** and _italic_.\n\n- 一つ\n- two\n\n[QA link](https://example.com/a_b?q=test%20value)\n\n```text\n<not-html>\n```'],
    ['tilde fence', '~~~html\n<div>example</div>\n~~~'],
    ['long fence with shorter interior', '````text\n```\n<b>x</b>\n````'],
    ['unclosed fence', '```text\n<img src="x">'],
    ['different closing character', '```text\n~~~\n<b>x</b>\n```'],
    ['inline code', '`![image](https://example.com/a.png)`'],
    ['multi-backtick span', '``one ` ![image](https://example.com/a.png) two``'],
    ['fenced extensions', '```text\n:::message\n$$\n- [x] Task\n![image](https://example.com/a.png)\n---\nname: value\n---\n```'],
  ]) test(`${variant}: ignores code syntax (${label})`, () => {
    const result = harness(source).scan(input);
    assert.deepEqual(result, { issues: [], scores: { github: 100, qiita: 100, zenn: 100 } });
  });
  test(`${variant}: real HTML after code keeps warnings, scores and source lines`, () => {
    const h = harness(source), result = h.scan('```text\n<ignored>\n```\n\n<div>actual</div>');
    assert.equal(result.issues.length, 3);
    assert.deepEqual(result.issues.map(issue => issue.line), [5, 5, 5]);
    assert.deepEqual(result.scores, { github: 95, qiita: 95, zenn: 92 });
    h.context.runCompatibility('```text\n<ignored>\n```\n\n<div>actual</div>');
    assert.equal((h.byId('issues').innerHTML.match(/data-line="5"/g) || []).length, 3);
  });
  test(`${variant}: code fence metadata remains reportable without scanning its body`, () => {
    const h = harness(source), result = h.scan('```js title=example\n<div>code</div>\n```');
    assert.equal(result.issues.length, 3);
    assert.deepEqual(result.issues.map(issue => issue.line), [1, 1, 1]);
    assert.deepEqual(result.scores, { github: 98, qiita: 98, zenn: 98 });
    assert.match(h.context.markdownToHtml('```js title=example\n<div>code</div>\n```'), /<pre>[\s\S]*&lt;div&gt;code&lt;\/div&gt;[\s\S]*<\/pre>/);
  });
  test(`${variant}: matched code spans preserve literal inner backticks`, () => {
    const h = harness(source);
    assert.equal(h.context.inlineMarkdown('``one ` <b> two``'), '<code>one ` &lt;b&gt; two</code>');
  });
  test(`${variant}: front matter cannot hide real HTML after it`, () => {
    const h = harness(source), md = '---\nexample: |\n  ```\n---\n<div>actual</div>';
    const result = h.scan(md);
    assert.equal(result.issues.length, 5);
    assert.equal(result.issues.filter(issue => issue.line === 5).length, 3);
    assert.deepEqual(result.scores, { github: 92, qiita: 92, zenn: 92 });
    assert.equal(h.context.markdownToHtml(md), '<p class="raw-html">&lt;div&gt;actual&lt;/div&gt;</p>');
  });
  test(`${variant}: many inline code spans stay responsive`, () => {
    const h = harness(source), count = 64000, md = '`x` '.repeat(count);
    const start = performance.now();
    assert.equal(h.context.inlineMarkdown(md), '<code>x</code> '.repeat(count));
    assert.ok(performance.now() - start < 2000, 'A 256 KB line should render in under two seconds');
  });
  test(`${variant}: fence metadata does not reorder earlier HTML warnings`, () => {
    const result = harness(source).scan('<div>real</div>\n\n```js file=test\ncode\n```');
    assert.deepEqual(result.issues.map(issue => issue.line), [1, 1, 1, 3, 3, 3]);
  });
  test(`${variant}: escaped first backtick still allows the rest of a run to open code`, () => {
    const h = harness(source), md = '\\``![image](https://example.com/a.png)`';
    assert.equal(h.scan(md).issues.length, 0);
    assert.match(h.context.inlineMarkdown(md), /<code>!\[image\]/);
    assert.doesNotMatch(h.context.inlineMarkdown(md), /image-placeholder/);
  });
  test(`${variant}: multiline code spans do not produce HTML warnings`, () => {
    const h = harness(source), md = '`start\n<div>example</div>\nend`';
    assert.equal(h.scan(md).issues.length, 0);
    assert.equal(h.context.markdownToHtml(md), '<p><code>start &lt;div&gt;example&lt;/div&gt; end</code></p>');
  });
  test(`${variant}: inline code does not cross a new paragraph or heading`, () => {
    for (const separator of ['\n\n', '\n# Heading\n']) {
      const h = harness(source), md = '`start' + separator + '<div>real</div>\nend`';
      assert.equal(h.scan(md).issues.length, 3);
    }
  });
  test(`${variant}: literal fence text in math or message blocks cannot hide later HTML`, () => {
    for (const [open, close] of [['$$', '$$'], [':::message', ':::']]) {
      const h = harness(source), result = h.scan(open + '\n```\n' + close + '\n<div>real</div>');
      assert.equal(result.issues.filter(issue => issue.line === 4).length, 3);
    }
  });
  test(`${variant}: inline code masking does not cross table cells`, () => {
    const h = harness(source), md = '| a | b |\n| --- | --- |\n| `x | ![image](https://example.com/a.png)` |';
    assert.match(h.context.markdownToHtml(md), /image-placeholder/);
    const result = h.scan(md);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0].platform, 'local');
    assert.equal(result.issues[0].line, 3);
  });
  test(`${variant}: unmatched escaped delimiter runs stay responsive`, () => {
    const h = harness(source), md = '\\``x '.repeat(64000), start = performance.now();
    assert.equal(h.context.inlineMarkdown(md), md);
    assert.ok(performance.now() - start < 2000, 'A 320 KB unmatched-delimiter line should render in under two seconds');
  });
  test(`${variant}: every warning is localized and survives language changes`, () => {
    const h = harness(source), md = '---\ntitle: Test\n---\n:::message\nmessage text\n:::\n$$\nx = 1\n$$\n<div>real</div>\n![image](https://example.com/a.png)\n- [x] Task\n```js file=test\ncode\n```';
    const ja = h.scan(md);
    assert.ok(ja.issues.length >= 15);
    for (const issue of ja.issues) assert.match(issue.message, /[\u3040-\u30ff\u4e00-\u9fff]/);
    h.context.setLanguage('en');
    const en = h.scan(md);
    assert.equal(en.issues.length, ja.issues.length);
    assert.deepEqual(en.scores, ja.scores);
    for (const issue of en.issues) assert.doesNotMatch(issue.message, /[\u3040-\u30ff\u4e00-\u9fff]/);
    assert.ok(en.issues.some(issue => issue.message.includes('HTML')));
    h.context.setLanguage('ja');
    assert.deepEqual(h.scan(md), ja);
  });
  test(`${variant}: desktop and mobile privacy copy and accessible header switch together`, () => {
    const h = harness(source);
    for (const [lang, badge, next, aria, help] of [
      ['ja', '完全ローカル処理', 'EN', '英語に切り替え', '使い方と注意事項'],
      ['en', 'Completely local processing', 'JA', 'Switch to Japanese', 'Help & notes'],
      ['ja', '完全ローカル処理', 'EN', '英語に切り替え', '使い方と注意事項'],
    ]) {
      h.context.setLanguage(lang);
      const badges = h.nodes.filter(node => ['localOnly', 'mobileLocal'].includes(node.dataset.i18n));
      assert.equal(badges.length, 2);
      badges.forEach(node => assert.equal(node.textContent, badge));
      assert.equal(h.byId('languageButton').textContent, next);
      assert.equal(h.byId('languageButton').attrs['aria-label'], aria);
      assert.equal(h.byId('helpButton').attrs['aria-label'], help);
      assert.equal(h.byId('helpButton').title, help);
    }
  });
  test(`${variant}: the version stays outside the shrinkable title text`, () => {
    assert.match(source, /<span class="brand-title">Markdown Preview Lab<\/span>\s*<span class="version-badge">/);
    assert.match(source, /\.brand-title\s*\{[^}]*overflow:hidden;[^}]*text-overflow:ellipsis;/);
    assert.match(source, /\.version-badge\s*\{[^}]*flex:0 0 auto;/);
  });
  test(`${variant}: release version is consistently patch-incremented`, () => {
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));
    assert.equal(app.version, '1.0.3');
    assert.ok(source.includes(`<span class="version-badge">v${app.version}</span>`));
    assert.ok(source.includes(`helpSyntaxTitle:'Main syntax in v${app.version}'`));
    assert.ok(source.includes(`helpSyntaxTitle:'v${app.version}で対応する主な記法'`));
    assert.match(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), /^## 1\.0\.2\b/m);
  });
}
