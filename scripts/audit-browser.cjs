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
        // The phone header is not sticky; the hero heading and local badge are hidden.
        // Scores remain visible while compatibility findings start collapsed.
        for (const width of [320,390,720]) {
          await page.setViewportSize({width,height:844});
          const layout=await page.evaluate(()=>{
            const $=selector=>document.querySelector(selector);
            const rect=el=>el.getBoundingClientRect();
            const centered=id=>{
              const button=$('#'+id), svg=button.querySelector('svg');
              const outer=rect(button), inner=rect(svg);
              return Math.abs((outer.left+outer.right-inner.left-inner.right)/2)<1.6
                  && Math.abs((outer.top+outer.bottom-inner.top-inner.bottom)/2)<1.6;
            };
            return {
              headerPosition:getComputedStyle($('.app-header')).position,
              introVisible:getComputedStyle($('.page-intro')).display!=='none',
              badgeVisible:rect($('.local-badge')).height>0,
              syncDirection:getComputedStyle($('.sync-toggle span')).writingMode,
              syncWhiteSpace:getComputedStyle($('.sync-toggle span')).whiteSpace,
              syncHeight:rect($('.workspace-controls')).height,
              scoreVisible:rect($('#scoreGithub')).width>0,
              innerScoreBorder:getComputedStyle($('.score-card')).borderTopWidth,
              segmentedBorder:getComputedStyle($('.mobile-view-switch .segmented')).borderTopWidth,
              compatibilityShadow:getComputedStyle($('.compat-section')).boxShadow,
              collapsed:!$('#compatDetails').open,
              centered:['copyButton','undoButton','redoButton'].every(centered),
              overflow:document.documentElement.scrollWidth>innerWidth
            };
          });
          assert.equal(layout.headerPosition,'relative',width+': header scrolls with page');
          assert.equal(layout.introVisible,false,width+': empty mobile intro strip is hidden');
          assert.equal(await page.locator('.editor-pane > .pane-head > .pane-title').isVisible(),false,width+': editor Markdown label is hidden');
          assert.equal(layout.badgeVisible,false,width+': local badge is hidden');
          assert.equal(layout.syncDirection,'horizontal-tb',width+': sync label stays horizontal');
          assert.equal(layout.syncWhiteSpace,'nowrap',width+': sync label does not wrap');
          assert.ok(layout.syncHeight<72,width+': controls height '+layout.syncHeight);
          assert.equal(layout.centered,true,width+': toolbar icons centered');
          assert.equal(layout.scoreVisible,true,width+': scores visible');
          assert.equal(layout.innerScoreBorder,'0px',width+': no nested score-card border');
          assert.equal(layout.segmentedBorder,'0px',width+': no nested segmented-control border');
          assert.equal(layout.compatibilityShadow,'none',width+': no extra compatibility card shadow');
          assert.equal(layout.collapsed,true,width+': findings initially closed');
          assert.equal(layout.overflow,false,width+': no page horizontal overflow');
        }
        await page.setViewportSize({width:390,height:844});
        await page.locator('#compatDetails summary').click();
        assert.equal(await page.locator('#compatDetails').evaluate(el=>el.open),true,'compatibility findings expand');
        assert.equal(await page.locator('#issues').isVisible(),true,'expanded findings accessible');
        await page.locator('#compatDetails summary').click();
        assert.equal(await page.locator('#compatDetails').evaluate(el=>el.open),false,'compatibility findings collapse');
        // Force scroll to verify the mobile header leaves the viewport rather than sticking.
        await page.evaluate(()=>{ const probe=document.createElement('div');probe.id='audit-scroll-probe';probe.style.height='500px';document.body.appendChild(probe);window.scrollTo({top:200,behavior:'instant'}); });
        await page.waitForFunction(()=>window.scrollY>=150);
        assert.ok(await page.locator('.app-header').evaluate(el=>el.getBoundingClientRect().bottom<0),'mobile header leaves viewport when scrolling');
        await page.evaluate(()=>{document.querySelector('#audit-scroll-probe').remove();window.scrollTo(0,0);});

        await page.locator('#languageButton').click();
        assert.equal(await page.locator('html').getAttribute('lang'),'en');
        assert.match(await page.locator('#editor').inputValue(),/What you can do/,'untouched sample is English');
        await page.locator('#languageButton').click();
        assert.match(await page.locator('#editor').inputValue(),/できること/,'untouched sample is Japanese');
        await page.locator('#editor').fill('My personal draft');
        // After leaving the sample, the toolbar should use the space freed by the hidden title.
        const formatLayout=await page.evaluate(()=>{
          const head=document.querySelector('.editor-pane > .pane-head').getBoundingClientRect();
          const bar=document.querySelector('.editor-pane .format-bar').getBoundingClientRect();
          const expand=document.querySelector('#expandEditorButton').getBoundingClientRect();
          const stats=document.querySelector('#editorStats').getBoundingClientRect();
          return {width:bar.width,barRight:bar.right,expandLeft:expand.left,
            headHeight:head.height,expandTop:expand.top,statsTop:stats.top,
            overflow:document.documentElement.scrollWidth>innerWidth};
        });
        assert.ok(formatLayout.width>190,'format toolbar expands beyond the previous 172px cap: '+JSON.stringify(formatLayout));
        assert.ok(formatLayout.barRight<=formatLayout.expandLeft+2,'format toolbar stays before Expand button');
        assert.ok(Math.abs(formatLayout.expandTop-formatLayout.statsTop)<12,'editor controls remain in a single row');
        assert.ok(formatLayout.headHeight<60,'editor toolbar does not wrap to a second row');
        assert.equal(formatLayout.overflow,false,'expanded format toolbar does not overflow the page');
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
