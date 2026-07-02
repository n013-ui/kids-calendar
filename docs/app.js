const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

let state = {
  events: [],
  children: [],
  child: localStorage.getItem('selectedChild') || '',
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth() + 1,
  selected: null // {year, month, day}
};

const childSelect = document.getElementById('childSelect');
const monthLabel = document.getElementById('monthLabel');
const weekdayRow = document.getElementById('weekdayRow');
const calendarGrid = document.getElementById('calendarGrid');
const agendaLabel = document.getElementById('agendaLabel');
const agendaList = document.getElementById('agendaList');

function today() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

async function loadData() {
  const [childrenRes, eventsRes] = await Promise.all([
    apiGet('children'),
    apiGet('list')
  ]);
  state.children = childrenRes.success ? childrenRes.children : [];
  state.events = eventsRes.success ? eventsRes.events : [];

  if (!state.child || !state.children.includes(state.child)) {
    state.child = state.children[0] || '';
  }
  renderChildSelect();
  renderAll();
}

function renderChildSelect() {
  childSelect.innerHTML = '';
  if (state.children.length === 0) {
    const opt = el('option', null, '尚無行事');
    childSelect.appendChild(opt);
    childSelect.disabled = true;
    return;
  }
  childSelect.disabled = false;
  state.children.forEach(name => {
    const opt = el('option', null, name);
    opt.value = name;
    if (name === state.child) opt.selected = true;
    childSelect.appendChild(opt);
  });
}

function eventsFor(year, month, day) {
  return state.events
    .filter(ev => ev.ChildName === state.child && ev.Year === year && ev.Month === month && ev.Day === day)
    .sort((a, b) => (a.StartTime || '').localeCompare(b.StartTime || ''));
}

function eventsForMonth(year, month) {
  return state.events.filter(ev => ev.ChildName === state.child && ev.Year === year && ev.Month === month);
}

function renderAll() {
  monthLabel.textContent = `${state.viewYear} 年 ${state.viewMonth} 月`;
  renderWeekdayRow();
  renderCalendar();
  if (!state.selected) state.selected = today();
  renderAgenda();
}

function renderWeekdayRow() {
  weekdayRow.innerHTML = '';
  WEEKDAYS.forEach(w => weekdayRow.appendChild(el('div', 'weekday', w)));
}

function renderCalendar() {
  calendarGrid.innerHTML = '';
  const { viewYear, viewMonth } = state;
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
  const total = daysInMonth(viewYear, viewMonth);
  const t = today();

  for (let i = 0; i < firstWeekday; i++) {
    calendarGrid.appendChild(el('div', 'day-cell empty'));
  }

  for (let day = 1; day <= total; day++) {
    const cell = el('div', 'day-cell');
    cell.appendChild(el('div', null, String(day)));

    const dayEvents = eventsForMonth(viewYear, viewMonth).filter(ev => ev.Day === day);
    if (dayEvents.length > 0) {
      const allDone = dayEvents.every(ev => ev.Done);
      if (allDone) {
        cell.appendChild(el('div', 'check', '✓'));
      } else {
        const dotRow = el('div', 'dot-row');
        dayEvents.slice(0, 4).forEach(() => {
          const dot = el('div', 'dot');
          dot.style.background = childColor(state.child);
          dotRow.appendChild(dot);
        });
        cell.appendChild(dotRow);
      }
    }

    if (viewYear === t.year && viewMonth === t.month && day === t.day) cell.classList.add('today');
    if (state.selected && state.selected.year === viewYear && state.selected.month === viewMonth && state.selected.day === day) {
      cell.classList.add('selected');
    }

    cell.addEventListener('click', () => {
      state.selected = { year: viewYear, month: viewMonth, day };
      renderCalendar();
      renderAgenda();
    });

    calendarGrid.appendChild(cell);
  }
}

function renderAgenda() {
  const { year, month, day } = state.selected;
  agendaLabel.textContent = `${month} 月 ${day} 日 的行事`;
  agendaList.innerHTML = '';

  if (!state.child) {
    agendaList.appendChild(el('div', 'empty-msg', '目前還沒有安排的行事'));
    return;
  }

  const list = eventsFor(year, month, day);
  if (list.length === 0) {
    agendaList.appendChild(el('div', 'empty-msg', '今天沒有安排 🎉'));
    return;
  }

  list.forEach(ev => {
    const card = el('div', 'event-card' + (ev.Done ? ' done' : ''));
    card.style.borderLeftColor = childColor(ev.ChildName);

    const time = el('div', 'time', ev.StartTime && ev.EndTime ? `${ev.StartTime}\n${ev.EndTime}` : (ev.StartTime || ''));
    time.style.whiteSpace = 'pre-line';
    card.appendChild(time);

    const body = el('div');
    body.appendChild(el('div', 'title', ev.Title));
    if (ev.Note) body.appendChild(el('div', 'note', ev.Note));
    card.appendChild(body);

    const checkBtn = el('button', 'check-btn', ev.Done ? '✓' : '');
    checkBtn.addEventListener('click', () => toggleEvent(ev, card, checkBtn));
    card.appendChild(checkBtn);

    agendaList.appendChild(card);
  });
}

async function toggleEvent(ev, card, checkBtn) {
  const newDone = !ev.Done;
  ev.Done = newDone;
  card.classList.toggle('done', newDone);
  checkBtn.textContent = newDone ? '✓' : '';
  renderCalendar();

  const res = await apiPost({ action: 'toggle', id: ev.ID, done: newDone });
  if (!res.success) {
    ev.Done = !newDone;
    card.classList.toggle('done', ev.Done);
    checkBtn.textContent = ev.Done ? '✓' : '';
    alert('打勾失敗，請檢查網路連線後再試一次');
  }
}

childSelect.addEventListener('change', () => {
  state.child = childSelect.value;
  localStorage.setItem('selectedChild', state.child);
  renderAll();
});

document.getElementById('prevMonth').addEventListener('click', () => {
  state.viewMonth--;
  if (state.viewMonth < 1) { state.viewMonth = 12; state.viewYear--; }
  renderAll();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  state.viewMonth++;
  if (state.viewMonth > 12) { state.viewMonth = 1; state.viewYear++; }
  renderAll();
});

document.getElementById('todayBtn').addEventListener('click', () => {
  const t = today();
  state.viewYear = t.year;
  state.viewMonth = t.month;
  state.selected = t;
  renderAll();
});

document.getElementById('refreshBtn').addEventListener('click', loadData);

loadData();
