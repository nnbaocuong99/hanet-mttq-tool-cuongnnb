'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../core.js');
const headers = ['Họ tên','MSNV','Phòng ban','Chức vụ','08-09'];
function pages() {
  return Array.from({length:6}, (_, p) => ({page:p+1,totalPages:6,pageSize:50,headers:[...headers],records:Array.from({length:p === 5 ? 26 : 50}, (_, j) => {
    const i = p * 50 + j;
    return {id:(3300000000000000000n + BigInt(i)).toString(),values:[i < 2 ? 'Hai người cùng tên' : `Thử nghiệm ${i}`,'0007',i % 2 ? 'Ban B' : 'Ban A','Chuyên viên','07:59 - 17:05']};
  })}));
}
test('giờ giảm dần, có giây, cùng giờ giữ thứ tự và giờ trống đứng cuối', () => {
  const rows = [{time:'06:12:46',id:1},{time:'07:59:42',id:2},{time:'07:59:17',id:3},{time:'07:59:42',id:4},{time:'--',id:5}];
  assert.deepEqual(C.sortArrivals(rows).map(r=>r.id), [2,4,3,1,5]);
  assert.deepEqual(C.sortArrivals(rows,'asc').map(r=>r.id), [1,3,2,4,5]);
  assert.equal(C.timeSeconds('24:00'),null); assert.equal(C.timeSeconds('07:60'),null);
  assert.equal(C.timeSeconds('7:59'),28740); assert.equal(rows[0].id,1);
});
test('ghép đủ 276 người từ 6 trang, lọc ban và giữ người trùng tên theo ID', () => {
  const data = C.assemblePages(pages(),276);
  assert.equal(data.records.length,276);
  assert.equal(C.filterDepartment(data,'Ban A').length,138);
  assert.equal(C.departmentOptions(data)[0].count,138);
  assert.equal(data.records.filter(r=>r.values[0]==='Hai người cùng tên').length,2);
  assert.equal(data.records[1].id,'3300000000000000001');
});
test('chặn file thiếu trang, thiếu người, trùng ID, khác khoảng ngày', () => {
  assert.throws(()=>C.assemblePages(pages().slice(0,5),276),/đủ/);
  assert.throws(()=>C.assemblePages(pages(),277),/276\/277/);
  const duplicate=pages(); duplicate[2].records[0]=duplicate[0].records[0];
  assert.throws(()=>C.assemblePages(duplicate,276),/trùng/);
  const changed=pages(); changed[2].headers[4]='09-09';
  assert.throws(()=>C.assemblePages(changed,276),/thời gian/);
  const short=pages(); short[0].records.pop();
  assert.throws(()=>C.assemblePages(short,275),/đủ số hàng/);
});
test('phòng ban rỗng, dấu tiếng Việt, so khớp đúng nhóm', () => {
  const data={headers,records:[{id:'1',values:['A','','Ban A','','']},{id:'2',values:['B','','Ban AA','','']},{id:'3',values:['C','','','','']},{id:'4',values:['D','','Ban Tổ chức, Kiểm tra','','']}]};
  assert.equal(C.filterDepartment(data,'Ban A').length,1);
  assert.equal(C.filterDepartment(data,'').length,1);
  assert.ok(C.departmentOptions(data).some(d=>d.label==='Chưa phân phòng ban'));
  assert.ok(C.filenamePart('Ban / A: B?').indexOf('/')<0);
});
test('tạo workbook thật, FaceID dài và chuỗi giống công thức đều là văn bản', () => {
  const out = process.env.HANET_TEST_OUTPUT || path.join(__dirname,'generated');
  fs.mkdirSync(out,{recursive:true});
  const bytes=C.makeXlsx([{name:'Kiểm thử',rows:[['FaceID','Họ tên','MSNV','Nội dung'],['3300000000000000001','Nguyễn thử nghiệm','0007','=HYPERLINK("x")'],['3300000000000000002','Đặng & <Bình>','0008','+SUM(1,2)']]},{name:'Thông tin',filter:false,rows:[['Trường','Giá trị'],['Dữ liệu','Hoàn toàn giả lập']]}]);
  assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50);
  fs.writeFileSync(path.join(out,'xlsx-validation.xlsx'),bytes);
});
