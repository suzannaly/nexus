const API = 'https://script.google.com/macros/s/AKfycbxijZbHHPc0Pzo_DOpf2NN2OdeDHjX8j-qdlPADasGvMKanphW_-RI_fwuV5f7-5KOJcg/exec';

// ── Fetch data from a tab ──────────────────────────────────────────────────
async function getData(tab) {
  const res = await fetch(`${API}?tab=${tab}`);
  return await res.json();
}

// ── Post data to a tab ────────────────────────────────────────────────────
async function postData(tab, row) {
  await fetch(API, {
    method: 'POST',
    body: JSON.stringify({ tab, row })
  });
}

// ── Anchor modal ──────────────────────────────────────────────────────────
const modal = document.getElementById('anchor-modal');
const modalBody = document.getElementById('anchor-body');
const closeBtn = document.getElementById('anchor-close');

document.querySelectorAll('.anchor-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const phase = btn.dataset.phase.toUpperCase();
    const data = await getData('Anchor');
    const entry = data.find(r => r.Phase && r.Phase.toUpperCase() === phase);
if (entry) {
  const content = entry.Content || '';
  const isLinks = content.includes('http');
  console.log('content:', JSON.stringify(content));
console.log('isTimers:', /^\d+(\|\d+)*$/.test(content.trim()));
  const isTimers = /^\d+(\|\d+)*$/.test(content.trim());
  let bodyHTML = `<h2>${entry.Phase}</h2>`;

  if (isLinks) {
    const links = content.split('|').map(l => l.trim());
    bodyHTML += links.map(item => {
      const [label, url] = item.split(/:(.+)/);
      return `<a href="${url}" target="_blank" class="anchor-link">${label}</a>`;
    }).join('');
    modalBody.innerHTML = bodyHTML;

  } else if (isTimers) {
    const minutes = content.split('|').map(m => parseInt(m.trim()));
    bodyHTML += minutes.map(m =>
      `<button class="anchor-link timer-btn" data-minutes="${m}">${m} min</button>`
    ).join('');
    bodyHTML += `<div id="timer-display" style="text-align:center;font-size:48px;margin-top:20px;color:var(--primary);font-family:monospace;"></div>`;
    bodyHTML += `<button id="timer-cancel" class="anchor-link" style="display:none;text-align:center;">cancel</button>`;
    modalBody.innerHTML = bodyHTML;

    let countdown;
    document.querySelectorAll('.timer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        clearInterval(countdown);
        let secs = parseInt(btn.dataset.minutes) * 60;
        const display = document.getElementById('timer-display');
        const cancel = document.getElementById('timer-cancel');
        cancel.style.display = 'block';
        const tick = () => {
          const m = Math.floor(secs / 60);
          const s = secs % 60;
          display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
          if (secs <= 0) {
            clearInterval(countdown);
            display.textContent = 'done';
            return;
          }
          secs--;
        };
        tick();
        countdown = setInterval(tick, 1000);
        cancel.addEventListener('click', () => {
          clearInterval(countdown);
          display.textContent = '';
          cancel.style.display = 'none';
        });
      });
    });

  } else {
    bodyHTML += `<p>${content}</p>`;
    modalBody.innerHTML = bodyHTML;
  }
} else {
  modalBody.innerHTML = `<h2>${phase}</h2><p>No content yet.</p>`;
}
    modal.classList.remove('hidden');
  });
});

closeBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
});

// ── Load tasks ────────────────────────────────────────────────────────────
async function loadTasks() {
  const tasks = await getData('Tasks');
  console.log('Tasks:', tasks);
  // rendering comes next
}

loadTasks();
