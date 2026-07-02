// 共用工具：GAS 呼叫 + 日期/顏色小工具

async function apiGet(action, params) {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

// 用 text/plain 送出，避免瀏覽器發出 CORS 預檢請求（Apps Script 不處理 OPTIONS）
async function apiPost(payload) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.json();
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dateKey(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

const CHILD_COLORS = ['#ffb4a2', '#a2d2ff', '#b8f2e6', '#ffd6a5', '#caffbf', '#e2b6ff'];

function childColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return CHILD_COLORS[hash % CHILD_COLORS.length];
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
