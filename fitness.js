// fitness.js — Nexus Fitness / The Mountain
// Sequential protocol with Full / Rest day toggle.
// Call initFitness() to render.

const FITNESS_GAS_URL = 'https://script.google.com/macros/s/AKfycbxcw0Idgactfq_oG_hGIOe2H4xoDgVzLjg6uchxBg3AONOXgDwfD8WhBnJHjR9yXOQzzQ/exec';

// ─── Section config ───────────────────────────────────────────────────────────
const SECTION_CONFIG = {
  'Base Camp': { accent: '#0c8816', emoji: '⛺' },
  'Climb':     { accent: '#40c4db', emoji: '🧗' },
  'Chasm':     { accent: '#3a78ec', emoji: '🌀' },
  'Peak':      { accent: '#0515a5', emoji: '🏔️' },
  'Summit':    { accent: '#7050bd', emoji: '🎯' },
};
const DEFAULT_SECTION = { accent: '#888780', emoji: '·' };

// ─── State ────────────────────────────────────────────────────────────────────
let fitnessData     = [];
let completedFitness = new Set(); // tracks "Section-Order" keys
let isRestDay       = false;
let peakIndex       = 0; // which Peak workout is next in rotation

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fitKey(row) { return `${row.Section}-${row.Order}`; }

function getSectionColor(section) {
  return (SECTION_CONFIG[section] || DEFAULT_SECTION).accent;
}

function getSectionEmoji(section) {
  return (SECTION_CONFIG[section] || DEFAULT_SECTION).emoji;
}

function isToday_fit(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() &&
         d.getMonth()    === t.getMonth()    &&
         d.getDate()     === t.getDate();
}

function getTodayDate_fit() {
  const d = new Date();
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

// ─── Get ordered steps for current session type ───────────────────────────────

function getSessionSteps() {
  const sectionOrder = ['Base Camp', 'Climb', 'Chasm', 'Peak', 'Summit'];
  const excluded = isRestDay ? ['Peak', 'Summit'] : [];

  return fitnessData
    .filter(s => s.Status === 'active' && !excluded.includes(s.Section))
    .sort((a, b) => {
      const si = sectionOrder.indexOf(a.Section) - sectionOrder.indexOf(b.Section);
      return si !== 0 ? si : a.Order - b.Order;
    });
}

function getCurrentFitStep() {
  return getSessionSteps().find(s => !completedFitness.has(fitKey(s))) || null;
}

// ─── Next Peak workout in rotation ───────────────────────────────────────────

function getNextPeak() {
  const peaks = fitnessData
    .filter(s => s.Section === 'Peak' && s.Status === 'active')
    .sort((a, b) => a.Order - b.Order);
  if (!peaks.length) return null;
  return peaks[peakIndex % peaks.length];
}

// ─── Mark complete ────────────────────────────────────────────────────────────

async function completeFitStep(section, order) {
  const step = fitnessData.find(s => s.Section === section && s.Order === order);
  if (!step) return;

  completedFitness.add(fitKey(step));

  // Advance peak rotation
  if (section === 'Peak') peakIndex++;

  try {
    await fetch(FITNESS_GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tab: 'Fitness',
        matchColumn: 'Item',
        matchValue: step.Item,
        updates: { LastDone: getTodayDate_fit() }
      })
    });
  } catch (err) {
    console.warn('fitness.js: write-back failed', err);
  }

  renderFitness();
}

function skipFitStep(section, order) {
  const step = fitnessData.find(s => s.Section === section && s.Order === order);
  if (step) completedFitness.add(fitKey(step));
  renderFitness();
}

// ─── Toggle rest day ──────────────────────────────────────────────────────────

