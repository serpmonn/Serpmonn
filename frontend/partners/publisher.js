(function () {
  const who = document.getElementById('who');
  const offersEl = document.getElementById('offers');
  const statsEl = document.getElementById('stats');

  async function api(path, opts = {}) {
    const res = await fetch('/api/partners' + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts
    });
    if (res.status === 401) {
      location.href = '/frontend/partners/index.html';
      throw new Error('auth');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Ошибка');
    return data;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/auth/logout', { method: 'POST', body: '{}' });
    location.href = '/frontend/partners/index.html';
  });

  const payoutDrawer = document.getElementById('payoutDrawer');
  function openPayout() { payoutDrawer.hidden = false; }
  function closePayout() { payoutDrawer.hidden = true; }
  document.getElementById('openPayoutBtn').addEventListener('click', openPayout);
  document.getElementById('closePayoutBtn').addEventListener('click', closePayout);
  document.getElementById('payoutBackdrop').addEventListener('click', closePayout);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !payoutDrawer.hidden) closePayout();
  });

  async function loadWallet() {
    const { wallet, minPayout } = await api('/wallet');
    document.getElementById('walletBalance').textContent =
      `${Number(wallet.available).toLocaleString('ru-RU')} ₽`;
    const holdHint = wallet.hold > 0
      ? `В холде (заявки): ${Number(wallet.hold).toLocaleString('ru-RU')} ₽. `
      : '';
    document.getElementById('walletHold').textContent =
      `${holdHint}Минимум вывода: ${Number(minPayout).toLocaleString('ru-RU')} ₽`;
    const amountInput = document.querySelector('#payoutForm [name=amount]');
    if (amountInput) amountInput.min = String(minPayout || 1000);

    const { payouts } = await api('/publisher/payouts');
    const list = document.getElementById('payoutsList');
    if (!payouts.length) {
      list.innerHTML = '<p class="partners-panel__hint">Заявок пока нет</p>';
      return;
    }
    list.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
      <th>ID</th><th>Сумма</th><th>Статус</th>
    </tr></thead><tbody>${payouts.map((p) => `<tr>
      <td>${p.id}</td><td>${p.amount}</td><td>${escapeHtml(p.status)}</td>
    </tr>`).join('')}</tbody></table></div>`;
  }

  document.getElementById('payoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msg = document.getElementById('payoutMsg');
    try {
      await api('/publisher/payouts', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(fd.get('amount')),
          method: fd.get('method'),
          requisites: fd.get('requisites')
        })
      });
      msg.hidden = false;
      msg.classList.add('is-ok');
      msg.textContent = 'Заявка на вывод создана';
      e.target.reset();
      await loadWallet();
    } catch (err) {
      msg.hidden = false;
      msg.classList.remove('is-ok');
      msg.textContent = err.message;
    }
  });

  async function load() {
    const me = await api('/auth/me');
    if (me.user.role !== 'publisher' && me.user.role !== 'admin') {
      location.href = '/frontend/partners/index.html';
      return;
    }
    who.textContent = `${me.user.email} · код ${me.user.publisherCode || '—'}`;
    await loadWallet();

    const { offers } = await api('/publisher/offers');
    if (!offers.length) {
      offersEl.innerHTML = '<p class="partners-empty">Пока нет опубликованных офферов</p>';
    } else {
      offersEl.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
        <th>Оффер</th><th>Тип</th><th>Комиссия</th><th>Ваша ссылка</th>
      </tr></thead><tbody>${offers.map((o) => {
        const path = o.trackPath || o.trackUrl || '';
        const trackUrl = path.startsWith('http') ? path : `${location.origin}${path}`;
        return `<tr>
        <td><div class="partners-offer-title">${escapeHtml(o.title)}</div>
          ${o.promocode ? `<div class="partners-mono">код: ${escapeHtml(o.promocode)}</div>` : ''}
          <div class="partners__lead" style="margin:4px 0 0">${escapeHtml(o.conditions || '')}</div>
        </td>
        <td>${o.type}</td>
        <td>${escapeHtml(o.commission_text || '—')}</td>
        <td>
          <div class="partners-mono">${escapeHtml(trackUrl)}</div>
          <div class="partners-actions">
            <button type="button" class="partners-btn partners-btn--ghost copy-btn" data-url="${escapeHtml(trackUrl)}">Копировать</button>
          </div>
        </td>
      </tr>`;
      }).join('')}</tbody></table></div>`;
      offersEl.querySelectorAll('.copy-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(btn.getAttribute('data-url'));
            btn.textContent = 'Скопировано';
          } catch {
            btn.textContent = 'Не удалось';
          }
        });
      });
    }

    const { stats } = await api('/publisher/stats');
    if (!stats.length) {
      statsEl.innerHTML = '<p class="partners-empty">Статистика появится после кликов</p>';
    } else {
      statsEl.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
        <th>Оффер</th><th>Клики</th><th>Конверсии</th><th>Сумма</th>
      </tr></thead><tbody>${stats.map((s) => `<tr>
        <td><div class="partners-offer-title">${escapeHtml(s.title)}</div>
          <span class="partners-mono">${escapeHtml(s.public_id)}</span></td>
        <td>${s.clicks}</td><td>${s.conversions}</td><td>${s.amount}</td>
      </tr>`).join('')}</tbody></table></div>`;
    }
  }

  load().catch((e) => console.error(e));
})();
