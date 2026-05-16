// today.js — Nexus Today Section
// Manages Calendar
// Call initToday() to render.

const TODAY_GAS_URL = 'https://script.google.com/macros/s/AKfycbxcw0Idgactfq_oG_hGIOe2H4xoDgVzLjg6uchxBg3AONOXgDwfD8WhBnJHjR9yXOQzzQ/exec';
const IMG = 'https://raw.githubusercontent.com/suzannaly/nexus/main/images/';




// ─── State ────────────────────────────────────────────────────────────────────
let activeTab       = 'calendar';
let calendarEvents  = [];
let choresData      = [];
let completedChores = new Set();

// Collapse state — all start closed
let openGroups = new Set();
let openZones  = new Set();


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
// FETCH + INIT
// ══════════════════════════════════════════════════════════════════════════════

async function initToday() {
  renderToday();

  const [calRes] = await Promise.allSettled([
    fetch(`${TODAY_GAS_URL}?calendar=1`),
  
  ]);

  if (calRes.status === 'fulfilled') {
    try {
      calendarEvents = await calRes.value.json();
      if (!Array.isArray(calendarEvents)) calendarEvents = [];
    } catch { calendarEvents = []; }
  }

  
  renderToday();
}