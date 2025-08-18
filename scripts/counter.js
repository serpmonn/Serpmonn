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
    const years = Math.floor(daysTotal / 365);
    const months = Math.floor((daysTotal % 365) / 30);
    const days = daysTotal - years * 365 - months * 30;

    const yearWord = years % 10 === 1 && years % 100 !== 11 ? 'год' : (years % 10 >= 2 && years % 10 <= 4 && (years % 100 < 10 || years % 100 >= 20) ? 'года' : 'лет');
    const monthWord = months === 1 ? 'месяц' : (months >= 2 && months <= 4 ? 'месяца' : 'месяцев');
    const dayWord = days % 10 === 1 && days % 100 !== 11 ? 'день' : (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20) ? 'дня' : 'дней');

    const parts = [];
    if (years > 0) parts.push(years + ' ' + yearWord);
    if (months > 0) parts.push(months + ' ' + monthWord);
    if (parts.length === 0) parts.push(days + ' ' + dayWord);

    outEl.textContent = parts.join(' ');
}

window.addEventListener('DOMContentLoaded', () => {
    try { updateCounter(); } catch {}
    try { updateProjectAge(); } catch {}
});