(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HanetMttqCore = api;
})(typeof window === 'undefined' ? this : window, function () {
  'use strict';
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  function timeSeconds(value) {
    const match = clean(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    const [h, m, s] = [Number(match[1]), Number(match[2]), Number(match[3] || 0)];
    return h < 24 && m < 60 && s < 60 ? h * 3600 + m * 60 + s : null;
  }
  function sortArrivals(rows, direction = 'desc') {
    return rows.map((row, index) => ({row, index, t: timeSeconds(row.time)})).sort((a, b) => {
      if (a.t === null) return b.t === null ? a.index - b.index : 1;
      if (b.t === null) return -1;
      return (direction === 'asc' ? a.t - b.t : b.t - a.t) || a.index - b.index;
    }).map(item => item.row);
  }
  function assemblePages(pages, expectedCount) {
    if (!pages.length) throw new Error('Chưa đọc được trang dữ liệu nào.');
    const first = pages[0];
    if (pages.length !== first.totalPages) throw new Error('Chưa đọc đủ tất cả các trang.');
    const records = [], ids = new Set();
    pages.forEach((page, index) => {
      if (page.page !== index + 1 || page.totalPages !== first.totalPages || page.pageSize !== first.pageSize)
        throw new Error('Phân trang thay đổi trong lúc đọc. Vui lòng đọc lại.');
      if (JSON.stringify(page.headers) !== JSON.stringify(first.headers))
        throw new Error('Khoảng thời gian thay đổi trong lúc đọc. Vui lòng đọc lại.');
      if (index < pages.length - 1 && page.records.length !== first.pageSize)
        throw new Error('Một trang chưa tải đủ số hàng. Vui lòng đọc lại.');
      if (page.records.length > first.pageSize || (pages.length > 1 && !page.records.length))
        throw new Error('Số hàng trên trang không hợp lệ.');
      page.records.forEach(record => {
        if (!record.id || typeof record.id !== 'string') throw new Error('Thiếu mã FaceID.');
        if (ids.has(record.id)) throw new Error('Có FaceID trùng giữa các trang. Vui lòng đọc lại.');
        if (record.values.length !== first.headers.length) throw new Error('Số cột dữ liệu không khớp.');
        ids.add(record.id);
        records.push(record);
      });
    });
    if (Number.isInteger(expectedCount) && expectedCount !== records.length)
      throw new Error(`Chỉ đọc được ${records.length}/${expectedCount} FaceID. Chưa thể xuất; hãy xóa bộ lọc tìm kiếm và đọc lại.`);
    return {headers: first.headers.slice(), records};
  }
  function departmentOptions(dataset) {
    const index = dataset.headers.indexOf('Phòng ban');
    if (index < 0) throw new Error('Không có cột Phòng ban.');
    const counts = new Map();
    dataset.records.forEach(r => {const d = clean(r.values[index]); counts.set(d, (counts.get(d) || 0) + 1);});
    return Array.from(counts, ([value, count]) => ({value, count, label: value || 'Chưa phân phòng ban'}))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }
  function filterDepartment(dataset, department) {
    const index = dataset.headers.indexOf('Phòng ban');
    if (index < 0) throw new Error('Không có cột Phòng ban.');
    return dataset.records.filter(r => clean(r.values[index]) === department);
  }
  function filenamePart(value) {
    return clean(value).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').slice(0, 105) || 'Chua_phan_phong_ban';
  }
  const xml = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  function columnName(index) {
    let name = '';
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name;
    return name;
  }
  const encoder = new TextEncoder();
  const crcTable = Array.from({length: 256}, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
    return (crc ^ 0xffffffff) >>> 0;
  }
  function zipStore(files) {
    const localParts = [], centralParts = [];
    let offset = 0, centralSize = 0;
    for (const [name, source] of Object.entries(files)) {
      const nameBytes = encoder.encode(name), data = encoder.encode(source), crc = crc32(data);
      const local = new Uint8Array(30 + nameBytes.length), lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true);
      lv.setUint16(12, 33, true); lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true); lv.setUint16(26, nameBytes.length, true); local.set(nameBytes, 30);
      localParts.push(local, data);
      const central = new Uint8Array(46 + nameBytes.length), cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x800, true); cv.setUint16(14, 33, true); cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true); central.set(nameBytes, 46);
      centralParts.push(central); centralSize += central.length; offset += local.length + data.length;
    }
    const end = new Uint8Array(22), ev = new DataView(end.buffer), count = centralParts.length;
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, count, true); ev.setUint16(10, count, true);
    ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
    const output = new Uint8Array(offset + centralSize + end.length); let cursor = 0;
    for (const part of [...localParts, ...centralParts, end]) {output.set(part, cursor); cursor += part.length;}
    return output;
  }
  function makeXlsx(sheets) {
    if (!sheets.length) throw new Error('Thiếu bảng xuất.');
    const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const sheetNS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const relNS = 'http://schemas.openxmlformats.org/package/2006/relationships';
    const officeRel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const files = {};
    files['[Content_Types].xml'] = declaration + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>';
    files['_rels/.rels'] = declaration + `<Relationships xmlns="${relNS}"><Relationship Id="rId1" Type="${officeRel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    files['xl/workbook.xml'] = declaration + `<workbook xmlns="${sheetNS}" xmlns:r="${officeRel}"><sheets>` + sheets.map((sheet, i) => `<sheet name="${xml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>';
    files['xl/_rels/workbook.xml.rels'] = declaration + `<Relationships xmlns="${relNS}">` + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${officeRel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + `<Relationship Id="rId${sheets.length + 1}" Type="${officeRel}/styles" Target="styles.xml"/></Relationships>`;
    files['xl/styles.xml'] = declaration + `<styleSheet xmlns="${sheetNS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123E75"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="top"/></xf><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    sheets.forEach((sheet, sheetIndex) => {
      const rows = sheet.rows, width = Math.max(1, ...rows.map(r => r.length));
      if (rows.length > 1048576 || width > 16384) throw new Error('Bảng vượt giới hạn Excel.');
      const range = `A1:${columnName(width - 1)}${Math.max(1, rows.length)}`;
      const columns = Array.from({length: width}, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${sheet.widths?.[i] || 18}" customWidth="1"/>`).join('');
      // Every cell is explicitly text: preserve long IDs and prevent formula execution.
      const body = rows.map((row, ri) => `<row r="${ri + 1}"${ri === 0 ? ' ht="28" customHeight="1"' : ''}>` + row.map((value, ci) => `<c r="${columnName(ci)}${ri + 1}" t="inlineStr" s="${ri === 0 ? 1 : 0}"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join('') + '</row>').join('');
      files[`xl/worksheets/sheet${sheetIndex + 1}.xml`] = declaration + `<worksheet xmlns="${sheetNS}"><dimension ref="${range}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${columns}</cols><sheetData>${body}</sheetData>${sheet.filter === false ? '' : `<autoFilter ref="${range}"/>`}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
    });
    return zipStore(files);
  }
  return {clean, timeSeconds, sortArrivals, assemblePages, departmentOptions, filterDepartment, filenamePart, makeXlsx};
});
