const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
test('main informational footer hides in existing smartphone layouts',()=>assert.ok(source.includes("@media (max-width: 720px) { body > footer { display: none; } }")));
test('both local labels use canonical wording',()=>{assert.doesNotMatch(source,/Completely local processing/);assert.match(source,/localOnly:'Fully local processing'/);assert.match(source,/mobileLocal:'Fully local processing'/);});
