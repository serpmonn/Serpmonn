(function () {
  const I = window.PartnersI18n;
  if (I) I.apply();
  const t = (key, vars) => (I ? I.t(key, vars) : key);
  const authUrl = () => (I ? I.authUrl() : '/frontend/partners/index.html');
  const helpEl = document.getElementById('cabinetHelpLink');
  if (helpEl && I) helpEl.href = I.helpUrl('publisher');

  const who = document.getElementById('who');
  const offersEl = document.getElementById('offers');
  const statsEl = document.getElementById('stats');

  function emptyState(text, ctaLabel, ctaAction) {
    const actionAttr = ctaAction ? ` data-empty-action="${ctaAction}"` : '';
    const btn = ctaLabel
      ? `<button type="button" class="partners-btn partners-btn--sm js-empty-cta"${actionAttr}>${ctaLabel}</button>`
      : '';
    return `<div class="partners-empty"><p>${text}</p>${btn}</div>`;
  }

  function formatWhen(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function showSection(name) {
    document.querySelectorAll('.partners-section-tab').forEach((btn) => {
      const on = btn.getAttribute('data-section') === name;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('[data-section-panel]').forEach((panel) => {
      const on = panel.getAttribute('data-section-panel') === name;
      panel.hidden = !on;
      panel.classList.toggle('is-active', on);
    });
  }

  document.querySelectorAll('.partners-section-tab').forEach((btn) => {
    btn.addEventListener('click', () => showSection(btn.getAttribute('data-section')));
  });

  async function api(path, opts = {}) {
    const res = await fetch('/api/partners' + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts
    });
    if (res.status === 401) {
      location.href = authUrl();
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
    location.href = authUrl();
  });

  const payoutDrawer = document.getElementById('payoutDrawer');
  function openPayout() { payoutDrawer.hidden = false; }
  function closePayout() { payoutDrawer.hidden = true; }
  document.getElementById('openPayoutBtn').addEventListener('click', openPayout);
  document.getElementById('moneyPayoutBtn')?.addEventListener('click', openPayout);
  document.getElementById('closePayoutBtn').addEventListener('click', closePayout);
  document.getElementById('payoutBackdrop').addEventListener('click', closePayout);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !payoutDrawer.hidden) closePayout();
  });

  async function loadWallet() {
    const { wallet, minPayout, holdDays } = await api('/wallet');
    document.getElementById('walletBalance').textContent =
      `${Number(wallet.available).toLocaleString('ru-RU')} ₽`;
    const parts = [];
    if (wallet.hold > 0) {
      parts.push(t('payout.hold', {
        n: Number(wallet.hold).toLocaleString('ru-RU'),
        days: holdDays ?? 7
      }));
    } else if (holdDays > 0) {
      parts.push(t('payout.holdDaysDefault', { days: holdDays }));
    }
    parts.push(t('payout.min', { n: Number(minPayout).toLocaleString('ru-RU') }));
    const holdText = parts.join('. ');
    document.getElementById('walletHold').textContent = holdText;
    const moneyHint = document.getElementById('moneyHoldHint');
    if (moneyHint) moneyHint.textContent = holdText;
    const amountInput = document.querySelector('#payoutForm [name=amount]');
    if (amountInput) amountInput.min = String(minPayout || 1000);

    const { payouts } = await api('/publisher/payouts');
    const list = document.getElementById('payoutsList');
    if (!payouts.length) {
      list.innerHTML = `<p class="partners-drawer__hint">${t('payout.empty')}</p>`;
      return;
    }
    list.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
      <th>${t('th.id')}</th><th>${t('th.amount')}</th><th>${t('th.status')}</th>
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
      msg.textContent = t('payout.created');
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
      location.href = authUrl();
      return;
    }
    who.textContent = `${me.user.email} · код ${me.user.publisherCode || '—'}`;
    await loadWallet();

    const { offers } = await api('/publisher/offers');
    if (!offers.length) {
      offersEl.innerHTML = emptyState(t('catalog.empty'), null, null);
    } else {
      offersEl.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
        <th>${t('stats.offer')}</th><th>${t('th.type')}</th><th>${t('catalog.commission')}</th><th>${t('catalog.hold')}</th><th>${t('catalog.yourLink')}</th>
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
        <td>${escapeHtml(String(o.hold_days != null ? o.hold_days : '—'))}</td>
        <td>
          <div class="partners-link-row">
            <div class="partners-mono partners-link-row__url">${escapeHtml(trackUrl)}</div>
            <button type="button" class="partners-btn partners-btn--ghost partners-btn--sm copy-btn" data-url="${escapeHtml(trackUrl)}">${t('catalog.copy')}</button>
          </div>
        </td>
      </tr>`;
      }).join('')}</tbody></table></div>`;
      offersEl.querySelectorAll('.copy-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(btn.getAttribute('data-url'));
            btn.textContent = t('catalog.copied');
            setTimeout(() => { btn.textContent = t('catalog.copy'); }, 1500);
          } catch {
            btn.textContent = t('postback.copyFail');
          }
        });
      });
    }

    const { stats } = await api('/publisher/stats');
    if (!stats.length) {
      statsEl.innerHTML = emptyState(t('stats.emptyPub'), t('stats.emptyPubCta'), 'goto-catalog');
      statsEl.querySelectorAll('.js-empty-cta').forEach((btn) => {
        btn.addEventListener('click', () => showSection('catalog'));
      });
    } else {
      statsEl.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
        <th>${t('stats.offer')}</th><th>${t('stats.clicks')}</th><th>${t('stats.conversions')}</th><th>${t('stats.amount')}</th><th>${t('stats.held')}</th><th>${t('stats.lastAt')}</th>
      </tr></thead><tbody>${stats.map((s) => `<tr>
        <td><div class="partners-offer-title">${escapeHtml(s.title)}</div>
          <span class="partners-mono">${escapeHtml(s.public_id)}</span></td>
        <td>${s.clicks}</td><td>${s.conversions}</td><td>${s.amount}</td>
        <td>${s.held || 0}</td>
        <td class="partners-mono">${formatWhen(s.last_at)}</td>
      </tr>`).join('')}</tbody></table></div>`;
    }
  }

  load().catch((e) => console.error(e));
})();
