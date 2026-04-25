// sapphira.js — renders Sapphira's briefing into #sapphira-panel
// Claude API call routes through GAS proxy — key never touches the browser.

const SAPPHIRA_GAS = 'https://script.google.com/macros/s/AKfycbxcw0Idgactfq_oG_hGIOe2H4xoDgVzLjg6uchxBg3AONOXgDwfD8WhBnJHjR9yXOQzzQ/exec';
const CACHE_KEY    = 'sapphira-cache';
const CACHE_DATE   = 'sapphira-cache-date';

// ── Helpers ───────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function todayStr() {
  return new Date().toDateString();
}

function getPanel() {
  return document.getElementById('sapphira-panel');
}

// ── Loading state ─────────────────────────────────────────────────────────

function showLoading() {
  getPanel().innerHTML = `
    <div class="sap-loading">
      <div class="sap-loading-dot"></div>
      <span class="sap-loading-text">Sapphira is reading the day…</span>
    </div>
  `;
}

// ── Error state ───────────────────────────────────────────────────────────

function showError(msg) {
  getPanel().innerHTML = `
    <div class="sap-error">
      ${esc(msg || 'could not reach Sapphira')}
      <button class="sap-btn-retry" onclick="initSapphira()">retry</button>
    </div>
  `;
}

// ── Render briefing ───────────────────────────────────────────────────────

