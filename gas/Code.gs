/**
 * 小孩行事曆 - Google Apps Script 後端
 *
 * Sheet 結構（Events 分頁，會自動建立）：
 * ID | ChildName | Year | Month | Day | StartTime | EndTime | Title | Note | Done | UpdatedAt
 *
 * 部署方式：部署 > 新增部署作業 > 類型「網頁應用程式」
 *   執行身分：我
 *   誰可以存取：所有人
 *
 * 記得到「專案設定 > Script Properties」新增 ADMIN_PASSWORD，
 * 媽媽後台頁面登入、新增/編輯/刪除行事都需要這組密碼；
 * 小孩打勾完成不需要密碼。
 */

const SHEET_NAME = 'Events';
const HEADERS = ['ID', 'ChildName', 'Year', 'Month', 'Day', 'StartTime', 'EndTime', 'Title', 'Note', 'Done', 'UpdatedAt'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getAdminPassword_() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '';
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function formatTime_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm');
  }
  return v || '';
}

function readAllEvents_() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(row => row[0])
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      obj.Done = obj.Done === true || obj.Done === 'TRUE' || obj.Done === 'true';
      obj.Year = Number(obj.Year);
      obj.Month = Number(obj.Month);
      obj.Day = Number(obj.Day);
      obj.StartTime = formatTime_(obj.StartTime);
      obj.EndTime = formatTime_(obj.EndTime);
      obj.UpdatedAt = obj.UpdatedAt ? new Date(obj.UpdatedAt).toISOString() : '';
      return obj;
    });
}

function findRowById_(sheet, id) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function requireAuth_(body) {
  const pw = getAdminPassword_();
  if (!pw) throw new Error('尚未設定 ADMIN_PASSWORD，請先到 Script Properties 設定');
  if (body.password !== pw) throw new Error('密碼錯誤');
}

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'list';
  if (action === 'list') {
    return jsonOut_({ success: true, events: readAllEvents_() });
  }
  if (action === 'children') {
    const children = Array.from(new Set(readAllEvents_().map(ev => ev.ChildName).filter(Boolean))).sort();
    return jsonOut_({ success: true, children: children });
  }
  return jsonOut_({ success: false, error: '未知的 action' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ success: false, error: '無法解析請求內容' });
  }

  try {
    switch (body.action) {
      case 'toggle': return handleToggle_(body);
      case 'checkPassword': return handleCheckPassword_(body);
      case 'addEvent': return handleAdd_(body);
      case 'updateEvent': return handleUpdate_(body);
      case 'deleteEvent': return handleDelete_(body);
      default: return jsonOut_({ success: false, error: '未知的 action' });
    }
  } catch (err) {
    return jsonOut_({ success: false, error: String(err.message || err) });
  }
}

function handleCheckPassword_(body) {
  requireAuth_(body);
  return jsonOut_({ success: true });
}

function handleToggle_(body) {
  const sheet = getSheet_();
  const row = findRowById_(sheet, body.id);
  if (row === -1) return jsonOut_({ success: false, error: '找不到這筆行事' });
  sheet.getRange(row, HEADERS.indexOf('Done') + 1).setValue(!!body.done);
  sheet.getRange(row, HEADERS.indexOf('UpdatedAt') + 1).setValue(new Date());
  return jsonOut_({ success: true });
}

function handleAdd_(body) {
  requireAuth_(body);
  if (!body.childName || !body.year || !body.month || !body.day || !body.title) {
    return jsonOut_({ success: false, error: '缺少必填欄位' });
  }
  const sheet = getSheet_();
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    body.childName,
    Number(body.year),
    Number(body.month),
    Number(body.day),
    body.startTime || '',
    body.endTime || '',
    body.title,
    body.note || '',
    false,
    new Date()
  ]);
  return jsonOut_({ success: true, id: id });
}

function handleUpdate_(body) {
  requireAuth_(body);
  const sheet = getSheet_();
  const row = findRowById_(sheet, body.id);
  if (row === -1) return jsonOut_({ success: false, error: '找不到這筆行事' });

  const fieldMap = {
    childName: 'ChildName', year: 'Year', month: 'Month', day: 'Day',
    startTime: 'StartTime', endTime: 'EndTime', title: 'Title', note: 'Note'
  };
  Object.keys(fieldMap).forEach(key => {
    if (body[key] !== undefined) {
      sheet.getRange(row, HEADERS.indexOf(fieldMap[key]) + 1).setValue(body[key]);
    }
  });
  sheet.getRange(row, HEADERS.indexOf('UpdatedAt') + 1).setValue(new Date());
  return jsonOut_({ success: true });
}

function handleDelete_(body) {
  requireAuth_(body);
  const sheet = getSheet_();
  const row = findRowById_(sheet, body.id);
  if (row === -1) return jsonOut_({ success: false, error: '找不到這筆行事' });
  sheet.deleteRow(row);
  return jsonOut_({ success: true });
}