function toggleRestDay() {
  isRestDay = !isRestDay;
  completedFitness.clear();
  renderFitness();
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetFitness() {
  completedFitness.clear();
  renderFitness();
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderFitness() {
  const section = document.getElementById('fitness-section');
  if (!section) return;

  if (!fitnessData.length) {
    section.innerHTML = `<h2 class="fit-heading">The Mountain</h2><p style="font-size:12px;color:var(--color-text-tertiary);padding:0.5rem 0;">Loading…</p>`;
    return;
  }

  const steps   = getSessionSteps();
  const total   = steps.length;
  const done    = steps.filter(s => completedFitness.has(fitKey(s))).length;
  const current = getCurrentFitStep();
  const complete = done >= total;
  const pct     = total ? Math.round((done / total) * 100) : 0;

  // Section progress pills
  const sectionOrder = ['Base Camp', 'Climb', 'Chasm', 'Peak', 'Summit'];
  const sectionPills = sectionOrder.map(sec => {
    const secSteps = steps.filter(s => s.Section === sec);
    if (!secSteps.length) {
      const isLocked = isRestDay && (sec === 'Peak' || sec === 'Summit');
      const style = isLocked
        ? 'background:#1a1a1a;color:#444;border-color:#333;'
        : 'background:#1a1a2a;color:#444;border-color:#333;';
      return `<span class="fit-pill" style="${style}">${getSectionEmoji(sec)} ${sec}</span>`;
    }
    const secDone = secSteps.filter(s => completedFitness.has(fitKey(s))).length;
    const color   = getSectionColor(sec);
    let style;
    if (secDone === secSteps.length) {
      style = `background:#0e3d20;color:#6fcf97;border-color:#1a6035;`;
    } else if (secDone > 0) {
      style = `background:#0d2a45;color:#7ab3f5;border-color:#2a5080;font-weight:500;`;
    } else {
      style = `background:transparent;color:${color};border-color:${color}44;`;
    }
    return `<span class="fit-pill" style="${style}">${getSectionEmoji(sec)} ${sec} ${secDone}/${secSteps.length}</span>`;
  }).join('');

  // Current card
  let cardHTML = '';
  if (complete) {
    cardHTML = `
      <div class="fit-card fit-card--complete">
        <div class="fit-card-inner">
          <div class="fit-complete-msg">✓ ${isRestDay ? 'Rest day' : 'Full session'} complete</div>
          <button class="fit-reset-btn" onclick="resetFitness()">reset</button>
        </div>
      </div>`;
  } else if (current) {
    const color   = getSectionColor(current.Section);
    const isPeak  = current.Section === 'Peak';
    const peakRow = isPeak ? getNextPeak() : null;
    const displayItem = isPeak && peakRow ? `Workout ${peakRow.Item} — ${peakRow.Notes}` : current.Item;
    const isOptional  = current.Status === 'optional';

    cardHTML = `
      <div class="fit-card" style="border-color:${color}33">
        <div class="fit-accent" style="background:${color}"></div>
        <div class="fit-card-inner">
          <div class="fit-section-label" style="color:${color}">
            ${getSectionEmoji(current.Section)} ${current.Section}
          </div>
          <div class="fit-item">${displayItem}</div>
          <div class="fit-goal">${current.Goal || ''}</div>
          ${isOptional ? `<div class="fit-optional">optional — do if you want</div>` : ''}
          <div class="fit-actions">
            <button class="fit-done-btn" style="border-color:${color};color:${color}"
              onclick="completeFitStep('${current.Section}', ${current.Order})">
              ✓ done
            </button>
            <button class="fit-skip-btn"
              onclick="skipFitStep('${current.Section}', ${current.Order})">
              skip
            </button>
          </div>
        </div>
      </div>`;
  }

  section.innerHTML = `
    <div class="fit-header">
      <h2 class="fit-heading">The Mountain</h2>
      <button class="fit-mode-toggle ${isRestDay ? 'fit-mode-rest' : 'fit-mode-full'}"
        onclick="toggleRestDay()">
        ${isRestDay ? '🌙 rest day' : '🏔️ full session'}
      </button>
    </div>
    <div class="fit-progress-wrap">
      <div class="fit-progress-bar">
        <div class="fit-progress-fill" style="width:${pct}%;background:${isRestDay ? '#7F77DD' : '#BA7517'}"></div>
      </div>
      <span class="fit-progress-label">${done} / ${total}</span>
    </div>
    <div class="fit-pills">${sectionPills}</div>
    ${cardHTML}
  `;
}

// ─── Fetch + init ─────────────────────────────────────────────────────────────

async function initFitness() {
  renderFitness();

  try {
    const res  = await fetch(`${FITNESS_GAS_URL}?tab=Fitness`);
    const rows = await res.json();
    fitnessData = Array.isArray(rows) ? rows : [];

    // Pre-mark anything done today
    fitnessData.forEach(s => {
      if (isToday_fit(s.LastDone)) completedFitness.add(fitKey(s));
    });

    // Set peak rotation index based on last done dates
    const peaks = fitnessData
      .filter(s => s.Section === 'Peak' && s.Status === 'active')
      .sort((a, b) => a.Order - b.Order);
    if (peaks.length) {
      // Find the one most recently done and start from the next
      let lastDoneOrder = -1;
      let lastDate = null;
      peaks.forEach(p => {
        if (p.LastDone) {
          const d = new Date(p.LastDone);
          if (!lastDate || d > lastDate) { lastDate = d; lastDoneOrder = p.Order; }
        }
      });
      if (lastDoneOrder > -1) {
        const idx = peaks.findIndex(p => p.Order === lastDoneOrder);
        peakIndex = (idx + 1) % peaks.length;
      }
    }

  } catch (err) {
    console.error('fitness.js: failed to fetch Fitness tab', err);
    fitnessData = [];
  }

  renderFitness();
}
