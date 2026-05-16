// chores.js — Nexus Chores
// Extracted from today.js for the new two-column layout.
// Renders Daily, Standard, and Wheel into separate target divs.
// Call initChores() to start.

const CHORES_GAS_URL = 'https://script.google.com/macros/s/AKfycbxcw0Idgactfq_oG_hGIOe2H4xoDgVzLjg6uchxBg3AONOXgDwfD8WhBnJHjR9yXOQzzQ/exec';
const CHORES_IMG = 'https://raw.githubusercontent.com/suzannaly/nexus/main/images/';

// ─── Image maps ───────────────────────────────────────────────────────────────
const CHORE_GROUP_IMAGES = {
  daily:    `${CHORES_IMG}supplies.png`,
  standard: `${CHORES_IMG}note.png`,
  wheel:    `${CHORES_IMG}wheel.png`,
};

const CHORE_ZONE_IMAGES = {
  'Kitchen':         `${CHORES_IMG}kitchen.png`,
  'Bathroom':        `${CHORES_IMG}bathroom.png`,
  'Upstairs':        `${CHORES_IMG}bed.png`,
  'Downstairs':      `${CHORES_IMG}living.png`,
  'Living Room':     `${CHORES_IMG}living.png`,
  'Dining/Playroom': `${CHORES_IMG}play.png`,
  'Bedroom':         `${CHORES_IMG}bed.png`,
  'Girls Room':      `${CHORES_IMG}girls.png`,
  'Outside':         `${CHORES_IMG}outside.png`,
};

// ─── State ────────────────────────────────────────────────────────────────────
let choresData      = [];
let completedChores = new Set();
let openChoreGroups = new Set();
let openChoreZones  = new Set();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function choreKey(row) {
  return `${row.List}-${row.Zone}-${row.Item}`;
}

