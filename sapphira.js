// ── Sapphira ──────────────────────────────────────────────────────────────
// Context-aware priority engine and morning briefing system for Nexus.
// She is not a chatbot. She reads your day and tells you what it is.
//
// Entry points:
//   initSapphira()         — call on page load, renders the briefing panel
//   getSapphiraBriefing()  — returns the briefing object (cached or fresh)

const SAPPHIRA_API = 'https://script.google.com/macros/s/AKfycbxijZbHHPc0Pzo_DOpf2NN2OdeDHjX8j-qdlPADasGvMKanphW_-RI_fwuV5f7-5KOJcg/exec';
// Claude is called via GAS proxy — no API key ever touches the browser
const CACHE_KEY    = 'sapphira-briefing-cache';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ── System prompt ─────────────────────────────────────────────────────────
const SAPPHIRA_SYSTEM = `You are Sapphira, the reasoning layer inside Nexus — a personal operating system built by and for someone who is autistic, managing caregiving for multiple family members, finishing school through a self-directed curriculum, and working overnight warehouse shifts Thursday through Saturday.

Your job is not to chat. Your job is to read the shape of today and deliver a calm, accurate briefing that removes decisions rather than adding them.

THE PERSON:
- Autistic. Sharpest hours 6–10am Monday and Tuesday.
- Morning person. Post-shift (after Thu–Sat nights) she often functions fine and may go straight through to reset sleep. Lean toward brain/self-care on those mornings unless overridden.
- Caregiving context: Dan (family member finishing cancer treatment, moving toward remission — primarily administrative support now, occasional doctor appointments). Kid days range from one child (Bishop, a preemie niece) to six children for field trips in summer.
- Self-directed curriculum is her primary intellectual project. Treat it with the same weight as professional work.

DOMAINS (four, not arbitrary categories):
- Projects: self-directed curriculum, intellectual building work
- Fitness: structured workout progression (Foundation/Climb/Chasm) plus physical self-care protocol
- Chores: zone-based house maintenance (Kitchen, Bathroom, Living/Dining/Playroom, Bedroom/Girls areas)
- Self-care: rest, reflection, low-cognitive-load restoration

DAY MODES:
- Full Day: all four domains active, balanced and integrated
- need brainwork: Projects lead. Protect cognitive space. Other domains optional.
- need exertion: Fitness leads. Physical output prioritized.
- need clarity: Self-care leads. Protect the morning. Low cognitive load.
- need baseline: Chores lead. Tactile, visible progress. Simple wins.
- need rest: Nearly clear. One anchor task maximum. No decisions.

REASONING RULES:
1. If KidDay is TRUE, cognitive deep work (Projects) is unlikely to happen. Adjust accordingly. KidCount > 3 means the whole day is logistics.
2. If DanAppointment is TRUE, that is a time block. Factor it into what's realistic today.
3. If DanStatus is not "stable", weight caregiving tasks higher and protect her energy.
4. If EnergyOverride is set, respect it over your inference.
5. If Note is set, read it carefully. It contains human-judgment context no data source can provide.
6. Post-shift days (day after Thu/Fri/Sat): default lean is brain/self-care unless overridden.
7. The first task must be genuinely achievable within the first 30 minutes of the day. Not aspirational. Real.

OUTPUT FORMAT:
Respond only with a valid JSON object. No preamble, no explanation outside the JSON, no markdown fences.

{
  "orientation": "One to two sentences. State what today is. Calm, factual, present. Not motivational. Not warm in a performative way. Just clear.",
  "mode": "full | need brainwork | need exertion | need clarity | need baseline | need rest",
  "modeReason": "One sentence. Why this mode fits today. Honest, not cheerful.",
  "firstTask": "The single most important first task. Specific and achievable. Not a domain name — an actual task.",
  "firstTaskSource": "which domain or category this came from",
  "adjustedPlan": "Two to four sentences describing what today actually looks like in this mode. Concrete. What happens, roughly when, in what order.",
  "reasoning": "Internal reasoning log. Two to four sentences explaining what signals you read and why you made the calls you made. This is shown to the user so she understands your logic."
}

TONE:
Clear water. Calm and present. Not aggressive, not cold, not cheerful. You are not a motivational system. You are a clear-eyed assistant who sees the whole board and tells her what it looks like. She trusts you because you don't perform.`;

