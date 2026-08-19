function loadFailText() {
  return (typeof window !== 'undefined' && window.lbI18n?.loadFail) || 'Failed to load';
}

const BOARDS = [
  {
    gameId: 'redsquare2',
    bodyId: 'leaderboardBodyRedsquare2',
    formatScore: (score) => String(score ?? ''),
  },
  {
    gameId: 'neli',
    bodyId: 'leaderboardBodyNeli',
    formatScore: formatPlayTime,
  },
];

function formatPlayTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function rankClass(index) {
  if (index === 0) return 'lb-rank-1';
  if (index === 1) return 'lb-rank-2';
  if (index === 2) return 'lb-rank-3';
  return '';
}

function fillLeaderboardBody(body, rows, formatScore) {
  body.replaceChildren();
  if (!rows.length) {
    const row = document.createElement('tr');
    row.className = 'lb-empty';
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = window.lbI18n?.empty || 'Пока нет результатов';
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  rows.forEach((entry, index) => {
    const row = document.createElement('tr');
    const rankCls = rankClass(index);
    if (rankCls) row.className = rankCls;

    const rank = document.createElement('td');
    rank.textContent = String(index + 1);
    const nick = document.createElement('td');
    nick.textContent = String(entry.nickname ?? '');
    nick.title = nick.textContent;
    const score = document.createElement('td');
    score.textContent = formatScore(entry.score);
    row.append(rank, nick, score);
    body.appendChild(row);
  });
}

async function loadBoard({ gameId, bodyId, formatScore }) {
  const body = document.getElementById(bodyId);
  if (!body) return;

  body.replaceChildren();
  const loading = document.createElement('tr');
  loading.className = 'lb-loading';
  const cell = document.createElement('td');
  cell.colSpan = 3;
  cell.textContent = '…';
  loading.appendChild(cell);
  body.appendChild(loading);

  try {
    const response = await fetch(`/leaderboard?gameId=${encodeURIComponent(gameId)}&limit=20`);
    const data = await response.json();
    const rows = Array.isArray(data) ? data : [];
    fillLeaderboardBody(body, rows, formatScore);
  } catch (error) {
    console.error(`Leaderboard load failed (${gameId}):`, error);
    body.replaceChildren();
    const row = document.createElement('tr');
    row.className = 'lb-error';
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = loadFailText();
    row.appendChild(cell);
    body.appendChild(row);
  }
}

export function loadLeaderboard() {
  BOARDS.forEach((board) => {
    loadBoard(board);
  });
}

function scrollToHashBoard() {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return;
  const section = document.getElementById(`${hash}-board`);
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  scrollToHashBoard();
});
