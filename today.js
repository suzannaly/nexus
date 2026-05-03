// today.js — Nexus Today Section
// Manages Calendar, Chores, and Tasks tabs.
// Call initToday() to render.

const TODAY_GAS_URL = 'https://script.google.com/macros/s/AKfycbxcw0Idgactfq_oG_hGIOe2H4xoDgVzLjg6uchxBg3AONOXgDwfD8WhBnJHjR9yXOQzzQ/exec';
const IMG = 'https://raw.githubusercontent.com/suzannaly/nexus/main/images/';

// ─── Image map ────────────────────────────────────────────────────────────────
const GROUP_IMAGES = {
  daily:    `${IMG}supplies.png`,
  standard: `${IMG}note.png`,
  wheel:    `${IMG}wheel.png`,
};

const ZONE_IMAGES = {
  'Kitchen':         `${IMG}kitchen.png`,
  'Bathroom':        `${IMG}bathroom.png`,
  'Upstairs':        `${IMG}bed.png`,
  'Downstairs':      `${IMG}living.png`,
  'Living Room':     `${IMG}living.png`,
  'Dining/Playroom': `${IMG}play.png`,
  'Bedroom':         `${IMG}bed.png`,
  'Girls Room':      `${IMG}girls.png`,
  'Outside':         `${IMG}energy.png`,
};



// ─── State ────────────────────────────────────────────────────────────────────
let activeTab       = 'calendar';
let calendarEvents  = [];
let choresData      = [];
let completedChores = new Set();

// Collapse state — all start closed
let openGroups = new Set();
let openZones  = new Set();

// ─── Tab switcher ─────────────────────────────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;
  renderToday();
}

// ─── Collapse toggles ─────────────────────────────────────────────────────────

function toggleGroup(group) {
  openGroups.has(group) ? openGroups.delete(group) : openGroups.add(group);
  renderToday();
}

function toggleZone(key) {
  openZones.has(key) ? openZones.delete(key) : openZones.add(key);
  renderToday();
}

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════════════════════════════════════

