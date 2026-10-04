// After canonical build: node tests/editor-tab.cjs (existing Playwright runtime).
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'msedge' });
  try {
    for (const variant of ['index.html', 'index.self-extract.html']) {
      const context = await browser.newContext({ acceptDownloads: true });
      const page = await context.newPage(), errors = [], requests = [];
      page.on('pageerror', e => errors.push(e.message));
      await context.route(/^https?:/, r => { requests.push(r.request().url()); return r.abort(); });
      await page.goto(pathToFileURL(path.join(__dirname, '../dist', variant)).href);
      const main = page.locator('#editor');
      for (const expanded of [false, true]) {
        for (const [start, end, expected, caret] of [[0,0,'  abcdef',2],[2,2,'ab  cdef',4],[2,4,'ab  ef',4],[6,6,'abcdef  ',8]]) {
          await page.locator('#fileInput').setInputFiles({ name: 'synthetic.md', mimeType: 'text/markdown', buffer: Buffer.from('abcdef') });
          await page.waitForFunction(() => document.querySelector('#editor').value === 'abcdef');
          if (expanded) { await page.locator('#expandEditorButton').click(); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
          const editor = page.locator(expanded ? '#expandedEditor' : '#editor');
          await editor.focus();
          await editor.evaluate((e, range) => e.setSelectionRange(...range), [start,end]);
          await editor.press('Tab');
          assert.equal(await editor.inputValue(), expected, `${variant} expanded=${expanded} range=${start},${end}`);
          assert.deepEqual(await editor.evaluate(e => [e.selectionStart,e.selectionEnd]), [caret,caret]);
          assert.equal(await main.inputValue(), expected, 'expanded changes sync to main');
          if (expanded) { await editor.press('Escape'); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
          await page.locator('#undoButton').click();
          assert.equal(await main.inputValue(), 'abcdef', 'one undo restores pre-Tab text');
          await page.locator('#redoButton').click();
          assert.equal(await main.inputValue(), expected, 'redo restores indentation');
        }
        if (expanded) { await page.locator('#expandEditorButton').click(); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
        const editor = page.locator(expanded ? '#expandedEditor' : '#editor');
        await editor.focus();
        const before = await editor.inputValue();
        await editor.press('Shift+Tab');
        assert.equal(await editor.inputValue(), before, 'Shift+Tab must not change Markdown');
        assert.equal(await editor.evaluate(e => document.activeElement === e), false, 'Shift+Tab leaves editor');
        if (expanded) { await page.keyboard.press('Escape'); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
      }
      // Typing immediately before Tab must not be lost as one combined undo step.
      await main.fill('fresh'); await main.press('Tab'); await page.locator('#undoButton').click();
      assert.equal(await main.inputValue(), 'fresh');
      await page.locator('#redoButton').click();
      const saved = await main.inputValue();
      const downloadPromise = page.waitForEvent('download');
      await main.press('Control+s');
      const download = await downloadPromise;
      assert.equal(await fs.readFile(await download.path(), 'utf8'), saved);
      await page.waitForTimeout(650); await page.reload();
      assert.equal(await main.inputValue(), saved, 'autosave includes Tab');
      await page.locator('#languageButton').click();
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []); assert.deepEqual(requests, []);
      console.log(`PASS ${variant}: Tab ranges/caret/history/autosave/export and Shift+Tab escape, JA/EN/mobile`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
