// process.js — Nexus Self-Care Process
// Sequential card-by-card self-care protocol.
// Call initProcess() to render.

const PROCESS_GAS_URL = 'https://script.google.com/macros/s/AKfycbxcw0Idgactfq_oG_hGIOe2H4xoDgVzLjg6uchxBg3AONOXgDwfD8WhBnJHjR9yXOQzzQ/exec';

// ─── Phase accent colors ──────────────────────────────────────────────────────
const PHASE_CONFIG = {
  'Pre-Shower Prep':       { accent: '#b6b1e9' },
  'Lymphatic Brushing':    { accent: '#ade7d5' },
  'Shower & Cold Therapy': { accent: '#207de7' },
  'Facial Care':           { accent: '#b8d3f3e0' },
  'RF':                    { accent: '#777674f1' },
};
const DEFAULT_PHASE = { accent: '#888780' };

// ─── State ────────────────────────────────────────────────────────────────────
let processData    = [];
let completedSteps = new Set(); // tracks Order numbers completed this session

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPhaseColor(phase) {
  return (PHASE_CONFIG[phase] || DEFAULT_PHASE).accent;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() &&
         d.getMonth()    === t.getMonth()    &&
         d.getDate()     === t.getDate();
}

function getCurrentStep() {
  // Find the first step not completed this session
  const sorted = [...processData].sort((a, b) => a.Order - b.Order);
  return sorted.find(s => !completedSteps.has(s.Order)) || null;
}

function getTodayDate() {
  const d = new Date();
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

// ─── Mark step complete ───────────────────────────────────────────────────────

async function completeStep(order) {
  completedSteps.add(order);

  // Write LastDone back to Sheets
  const step = processData.find(s => s.Order === order);
  if (step) {
    try {
      await fetch(PROCESS_GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: 'Process',
          matchColumn: 'Order',
          matchValue: String(order),
          updates: { LastDone: getTodayDate() }
        })
      });
    } catch (err) {
      console.warn('process.js: write-back failed', err);
    }
  }

  renderProcess();
}

// ─── Skip step ───────────────────────────────────────────────────────────────

function skipStep(order) {
  completedSteps.add(order);
  renderProcess();
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderProcess() {
  const section = document.getElementById('process-section');
  if (!section) return;

  if (!processData.length) {
    section.innerHTML = `<h2 class="prc-heading">Process</h2><p style="font-size:12px;color:var(--color-text-tertiary);padding:0.5rem 0;">Loading…</p>`;
    return;
  }

  const sorted  = [...processData].sort((a, b) => a.Order - b.Order);
  const total   = sorted.length;
  const done    = completedSteps.size;
  const current = getCurrentStep();
  const complete = done >= total;
  const pct     = Math.round((done / total) * 100);

  

  let cardHTML = '';
  if (complete) {
    cardHTML = `
      <div class="prc-card prc-card--complete">
        <div class="prc-card-inner">
          <div class="prc-card-text">
            <div class="prc-complete-msg">✓ Process complete for today</div>
            <button class="prc-reset-btn" onclick="resetProcess()">reset</button>
          </div>
      
        </div>
      </div>`;
  } else if (current) {
    const color = getPhaseColor(current.Phase);
    const isOpt = current.SessionType === 'optional';
    const isTuesday = new Date().getDay() === 2;
    const skipTuesdayOnly = current.Notes && current.Notes.includes('Tuesday') && !isTuesday;

    cardHTML = `
      <div class="prc-card" style="border-color:${color}22">
        <div class="prc-accent" style="background:${color}"></div>
        <div class="prc-card-inner">
          <div class="prc-card-text">
            <div class="prc-phase-label" style="color:${color}">${current.Phase}</div>
            <div class="prc-step-number">Step ${current.Order} of ${total}</div>
            <div class="prc-item">${current.Item}</div>
            ${current.Notes ? `<div class="prc-notes">${current.Notes}</div>` : ''}
            ${isOpt ? `<div class="prc-optional">optional — do if you want</div>` : ''}
            ${skipTuesdayOnly ? `<div class="prc-optional">Tuesday only — skip today</div>` : ''}
            <div class="prc-actions">
              <button class="prc-done-btn" style="border-color:${color};color:#1a0a2e;background:${color}88" onclick="completeStep(${current.Order})">✓ done</button>
              <button class="prc-skip-btn" style="color:#1a0a2e;border-color:rgba(80,60,120,0.4);background:rgba(180,160,220,0.3)" onclick="skipStep(${current.Order})">skip</button>
            </div>
          </div>
  
        </div>
      </div>`;
  }

  section.innerHTML = `
    <h2 class="prc-heading">Process</h2>
    <div class="prc-progress-wrap">
      <div class="prc-progress-bar">
        <div class="prc-progress-fill" style="width:${pct}%"></div>
      </div>
      <span class="prc-progress-label">${done} / ${total}</span>
    </div>
    ${cardHTML}
  `;
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetProcess() {
  completedSteps.clear();
  renderProcess();
}

// ─── Fetch + init ─────────────────────────────────────────────────────────────

async function initProcess() {
  renderProcess();

  try {
    const res  = await fetch(`${PROCESS_GAS_URL}?tab=Process`);
    const rows = await res.json();
    processData = Array.isArray(rows) ? rows.sort((a,b) => a.Order - b.Order) : [];

    // Pre-mark anything already done today
    processData.forEach(s => {
      if (isToday(s.LastDone)) completedSteps.add(s.Order);
    });

  } catch (err) {
    console.error('process.js: failed to fetch Process tab', err);
    processData = [];
  }

  renderProcess();
}
