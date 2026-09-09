'use strict';
const fixtureMain=document.getElementById('main');
const people=Array.from({length:276},(_,i)=>({id:(3300000000000000000n+BigInt(i)).toString(),name:i<2?'Hai người cùng tên':`Nhân sự thử nghiệm ${String(i+1).padStart(3,'0')}`,employee:String(i+1).padStart(4,'0'),department:i%13===0?'Ban Tổ chức, Kiểm tra':i%13===1?'Văn phòng - Phòng Tài chính, Kế toán':`Ban thử nghiệm ${i%13+1}`,role:'Chuyên viên'}));
function cell(row,content){const td=document.createElement('td');if(content instanceof Node)td.append(content);else td.textContent=content;row.append(td);}
if(location.pathname.endsWith('/person/checkin')){
  let page=1,pageSize=50,dates=['07-09','08-09'];
  fixtureMain.innerHTML='<div id="native-controls"><button id="date-filter">Chọn thời gian</button><input placeholder="Tìm Face" aria-label="Tìm Face"><button id="next-period">Đổi khoảng ngày (kiểm thử)</button></div><div class="table-wrap"><table><thead></thead><tbody></tbody></table></div><div class="pager"><div class="page-controls"><label for="rows-per-page">Số hàng trên mỗi trang</label><select id="rows-per-page" aria-label="Số hàng trên mỗi trang"><option>20</option><option selected>50</option></select><div id="page-label"></div><button id="first" aria-label="Trang đầu"><svg class="lucide-chevrons-left"></svg>Đầu</button><button id="next" aria-label="Trang tiếp"><svg class="lucide-chevron-right"></svg>Tiếp</button></div></div>';
  // Native HANET uses a Radix button. A selectable control with the same text is
  // sufficient for this fixture; the extension only reads its selected count.
  const size=document.getElementById('rows-per-page');
  const button=document.createElement('button');button.id=size.id;button.setAttribute('role','combobox');button.setAttribute('aria-label','Số hàng trên mỗi trang');button.textContent='50';size.replaceWith(button);
  button.onclick=()=>{pageSize=pageSize===50?20:50;button.textContent=String(pageSize);page=1;render();};
  function render(){
    const total=Math.ceil(people.length/pageSize);
    document.getElementById('page-label').textContent=`Trang ${page} / ${total}`;
    document.getElementById('first').disabled=page===1;document.getElementById('next').disabled=page===total;
    const thead=fixtureMain.querySelector('thead');thead.replaceChildren();const tr=document.createElement('tr');
    ['Ảnh','Họ tên','MSNV','Phòng ban','Chức vụ',...dates].forEach(h=>{const th=document.createElement('th');th.textContent=h;tr.append(th);});thead.append(tr);
    const body=fixtureMain.querySelector('tbody');body.replaceChildren();
    people.slice((page-1)*pageSize,page*pageSize).forEach(person=>{
      const row=document.createElement('tr'),a=document.createElement('a');a.href=`/997606/person/face/${person.id}`;a.textContent=person.name;
      cell(row,'');cell(row,a);cell(row,person.employee);cell(row,person.department);cell(row,person.role);dates.forEach((_,i)=>cell(row,i===0?'07:45 - 17:10':'07:59 - 14:30'));body.append(row);
    });
  }
  function go(newPage){page=newPage;document.getElementById('page-label').textContent=`Trang ${page} / ${Math.ceil(people.length/pageSize)}`;setTimeout(render,350);}
  document.getElementById('first').onclick=()=>go(1);document.getElementById('next').onclick=()=>go(page+1);
  document.getElementById('next-period').onclick=()=>{dates=['01-09'];page=1;render();};render();
}else{
  const arrivals=Array.from({length:168},(_,i)=>{let t=i===167?28782:21600+i*43;return {name:`Người thử nghiệm ${String(i+1).padStart(3,'0')}`,time:[Math.floor(t/3600),Math.floor(t/60)%60,t%60].map(v=>String(v).padStart(2,'0')).join(':')};});
  fixtureMain.innerHTML='<button id="day">08/09/2026</button><div class="card" role="button" tabindex="0"><div><p>FaceID đi sớm</p><p>168</p></div><div class="native-early"></div><p>Xem thêm</p></div>';
  const card=fixtureMain.querySelector('.card');
  function draw(parent,rows,role){rows.forEach(r=>{const item=document.createElement('div');if(role)item.setAttribute('role','button');const time=document.createElement('p');time.textContent=r.time;const name=document.createElement('p');name.textContent=r.name;item.append(time,name);if(role){const wrapper=document.createElement('div');wrapper.append(item);parent.append(wrapper);}else parent.append(item);});}
  draw(card.querySelector('.native-early'),arrivals.slice(0,5),false);
  card.onclick=()=>{
    if(document.querySelector('[role=dialog]'))return;
    const dialog=document.createElement('div');dialog.className='sheet';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','FaceID đi sớm');
    dialog.innerHTML='<h2>FaceID đi sớm</h2><div class="all-arrivals"></div><button>Close</button>';
    draw(dialog.querySelector('.all-arrivals'),arrivals,true);dialog.querySelector('button').onclick=()=>dialog.remove();document.body.append(dialog);
  };
  document.getElementById('day').onclick=()=>{document.getElementById('day').textContent='07/09/2026';};
}
