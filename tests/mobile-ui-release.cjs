// Static regressions for the mobile presentation and protected release workflow.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const root = path.resolve(__dirname,'..');
const versions=['src/index.template.html','dist/index.html','dist/index.self-extract.html','markdown-preview-lab.html'];

for(const file of versions) {
  const html=fs.readFileSync(path.join(root,file),'utf8');
  test(file+': mobile header is not sticky and hero/local badge are hidden',()=>{
    const mobile=html.slice(html.indexOf('@media (max-width: 720px) {'),html.indexOf('@media (max-width: 430px) {'));
    assert.match(mobile,/\.app-header\s*\{\s*position:relative;/);
    assert.match(mobile,/\.page-intro h2,\s*\.page-intro \.local-badge\s*\{\s*display:none;/);
    assert.match(mobile,/\.sync-toggle\s*\{\s*flex:0 0 auto;\s*white-space:nowrap;/);
    assert.match(mobile,/\.sync-toggle span\s*\{\s*white-space:nowrap;\s*writing-mode:horizontal-tb;/);
    assert.match(mobile,/#copyButton, #undoButton, #redoButton\s*\{\s*display:inline-grid;/);
    assert.match(mobile,/\.editor-pane > \.pane-head > \.pane-title\s*\{\s*display:none;/);
    assert.match(mobile,/\.editor-pane > \.pane-head\s*\{\s*flex-wrap:nowrap;/);
    assert.match(mobile,/\.editor-pane > \.pane-head > \.format-bar\s*\{\s*flex:1 1 auto;\s*min-width:0;\s*max-width:none;/);
    assert.match(html,/\.format-bar\s*\{\s*max-width:none;\s*overflow-x:auto;/);
  });
  test(file+': application UI uses 8px spacing increments outside platform previews',()=>{
    const css=html.match(/<style>([\\s\\S]*?)<\\/style>/)?.[1]||'';
    const start=css.indexOf('/* Rendered Markdown: shared */');
    const end=css.indexOf('.compat-section {',start);
    assert.ok(start>=0&&end>start);
    // Keep platform-inspired Markdown typography separate from app-shell spacing.
    const uiCss=css.slice(0,start)+css.slice(end);
    const invalid=[];
    const properties=/\\b(?:padding(?:-(?:left|right|top|bottom))?|margin(?:-(?:left|right|top|bottom))?|gap|row-gap|column-gap)\\s*:\\s*([^;]+);/g;
    for(const declaration of uiCss.matchAll(properties)){
      for(const match of declaration[1].matchAll(/(-?\\d+(?:\\.\\d+)?)px/g)){
        if(Number(match[1])%8!==0)invalid.push(declaration[0]);
      }
    }
    assert.deepEqual(invalid,[],'UI spacing must follow the 8px grid');
  });
  test(file+': framed sections have quiet nested surfaces',()=>{
    const rules=html.match(/<style>([\\s\\S]*?)<\\/style>/)?.[1]||'';
    const uiRule=selector=>rules.split('    '+selector+' {')[1]?.split('}')[0]||'';
    assert.match(uiRule('.compat-section'),/box-shadow:none/);
    assert.match(uiRule('.score-card'),/border:0/);
    assert.match(uiRule('.segmented'),/border:0/);
    assert.match(uiRule('.seg-button.active'),/box-shadow:none/);
    assert.match(uiRule('.workspace-toolbar .button'),/border-color:transparent/);
  });
  test(file+': compatibility scores remain outside the initially closed details',()=>{
    const title=html.indexOf('<section class="compat-section"');
    const scores=html.indexOf('<div class="score-grid">',title);
    const details=html.indexOf('<details class="compat-details"',title);
    const issues=html.indexOf('id="issues"',title);
    const end=html.indexOf('</section>',title);
    assert.ok(title< scores && scores<details && details<issues && issues<end);
    assert.match(html.slice(details,issues),/<summary[^>]*class="compat-summary"/);
    assert.doesNotMatch(html.slice(details,issues),/<details[^>]*\sopen(?:\s|>)/);
    for(const key of ['compatExpand','compatCollapse'])assert.match(html,new RegExp('data-i18n="'+key+'"'));
  });
  test(file+': undo and redo use accessible centered SVG controls',()=>{
    for(const [id,key] of [['undoButton','undoAction'],['redoButton','redoAction']]){
      const markup=html.match(new RegExp('<button[^>]+id="'+id+'"[^>]*>[\\s\\S]*?<\\/button>'))?.[0];
      assert.ok(markup,id);
      assert.ok(markup.includes('data-i18n-aria="'+key+'"'));
      assert.ok(markup.includes('data-i18n-title="'+key+'"'));
      assert.match(markup,/<svg[^>]*aria-hidden="true"/);
      assert.match(markup,/<path d="M/);
    }
  });
}

test('release workflow publishes a single validated SemVer after a main push',()=>{
  const yaml=fs.readFileSync(path.join(root,'.github/workflows/release-on-main.yml'),'utf8');
  assert.match(yaml,/push:\s*\n\s*branches: \[main\]/);
  assert.match(yaml,/github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml,/contents: write/);
  assert.match(yaml,/\.\/scripts\/check-repository\.ps1/);
  assert.match(yaml,/\$app\.version/);
  assert.match(yaml,/git tag -a \$tag/);
  assert.match(yaml,/git push origin "refs\/tags\/\$tag"/);
  assert.match(yaml,/gh release create \$tag/);
  assert.match(yaml,/gh release view \$tag/);
  assert.match(yaml,/--verify-tag/);
  assert.match(yaml,/--generate-notes/);
  assert.match(yaml,/cancel-in-progress: false/);
  assert.doesNotMatch(yaml,/pull_request:/);
});
