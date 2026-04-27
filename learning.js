// learning.js — Nexus Learning Tracks
// Fetches live data from the Learning tab in Google Sheets via GAS.
// Call initLearning() to render.

const GAS_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

// ─── Accent colors per zone ───────────────────────────────────────────────────
const ZONE_CONFIG = {
  'Codecademy': { accent: '#2a6bb5', statusLabel: 'on track',    statusType: 'active' },
  'Calculus':   { accent: '#1D9E75', statusLabel: 'low pressure', statusType: 'slow'   },
  'Coursera':   { accent: '#7F77DD', statusLabel: 'phase 2',      statusType: 'ready'  },
  'Nexus':      { accent: '#BA7517', statusLabel: 'building',     statusType: 'active' },
  'CHDA':       { accent: '#D85A30', statusLabel: 'slow burn',    statusType: 'slow'   },
  'Typing':     { accent: '#888780', statusLabel: 'daily habit',  statusType: 'active' },
};

const DEFAULT_CONFIG = { accent: '#555', statusLabel: 'active', statusType: 'active' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBg(type) {
  return {
    active: 'background:#0e3d20;color:#6fcf97;border:0.5px solid #1a6035',
    slow:   'background:#3a2a00;color:#f2c94c;border:0.5px solid #6a4a00',
    ready:  'background:#1a2a40;color:#7ab3f5;border:0.5px solid #2a4a70',
  }[type] || '';
}

function formatLastDone(raw) {
  if (!raw) return 'never';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Group rows by Zone, pick current item per zone ───────────────────────────

function groupByZone(rows) {
  const zones = {};
  rows.forEach(row => {
    if (!zones[row.Zone]) zones[row.Zone] = [];
    zones[row.Zone].push(row);
  });

  return Object.entries(zones).map(([zone, items]) => {
    items.sort((a, b) => a.Order - b.Order);
    const current = items.find(i => i.Status === 'current') || items[0];
    const config  = ZONE_CONFIG[zone] || DEFAULT_CONFIG;
    return { zone, items, current, ...config };
  });
}

// ─── Card renderer ────────────────────────────────────────────────────────────

function buildCard(track, isOpen) {
  const { zone, current, accent, statusLabel, statusType } = track;
  return `
    <div class="lrn-card ${isOpen ? 'lrn-card--open' : ''}" id="card-${zone}" onclick="toggleLearning('${zone}')">
      <div class="lrn-accent" style="background:${accent}"></div>
      <div class="lrn-card-inner">
        <div class="lrn-card-header">
          <div>
            <div class="lrn-name">${zone}</div>
            <div class="lrn-sub">${current.Item}</div>
          </div>
          <span class="lrn-chip" style="${statusBg(statusType)}">${statusLabel}</span>
        </div>
        <div class="lrn-bar-wrap">
          <div class="lrn-bar-fill" style="width:${current.Progress}%;background:${accent}"></div>
        </div>
        <div class="lrn-bar-label">${current.Progress}% · ${current.Notes}</div>
        <div class="lrn-week">
          <div class="lrn-week-label">this week</div>
          ${current.WeekTarget}
        </div>
        <button class="lrn-launch-btn" onclick="event.stopPropagation();toggleLearning('${zone}')">
          open session ›
        </button>
      </div>
    </div>`;
}

// ─── Detail panel renderer ────────────────────────────────────────────────────

function buildDetail(track) {
  const { zone, items, current, accent } = track;

  const syllabus = items.map(item => {
    let style = 'background:var(--learning-tag-bg,#1a1f2e);color:var(--color-text-secondary);border:0.5px solid var(--color-border-tertiary)';
    if (item.Status === 'done')    style = 'background:#0e3d20;color:#6fcf97;border:0.5px solid #1a6035;text-decoration:line-through';
    if (item.Status === 'current') style = 'background:#0d2a45;color:#7ab3f5;border:0.5px solid #2a5080;font-weight:500';
    return `<span style="font-size:10px;padding:3px 8px;border-radius:20px;${style}">${item.Item}</span>`;
  }).join('');

  const sessionRow = current.URL ? `
    <div class="lrn-session-item" onclick="openSession('${current.URL}')" style="cursor:pointer">
      <div class="lrn-session-dot" style="background:${accent}"></div>
      <div>
        <div style="font-size:12px;color:var(--color-text-primary)">${zone}</div>
        <div style="font-size:10px;color:var(--color-text-tertiary)">
          ${current.Duration} min · last done ${formatLastDone(current.LastDone)}
        </div>
      </div>
    </div>` : '';

  return `
    <div class="lrn-detail" id="detail-${zone}">
      <div class="lrn-detail-title">${zone} — session</div>
      <div class="lrn-syllabus">${syllabus}</div>
      <div class="lrn-sessions">${sessionRow}</div>
      <button class="lrn-open-all" onclick="openSession('${current.URL}')">
        launch ${zone}
      </button>
    </div>`;
}

// ─── Session launcher ─────────────────────────────────────────────────────────

function openSession(url) {
  if (!url) return;
  window.open(url, '_blank');
}

// ─── State + render ───────────────────────────────────────────────────────────

let openZoneId   = null;
let learningData = [];

function toggleLearning(zone) {
  openZoneId = openZoneId === zone ? null : zone;
  renderLearning();
  if (openZoneId) {
    const detail = document.getElementById(`detail-${openZoneId}`);
    if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderLearning() {
  const section = document.getElementById('learning-section');
  if (!section) return;

  if (!learningData.length) {
    section.innerHTML = `<h2 class="lrn-heading">Learning</h2><p style="font-size:12px;color:var(--color-text-tertiary);padding:0.5rem 0;">Loading tracks…</p>`;
    return;
  }

  const tracks = groupByZone(learningData);
  const cards  = tracks.map(t => buildCard(t, openZoneId === t.zone)).join('');
  const detail = openZoneId
    ? buildDetail(tracks.find(t => t.zone === openZoneId))
    : '';

  section.innerHTML = `
    <h2 class="lrn-heading">Learning</h2>
    <div class="lrn-grid">${cards}</div>
    ${detail}
  `;
}

// ─── Fetch + init ─────────────────────────────────────────────────────────────

async function initLearning() {
  renderLearning(); // show loading state immediately

  try {
    const res  = await fetch(`${GAS_URL}?tab=Learning`);
    const rows = await res.json();
    learningData = Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error('learning.js: failed to fetch Learning tab', err);
    learningData = [];
  }

  renderLearning();
}