function getTodayDate_c() {
  const d = new Date();
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

function isThisMonth_c(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
}

function toggleChoreGroup(group) {
  openChoreGroups.has(group) ? openChoreGroups.delete(group) : openChoreGroups.add(group);
  renderChores();
}

function toggleChoreZone(key) {
  openChoreZones.has(key) ? openChoreZones.delete(key) : openChoreZones.add(key);
  renderChores();
}

// ─── Complete / skip ──────────────────────────────────────────────────────────

async function completeChore(list, zone, item) {
  completedChores.add(`${list}-${zone}-${item}`);
  renderChores();
  try {
    await fetch(
      CHORES_GAS_URL +
      '?tab=Chores' +
      '&matchColumn=Item' +
      '&matchValue=' + encodeURIComponent(item) +
      '&updates=' + encodeURIComponent(JSON.stringify({ LastDone: getTodayDate_c(), Status: 'done' })),
      { method: 'GET', mode: 'no-cors' }
    );
  } catch(err) { console.warn('chores.js: write-back failed', err); }
}

function skipChore(list, zone, item) {
  completedChores.add(`${list}-${zone}-${item}`);
  renderChores();
}

// ─── Mark pill done ───────────────────────────────────────────────────────────

function choresSectionDone(panelId) {
  if (typeof markDone === 'function') markDone(panelId);
}

// ─── Group header ─────────────────────────────────────────────────────────────

function choreGroupHeader(id, label, count, total, isOpen) {
  const img = CHORE_GROUP_IMAGES[id] || '';
  const allDone = count === total;
  return `
    <div class="chore-group-header" onclick="toggleChoreGroup('${id}')">
      ${img ? `<img class="chore-group-img" src="${img}" alt="${label}">` : ''}
      <div class="chore-group-left">
        <span class="chore-chevron">${isOpen ? '▾' : '▸'}</span>
        <span class="chore-group-title">${label}</span>
        ${allDone ? '<span class="chore-all-done">✓</span>' : ''}
      </div>
      <span class="chore-group-count">${count}/${total}</span>
    </div>`;
}

// ─── Zone header ──────────────────────────────────────────────────────────────

function choreZoneHeader(zoneKey, zone, count, total, isOpen, monthly) {
  const img = CHORE_ZONE_IMAGES[zone] || '';
  const allDone = count === total;
  const countLabel = monthly ? `${count}/${total} this month` : `${count}/${total}`;
  return `
    <div class="chore-zone-header" onclick="event.stopPropagation();toggleChoreZone('${zoneKey}')">
      ${img ? `<img class="chore-zone-img" src="${img}" alt="${zone}">` : ''}
      <div class="chore-group-left">
        <span class="chore-chevron chore-chevron--sm">${isOpen ? '▾' : '▸'}</span>
        <span class="chore-zone-label-text">${zone}</span>
        ${allDone ? '<span class="chore-all-done">✓</span>' : ''}
      </div>
      <span class="chore-zone-count">${countLabel}</span>
    </div>`;
}

// ─── Done button ──────────────────────────────────────────────────────────────

function choreDoneBtn(panelId, label) {
  return `
    <div style="padding:16px 12px 8px;">
      <button onclick="choresSectionDone('${panelId}')"
        style="width:100%;padding:10px;border-radius:8px;border:1px solid #2ECC71;
               background:#0e3d20;color:#6fcf97;font-size:13px;cursor:pointer;
               letter-spacing:0.06em;">
        ✓ Done with ${label}
      </button>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// DAILY
// ══════════════════════════════════════════════════════════════════════════════

function renderDailySection() {
  const items  = choresData.filter(r => r.List === 'daily').sort((a,b) => a.Item.localeCompare(b.Item));
  if (!items.length) return '<p style="font-size:12px;color:#AAB3FF;padding:16px;">Loading…</p>';

  const done   = items.filter(r => completedChores.has(choreKey(r))).length;
  const total  = items.length;
  const isOpen = openChoreGroups.has('daily');
  const allDone = done === total;

  const checklist = isOpen ? `
    <div class="chore-checklist" style="padding:0 12px;">
      ${items.map(r => {
        const isDone = completedChores.has(choreKey(r));
        return `
          <div class="chore-check-item ${isDone ? 'chore-check-item--done' : ''}"
               onclick="completeChore('daily','Daily','${r.Item.replace(/'/g,"\\'")}')">
            <div class="chore-check-box">${isDone ? '✓' : ''}</div>
            <div class="chore-check-label">${r.Item}</div>
          </div>`;
      }).join('')}
    </div>
    ${choreDoneBtn('daily-panel', 'Daily Tidy')}` : '';

  return `
    <div class="chore-group" style="margin:12px;">
      ${choreGroupHeader('daily', 'Daily Tidy', done, total, isOpen)}
      ${allDone && !isOpen ? '<div style="padding:8px 12px;font-size:12px;color:#6fcf97;">✓ All done</div>' : ''}
      ${checklist}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// STANDARD
// ══════════════════════════════════════════════════════════════════════════════

function renderStandardSection() {
  const items = choresData.filter(r => r.List === 'standard');
  const zones = [...new Set(items.map(r => r.Zone))];
  if (!zones.length) return '<p style="font-size:12px;color:#AAB3FF;padding:16px;">Loading…</p>';

  const allDone  = items.filter(r => completedChores.has(choreKey(r))).length;
  const allTotal = items.length;
  const isOpen   = openChoreGroups.has('standard');

  const zoneHTML = isOpen ? zones.map(zone => {
    const zItems  = items.filter(r => r.Zone === zone);
    const done    = zItems.filter(r => completedChores.has(choreKey(r))).length;
    const zoneKey = `standard-${zone}`;
    const zIsOpen = openChoreZones.has(zoneKey);

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
        ${choreZoneHeader(zoneKey, zone, done, zItems.length, zIsOpen, false)}
        ${rows}
      </div>`;
  }).join('') : '';

  return `
    <div class="chore-group" style="margin:12px;">
      ${choreGroupHeader('standard', 'Standards', allDone, allTotal, isOpen)}
      ${zoneHTML}
      ${isOpen ? choreDoneBtn('standard-panel', 'Standards') : ''}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// WHEEL
// ══════════════════════════════════════════════════════════════════════════════

function renderWheelSection() {
  const items = choresData.filter(r => r.List === 'wheel');
  const zones = [...new Set(items.map(r => r.Zone))];
  if (!zones.length) return '<p style="font-size:12px;color:#AAB3FF;padding:16px;">Loading…</p>';

  const isOpen   = openChoreGroups.has('wheel');
  const totalAll = items.length;
  const doneAll  = items.filter(r => isThisMonth_c(r.LastDone) || completedChores.has(choreKey(r))).length;

  const zoneHTML = isOpen ? zones.map(zone => {
    const zItems       = items.filter(r => r.Zone === zone);
    const weeklyTarget = Number(zItems[0]?.WeeklyTarget) || 1;
    const zoneKey      = `wheel-${zone}`;
    const zIsOpen      = openChoreZones.has(zoneKey);

    const doneSoFar = zItems.filter(r =>
      isThisMonth_c(r.LastDone) || completedChores.has(choreKey(r))
    ).length;
    const pct = Math.round((doneSoFar / zItems.length) * 100);

    const pending = zItems
      .filter(r => !isThisMonth_c(r.LastDone) && !completedChores.has(choreKey(r)))
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
        ${choreZoneHeader(zoneKey, zone, doneSoFar, zItems.length, zIsOpen, true)}
        ${innerHTML}
      </div>`;
  }).join('') : '';

  return `
    <div class="chore-group" style="margin:12px;">
      ${choreGroupHeader('wheel', 'Wheel', doneAll, totalAll, isOpen)}
      ${zoneHTML}
      ${isOpen ? choreDoneBtn('wheel-panel', 'Wheel') : ''}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN RENDER
// ══════════════════════════════════════════════════════════════════════════════

function renderChores() {
  const daily    = document.getElementById('chores-daily-section');
  const standard = document.getElementById('chores-standard-section');
  const wheel    = document.getElementById('chores-wheel-section');

  if (daily)    daily.innerHTML    = renderDailySection();
  if (standard) standard.innerHTML = renderStandardSection();
  if (wheel)    wheel.innerHTML    = renderWheelSection();
}

// ══════════════════════════════════════════════════════════════════════════════
// FETCH + INIT
// ══════════════════════════════════════════════════════════════════════════════

async function initChores() {
  renderChores(); // loading state

  try {
    const res  = await fetch(`${CHORES_GAS_URL}?tab=Chores`);
    const rows = await res.json();
    choresData = Array.isArray(rows) ? rows : [];
  } catch(err) {
    console.error('chores.js: fetch failed', err);
    choresData = [];
  }

  renderChores();
}