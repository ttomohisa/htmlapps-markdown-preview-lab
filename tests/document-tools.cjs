'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {test}=require('node:test');
const versions=['src/index.template.html','dist/index.html','dist/index.self-extract.html','markdown-preview-lab.html'];
function section(source,first,last) {
  const a=source.indexOf(first),b=source.indexOf(last,a);
  assert.ok(a>=0&&b>a,'Missing helper: '+first);
  return source.slice(a,b);
}
function parseHeadings(source) {
  const ctx=vm.createContext({});
  vm.runInContext(section(source,'    function codeFenceStart(', '    function replaceInlineCode(') +
    section(source,'    function frontMatterEnd(', '    function continuesParagraph('),ctx);
  return ctx.extractHeadings;
}
function finder(source,value,query,replacement) {
  const editor={value,selectionStart:0,selectionEnd:0,scrollHeight:300,clientHeight:100,
    focus(){},setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}};
  const els={editor,findInput:{value:query},replaceInput:{value:replacement},
    findMatchCase:{checked:false},findCount:{textContent:'',title:''},
    findNext:{disabled:false},findPrevious:{disabled:false},
    replaceOneButton:{disabled:false},replaceAllButton:{disabled:false},
    outlineEmpty:{hidden:false},outlineList:{innerHTML:''}};
  const edits=[value],toast=[];
  const ctx=vm.createContext({
    els,state:{mobileView:'editor'},window:{innerWidth:1200},
    extractHeadings:()=>[],escapeHtml:x=>x,t:k=>k,showToast:m=>toast.push(m),
    leaveSampleMode(){},pushHistory(){if(edits.at(-1)!==editor.value)edits.push(editor.value);},
    render(){ctx.updateFindMatches();}
  });
  vm.runInContext("let findMatches=[],findCursor=-1,findOverflow=false,editRevision=0;\n"+
    section(source,'    function updateOutline(', '    function formatSelection('),ctx);
  return {ctx,editor,els,edits,toast};
}
for(const variant of versions) {
  const source=fs.readFileSync(path.join(__dirname,'..',variant),'utf8');
  test(variant+': application script parses',()=>{
    const js=source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(js);new vm.Script(js);
  });
  test(variant+': outline excludes fenced code, YAML front matter and extension blocks',()=>{
    const fence=String.fromCharCode(96).repeat(3);
    const value=['---','title: hidden','---','# First','',''+fence+'md','# hidden',fence,
      '~~~text','## hidden','~~~','$$','# math','$$',':::message','# hidden',':::',
      '## Second ###','\\# not heading','###### Deep'].join('\r\n');
    const headings=JSON.parse(JSON.stringify(parseHeadings(source)(value)));
    assert.deepEqual(headings.map(h=>[h.level,h.text,h.line]),[[1,'First',4],[2,'Second',18],[6,'Deep',20]]);
    assert.equal(value.slice(headings[0].start).startsWith('# First'),true);
    assert.equal(value.slice(headings[1].start).startsWith('## Second'),true);
  });
  test(variant+': literal search escapes punctuation and honors case',()=>{
    const h=finder(source,'[a] + [a]','[a]','literal');
    const a=JSON.parse(JSON.stringify(h.ctx.literalMatches(h.editor.value,h.els.findInput.value,true)));
    assert.deepEqual(a.matches,[{start:0,end:3},{start:6,end:9}]);
    assert.equal(h.ctx.literalMatches('A a à','a',false).matches.length,2);
    assert.equal(h.ctx.literalMatches('A a à','a',true).matches.length,1);
    assert.equal(h.ctx.literalMatches('aaaa','a',true,2).overflow,true);
  });
  test(variant+': find navigation wraps and selects exact locations',()=>{
    const h=finder(source,'foo bar foo','foo','ok');
    h.ctx.updateFindMatches();h.ctx.navigateFind(1);
    assert.deepEqual([h.editor.selectionStart,h.editor.selectionEnd],[0,3]);
    h.ctx.navigateFind(1);
    assert.deepEqual([h.editor.selectionStart,h.editor.selectionEnd],[8,11]);
    h.ctx.navigateFind(1);
    assert.deepEqual([h.editor.selectionStart,h.editor.selectionEnd],[0,3]);
    h.ctx.navigateFind(-1);
    assert.deepEqual([h.editor.selectionStart,h.editor.selectionEnd],[8,11]);
  });
  test(variant+': single replacement preserves immediate pre-edit history',()=>{
    const h=finder(source,'foo bar foo','foo','bar');
    h.ctx.updateFindMatches();h.ctx.replaceCurrentMatch();
    assert.equal(h.editor.value,'bar bar foo');
    assert.deepEqual(h.edits,['foo bar foo','bar bar foo']);
  });
  test(variant+': replace-all uses literal replacement and is one undo step',()=>{
    const h=finder(source,'a.b a.b','a.b','$&');
    h.ctx.updateFindMatches();h.ctx.replaceEveryMatch();
    assert.equal(h.editor.value,'$& $&');
    assert.deepEqual(h.edits,['a.b a.b','$& $&']);
    assert.equal(h.toast[0],'replacedCount');
  });
  test(variant+': empty replacement and match cap work',()=>{
    const h=finder(source,'abc abc','abc','');
    h.ctx.updateFindMatches();h.ctx.replaceEveryMatch();
    assert.equal(h.editor.value,' ');
    h.editor.value='x'.repeat(5010);h.els.findInput.value='x';h.ctx.updateFindMatches();
    assert.equal(h.els.replaceAllButton.disabled,true);
    assert.match(h.els.findCount.textContent,/5000\+/);
  });
  test(variant+': UI is localized, initially hidden and editor data stays local',()=>{
    assert.match(source,/class="document-find-row document-search-row"/);
    assert.match(source,/class="document-find-row document-search-row"/);
    assert.match(source,/class="document-find-row document-replace-row"/);
    for(const id of ['findPrevious','findNext']) {
      assert.match(source,new RegExp('class="document-step" id="'+id+'"[^>]*data-i18n-aria="find(?:Previous|Next)"'));
    }
    for(const id of ['replaceOneButton','replaceAllButton']) {
      assert.match(source,new RegExp('class="document-action[^"]*" id="'+id+'"'));
    }
    const css=source.match(/<style>([\s\S]*?)<\/style>/)?.[1]||'';
    assert.match(css,/\.document-step\s*\{[^}]*border:0;[^}]*background:transparent;/);
    assert.match(css,/\.document-action\s*\{[^}]*border:0;[^}]*background:transparent;/);
    assert.match(css,/\.document-action-all\s*\{\s*color:var\(--accent\);/);
    assert.doesNotMatch(css,/\.document-find-row \.button/);
    assert.match(source,/id="documentPanel" hidden/);
    assert.match(source,/id="mobileDocumentToolsButton"[^>]*aria-expanded="false"/);
    assert.match(source,/class="document-tabs"[^>]*data-i18n-aria="documentTools"/);
    assert.match(source,/els\.mobileDocumentToolsButton\.addEventListener/);
    assert.match(source,/id="outlineTab"[^>]*role="tab"/);
    assert.match(source,/id="findCount"[^>]*aria-live="polite"/);
    assert.match(source,/data-i18n-placeholder="findLabel"/);
    assert.match(source,/data-i18n-placeholder="replaceLabel"/);
    assert.match(source,/els\.findNext\.addEventListener/);
    assert.match(source,/els\.replaceAllButton\.addEventListener/);
    assert.doesNotMatch(source,/state\.findInput/);
  });
}
