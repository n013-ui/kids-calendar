let adminPassword = localStorage.getItem('adminPassword') || '';
let events = [];
let editingId = null;

const loginView = document.getElementById('loginView');
const adminView = document.getElementById('adminView');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

async function tryLogin(pw) {
  const res = await apiPost({ action: 'checkPassword', password: pw });
  if (res.success) {
    adminPassword = pw;
    localStorage.setItem('adminPassword', pw);
    showAdmin();
  } else {
    loginError.style.display = 'block';
  }
}

document.getElementById('loginBtn').addEventListener('click', () => tryLogin(passwordInput.value));
passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(passwordInput.value); });

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('adminPassword');
  adminPassword = '';
  adminView.style.display = 'none';
  loginView.style.display = 'block';
});

async function showAdmin() {
  loginView.style.display = 'none';
  adminView.style.display = 'block';
  await loadEvents();
}

async function loadEvents() {
  const res = await apiGet('list');
  events = res.success ? res.events : [];
  populateChildDatalist();
  renderTable();
}

function populateChildDatalist() {
  const names = Array.from(new Set(events.map(ev => ev.ChildName))).sort();
  const childList = document.getElementById('childList');
  const filterChild = document.getElementById('filterChild');
  childList.innerHTML = '';
  names.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    childList.appendChild(opt);
  });

  const prevFilter = filterChild.value;
  filterChild.innerHTML = '<option value="">全部小孩</option>';
  names.forEach(n => {
    const opt = el('option', null, n);
    opt.value = n;
    filterChild.appendChild(opt);
  });
  filterChild.value = prevFilter;
}

function renderTable() {
  const tbody = document.getElementById('eventTableBody');
  tbody.innerHTML = '';
  const childFilter = document.getElementById('filterChild').value;
  const search = document.getElementById('filterSearch').value.trim().toLowerCase();

  const sorted = events
    .filter(ev => !childFilter || ev.ChildName === childFilter)
    .filter(ev => !search || ev.Title.toLowerCase().includes(search))
    .sort((a, b) => {
      const da = `${a.Year}-${pad2(a.Month)}-${pad2(a.Day)} ${a.StartTime}`;
      const db = `${b.Year}-${pad2(b.Month)}-${pad2(b.Day)} ${b.StartTime}`;
      return da.localeCompare(db);
    });

  if (sorted.length === 0) {
    const tr = document.createElement('tr');
    const td = el('td', null, '沒有符合的行事');
    td.colSpan = 7;
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  sorted.forEach(ev => {
    const tr = document.createElement('tr');
    if (ev.Done) tr.classList.add('done');

    tr.appendChild(el('td', null, ev.ChildName));
    tr.appendChild(el('td', null, `${ev.Year}/${pad2(ev.Month)}/${pad2(ev.Day)}`));
    tr.appendChild(el('td', null, [ev.StartTime, ev.EndTime].filter(Boolean).join('-')));
    tr.appendChild(el('td', null, ev.Title));
    tr.appendChild(el('td', null, ev.Note || ''));
    tr.appendChild(el('td', null, ev.Done ? '✅' : ''));

    const actionsTd = document.createElement('td');
    actionsTd.className = 'row-actions';
    const editBtn = el('button', 'secondary', '編輯');
    editBtn.addEventListener('click', () => startEdit(ev));
    const delBtn = el('button', 'secondary', '刪除');
    delBtn.addEventListener('click', () => deleteEvent(ev));
    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);
  });
}

function startEdit(ev) {
  editingId = ev.ID;
  document.getElementById('fChildName').value = ev.ChildName;
  document.getElementById('fDate').value = dateKey(ev.Year, ev.Month, ev.Day);
  document.getElementById('fStart').value = ev.StartTime || '';
  document.getElementById('fEnd').value = ev.EndTime || '';
  document.getElementById('fTitle').value = ev.Title;
  document.getElementById('fNote').value = ev.Note || '';
  document.getElementById('submitBtn').textContent = '儲存修改';
  document.getElementById('cancelEditBtn').style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  editingId = null;
  document.getElementById('eventForm').reset();
  document.getElementById('submitBtn').textContent = '新增行事';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

document.getElementById('cancelEditBtn').addEventListener('click', resetForm);

document.getElementById('eventForm').addEventListener('submit', async e => {
  e.preventDefault();
  const [year, month, day] = document.getElementById('fDate').value.split('-').map(Number);
  const payload = {
    password: adminPassword,
    childName: document.getElementById('fChildName').value.trim(),
    year, month, day,
    startTime: document.getElementById('fStart').value,
    endTime: document.getElementById('fEnd').value,
    title: document.getElementById('fTitle').value.trim(),
    note: document.getElementById('fNote').value.trim()
  };

  let res;
  if (editingId) {
    res = await apiPost({ action: 'updateEvent', id: editingId, ...payload });
  } else {
    res = await apiPost({ action: 'addEvent', ...payload });
  }

  if (res.success) {
    resetForm();
    await loadEvents();
  } else {
    alert('儲存失敗：' + (res.error || '未知錯誤'));
  }
});

async function deleteEvent(ev) {
  if (!confirm(`確定要刪除「${ev.Title}」嗎？`)) return;
  const res = await apiPost({ action: 'deleteEvent', id: ev.ID, password: adminPassword });
  if (res.success) {
    await loadEvents();
  } else {
    alert('刪除失敗：' + (res.error || '未知錯誤'));
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadEvents);
document.getElementById('filterChild').addEventListener('change', renderTable);
document.getElementById('filterSearch').addEventListener('input', renderTable);

if (adminPassword) {
  tryLogin(adminPassword);
} else {
  loginView.style.display = 'block';
}
