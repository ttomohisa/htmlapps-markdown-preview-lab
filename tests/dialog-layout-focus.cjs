// Actual app handlers in a minimal DOM adapter. CSS assertions are contracts, not geometry proof.
// Native viewport evidence is recorded separately in the audit.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const variants = process.env.SOURCE_ONLY ? ['src/index.template.html'] : ['src/index.template.html','dist/index.html','dist/index.self-extract.html','markdown-preview-lab.html'];
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,start);return source.slice(a,b);}
function harness(source){
  let focused=null, modal=null; const frames=[];
  const node=(id)=>({id,isConnected:true,disabled:false,visible:true,value:'current',selectionStart:1,selectionEnd:3,open:false,listeners:{},dataset:{},classList:{toggle(){}},getClientRects(){return this.visible?[{}]:[];},focus(){if(this.visible&&this.isConnected&&!this.disabled)focused=this;},setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;},addEventListener(k,fn){this.listeners[k]=fn;},showModal(){this.open=true;modal=this;},close(){this.open=false;if(modal===this)modal=null;}});
  const els={editor:node('editor'),expandedEditor:node('expandedEditor'),expandEditorButton:node('expandEditorButton'),customCssEditor:node('customCssEditor'),customCssDialog:node('customCssDialog')};
  const mobile=node('mobilePreview'),open=node('openButton'),custom=node('customStyleButton'),github=node('githubStyle');custom.dataset.style='custom';github.dataset.style='github';
  const context=vm.createContext({els,document:{querySelector(s){if(s==='dialog[open]')return modal;if(s==='[data-mobile-view].active')return mobile;throw Error('Unexpected selector '+s);},getElementById(id){assert.equal(id,'openButton');return open;},querySelectorAll(s){assert.equal(s,'[data-style]');return[custom,github];}},requestAnimationFrame(fn){frames.push(fn);},getComputedStyle(el){return {visibility:el.visible?'visible':'hidden'};},render(){},pushHistory(){}});
  const listener=source.split('\n').find(s=>s.includes("document.querySelectorAll('[data-style]')")&&s.includes('addEventListener'));
  assert.ok(listener,'actual explicit style-control listener');
  vm.runInContext("const state={style:'github',customCss:'.md h1 { color: #16624f; }'};\n"+section(source,'    function setStyle(','    function setMode(')+section(source,'    function closeExpandedEditorSync(','    function formatEditorShortcut(')+listener,context);
  return {els,mobile,open,custom,github,context,focus:()=>focused,flush(){while(frames.length)frames.shift()();},modal(value){modal=value;},state:()=>JSON.parse(vm.runInContext('JSON.stringify(state)',context))};
}
for(const variant of variants){const source=fs.readFileSync(path.join(__dirname,'..',variant),'utf8');
 test(`${variant}: modal-only root and body overflow lock contract`,()=>{assert.match(source,/html:has\(dialog:modal\)\s*,\s*body:has\(dialog:modal\)\s*\{\s*overflow:\s*hidden/);});
 test(`${variant}: explicit Custom CSS control reopens saved CSS for editing`,()=>{const h=harness(source);h.custom.listeners.click();assert.equal(h.els.customCssDialog.open,true);assert.equal(h.els.customCssEditor.value,h.state().customCss);h.els.customCssDialog.close();h.github.listeners.click();h.custom.listeners.click();assert.equal(h.els.customCssDialog.open,true);assert.equal(h.state().style,'custom');});
 test(`${variant}: restoring a saved custom style does not open settings`,()=>{const h=harness(source);h.context.setStyle('custom');assert.equal(h.els.customCssDialog.open,false);assert.equal(h.state().customCss,'.md h1 { color: #16624f; }');});
 test(`${variant}: closing expanded editor preserves text and selection and visible editor focus`,()=>{const h=harness(source);h.els.expandedEditor.value='edited';h.context.closeExpandedEditorSync();assert.equal(h.els.editor.value,'edited');assert.equal(h.els.editor.selectionStart,1);assert.equal(h.focus(),null);h.flush();assert.equal(h.focus(),h.els.editor);});
 test(`${variant}: hidden main editor restores visible active mobile view without changing views`,()=>{const h=harness(source);h.els.editor.visible=false;h.els.expandEditorButton.visible=false;h.context.closeExpandedEditorSync();h.flush();assert.equal(h.focus(),h.mobile);});
 test(`${variant}: disabled or detached focus targets fall back to existing Open control`,()=>{const h=harness(source);h.els.editor.isConnected=false;h.els.expandEditorButton.disabled=true;h.mobile.visible=false;h.context.closeExpandedEditorSync();h.flush();assert.equal(h.focus(),h.open);});
 test(`${variant}: delayed close does not steal a newer dialog's focus`,()=>{const h=harness(source);h.context.closeExpandedEditorSync();h.modal({open:true});h.flush();assert.equal(h.focus(),null);});
 test(`${variant}: closing expanded editor has no focus side effect if every target is hidden`,()=>{const h=harness(source);[h.els.editor,h.els.expandEditorButton,h.mobile,h.open].forEach(x=>x.visible=false);h.context.closeExpandedEditorSync();h.flush();assert.equal(h.focus(),null);});
 test(`${variant}: local-processing badge retains its existing shield`,()=>{const badge=source.match(/<div class="local-badge"[\s\S]*?<\/div>/)[0];assert.match(badge,/M12 3l7 3v5c0 4\.8-2\.9 8\.2-7 10/);});
}
