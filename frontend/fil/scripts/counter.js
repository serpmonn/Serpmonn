async function updateCounter() {
    const response = await fetch('/counter');
    const data = await response.json();
    const el = document.getElementById('userCounter');
    if (el && typeof data.count !== 'undefined') {
        el.textContent = data.count;
    }
}

function updateProjectAge() {
    const dataEl = document.getElementById('projectAgeData');
    const outEl = document.getElementById('projectAgeValue');
    if (!dataEl || !outEl) return;
    const startIso = dataEl.getAttribute('data-start');
    const startDate = new Date(startIso);
    const now = new Date();

    const ms = now - startDate;
    if (isNaN(ms) || ms < 0) { outEl.textContent = '—'; return; }

    const daysTotal = Math.floor(ms / (1000 * 60 * 60 * 24));

    const dayWord = daysTotal % 10 === 1 && daysTotal % 100 !== 11
        ? 'день'
        : (daysTotal % 10 >= 2 && daysTotal % 10 <= 4 && (daysTotal % 100 < 10 || daysTotal % 100 >= 20)
            ? 'дня'
            : 'дней');

    outEl.textContent = daysTotal + ' ' + dayWord;
}

window.addEventListener('DOMContentLoaded', () => {
    try { updateCounter(); } catch {}
    try { updateProjectAge(); } catch {}
});