function getWeekDays() {
  const today  = new Date();
  const day    = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth()    === db.getMonth()    &&
         da.getDate()     === db.getDate();
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function renderCalendar() {
  const today    = new Date();
  const weekDays = getWeekDays();
  const dayNames = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

  const columns = weekDays.map((day, i) => {
    const isToday   = isSameDay(day, today);
    const dayEvents = calendarEvents.filter(e => isSameDay(e.start, day));

    const eventHTML = dayEvents.length
      ? dayEvents.map(e => `
          <div class="cal-event">
            <div class="cal-event-time">${e.allDay ? 'all day' : formatTime(e.start)}</div>
            <div class="cal-event-title">${e.title}</div>
            ${e.calendar === 'Dan' ? '<div class="cal-event-who">Dan</div>' : ''}
          </div>`).join('')
      : `<div class="cal-no-events">No events</div>`;

    return `
      <div class="cal-day ${isToday ? 'cal-day--today' : ''}">
        <div class="cal-day-header">
          <div class="cal-day-name">${dayNames[i]}</div>
          <div class="cal-day-num">${day.getDate()}</div>
        </div>
        <div class="cal-day-events">${eventHTML}</div>
      </div>`;
  }).join('');

  return `<div class="cal-grid">${columns}</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// CHORES
// ══════════════════════════════════════════════════════════════════════════════

function choreKey(row) {
  return `${row.List}-${row.Zone}-${row.Item}`;
}

function getTodayDate_chores() {
  const d = new Date();
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
}

async function completeChore(list, zone, item) {
  completedChores.add(`${list}-${zone}-${item}`);
  try {
    await fetch(TODAY_GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tab: 'Chores',
        matchColumn: 'Item',
        matchValue: item,
        updates: { LastDone: getTodayDate_chores(), Status: 'done' }
      })
    });
  } catch (err) {
    console.warn('today.js: chore write-back failed', err);
  }
  renderToday();
}

function skipChore(list, zone, item) {
  completedChores.add(`${list}-${zone}-${item}`);
  renderToday();
}

// ── Group header with image ───────────────────────────────────────────────────

function groupHeader(id, label, count, total, isOpen) {
  const img    = GROUP_IMAGES[id] || '';
  const allDone = count === total;
  return `
    <div class="chore-group-header" onclick="toggleGroup('${id}')">
      ${img ? `<img class="chore-group-img" src="${img}" alt="${label}">` : ''}
      <div class="chore-group-left">
        <span class="chore-chevron">${isOpen ? '▾' : '▸'}</span>
        <span class="chore-group-title">${label}</span>
        ${allDone ? '<span class="chore-all-done">✓</span>' : ''}
      </div>
      <span class="chore-group-count">${count}/${total}</span>
    </div>`;
}

// ── Zone header with image ────────────────────────────────────────────────────

function zoneHeader(zoneKey, zone, count, total, isOpen, monthly) {
  const img     = ZONE_IMAGES[zone] || '';
  const allDone = count === total;
  const countLabel = monthly ? `${count}/${total} this month` : `${count}/${total}`;
  return `
    <div class="chore-zone-header" onclick="event.stopPropagation();toggleZone('${zoneKey}')">
      ${img ? `<img class="chore-zone-img" src="${img}" alt="${zone}">` : ''}
      <div class="chore-group-left">
        <span class="chore-chevron chore-chevron--sm">${isOpen ? '▾' : '▸'}</span>
        <span class="chore-zone-label-text">${zone}</span>
        ${allDone ? '<span class="chore-all-done">✓</span>' : ''}
      </div>
      <span class="chore-zone-count">${countLabel}</span>
    </div>`;
}

// ── Daily Tidy ────────────────────────────────────────────────────────────────

function renderDaily() {
  const items  = choresData.filter(r => r.List === 'daily').sort((a,b) => a.Item.localeCompare(b.Item));
  if (!items.length) return '';

  const done   = items.filter(r => completedChores.has(choreKey(r))).length;
  const total  = items.length;
  const isOpen = openGroups.has('daily');

  const checklist = isOpen ? `
    <div class="chore-checklist">
      ${items.map(r => {
        const isDone = completedChores.has(choreKey(r));
        return `
          <div class="chore-check-item ${isDone ? 'chore-check-item--done' : ''}"
               onclick="completeChore('daily','Daily','${r.Item.replace(/'/g,"\\'")}')">
            <div class="chore-check-box">${isDone ? '✓' : ''}</div>
            <div class="chore-check-label">${r.Item}</div>
          </div>`;
      }).join('')}
    </div>` : '';

  return `
    <div class="chore-group">
      ${groupHeader('daily', 'Daily Tidy', done, total, isOpen)}
      ${checklist}
    </div>`;
}

// ── Standards ─────────────────────────────────────────────────────────────────

function renderStandards() {
  const items    = choresData.filter(r => r.List === 'standard');
  const zones    = [...new Set(items.map(r => r.Zone))];
  if (!zones.length) return '';

  const allDone  = items.filter(r => completedChores.has(choreKey(r))).length;
  const allTotal = items.length;
  const isOpen   = openGroups.has('standard');

  const zoneHTML = isOpen ? zones.map(zone => {
    const zItems   = items.filter(r => r.Zone === zone);
    const done     = zItems.filter(r => completedChores.has(choreKey(r))).length;
    const zoneKey  = `standard-${zone}`;
    const zIsOpen  = openZones.has(zoneKey);
    const zAllDone = done === zItems.length;

    const rows = zIsOpen ? `
      <div class="chore-checklist">
        ${zItems.map(r => {
          const isDone = completedChores.has(choreKey(r));
          return `
            <div class="chore-check-item ${isDone ? 'chore-check-item--done' : ''}"
                 onclick="completeChore('standard','${zone}','${r.Item.replace(/'/g,"\\'")}')">
              <div class="chore-check-box">${isDone ? '✓' : ''}</div>
              <div class="chore-check-label">${r.Item}</div>
            </div>`;
        }).join('')}
      </div>` : '';

    return `
      <div class="chore-zone">
        ${zoneHeader(zoneKey, zone, done, zItems.length, zIsOpen, false)}
        ${rows}
      </div>`;
  }).join('') : '';

  return `
    <div class="chore-group">
      ${groupHeader('standard', 'Standards', allDone, allTotal, isOpen)}
      ${zoneHTML}
    </div>`;
}

// ── Wheel ─────────────────────────────────────────────────────────────────────

function renderWheel() {
  const items  = choresData.filter(r => r.List === 'wheel');
  const zones  = [...new Set(items.map(r => r.Zone))];
  if (!zones.length) return '';

  const isOpen   = openGroups.has('wheel');
  const totalAll = items.length;
  const doneAll  = items.filter(r => isThisMonth(r.LastDone) || completedChores.has(choreKey(r))).length;

  const zoneHTML = isOpen ? zones.map(zone => {
    const zItems       = items.filter(r => r.Zone === zone);
    const weeklyTarget = Number(zItems[0]?.WeeklyTarget) || 1;
    const zoneKey      = `wheel-${zone}`;
    const zIsOpen      = openZones.has(zoneKey);

    const doneSoFar = zItems.filter(r =>
      isThisMonth(r.LastDone) || completedChores.has(choreKey(r))
    ).length;
    const pct         = Math.round((doneSoFar / zItems.length) * 100);
    const allDoneZone = doneSoFar === zItems.length;

    const pending = zItems
      .filter(r => !isThisMonth(r.LastDone) && !completedChores.has(choreKey(r)))
      .sort((a, b) => {
        if (!a.LastDone && !b.LastDone) return 0;
        if (!a.LastDone) return -1;
        if (!b.LastDone) return 1;
        return new Date(a.LastDone) - new Date(b.LastDone);
      });

    const suggested = pending.slice(0, weeklyTarget);

    const innerHTML = zIsOpen ? `
      <div class="chore-month-bar">
        <div class="chore-month-fill" style="width:${pct}%"></div>
      </div>
      <div class="chore-wheel-target">suggested this week (${weeklyTarget}x):</div>
      ${suggested.length
        ? suggested.map(r => `
            <div class="chore-wheel-item">
              <div class="chore-check-label">${r.Item}</div>
              <div class="chore-wheel-actions">
                <button class="chore-wheel-done"
                  onclick="event.stopPropagation();completeChore('wheel','${zone}','${r.Item.replace(/'/g,"\\'")}')">✓</button>
                <button class="chore-wheel-skip"
                  onclick="event.stopPropagation();skipChore('wheel','${zone}','${r.Item.replace(/'/g,"\\'")}')">skip</button>
              </div>
            </div>`).join('')
        : '<div class="chore-all-done-msg">all done this month ✓</div>'
      }` : '';

    return `
      <div class="chore-zone">
        ${zoneHeader(zoneKey, zone, doneSoFar, zItems.length, zIsOpen, true)}
        ${innerHTML}
      </div>`;
  }).join('') : '';

  return `
    <div class="chore-group">
      ${groupHeader('wheel', 'Wheel', doneAll, totalAll, isOpen)}
      ${zoneHTML}
    </div>`;
}

function renderChores() {
  if (!choresData.length) return '<p style="font-size:12px;color:#AAB3FF">Loading chores…</p>';
  return `
    <div class="chores-container">
      <div class="chores-col">${renderDaily()}</div>
      <div class="chores-col">${renderStandards()}</div>
      <div class="chores-col">${renderWheel()}</div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════════════════════

// ── Task state ────────────────────────────────────────────────────────────
let tasksData = [];
let completedTasks = new Set();

// ── Render tasks tab ──────────────────────────────────────────────────────
function renderTasksTab() {
  const order = JSON.parse(localStorage.getItem('nexus-task-order') || '[]');
  let active = tasksData.filter(t => {
    const done = String(t.Done).toUpperCase().trim();
    return done !== 'TRUE' && done !== '1' && t.Title && !completedTasks.has(t.ID);
  });

  if (order.length) {
    active.sort((a, b) => {
      const ai = order.indexOf(a.ID);
      const bi = order.indexOf(b.ID);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  const half = Math.ceil(active.length / 2);
  const col1 = active.slice(0, half);
  const col2 = active.slice(half);

  const renderCol = (tasks) => tasks.map(t => `
    <div class="task-item" onclick="completeTask('${t.ID}', '${escHtml(t.Title)}')">
      <div class="task-check-box"></div>
      <div class="task-item-body">
        <div class="task-item-title">${escHtml(t.Title)}</div>
        ${t.Priority ? `<span class="task-item-priority priority-${t.Priority.toLowerCase()}">${t.Priority}</span>` : ''}
      </div>
    </div>`).join('');

  return `
    <div class="task-add-row">
      <input id="task-new-input" class="task-new-input" type="text" placeholder="Add a task…"
        onkeydown="if(event.key==='Enter')addTask()">
      <button class="task-new-btn" onclick="addTask()">+</button>
    </div>
    <div class="task-two-col">
      <div class="task-col">${col1.length ? renderCol(col1) : ''}</div>
      <div class="task-col">${col2.length ? renderCol(col2) : ''}</div>
    </div>
    ${active.length === 0 ? '<div class="task-preview-empty">no tasks queued</div>' : ''}
  `;
}

// ── Complete task ─────────────────────────────────────────────────────────
async function completeTask(id, title) {
  completedTasks.add(id);
  renderToday();
  try {
    await fetch(TODAY_GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tab: 'Tasks',
        matchColumn: 'ID',
        matchValue: id,
        updates: { Done: 'TRUE' }
      })
    });
  } catch(err) {
    console.warn('today.js: task complete write-back failed', err);
  }
}

// ── Add task ──────────────────────────────────────────────────────────────
async function addTask() {
  const input = document.getElementById('task-new-input');
  const title = input.value.trim();
  if (!title) return;
  input.value = '';

  const newTask = {
  Title: title,
  Done: 'FALSE',
  Priority: '',
  Category: '',
  Notes: ''
};

  tasksData.push(newTask);
  renderToday();

  try {
    await fetch(TODAY_GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tab: 'Tasks',
        row: newTask
      })
    });
  } catch(err) {
    console.warn('today.js: task add failed', err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN RENDER
// ══════════════════════════════════════════════════════════════════════════════

function renderToday() {
  const section = document.getElementById('today-section');
  if (!section) return;

  const tabs = [
    { id: 'calendar', label: 'Calendar' },
    { id: 'chores',   label: 'Chores'   },
    { id: 'tasks',    label: 'Tasks'    },
  ];

  const tabBar = tabs.map(t => `
    <button class="today-tab ${activeTab === t.id ? 'today-tab--active' : ''}"
      onclick="switchTab('${t.id}')">
      <img src="${IMG}${t.id === 'calendar' ? 'calendar' : t.id === 'chores' ? 'chores' : 'decision'}.png" alt="${t.label}">
    </button>`).join('');

  let content = '';
  if (activeTab === 'calendar') content = renderCalendar();
  if (activeTab === 'chores')   content = renderChores();
  if (activeTab === 'tasks')    content = renderTasksTab();

  section.innerHTML = `
    <div class="today-tabs">${tabBar}</div>
    <div class="today-content">${content}</div>
  `;

  if (activeTab === 'tasks' && typeof loadTasks === 'function') {
    loadTasks();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FETCH + INIT
// ══════════════════════════════════════════════════════════════════════════════

async function initToday() {
  renderToday();
const [calRes, choreRes, taskRes] = await Promise.allSettled([
  fetch(`${TODAY_GAS_URL}?calendar=1`),
  fetch(`${TODAY_GAS_URL}?tab=Chores`),
  fetch(`${TODAY_GAS_URL}?tab=Tasks`)
]);
  const [calRes, choreRes] = await Promise.allSettled([
    fetch(`${TODAY_GAS_URL}?calendar=1`),
    fetch(`${TODAY_GAS_URL}?tab=Chores`)
  ]);

  if (calRes.status === 'fulfilled') {
    try {
      calendarEvents = await calRes.value.json();
      if (!Array.isArray(calendarEvents)) calendarEvents = [];
    } catch { calendarEvents = []; }
  }

  if (choreRes.status === 'fulfilled') {
    try {
      choresData = await choreRes.value.json();
      if (!Array.isArray(choresData)) choresData = [];
    } catch { choresData = []; }
  }
if (taskRes.status === 'fulfilled') {
  try {
    tasksData = await taskRes.value.json();
    if (!Array.isArray(tasksData)) tasksData = [];
  } catch { tasksData = []; }
}
  renderToday();
}