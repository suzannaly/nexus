// Saphira.js — renders Saphira's briefings into #Saphira-panel
// Claude API call routes through GAS proxy — key never touches the browser.

const Saphira_GAS = 'https://script.google.com/macros/s/AKfycbxcw0Idgactfq_oG_hGIOe2H4xoDgVzLjg6uchxBg3AONOXgDwfD8WhBnJHjR9yXOQzzQ/exec';
const CACHE_KEY    = 'Saphira-cache';
const CACHE_DATE   = 'Saphira-cache-date';

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
  return document.getElementById('Saphira-panel');
}

// ── Loading state ─────────────────────────────────────────────────────────

function showLoading() {
  getPanel().innerHTML = `
    <div class="sap-loading">
      <div class="sap-loading-dot"></div>
      <span class="sap-loading-text">Saphira is reading the day…</span>
    </div>
  `;
}

// ── Error state ───────────────────────────────────────────────────────────

function showError(msg) {
  getPanel().innerHTML = `
    <div class="sap-error">
      ${esc(msg || 'could not reach Saphira')}
      <button class="sap-btn-retry" onclick="initSaphira()">retry</button>
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
    <div class="sap-layout">

      <!-- Left: all briefing content -->
      <div class="sap-inner">

        <!-- Header -->
        <div class="sap-header">
          <div class="sap-header-left">
            <div class="sap-avatar">
              <img src="images/saphira.png" alt="Saphira"
                onerror="this.style.display='none'">
              <div class="sap-avatar-ring"></div>
            </div>
            <div>
              <div class="sap-name">
                Saphira
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
        <button class="sap-btn-dismiss" onclick="dismissSaphira()">Got it</button>

      </div>

      <!-- Right: portrait -->
      <div class="sap-portrait-wrap">
        <img
          src="images/saphira.png"
          alt="Saphira"
          class="sap-portrait"
          onerror="this.parentElement.style.display='none'"
        >
        <div class="sap-portrait-fade"></div>
      </div>

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

function dismissSaphira() {
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
  const [tasks, context, calendar] = await Promise.all([
    fetch(`${Saphira_GAS}?tab=Tasks`).then(r => r.json()).catch(() => []),
    fetch(`${Saphira_GAS}?tab=Context`).then(r => r.json()).catch(() => []),
    fetch(`${Saphira_GAS}?calendar=today`).then(r => r.json()).catch(() => []),
  ]);

 const activeTasks = (tasks || []).filter(t => t.Done !== 'TRUE' && t.Done !== true && t.Title);
  const contextMap  = Object.fromEntries((context || []).map(r => [r.Key, r.Value]));
  const todayEvents = Array.isArray(calendar) ? calendar : [];

  return { activeTasks, contextMap, todayEvents };
}

// ── Build Claude payload ──────────────────────────────────────────────────

function buildPayload(activeTasks, contextMap, todayEvents) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  const timeStr = new Date().toLocaleTimeString('en-US', { 
  hour: 'numeric', minute: '2-digit', hour12: true 
});
  const taskList = activeTasks.slice(0, 12).map((t, i) =>
  `${i + 1}. ${t.Title}` +
  (t.Priority ? ` [${t.Priority}]` : '') +
  (t.Deadline ? ` (due ${new Date(t.Deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})})` : '') +
  (t.Category ? ` · ${t.Category}` : '') +
  (t.Notes ? ` — ${t.Notes}` : '')   
).join('\n');

  const contextStr = Object.entries(contextMap)
    .map(([k, v]) => `${k}: ${v}`).join('\n') || 'No context flags set.';
 const calendarStr = todayEvents.length
    ? todayEvents.map(ev => {
        const start = ev.allDay ? 'all day' : new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const end   = ev.allDay ? '' : ` – ${new Date(ev.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        return `[${ev.calendar}] ${ev.title} · ${start}${end}${ev.location ? ' · ' + ev.location : ''}`;
      }).join('\n')
    : 'No events today.';
 

