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
        // The phone header is not sticky; the description remains while its heading and badge are hidden.
        // Scores remain visible while compatibility findings start collapsed.
        for (const width of [320,360,374,375,390,430,720]) {
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
              introVisible:rect($('.page-intro')).height>0,
              headingVisible:rect($('.page-intro h2')).height>0,
              descriptionVisible:rect($('.page-intro p')).height>0,
              descriptionMarginTop:getComputedStyle($('.page-intro p')).marginTop,
              introBottomGap:rect($('.workspace')).top-rect($('.page-intro p')).bottom,
              introLeftInset:rect($('.page-intro p')).left-rect($('.workspace')).left,
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

          const toolbar=await page.evaluate(()=>{
            const toolbar=document.querySelector('.workspace-toolbar').getBoundingClientRect();
            const box=id=>{const r=document.querySelector('#'+id).getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,width:r.width,height:r.height};};
            const first=['openButton','downloadButton'].map(box);
            const filename=document.querySelector('.filename-control').getBoundingClientRect();
            const second=['copyButton','undoButton','redoButton'].map(box);
            return {left:toolbar.left,right:toolbar.right,first,filename:{left:filename.left,right:filename.right,width:filename.width,top:filename.top},second};
          });
          const allActions=[...toolbar.first,...toolbar.second];
          assert.ok(allActions.every(btn=>btn.width>=40&&btn.height>=40),width+': action buttons remain >= 40px');
          assert.ok(allActions.every(btn=>btn.left>=toolbar.left-1&&btn.right<=toolbar.right+1),width+': no toolbar buttons are clipped');
          assert.ok(toolbar.filename.width>=80,width+': filename remains editable');
          assert.ok(toolbar.first.every(btn=>Math.abs(btn.top-toolbar.filename.top)<2),width+': open/file/save share a row');
          assert.ok(toolbar.second.every(btn=>Math.abs(btn.top-toolbar.second[0].top)<2),width+': copy/undo/redo stay grouped');
          if(width<375) assert.ok(toolbar.second[0].top-toolbar.first[0].top>=40,width+': compact phone uses two orderly action rows');
          else assert.ok(Math.abs(toolbar.second[0].top-toolbar.first[0].top)<2,width+': buttons fit on one row');
          assert.equal(layout.headerPosition,'relative',width+': header scrolls with page');
          assert.equal(layout.introVisible,true,width+': description section remains visible');
          assert.equal(layout.headingVisible,false,width+': redundant heading is hidden');
          assert.equal(layout.descriptionVisible,true,width+': description text is visible');
          assert.equal(layout.descriptionMarginTop,'0px',width+': description has no redundant top margin');
          assert.ok(Math.abs(layout.introBottomGap-16)<1,width+': description has a 16px gap before workspace: '+layout.introBottomGap);
          assert.ok(Math.abs(layout.introLeftInset-8)<1,width+': description aligns to an 8px inset: '+layout.introLeftInset);
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
        // Search navigation is visually lightweight: no borders/shadows on four actions.
        for(const width of [320,390,720]) {
          await page.setViewportSize({width,height:844});
          await page.locator('#mobileDocumentToolsButton').click();
          await page.locator('#findTab').click();
          const controls=await page.evaluate(()=>{
            const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
            const buttons=['findPrevious','findNext','replaceOneButton','replaceAllButton'].map(id=>{
              const el=document.getElementById(id),css=getComputedStyle(el);
              return {id,...rect(el),border:css.borderTopWidth,shadow:css.boxShadow};
            });
            const search=rect(document.querySelector('.document-search-row'));
            const replace=rect(document.querySelector('.document-replace-row'));
            const first=rect(document.getElementById('findInput'));
            return {buttons,search,replace,first,overflow:document.documentElement.scrollWidth>innerWidth};
          });
          assert.equal(controls.overflow,false,width+': open search panel never causes horizontal scrolling');
          assert.ok(controls.first.width>=100,width+': search input stays usable');
          assert.ok(controls.buttons.every(x=>x.height>=40 && x.border==='0px' && x.shadow==='none'),width+': four flat 40px actions');
          assert.ok(controls.buttons.every(x=>x.left>=0&&x.right<=width+1),width+': no actions spill offscreen: '+JSON.stringify(controls));
          assert.ok(controls.buttons.slice(0,2).every(x=>Math.abs(x.top-controls.search.top)<1),width+': navigation sits by the search count');
          assert.ok(controls.buttons.slice(2).every(x=>Math.abs(x.top-controls.replace.top)<1),width+': replace actions sit beside the replace field');
          await page.locator('#documentClose').click();
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
        // Document tools: keep the phone UI compact and test actual navigation/replace behavior.
        await page.locator('#editor').fill('# Start\none two one\n## Second\n' +
          String.fromCharCode(96).repeat(3) + 'md\n# skipped\n' + String.fromCharCode(96).repeat(3) + '\n## Third');
        assert.equal(await page.locator('#documentPanel').isVisible(),false,'document tools start closed');
        await page.locator('#mobileDocumentToolsButton').click();
        assert.equal(await page.locator('#documentPanel').isVisible(),true,'mobile document tools open');
        assert.equal(await page.locator('.outline-item').count(),3,'outline ignores code fences');
        await page.locator('[data-outline-line="3"]').click();
        assert.equal(await page.locator('#documentPanel').isVisible(),false,'outline selection closes tools');
        assert.equal(await page.locator('#editor').evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd)),'## Second','outline jumps to heading source line');
        await page.locator('#mobileDocumentToolsButton').click();
        await page.locator('#findTab').click();
        await page.locator('#findInput').fill('one');
        assert.equal(await page.locator('#findCount').textContent(),'0 / 2');
        await page.locator('#findNext').click();
        assert.equal(await page.locator('#editor').evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd)),'one');
        await page.locator('#replaceInput').fill('ONE');
        await page.locator('#replaceOneButton').click();
        assert.match(await page.locator('#editor').inputValue(),/ONE two one/,'single replace changes only first match');
        await page.locator('#undoButton').click();
        assert.match(await page.locator('#editor').inputValue(),/one two one/,'single replace is undoable');
        await page.locator('#findInput').fill('one');
        await page.locator('#replaceInput').fill('$&');
        await page.locator('#replaceAllButton').click();
        assert.match(await page.locator('#editor').inputValue(),/\$& two \$&/,'replace-all treats $ as literal');
        await page.locator('#undoButton').click();
        assert.match(await page.locator('#editor').inputValue(),/one two one/,'replace-all is undoable');
        await page.locator('#documentClose').click();
        await page.locator('#editor').focus();
        await page.keyboard.press('Control+f');
        assert.equal(await page.locator('#findPanel').isVisible(),true,'Ctrl+F opens app find');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#documentPanel').isVisible(),false,'Escape closes document panel');
        await page.screenshot({path:path.join(evidence,file+'-document-tools.png')});
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
        // Desktop: the tool action belongs to the editor header, not the phone tab bar.
        await page.setViewportSize({width:1280,height:900});
        assert.equal(await page.locator('#documentToolsButton').isVisible(),true,'desktop tool icon available');
        assert.equal(await page.locator('#mobileDocumentToolsButton').isVisible(),false,'phone document icon hidden on desktop');
        await page.locator('#editor').fill('# Desktop\n## Section');
        await page.locator('#documentToolsButton').click();
        assert.equal(await page.locator('.outline-item').count(),2,'desktop heading outline displays');
        await page.locator('#findTab').click();
        await page.locator('#findInput').fill('Section');
        assert.equal(await page.locator('#findCount').textContent(),'0 / 1','desktop find counts matches');
        await page.locator('#findPrevious').click();
        assert.equal(await page.locator('#editor').evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd)),'Section','desktop find goes to a match');
        await page.locator('#documentClose').click();
        await page.locator('#documentToolsButton').click();
        await page.locator('#outlineTab').focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#findPanel').isVisible(),true,'desktop document tabs support arrow keys');
        await page.locator('#documentClose').click();
        await page.locator('#expandEditorButton').click();
        await page.locator('#expandedEditor').fill('# Expanded\nkept across search');
        await page.locator('#expandedEditor').press('Control+f');
        assert.equal(await page.locator('#expandedEditorDialog').isVisible(),false,'Ctrl+F closes expanded editor safely');
        assert.equal(await page.locator('#editor').inputValue(),'# Expanded\nkept across search','expanded typing stays intact');
        assert.equal(await page.locator('#findPanel').isVisible(),true,'Ctrl+F opens find after expanded dialog');
        await page.locator('#documentClose').click();
        await page.screenshot({path:path.join(evidence,file+'-desktop-outline.png')});
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