// ── Gather context from Sheets ────────────────────────────────────────────
async function gatherContext() {
  const today = new Date();
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayName  = dayNames[today.getDay()];
  const dateStr  = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const isPostShift = [0, 1, 2].includes(today.getDay()); // Sun/Mon/Tue after Thu-Sat shifts

  // Parallel fetch — Tasks, Context, Work
  const [tasksRaw, contextRaw, workRaw] = await Promise.all([
    fetch(`${SAPPHIRA_API}?tab=Tasks`).then(r => r.json()).catch(() => []),
    fetch(`${SAPPHIRA_API}?tab=Context`).then(r => r.json()).catch(() => []),
    fetch(`${SAPPHIRA_API}?tab=Work`).then(r => r.json()).catch(() => [])
  ]);

  // Parse context flags into a clean object
  const ctx = {};
  contextRaw.forEach(row => {
    if (row.Key) ctx[row.Key] = row.Value;
  });

  // Check Work tab for a shift today
  const todayISO = today.toISOString().split('T')[0];
  const shiftToday = workRaw.some(row => {
    if (!row.Date) return false;
    const rowDate = new Date(row.Date).toISOString().split('T')[0];
    return rowDate === todayISO;
  });

  // Active tasks only, in saved order
  const order = JSON.parse(localStorage.getItem('nexus-task-order') || '[]');
  const activeTasks = tasksRaw
    .filter(t => t.ID && t.Done !== 'TRUE' && t.Title)
    .sort((a, b) => {
      const ai = order.indexOf(a.ID);
      const bi = order.indexOf(b.ID);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  return {
    dayName,
    dateStr,
    isPostShift,
    shiftToday,
    danStatus:       ctx.DanStatus       || 'stable',
    danAppointment:  ctx.DanAppointment  || 'FALSE',
    kidDay:          ctx.KidDay          || 'FALSE',
    kidCount:        parseInt(ctx.KidCount) || 0,
    energyOverride:  ctx.EnergyOverride  || '',
    note:            ctx.Note            || '',
    activeTasks:     activeTasks.slice(0, 10).map(t => ({
      title:    t.Title,
      category: t.Category,
      deadline: t.Deadline || null
    }))
  };
}

// ── Call Claude ───────────────────────────────────────────────────────────
async function askSapphira(context) {
  const userMessage = `Today is ${context.dayName}, ${context.dateStr}.

Context flags:
- Dan status: ${context.danStatus}
- Dan has appointment today: ${context.danAppointment}
- Kid day: ${context.kidDay} (count: ${context.kidCount})
- Post-shift morning: ${context.isPostShift}
- Shift scheduled today: ${context.shiftToday}
- Energy override: ${context.energyOverride || 'none'}
- Note: ${context.note || 'none'}

Active tasks (in priority order):
${context.activeTasks.length
  ? context.activeTasks.map((t, i) => `${i + 1}. [${t.category}] ${t.title}${t.deadline ? ' — due ' + t.deadline : ''}`).join('\n')
  : 'No tasks currently queued.'}

Read today and tell me what it is.`;

  // Call Claude via GAS proxy — key never touches the browser
  const response = await fetch(SAPPHIRA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sapphira: true,
      body: {
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: SAPPHIRA_SYSTEM,
        messages: [{ role: 'user', content: userMessage }]
      }
    })
  });

  if (!response.ok) {
    throw new Error(`GAS proxy error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Parse JSON — strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ── Cache helpers ─────────────────────────────────────────────────────────
function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { briefing, timestamp, date } = JSON.parse(raw);
    const today = new Date().toDateString();
    const age   = Date.now() - timestamp;
    if (date !== today || age > CACHE_TTL_MS) return null;
    return briefing;
  } catch { return null; }
}

function saveCache(briefing) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      briefing,
      timestamp: Date.now(),
      date: new Date().toDateString()
    }));
  } catch { /* storage unavailable */ }
}

// ── Log to SapphiraLog sheet ──────────────────────────────────────────────
async function logBriefing(briefing) {
  try {
    await fetch(SAPPHIRA_API, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tab: 'SapphiraLog',
        row: {
          Date:      new Date().toLocaleDateString(),
          DayType:   briefing.mode,
          FirstTask: briefing.firstTask,
          Mode:      briefing.mode,
          Timestamp: new Date().toISOString()
        }
      })
    });
  } catch { /* log failure is non-fatal */ }
}

// ── Get briefing (cached or fresh) ───────────────────────────────────────
async function getSapphiraBriefing() {
  const cached = loadCache();
  if (cached) return { briefing: cached, fromCache: true };

  const context  = await gatherContext();
  const briefing = await askSapphira(context);
  saveCache(briefing);
  logBriefing(briefing); // fire and forget
  return { briefing, fromCache: false };
}

// ── Render helpers ────────────────────────────────────────────────────────
function escH(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const MODE_LABELS = {
  'full':           'Full Day',
  'need brainwork': 'Brainwork Day',
  'need exertion':  'Exertion Day',
  'need clarity':   'Clarity Day',
  'need baseline':  'Baseline Day',
  'need rest':      'Rest Day'
};

// ── Render the briefing panel ─────────────────────────────────────────────
function renderBriefing(briefing, panel) {
  const modeLabel = MODE_LABELS[briefing.mode] || briefing.mode;

  panel.innerHTML = `
    <div class="sap-orientation">${escH(briefing.orientation)}</div>

    <div class="sap-mode-row">
      <span class="sap-mode-badge">${escH(modeLabel)}</span>
      <span class="sap-mode-reason">${escH(briefing.modeReason)}</span>
    </div>

    <div class="sap-plan">${escH(briefing.adjustedPlan)}</div>

    <div class="sap-first-task-wrap">
      <div class="sap-first-task-label">first task</div>
      <div class="sap-first-task">${escH(briefing.firstTask)}</div>
    </div>

    <div class="sap-reasoning">${escH(briefing.reasoning)}</div>

    <div class="sap-actions">
      <button class="sap-btn-dismiss" id="sap-dismiss">got it</button>
    </div>
  `;

  document.getElementById('sap-dismiss')?.addEventListener('click', () => {
    dismissSapphira();
  });
}

function renderLoading(panel) {
  panel.innerHTML = `
    <div class="sap-loading">
      <span class="sap-loading-dot"></span>
      <span class="sap-loading-text">Sapphira is thinking.</span>
    </div>
  `;
}

function renderError(panel, err) {
  panel.innerHTML = `
    <div class="sap-error">
      Could not load briefing.
      <button class="sap-btn-retry" id="sap-retry">retry</button>
    </div>
  `;
  document.getElementById('sap-retry')?.addEventListener('click', () => initSapphira());
}

// ── Dismiss for the session ───────────────────────────────────────────────
function dismissSapphira() {
  sessionStorage.setItem('sapphira-dismissed', new Date().toDateString());
  const panel = document.getElementById('sapphira-panel');
  if (panel) {
    panel.style.transition = 'opacity 0.3s';
    panel.style.opacity = '0';
    setTimeout(() => { panel.style.display = 'none'; }, 300);
  }
}

function isDismissed() {
  return sessionStorage.getItem('sapphira-dismissed') === new Date().toDateString();
}

// ── Init ──────────────────────────────────────────────────────────────────
async function initSapphira() {
  const panel = document.getElementById('sapphira-panel');
  if (!panel) return;
  if (isDismissed()) { panel.style.display = 'none'; return; }

  renderLoading(panel);

  try {
    const { briefing } = await getSapphiraBriefing();
    renderBriefing(briefing, panel);
  } catch (err) {
    console.error('Sapphira error:', err);
    renderError(panel, err);
  }
}