const systemPrompt = `You are Saphira — a calm, stoic, precise daily orientation engine and mentor for a personal operating system called Nexus. You are not a chatbot, do not present false information, make up something without being explicitly told to do so, or say you can do something you can't. Any information from outside sources must be cited. You deliver clear status readings.
I am Suzy, I am autistic, a morning person, work overnight warehouse shifts Thu–Sat, and am sharpest 6–10am Mon/Tue. I am managing caregiving for family members (Primarily Dan, who has Cancer) and may have kids present on some days. Executive function support is a core need — every output should reduce decisions, not add them.
You receive: today's date, active tasks (with notes and done status), and context flags. Use ALL context flags in your reasoning.

CONTEXT FLAG GUIDE:
- DanStatus: Dan's general health status (stable, under but okay, sick)
- DanNeeds: specific needs ANYONE -not just dan- has today (tasks, time, other)
- KidDay / KidCount: whether kids are present and how many — affects focus availability
- WorkShiftTonight: true if user works overnight tonight — will be 2 scheduled sleep times
- ShiftStart / ShiftEnd: shift times if working tonight
- ModeOverride: if set, use this as the day mode instead of inferring one (e.g. "Rest day")
- TodayConstraint: a one-line hard constraint on the day (e.g. "interview at 3pm")
- BackgroundStressor: low-level anxiety source — weave awareness into reasoning, do not just optimize tasks in a vacuum
- Note: freeform context from the user
- Eating: the specific food planned (e.g. "Roast Beef") — present as a non-negotiable directive
- MealPlan: the eating protocol (e.g. "KETO") — present as a non-negotiable directive
- EatTime: when the first or main meal is scheduled
- ChoreFocus / WheelFocus: specific chore or area to focus on — non-negotiable directive if set
- LastDailyTidy: date of last tidy — factor into urgency of home tasks
- MotivationNeed: High means push hard, use strong directive language; Low means soften, suggest instead of direct
- WorkoutPlan: specific workout to do today — non-negotiable directive if set
- WorkoutDone: whether workout is already complete
- ProcessComplete: whether morning process is already complete
- SleepHours: hours when sleep should occur, may be 2 sleeps on each day
- Meds: medication status
- Schedule: today's planned activities: how far in the workout, chores (y or n), process (y or n)
- PlanStart: what time the day’s plan starts
- LearningFocus: specific learning topic or resource for today — non-negotiable directive if set
- LearningWeekTarget: what the user is trying to accomplish this week in learning
- LearningPressureLevel: how much pressure exists around learning this week
- ProjectFocus: specific project to work on today — non-negotiable directive if set
- BillsToday / BillsTomorrow: total of bills due today and tomorrow — flag if action is needed
- BookkeepingLastDone: when bookkeeping was last completed — flag if overdue

You reason about what the current state is and what the single most important first move is in 4 domains: Self-improvement (learning), health, home, and caregiving (including self-care). Then list that and a rough plan for the day.

Output ONLY valid JSON — no markdown, no preamble, no explanation:
{
  "mode": "short mode name (e.g. Brainwork day, Rest day, Logistics day)",
  "topLine": "one sentence: the clearest true thing about today",
  "reasoning": ["thread 1", "thread 2", "thread 3"],
  "day": "paragraph: how the day should unfold, use Schedule as minimum guide",
  "eat": "specific eating directive — non-negotiable if Eating or MealPlan is set (e.g. Keto day, roast beef at 11am, no snacks)",
  "home": "specific chore directive — non-negotiable if ChoreFocus is set (e.g. focus on kitchen today)",
  "workout": "specific workout directive — non-negotiable if WorkoutPlan is set (e.g. posterior chain and glutes session today)",
  "learning": "specific learning directive — non-negotiable if LearningFocus is set",
  "project": "specific project directive — non-negotiable if ProjectFocus is set",
  "firstTask": {
    "title": "specific actionable first step",
    "why": "one sentence: why this, first",
    "domain": "domain e.g. Health · Morning Process",
    "due": "due date if relevant, else empty string"
  }
}`;


const userMessage = `Today is ${today} at ${timeStr}.
ACTIVE TASKS:
${taskList || 'No active tasks.'}

TODAY'S CALENDAR (Suzy + Dan):
${calendarStr}

CONTEXT FLAGS:
${contextStr}

Deliver the reading.`;

  return {
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  };
}

// ── Call Claude via GAS proxy ─────────────────────────────────────────────
async function callClaudeViaProxy(payload) {
  const res = await fetch(Saphira_GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ Saphira: 1, payload })
  });
  const result = await res.json();
  if (result.error) throw new Error(result.error);
  const text = result.content?.[0]?.text || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// ── Init ──────────────────────────────────────────────────────────────────

async function initSaphira() {
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
    const { activeTasks, contextMap, todayEvents } = await fetchSheetData();
const payload  = buildPayload(activeTasks, contextMap, todayEvents);
    const briefing = await callClaudeViaProxy(payload);

    localStorage.setItem(CACHE_KEY,  JSON.stringify(briefing));
    localStorage.setItem(CACHE_DATE, todayStr());

    renderBriefing(briefing);
  } catch(e) {
    console.error('Saphira error:', e);
    showError(e.message);
  }
}
// ── Chat state ────────────────────────────────────────────────────────────

let chatHistory = [];

// ── Open / switch to chat ─────────────────────────────────────────────────

