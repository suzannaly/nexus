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
    modalBody.innerHTML = entry
      ? `<h2>${entry.Phase}</h2><p>${entry.Content}</p>`
      : `<h2>${phase}</h2><p>No content yet.</p>`;
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
