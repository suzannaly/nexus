// learning.js — Nexus Learning Tracks
// Drop-in module. Call initLearning() to render.
// No external dependencies.

const LEARNING_TRACKS = [
  {
    id: 'codecademy',
    name: 'BI Data Analyst Path',
    sub: 'Codecademy',
    accent: '#2a6bb5',
    status: 'on track',
    statusType: 'active',
    progress: 42,
    progressText: '42% · Unit 4 of 9',
    weekTarget: 'Complete SQL window functions module. Finish 2 practice projects.',
    syllabus: ['SQL basics', 'Advanced SQL', 'Python', 'Pandas', 'Tableau', 'Excel', 'Capstone'],
    currentUnit: 1, // index of current syllabus item (0-based)
    sessions: [
      { label: 'Codecademy lesson', sub: 'Resume Unit 4 — SQL', url: 'https://www.codecademy.com/learn' },
      { label: 'Practice sandbox', sub: 'SQLiteOnline', url: 'https://sqliteonline.com/' },
      { label: 'Notes doc', sub: 'Weekly SQL notes', url: 'https://docs.google.com' },
    ]
  },
  {
    id: 'calculus',
    name: 'Calculus',
    sub: 'Khan Academy · low pressure',
    accent: '#1D9E75',
    status: 'low pressure',
    statusType: 'slow',
    progress: 18,
    progressText: '18% · Limits',
    weekTarget: 'Watch 3 videos on derivatives. 20 min sessions only — no pressure.',
    syllabus: ['Limits', 'Derivatives', 'Integrals', 'Applications'],
    currentUnit: 0,
    sessions: [
      { label: 'Khan Academy', sub: 'Derivatives unit', url: 'https://www.khanacademy.org/math/calculus-1' },
    ]
  },
  {
    id: 'coursera',
    name: 'IBM Data Analyst + Power BI',
    sub: 'Coursera · Phase 2',
    accent: '#7F77DD',
    status: 'phase 2',
    statusType: 'ready',
    progress: 10,
    progressText: 'Phase 2 starting',
    weekTarget: 'Watch orientation videos. Set up Python notebook environment.',
    syllabus: ['Data tools', 'Python notebooks', 'SQL', 'Power BI', 'Capstone'],
    currentUnit: 0,
    sessions: [
      { label: 'Coursera', sub: 'IBM Data Analyst', url: 'https://www.coursera.org' },
      { label: 'Google Colab', sub: 'Notebook environment', url: 'https://colab.research.google.com' },
    ]
  },
  {
    id: 'nexus',
    name: 'Nexus / Sapphira Dev',
    sub: 'Active build',
    accent: '#BA7517',
    status: 'building',
    statusType: 'active',
    progress: 65,
    progressText: 'Phase E — Polish',
    weekTarget: 'Calendar API · Sapphira reads task notes · icon placement.',
    syllabus: ['Phases A–D', 'Phase E', 'Calendar API', 'Mobile', 'Sapphira agent'],
    currentUnit: 1,
    sessions: [
      { label: 'VS Code', sub: 'suzannaly/nexus', url: 'vscode://file' }, // update to your local path
      { label: 'GAS editor', sub: 'Apps Script dashboard', url: 'https://script.google.com' },
      { label: 'Live site', sub: 'suzannaly.github.io/nexus', url: 'https://suzannaly.github.io/nexus' },
    ]
  },
  {
    id: 'chda',
    name: 'CHDA Exam Prep',
    sub: 'Book first · exam when ready',
    accent: '#D85A30',
    status: 'slow burn',
    statusType: 'slow',
    progress: 5,
    progressText: 'Chapter 1',
    weekTarget: 'Read Chapter 1. 20 min sessions — no timeline pressure.',
    syllabus: ['Ch.1 Foundations', 'Ch.2 Data Mgmt', 'Ch.3 Analytics', 'Practice exam'],
    currentUnit: 0,
    sessions: [
      { label: 'CHDA textbook', sub: 'Physical / PDF', url: '' }, // fill in if PDF link exists
      { label: 'Study notes', sub: 'CHDA notes doc', url: 'https://docs.google.com' },
    ]
  },
  {
    id: 'typing',
    name: 'Typing Fundamentals',
    sub: 'keybr.com · 15 min sessions',
    accent: '#888780',
    status: 'daily habit',
    statusType: 'active',
    progress: 30,
    progressText: '~55 WPM avg',
    weekTarget: 'One 15-min session per day. Focus on accuracy over speed this week.',
    syllabus: ['Home row', 'Numbers / symbols', 'Target 70 WPM', 'Maintain'],
    currentUnit: 1,
    sessions: [
      { label: 'keybr.com', sub: 'Daily session', url: 'https://www.keybr.com' },
    ]
  }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBg(type) {
  return {
    active: 'background:#0e3d20;color:#6fcf97;border:0.5px solid #1a6035',
    slow:   'background:#3a2a00;color:#f2c94c;border:0.5px solid #6a4a00',
    ready:  'background:#1a2a40;color:#7ab3f5;border:0.5px solid #2a4a70',
  }[type] || '';
}

function buildSyllabus(track) {
  return track.syllabus.map((s, i) => {
    let style = 'background:var(--learning-tag-bg,#1a1f2e);color:var(--color-text-secondary);border:0.5px solid var(--color-border-tertiary)';
    if (i < track.currentUnit)  style = 'background:#0e3d20;color:#6fcf97;border:0.5px solid #1a6035;text-decoration:line-through';
    if (i === track.currentUnit) style = 'background:#0d2a45;color:#7ab3f5;border:0.5px solid #2a5080;font-weight:500';
    return `<span style="font-size:10px;padding:3px 8px;border-radius:20px;${style}">${s}</span>`;
  }).join('');
}

function buildSessionItems(track) {
  return track.sessions.map(s => {
    const clickable = s.url ? `onclick="openSession('${s.url}')" style="cursor:pointer"` : '';
    return `
      <div class="lrn-session-item" ${clickable}>
        <div class="lrn-session-dot" style="background:${track.accent}"></div>
        <div>
          <div style="font-size:12px;color:var(--color-text-primary)">${s.label}</div>
          <div style="font-size:10px;color:var(--color-text-tertiary)">${s.sub}</div>
        </div>
      </div>`;
  }).join('');
}

function openSession(url) {
  if (!url) return;
  window.open(url, '_blank');
}

function openAllSessions(trackId) {
  const track = LEARNING_TRACKS.find(t => t.id === trackId);
  if (!track) return;
  track.sessions.forEach(s => { if (s.url) window.open(s.url, '_blank'); });
}

// ─── Card renderer ────────────────────────────────────────────────────────────

function buildCard(track, isOpen) {
  const accentStyle = `background:${track.accent}`;
  return `
    <div class="lrn-card ${isOpen ? 'lrn-card--open' : ''}" id="card-${track.id}" onclick="toggleLearning('${track.id}')">
      <div class="lrn-accent" style="${accentStyle}"></div>
      <div class="lrn-card-inner">
        <div class="lrn-card-header">
          <div>
            <div class="lrn-name">${track.name}</div>
            <div class="lrn-sub">${track.sub}</div>
          </div>
          <span class="lrn-chip" style="${statusBg(track.statusType)}">${track.status}</span>
        </div>
        <div class="lrn-bar-wrap">
          <div class="lrn-bar-fill" style="width:${track.progress}%;background:${track.accent}"></div>
        </div>
        <div class="lrn-bar-label">${track.progressText}</div>
        <div class="lrn-week">
          <div class="lrn-week-label">this week</div>
          ${track.weekTarget}
        </div>
        <button class="lrn-launch-btn" onclick="event.stopPropagation();toggleLearning('${track.id}')">
          open session ›
        </button>
      </div>
    </div>`;
}

// ─── Detail panel renderer ────────────────────────────────────────────────────

function buildDetail(track) {
  return `
    <div class="lrn-detail" id="detail-${track.id}">
      <div class="lrn-detail-title">${track.name} — session</div>
      <div class="lrn-syllabus">${buildSyllabus(track)}</div>
      <div class="lrn-sessions">${buildSessionItems(track)}</div>
      <button class="lrn-open-all" onclick="openAllSessions('${track.id}')">
        open all tabs
      </button>
    </div>`;
}

// ─── State + render ───────────────────────────────────────────────────────────

let openTrackId = null;

function toggleLearning(id) {
  openTrackId = openTrackId === id ? null : id;
  renderLearning();
  if (openTrackId) {
    const detail = document.getElementById(`detail-${openTrackId}`);
    if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderLearning() {
  const section = document.getElementById('learning-section');
  if (!section) return;

  const cards = LEARNING_TRACKS.map(t => buildCard(t, openTrackId === t.id)).join('');
  const detail = openTrackId
    ? buildDetail(LEARNING_TRACKS.find(t => t.id === openTrackId))
    : '';

  section.innerHTML = `
    <h2 class="lrn-heading">Learning</h2>
    <div class="lrn-grid">${cards}</div>
    ${detail}
  `;
}

function initLearning() {
  renderLearning();
}