function renderBriefing(data) {
  const panel = getPanel();

  const now     = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const reasoningItems = Array.isArray(data.reasoning)
    ? data.reasoning.map((r, i) => `
        <div class="sap-reasoning-item">
          <span class="sap-reasoning-idx">${String(i + 1).padStart(2, '0')}</span>
          <span>${esc(r)}</span>
        </div>`).join('')
    : `<div class="sap-reasoning-item">
         <span class="sap-reasoning-idx">01</span>
         <span>${esc(data.reasoning || '')}</span>
       </div>`;

  const ft = data.firstTask || {};

  panel.innerHTML = `
    <div class="sap-inner">

      <!-- Header -->
      <div class="sap-header">
        <div class="sap-header-left">
          <div class="sap-avatar">
            <img src="images/sapphira.png" alt="Sapphira"
              onerror="this.style.display='none'">
            <div class="sap-avatar-ring"></div>
          </div>
          <div>
            <div class="sap-name">
              Sapphira
              <span class="sap-name-sep">·</span>
              <span class="sap-name-sub">a daily reading</span>
            </div>
            <div class="sap-date">${esc(dateStr)} · ${esc(timeStr)}</div>
          </div>
        </div>
        <div class="sap-header-right">
          <div class="sap-pulse"></div>
          <span class="sap-status-label">Listening</span>
        </div>
      </div>

      <!-- Status report eyebrow -->
      <div class="sap-status-label-row">
        <span class="sap-status-rule"></span>
        <span class="sap-status-eyebrow">Status Report</span>
        <span class="sap-status-eyebrow" style="color:rgba(147,209,237,0.3)">:</span>
        <span class="sap-status-mode">${esc(data.mode || '')}</span>
      </div>

      <!-- Top line -->
      <div class="sap-topline">
        <span class="sap-topline-quote">"</span>${esc(data.topLine || '')}<span class="sap-topline-quote">"</span>
      </div>

      <!-- Mode badge -->
      ${data.mode ? `<div class="sap-mode-badge">${esc(data.mode)}</div>` : ''}

      <!-- Reasoning — collapsible -->
      <button class="sap-reasoning-toggle" onclick="toggleReasoning(this)">
        <span class="sap-reasoning-chev">›</span>
        <span>Her reasoning</span>
        <span style="opacity:0.4;font-size:8px;margin-left:4px;">
          ${Array.isArray(data.reasoning) ? data.reasoning.length : 1} threads
        </span>
      </button>
      <div class="sap-reasoning-body">
        <div class="sap-reasoning-inner">
          ${reasoningItems}
        </div>
      </div>

      <!-- First task -->
      ${ft.title ? `
        <div class="sap-first-task">
          <div class="sap-first-task-eyebrow">First step</div>
          <div class="sap-first-task-title">${esc(ft.title)}</div>
          ${ft.why ? `<div class="sap-first-task-why">${esc(ft.why)}</div>` : ''}
          <div class="sap-first-task-meta">
            ${ft.estimate ? `<span class="sap-first-task-tag">${esc(ft.estimate)}</span>` : ''}
            ${ft.domain   ? `<span class="sap-first-task-tag">${esc(ft.domain)}</span>`   : ''}
            ${ft.due      ? `<span class="sap-first-task-tag">Due: ${esc(ft.due)}</span>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Day plan -->
      ${data.day ? `<div class="sap-plan">${esc(data.day)}</div>` : ''}

      <!-- Dismiss -->
      <button class="sap-btn-dismiss" onclick="dismissSapphira()">Got it</button>

    </div>
  `;
}

// ── Reasoning toggle ──────────────────────────────────────────────────────

function toggleReasoning(btn) {
  const body = btn.nextElementSibling;
  const chev = btn.querySelector('.sap-reasoning-chev');
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  chev.classList.toggle('open', !isOpen);
}

// ── Dismiss ───────────────────────────────────────────────────────────────

function dismissSapphira() {
  const panel = getPanel();
  panel.style.transition = 'opacity 0.4s ease, max-height 0.5s ease';
  panel.style.opacity = '0';
  panel.style.overflow = 'hidden';
  panel.style.maxHeight = panel.offsetHeight + 'px';
  setTimeout(() => { panel.style.maxHeight = '0'; }, 10);
  setTimeout(() => { panel.style.display = 'none'; }, 500);
}

// ── Fetch Sheets data ─────────────────────────────────────────────────────

async function fetchSheetData() {
  const [tasks, context] = await Promise.all([
    fetch(`${SAPPHIRA_GAS}?tab=Tasks`).then(r => r.json()).catch(() => []),
    fetch(`${SAPPHIRA_GAS}?tab=Context`).then(r => r.json()).catch(() => []),
  ]);

  const activeTasks = (tasks || []).filter(t => t.Done !== 'TRUE' && t.Title);
  const contextMap  = Object.fromEntries((context || []).map(r => [r.Key, r.Value]));

  return { activeTasks, contextMap };
}

// ── Build Claude payload ──────────────────────────────────────────────────

function buildPayload(activeTasks, contextMap) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const taskList = activeTasks.slice(0, 12).map((t, i) =>
    `${i + 1}. ${t.Title}` +
    (t.Priority ? ` [${t.Priority}]` : '') +
    (t.Deadline ? ` (due ${new Date(t.Deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})})` : '') +
    (t.Category ? ` · ${t.Category}` : '')
  ).join('\n');

  const contextStr = Object.entries(contextMap)
    .map(([k, v]) => `${k}: ${v}`).join('\n') || 'No context flags set.';

  const systemPrompt = `You are Sapphira — a calm, precise daily orientation engine for a personal operating system called Nexus. You are not a chatbot. You deliver one clear morning reading.

The user is autistic, a morning person, works overnight warehouse shifts Thu–Sat, and is sharpest 6–10am Mon/Tue. They are managing caregiving for family members (Dan, who is finishing cancer treatment) and may have kids present on some days. Executive function support is a core need — every output should reduce decisions, not add them.

You receive: today's date, active tasks, and context flags. You reason about what kind of day this is and what the single most important first move is.

Output ONLY valid JSON — no markdown, no preamble, no explanation:
{
  "mode": "short mode name (e.g. Brainwork day, Rest day, Logistics day)",
  "topLine": "one sentence: the clearest true thing about today",
  "reasoning": ["thread 1", "thread 2", "thread 3"],
  "day": "paragraph: how the day should unfold",
  "firstTask": {
    "title": "specific actionable first step",
    "why": "one sentence: why this, first",
    "estimate": "time estimate e.g. 15 min",
    "domain": "domain e.g. School · RHIT",
    "due": "due date if relevant, else empty string"
  }
}`;

  const userMessage = `Today is ${today}.

ACTIVE TASKS:
${taskList || 'No active tasks.'}

CONTEXT FLAGS:
${contextStr}

Deliver the morning reading.`;

  return {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  };
}

// ── Call Claude via GAS proxy ─────────────────────────────────────────────

async function callClaudeViaProxy(payload) {
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const url     = `${SAPPHIRA_GAS}?sapphira=1&payload=${encoded}`;
  const res     = await fetch(url);
  const result  = await res.json();

  if (result.error) throw new Error(result.error);

  // Anthropic response shape: result.content[0].text
  const text = result.content?.[0]?.text || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// ── Init ──────────────────────────────────────────────────────────────────

async function initSapphira() {
  // Serve from cache if already run today
  const cachedDate = localStorage.getItem(CACHE_DATE);
  const cached     = localStorage.getItem(CACHE_KEY);

  if (cached && cachedDate === todayStr()) {
    try {
      renderBriefing(JSON.parse(cached));
      return;
    } catch(e) { /* fall through */ }
  }

  showLoading();

  try {
    const { activeTasks, contextMap } = await fetchSheetData();
    const payload  = buildPayload(activeTasks, contextMap);
    const briefing = await callClaudeViaProxy(payload);

    localStorage.setItem(CACHE_KEY,  JSON.stringify(briefing));
    localStorage.setItem(CACHE_DATE, todayStr());

    renderBriefing(briefing);
  } catch(e) {
    console.error('Sapphira error:', e);
    showError(e.message);
  }
}
