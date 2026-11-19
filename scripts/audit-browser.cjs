// Chromium acceptance checks. This complements, not replaces, device/Safari/Firefox testing.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const evidence = path.resolve('test-results/audit');
async function main() {
  fs.mkdirSync(evidence,{recursive:true});
  const browser = await chromium.launch();
  try {
    for(const file of ['index.html','index.self-extract.html']) {
      const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja',acceptDownloads:true});
      const page=await context.newPage(),errors=[],requests=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
      try {
        await page.goto(pathToFileURL(path.resolve(__dirname,'../dist',file)).href);
        assert.equal(await page.locator('#editor').count(),1,'editor exists');
        await page.locator('#languageButton').click();
        assert.equal(await page.locator('html').getAttribute('lang'),'en');
        assert.match(await page.locator('#editor').inputValue(),/What you can do/,'untouched sample is English');
        await page.locator('#languageButton').click();
        assert.match(await page.locator('#editor').inputValue(),/できること/,'untouched sample is Japanese');
        await page.locator('#editor').fill('My personal draft');
        await page.locator('#languageButton').click();
        assert.equal(await page.locator('#editor').inputValue(),'My personal draft','language change leaves user input untouched');
        await page.locator('[data-mobile-view="compare"]').click();
        const heights=await page.evaluate(()=>[document.querySelector('#compareScrollA').getBoundingClientRect().height,document.querySelector('#compareScrollB').getBoundingClientRect().height]);
        assert.ok(heights.every(h=>h>150),'compare scroll panes are usable: '+heights);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page horizontal overflow');
        await page.screenshot({path:path.join(evidence,file+'-compare.png')});
        await page.locator('[data-mobile-view="editor"]').click();
        await page.locator('#fileInput').setInputFiles({name:'test.md',mimeType:'text/markdown',buffer:Buffer.from('Imported content')});
        await page.waitForFunction(()=>document.querySelector('#editor').value==='Imported content');
        await page.locator('#undoButton').click();
        assert.equal(await page.locator('#editor').inputValue(),'My personal draft','file import is undoable');
        await page.locator('[data-style="custom"]').click();
        await page.locator('#customCssEditor').fill('.md h1 { color: red; }');
        await page.locator('#applyCssButton').click();
        assert.match(await page.locator('#customCssStyle').textContent(),/color: red/);
        await page.locator('[data-style="custom"]').click();
        await page.locator('#resetCssButton').click();
        assert.equal(await page.locator('#cssResetDialog').isVisible(),true);
        assert.equal(await page.locator('#cancelResetCss').evaluate(e=>document.activeElement===e),true,'cancel gets focus');
        await page.locator('#cancelResetCss').click();
        assert.match(await page.locator('#customCssStyle').textContent(),/color: red/,'cancel retains CSS');
        await page.locator('#resetCssButton').click();
        await page.locator('#confirmResetCss').click();
        assert.equal((await page.locator('#customCssStyle').textContent()).trim(),'','confirmed reset clears CSS');
        await page.locator('[data-close-dialog="customCssDialog"]').click();
        // Seed the broken draft *before* app startup; the open tab's beforeunload saves normally.
        await context.addInitScript(() => localStorage.setItem('markdown-preview-lab:v1','{broken'));
        await page.reload();
        assert.equal(await page.locator('#saveNotice').isVisible(),true,'corrupt local draft shows persistent warning');
        await page.locator('#editor').fill('Safety first');
        await page.waitForTimeout(500);
        assert.equal(await page.evaluate(()=>localStorage.getItem('markdown-preview-lab:v1')),'{broken','corrupt draft is not overwritten');
        page.once('dialog',dialog=>dialog.accept());
        await page.locator('#retrySaveButton').click();
        assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('markdown-preview-lab:v1')).markdown),'Safety first');
        assert.equal(await page.locator('#saveNotice').isVisible(),false,'warning clears on confirmed save');
        assert.deepEqual(errors,[],'runtime errors');
        assert.deepEqual(requests,[],'unexpected external requests');
        console.log('PASS '+file+' language, compare, import Undo, CSS reset, corrupt storage, no requests');
      } catch(error) {
        await page.screenshot({path:path.join(evidence,file+'-failure.png')}).catch(()=>{});
        throw error;
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
