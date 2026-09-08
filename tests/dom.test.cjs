'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require(process.env.HANET_JSDOM_PATH || 'jsdom');
const root=path.resolve(__dirname,'..');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,timeout=25000){const start=Date.now();while(Date.now()-start<timeout){const result=fn();if(result)return result;await delay(75);}throw new Error('Hết thời gian đợi: '+fn.toString());}
function create(route){
  const html=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  const dom=new JSDOM(html,{url:'https://fixture.invalid/997606/'+route,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,blobs=[];w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.Blob=Blob;
  w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:fixture-'+blobs.length;};w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){if(!this.download)throw new Error('Không cho phép điều hướng ngoài fixture.');};
  for(const file of ['tests/fixture.js','core.js','dom.js','content.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
  return {dom,w,doc:w.document,blobs};
}
const panel=doc=>doc.querySelector('#hanet-mttq-helper')?.shadowRoot;
test('giao diện đọc 6 trang, đợi bảng đổi, lọc đúng 22 người, xuất và hủy cache khi đổi ngày',async()=>{
  const {dom,w,doc,blobs}=create('person/checkin');
  try{
    const ui=await until(()=>panel(doc));
    assert.equal(ui.querySelector('#export').disabled,true);
    ui.querySelector('#read').click();
    await until(()=>!ui.querySelector('#read').disabled && ui.querySelector('#status').textContent.includes('Đã đọc đủ'));
    assert.match(ui.querySelector('#status').textContent,/276 FaceID · 6 trang/);
    assert.equal(doc.querySelector('#page-label').textContent,'Trang 1 / 6');
    const select=ui.querySelector('#department');
    const option=Array.from(select.options).find(o=>o.dataset.department==='Ban Tổ chức, Kiểm tra');
    assert.ok(option);assert.match(option.textContent,/22 FaceID/);
    select.value=option.value;select.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(ui.querySelectorAll('tbody tr').length,6);
    assert.equal(ui.querySelector('#export').disabled,false);
    ui.querySelector('#export').click();
    assert.equal(blobs.length,1);
    const output=process.env.HANET_TEST_OUTPUT||path.join(__dirname,'generated');fs.mkdirSync(output,{recursive:true});
    fs.writeFileSync(path.join(output,'ui-export-validation.xlsx'),Buffer.from(await blobs[0].arrayBuffer()));
    doc.querySelector('#next-period').click();
    await until(()=>ui.querySelector('#export').disabled);
    assert.equal(ui.querySelector('#department').disabled,true);
  }finally{dom.window.close();}
});
test('Hủy khi đang đọc không để lại dữ liệu xuất một phần',async()=>{
  const {dom,doc}=create('person/checkin');
  try{
    const ui=await until(()=>panel(doc));ui.querySelector('#read').click();await delay(250);ui.querySelector('#cancel').click();
    await until(()=>!ui.querySelector('#read').disabled);
    assert.equal(ui.querySelector('#export').disabled,true);assert.match(ui.querySelector('#status').textContent,/hủy/);
  }finally{dom.window.close();}
});
test('sắp xếp toàn bộ 168 người, đổi chiều, thẻ tóm tắt và đổi ngày',async()=>{
  const {dom,w,doc}=create('dashboard');
  try{
    const ui=await until(()=>panel(doc));ui.querySelector('#read').click();
    await until(()=>!ui.querySelector('#read').disabled && ui.querySelector('#status').textContent.includes('Đã sắp xếp đủ'));
    assert.match(ui.querySelector('#status').textContent,/168 FaceID/);
    assert.equal(doc.querySelector('[role=dialog]'),null);
    const card=doc.querySelector('.card');
    let summary=Array.from(card.children).find(el=>el.shadowRoot)?.shadowRoot;
    assert.equal(summary.querySelector('time').textContent,'07:59:42');
    assert.equal(card.querySelector('.native-early').style.display,'none');
    card.click();await until(()=>doc.querySelector('.all-arrivals').style.display==='flex');
    const rows=Array.from(doc.querySelectorAll('.all-arrivals>[role=button]'));
    assert.equal(rows.length,168);
    const first=rows.slice().sort((a,b)=>Number(a.style.order)-Number(b.style.order))[0];
    assert.equal(first.querySelector('p').textContent,'07:59:42');
    const select=Array.from(doc.querySelector('.sheet').children).find(el=>el.shadowRoot).shadowRoot.querySelector('select');
    select.value='asc';select.dispatchEvent(new w.Event('change',{bubbles:true}));await delay(250);
    assert.equal(rows[0].style.order,'0');
    summary=Array.from(card.children).find(el=>el.shadowRoot)?.shadowRoot;
    assert.equal(summary.querySelector('time').textContent,'06:00:00');
    doc.querySelector('.sheet>button').click();doc.querySelector('#day').click();await delay(400);
    assert.equal(card.querySelector('.native-early').style.display,'');
    assert.match(ui.querySelector('#status').textContent,/thay đổi/);
  }finally{dom.window.close();}
});
