(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.HanetMttqDOM = factory(root.HanetMttqCore);
})(typeof window === 'undefined' ? this : window, function (Core) {
  'use strict';
  const clean = Core.clean;
  const text = el => clean(el?.textContent);
  function findTable(doc) {
    return Array.from(doc.querySelectorAll('main table')).find(t => {
      const headers = Array.from(t.tHead?.rows?.[0]?.cells || [], text);
      return ['Họ tên', 'MSNV', 'Phòng ban', 'Chức vụ'].every(h => headers.includes(h)) && headers.some(h => /^\d{2}-\d{2}$/.test(h));
    }) || null;
  }
  function pager(doc) {
    const sizeControl = doc.querySelector('#rows-per-page');
    if (!sizeControl) throw new Error('Chưa tìm thấy điều khiển phân trang của HANET.');
    let container = sizeControl.parentElement;
    for (let depth = 0; container && depth < 6; depth++, container = container.parentElement) {
      const label = Array.from(container.querySelectorAll('div,span,p')).find(e => !e.children.length && /^Trang\s+\d+\s*\/\s*\d+$/.test(text(e)));
      if (!label) continue;
      const match = text(label).match(/^Trang\s+(\d+)\s*\/\s*(\d+)$/);
      const button = className => container.querySelector(`svg.${className}`)?.closest('button') || null;
      const pageSize = Number(text(sizeControl));
      if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('Không đọc được số hàng trên mỗi trang.');
      return {page: Number(match[1]), totalPages: Number(match[2]), pageSize, first: button('lucide-chevrons-left'), next: button('lucide-chevron-right')};
    }
    throw new Error('Không đọc được số trang.');
  }
  function readPage(doc, placeId) {
    const table = findTable(doc);
    if (!table) throw new Error('Chưa tìm thấy bảng Vào ra.');
    const headers = Array.from(table.tHead.rows[0].cells, text), indices = headers.map((h, i) => h === 'Ảnh' ? -1 : i).filter(i => i >= 0);
    const dataRows = Array.from(table.tBodies).flatMap(body => Array.from(body.rows));
    const records = dataRows.map(row => {
      const cells = Array.from(row.cells);
      if (cells.length !== headers.length) throw new Error('Bảng đang tải hoặc không có hàng dữ liệu.');
      const link = row.querySelector(`a[href^="/${placeId}/person/face/"]`);
      const id = link?.getAttribute('href')?.match(/\/person\/face\/(\d+)(?:[/?#]|$)/)?.[1];
      if (!id) throw new Error('Không xác định được mã FaceID của một hàng.');
      return {id, values: indices.map(i => text(cells[i]))};
    });
    const {page, totalPages, pageSize} = pager(doc);
    return {headers: indices.map(i => headers[i]), records, page, totalPages, pageSize};
  }
  function rosterCount(doc, placeId) {
    const link = doc.querySelector(`a[href="/${placeId}/person/face"]`);
    const match = text(link).match(/Danh sách\s*(\d+)$/);
    return match ? Number(match[1]) : null;
  }
  function earlyCard(doc) {
    const p = Array.from(doc.querySelectorAll('main p')).find(e => text(e) === 'FaceID đi sớm');
    return p?.closest('[role="button"]') || null;
  }
  function earlyDialog(doc) {
    return Array.from(doc.querySelectorAll('[role="dialog"]')).find(d => Array.from(d.querySelectorAll('h2')).some(h => text(h) === 'FaceID đi sớm')) || null;
  }
  function readEarlyDialog(doc) {
    const dialog = earlyDialog(doc);
    if (!dialog) return null;
    const items = Array.from(dialog.querySelectorAll('[role="button"]')).map(node => {
      const paragraphs = Array.from(node.querySelectorAll('p'));
      return {node, time: text(paragraphs[0]), name: text(paragraphs[paragraphs.length - 1])};
    }).filter(row => row.name && Core.timeSeconds(row.time) !== null);
    return {dialog, items};
  }
  function dashboardKey(doc) {
    const card = earlyCard(doc);
    const header = card?.firstElementChild;
    const count = header ? Array.from(header.querySelectorAll('p')).map(text).find(t => /^\d+$/.test(t)) : null;
    const dateControl = Array.from(doc.querySelectorAll('main button')).find(b => /^\d{2}\/\d{2}\/\d{4}$/.test(text(b)));
    return {date: text(dateControl), count: count === null ? null : Number(count)};
  }
  return {text, findTable, pager, readPage, rosterCount, earlyCard, earlyDialog, readEarlyDialog, dashboardKey};
});
