// Run after scripts/check-repository.ps1. Uses only the Node.js standard library.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const variants = ['src/index.template.html', 'dist/index.html', 'dist/index.self-extract.html', 'markdown-preview-lab.html'];
const root = path.join(__dirname, '..');
const escape = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const anchor = (label, url) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
const cases = [
  ['plain link', '[Simple](https://example.com/simple)', anchor('Simple', 'https://example.com/simple')],
  ['query ampersand', '[Search](https://example.com/search?q=red&lang=en)', anchor('Search', 'https://example.com/search?q=red&lang=en')],
  ['underscore path', '[File](https://example.com/my_file_name)', anchor('File', 'https://example.com/my_file_name')],
  ['mixed query syntax', '[Filter](https://example.com/?sort=first_name&show=all_items)', anchor('Filter', 'https://example.com/?sort=first_name&show=all_items')],
  ['percent encoded URL', '[Search](https://example.com/?q=red%20blue&lang=ja)', anchor('Search', 'https://example.com/?q=red%20blue&lang=ja')],
  ['Japanese formatted label', '[**検索** と _file_ と ~~old~~](https://example.com/my_file_name?a=1&b=2)', anchor('<strong>検索</strong> と <em>file</em> と <del>old</del>', 'https://example.com/my_file_name?a=1&b=2')],
  ['escaped label characters', '[A & B < C "D"](https://example.com/?a=1&b=2)', anchor('A &amp; B &lt; C &quot;D&quot;', 'https://example.com/?a=1&b=2')],
  ['URL quote and entity-like text', '[Book](https://example.com/O\'Reilly?q="red"&literal=&amp;)', anchor('Book', 'https://example.com/O\'Reilly?q="red"&literal=&amp;')],
  ['inline code label', '[`my_file_name` & **more**](https://example.com/my_file_name)', anchor('<code>my_file_name</code> &amp; <strong>more</strong>', 'https://example.com/my_file_name')],
  ['formatting around a link', '**[File](https://example.com/my_file_name)**', `<strong>${anchor('File', 'https://example.com/my_file_name')}</strong>`],
  ['separate links and emphasis', '[One](https://example.com/a_b_c) and _text_ [Two](https://example.com/?a=1&b=2)', `${anchor('One', 'https://example.com/a_b_c')} and <em>text</em> ${anchor('Two', 'https://example.com/?a=1&b=2')}`],
  ['existing URL forms', '[mail](mailto:hello@example.com) [section](#my_section_name) [path](/my_file_name)', `${anchor('mail', 'mailto:hello@example.com')} ${anchor('section', '#my_section_name')} ${anchor('path', '/my_file_name')}`],
  ['inline code stays literal', '`[Search](https://example.com/?a=1&b=2)`', '<code>[Search](https://example.com/?a=1&amp;b=2)</code>'],
  ['ordinary text formatting', 'A & B < C **bold** __strong__ *em* _italic_ ~~old~~ `a_b & c`', 'A &amp; B &lt; C <strong>bold</strong> <strong>strong</strong> <em>em</em> <em>italic</em> <del>old</del> <code>a_b &amp; c</code>'],
  ['autolink underscores', '<https://example.com/my_file_name>', anchor('https://example.com/my_file_name', 'https://example.com/my_file_name')],
  ['linked image label', '[![Logo](https://example.com/logo.png)](https://example.com/home)', anchor('<span class="image-placeholder" title="https://example.com/logo.png">▧ <span>Logo · https://example.com/logo.png</span></span>', 'https://example.com/home')],
  ['image placeholder URL and label', '![**A** & B](https://example.com/my_file_name.png?a=1&b=2)', '<span class="image-placeholder" title="https://example.com/my_file_name.png?a=1&amp;b=2">▧ <span><strong>A</strong> &amp; B · https://example.com/my_file_name.png?a=1&amp;b=2</span></span>'],
];

for (const variant of variants) {
  const source = fs.readFileSync(path.join(root, variant), 'utf8');
  const start = source.indexOf('    function escapeHtml(');
  const end = source.indexOf('    function render', start);
  assert.ok(start >= 0 && end > start, `${variant}: renderer boundaries found`);
  const context = vm.createContext({});
  vm.runInContext(source.slice(start, end), context, { filename: variant });
  test(`${variant}: app script parses`, () => {
    const script = source.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(script, 'inline app script exists');
    new vm.Script(script[1], { filename: variant });
  });
  for (const [name, markdown, expected] of cases) {
    test(`${variant}: ${name}`, () => assert.equal(context.inlineMarkdown(markdown), expected));
  }
  test(`${variant}: all preview styles keep the same destinations`, () => {
    const markdown = cases.slice(0, 7).map(([, text]) => text).join('\n\n');
    const expected = cases.slice(0, 7).map(([, , html]) => `<p>${html}</p>`).join('\n');
    for (const style of ['github', 'qiita', 'zenn', 'standard', 'minimal', 'print', 'custom']) {
      assert.equal(context.markdownToHtml(markdown, style), expected, style);
    }
  });
  test(`${variant}: source and shipped HTML stay byte-identical`, () => {
    const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    assert.equal(hash(variant), hash(variants[0]));
  });
}