function openSaphiraChat() {
  const panel = getPanel();

  if (panel.style.display === 'none' || panel.style.maxHeight === '0px') {
    // Panel is collapsed — open it in chat mode
    panel.style.display = 'block';
    panel.style.opacity = '0';
    panel.style.maxHeight = '0';
    panel.style.overflow = 'hidden';
    panel.style.transition = 'opacity 0.4s ease, max-height 0.5s ease';
    renderChatPanel();
    setTimeout(() => {
      panel.style.opacity = '1';
      panel.style.maxHeight = '600px';
    }, 10);
  } else {
    // Panel is open (briefing showing) — swap to chat
    renderChatPanel();
  }
}

// ── Render chat panel ─────────────────────────────────────────────────────

function renderChatPanel() {
  const panel = getPanel();

  const messagesHTML = chatHistory.map(m => `
    <div class="sap-chat-msg sap-chat-msg--${m.role}">
    <div class="sap-chat-bubble">${String(m.content || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
    </div>`).join('');

  panel.innerHTML = `
    <div class="sap-layout">
      <div class="sap-inner">
        <div class="sap-header">
          <div class="sap-header-left">
            <div class="sap-avatar" onclick="resetSaphira()" title="Refresh Saphira" style="cursor:pointer">
  <img src="https://raw.githubusercontent.com/suzannaly/nexus/main/images/saphira.png" alt="Saphira">
  <div class="sap-avatar-ring"></div>
</div>
            <div>
              <div class="sap-name">Saphira <span class="sap-name-sep">·</span> <span class="sap-name-sub">chat</span></div>
              <div class="sap-date">${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
            </div>
          </div>
          <div class="sap-header-right">
            <div class="sap-pulse"></div>
            <span class="sap-status-label">online</span>
          </div>
        </div>

        <div id="sap-chat-messages" class="sap-chat-messages">
          ${messagesHTML.length ? messagesHTML : '<div class="sap-chat-empty">Ask me anything about today.</div>'}
        </div>

        <div class="sap-chat-input-row">
          <input id="sap-chat-input" class="sap-chat-input" type="text" placeholder="Message Saphira…"
            onkeydown="if(event.key==='Enter')sendChatMessage()">
          <button class="sap-chat-send" onclick="sendChatMessage()">→</button>
        </div>

        <div style="margin-top:10px">
          <button class="sap-btn-dismiss" onclick="dismissSaphira()">got it</button>
        </div>
      </div>
      <div class="sap-portrait-wrap">
        <img class="sap-portrait" src="https://raw.githubusercontent.com/suzannaly/nexus/main/images/saphira.png" alt="">
        <div class="sap-portrait-fade"></div>
      </div>
    </div>`;
}


// ── Call GAS chat route ───────────────────────────────────────────────────
async function callChatViaProxy(message) {
  const payload = {
    action: 'chat',
    message,
    history: chatHistory.slice(-10)
  };
  const res = await fetch(Saphira_GAS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });

  const result = await res.json();
  console.log('RAW RESULT:', result);

  if (result.error) throw new Error(result.error);

  let reply = result.reply;
  let actions = [];

  try {
    const cleaned = reply.replace(/```json|```/g, '').trim();
    console.log('CLEANED:', cleaned);
    const parsed = JSON.parse(cleaned);
    if (parsed.reply) {
      reply = parsed.reply;
      actions = parsed.actions || [];
    }
  } catch(e) {
    console.log('PARSE ERROR:', e);
  }

  if (actions.length > 0) {
    await Promise.all(actions.map(a =>
      fetch(Saphira_GAS, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'updateContext',
          key: a.key,
          value: a.value
        })
      })
    ));
  }

  return { reply, actions };
}

// ── Send message ──────────────────────────────────────────────────────────
async function sendChatMessage() {
  const input = document.getElementById('sap-chat-input');
  const text  = input.value.trim();
  if (!text) return;

  input.value = '';
  chatHistory.push({ role: 'user', content: text });
  renderChatPanel();

  const messages = document.getElementById('sap-chat-messages');
  const typing = document.createElement('div');
  typing.className = 'sap-chat-msg sap-chat-msg--assistant';
  typing.innerHTML = '<div class="sap-chat-bubble sap-chat-typing">…</div>';
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;

  try {
    const { reply, actions } = await callChatViaProxy(text);

    let displayReply = reply;
    if (actions && actions.length > 0) {
      const updates = actions.map(a => `${a.key} → ${a.value}`).join(', ');
      displayReply += `\n\n*Updated: ${updates}*`;
    }

    chatHistory.push({ role: 'assistant', content: displayReply });
    renderChatPanel();
  } catch(e) {
    console.log('SEND ERROR:', e);
    chatHistory.push({ role: 'assistant', content: 'Something went wrong. Try again.' });
    renderChatPanel();
  }
}
// ── Reset Saphira ───────────────────────────────────────────────────
function resetSaphira() {
  localStorage.removeItem('saphira-cache');
  localStorage.removeItem('saphira-cache-date');
  initSaphira();
}
