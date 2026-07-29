(function () {
  const who = document.getElementById('who');
  const offersEl = document.getElementById('offers');
  const statsEl = document.getElementById('stats');
  const kpisEl = document.getElementById('kpis');
  const form = document.getElementById('offerForm');
  const formMsg = document.getElementById('formMsg');
  const promoWrap = document.getElementById('promoWrap');
  const offerType = document.getElementById('offerType');
  const editOfferId = document.getElementById('editOfferId');
  const offerFormTitle = document.getElementById('offerFormTitle');
  const offerFormHint = document.getElementById('offerFormHint');
  const offerSubmitBtn = document.getElementById('offerSubmitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  let offersCache = [];

  const STATUS_LABELS = {
    published: 'Опубликован',
    moderation: 'На модерации',
    rejected: 'Отклонён',
    draft: 'Черновик'
  };

  function badge(status) {
    const label = STATUS_LABELS[status] || status;
    return `<span class="partners-badge partners-badge--${status}">${label}</span>`;
  }

  function typeBadge(type) {
    const label = type === 'cpa' ? 'CPA' : 'Промо';
    return `<span class="partners-badge partners-badge--${type === 'cpa' ? 'cpa' : 'promo'}">${label}</span>`;
  }

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

  offerType.addEventListener('change', () => {
    promoWrap.hidden = offerType.value === 'cpa';
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/auth/logout', { method: 'POST', body: '{}' });
    location.href = '/frontend/partners/index.html';
  });

  const postbackBase = `${location.origin}/api/partners/postback`;
  const postbackUrlEl = document.getElementById('postbackUrl');
  const postbackExampleEl = document.getElementById('postbackExample');
  postbackUrlEl.textContent = `${postbackBase}?click_id={CLICK_ID}&amount={AMOUNT}&status=confirmed`;
  postbackExampleEl.textContent = `${postbackBase}?click_id=abc123&amount=500&status=confirmed`;

  document.getElementById('copyPostbackBtn').addEventListener('click', async () => {
    const btn = document.getElementById('copyPostbackBtn');
    try {
      await navigator.clipboard.writeText(postbackUrlEl.textContent);
      btn.textContent = 'Скопировано';
      setTimeout(() => { btn.textContent = 'Копировать'; }, 1500);
    } catch {
      btn.textContent = 'Не удалось';
    }
  });

  function clearEditMode() {
    editOfferId.value = '';
    form.reset();
    promoWrap.hidden = false;
    offerFormTitle.textContent = 'Новый оффер';
    offerFormHint.textContent = 'После отправки оффер попадёт на модерацию';
    offerSubmitBtn.textContent = 'Отправить на модерацию';
    cancelEditBtn.hidden = true;
    formMsg.hidden = true;
    document.getElementById('offerFormSection')?.classList.remove('is-editing');
  }

  function setField(name, value) {
    const el = form.elements.namedItem(name);
    if (el && 'value' in el) el.value = value == null ? '' : String(value);
  }

  function scrollToOfferForm() {
    const section = document.getElementById('offerFormSection');
    if (!section) return;
    const menu = document.querySelector('#menuContainer header, #menuContainer nav, .site-header, header');
    const offset = (menu?.getBoundingClientRect?.().height || 72) + 12;
    const top = section.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    section.classList.add('is-editing');
    const titleInput = form.elements.namedItem('title');
    if (titleInput && typeof titleInput.focus === 'function') {
      setTimeout(() => titleInput.focus({ preventScroll: true }), 350);
    }
  }

  function startEdit(offer) {
    if (!offer) return;
    editOfferId.value = String(offer.id);
    setField('type', offer.type === 'cpa' ? 'cpa' : 'promo');
    setField('title', offer.title || '');
    setField('promocode', offer.promocode || '');
    setField('landingUrl', offer.landing_url || '');
    setField('erid', offer.erid || '');
    setField('commissionText', offer.commission_text || '');
    setField('conditions', offer.conditions || '');
    const typeEl = form.elements.namedItem('type');
    promoWrap.hidden = typeEl && typeEl.value === 'cpa';
    offerFormTitle.textContent = 'Редактирование оффера';
    offerFormHint.textContent =
      'Сохранение снова отправит оффер на модерацию (снятие с публикации до одобрения)';
    offerSubmitBtn.textContent = 'Сохранить и на модерацию';
    cancelEditBtn.hidden = false;
    formMsg.hidden = true;
    scrollToOfferForm();
  }

  cancelEditBtn.addEventListener('click', () => clearEditMode());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      type: fd.get('type'),
      title: fd.get('title'),
      promocode: fd.get('promocode'),
      landingUrl: fd.get('landingUrl'),
      erid: fd.get('erid'),
      commissionText: fd.get('commissionText'),
      conditions: fd.get('conditions')
    };
    const id = String(fd.get('editId') || '').trim();
    try {
      if (id) {
        await api(`/advertiser/offers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        formMsg.textContent = 'Сохранено — оффер на модерации';
      } else {
        await api('/advertiser/offers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        formMsg.textContent = 'Отправлено на модерацию';
      }
      formMsg.hidden = false;
      formMsg.classList.add('is-ok');
      clearEditMode();
      await load();
    } catch (err) {
      formMsg.hidden = false;
      formMsg.classList.remove('is-ok');
      formMsg.textContent = err.message;
    }
  });

  function renderKpis(offers, stats) {
    const clicks = stats.reduce((sum, s) => sum + Number(s.clicks || 0), 0);
    const conversions = stats.reduce((sum, s) => sum + Number(s.conversions || 0), 0);
    kpisEl.hidden = false;
    kpisEl.innerHTML = `
      <div class="partners-kpi">
        <span class="partners-kpi__label">Офферы</span>
        <div class="partners-kpi__value">${offers.length}</div>
      </div>
      <div class="partners-kpi">
        <span class="partners-kpi__label">Клики</span>
        <div class="partners-kpi__value">${clicks}</div>
      </div>
      <div class="partners-kpi">
        <span class="partners-kpi__label">Конверсии</span>
        <div class="partners-kpi__value">${conversions}</div>
      </div>`;
  }

  async function loadWallet() {
    const { wallet, feeRate } = await api('/wallet');
    document.getElementById('walletBalance').textContent =
      `${Number(wallet.balance).toLocaleString('ru-RU')} ₽`;
    const hint = document.getElementById('topupHint');
    if (hint) {
      hint.textContent =
        `С конверсии списывается сумма паблишеру + ${Math.round((feeRate || 0.1) * 100)}% сети. Админ подтвердит заявку вручную (ЮKassa позже).`;
    }
    const { topups } = await api('/advertiser/topups');
    const list = document.getElementById('topupsList');
    if (!topups.length) {
      list.innerHTML = '<p class="partners-panel__hint">Заявок пока нет</p>';
      return;
    }
    list.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
      <th>ID</th><th>Сумма</th><th>Статус</th><th>Дата</th>
    </tr></thead><tbody>${topups.map((t) => `<tr>
      <td>${t.id}</td><td>${t.amount}</td><td>${escapeHtml(t.status)}</td>
      <td>${escapeHtml(String(t.created_at || '').slice(0, 19))}</td>
    </tr>`).join('')}</tbody></table></div>`;
  }

  const topupDrawer = document.getElementById('topupDrawer');
  function openTopup() { topupDrawer.hidden = false; }
  function closeTopup() { topupDrawer.hidden = true; }
  document.getElementById('openTopupBtn').addEventListener('click', openTopup);
  document.getElementById('closeTopupBtn').addEventListener('click', closeTopup);
  document.getElementById('topupBackdrop').addEventListener('click', closeTopup);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !topupDrawer.hidden) closeTopup();
  });

  document.getElementById('topupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msg = document.getElementById('topupMsg');
    try {
      await api('/advertiser/topups', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(fd.get('amount')) })
      });
      msg.hidden = false;
      msg.classList.add('is-ok');
      msg.textContent = 'Заявка создана — ждите подтверждения админа';
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
    if (me.user.role !== 'advertiser' && me.user.role !== 'admin') {
      location.href = '/frontend/partners/index.html';
      return;
    }
    who.textContent = me.user.email + (me.user.company ? ` · ${me.user.company}` : '');

    const [{ offers }, { stats }] = await Promise.all([
      api('/advertiser/offers'),
      api('/advertiser/stats')
    ]);

    await loadWallet();
    renderKpis(offers, stats);

    if (!offers.length) {
      offersEl.innerHTML = '<p class="partners-empty">Пока нет офферов — создайте первый выше</p>';
    } else {
      offersCache = offers;
      offersEl.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
        <th>ID</th><th>Тип</th><th>Название</th><th>Статус</th><th>Ссылка</th><th></th>
      </tr></thead><tbody>${offers.map((o) => {
        const canUnpublish = ['published', 'moderation', 'rejected'].includes(o.status);
        return `<tr data-offer-id="${o.id}">
        <td class="partners-mono">${escapeHtml(o.public_id)}</td>
        <td>${typeBadge(o.type)}</td>
        <td><div class="partners-offer-title">${escapeHtml(o.title)}</div>
          ${o.promocode ? `<div class="partners-mono">${escapeHtml(o.promocode)}</div>` : ''}
          ${o.reject_reason ? `<div class="partners-msg">${escapeHtml(o.reject_reason)}</div>` : ''}
        </td>
        <td>${badge(o.status)}</td>
        <td class="partners-mono">${escapeHtml(o.landing_url)}</td>
        <td class="partners-row-actions">
          <button type="button" class="partners-btn partners-btn--ghost partners-btn--sm js-edit-offer">Изменить</button>
          ${canUnpublish
            ? `<button type="button" class="partners-btn partners-btn--ghost partners-btn--sm js-unpublish-offer">${
                o.status === 'published' ? 'Снять' : 'В черновик'
              }</button>`
            : ''}
        </td>
      </tr>`;
      }).join('')}</tbody></table></div>`;

      offersEl.querySelectorAll('.js-edit-offer').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = Number(btn.closest('tr').getAttribute('data-offer-id'));
          const offer = offersCache.find((x) => Number(x.id) === id);
          if (!offer) {
            alert('Оффер не найден в списке — обновите страницу');
            return;
          }
          startEdit(offer);
        });
      });
      offersEl.querySelectorAll('.js-unpublish-offer').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.closest('tr').getAttribute('data-offer-id'));
          const offer = offersCache.find((x) => Number(x.id) === id);
          const label = offer?.status === 'published' ? 'Снять оффер с публикации?' : 'Перевести оффер в черновик?';
          if (!confirm(label)) return;
          try {
            await api(`/advertiser/offers/${id}/unpublish`, { method: 'POST', body: '{}' });
            if (String(editOfferId.value) === String(id)) clearEditMode();
            await load();
          } catch (err) {
            alert(err.message || 'Ошибка');
          }
        });
      });
    }

    if (!stats.length) {
      statsEl.innerHTML = '<p class="partners-empty">Статистика появится после кликов по офферам</p>';
    } else {
      statsEl.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
        <th>Оффер</th><th>Клики</th><th>Конверсии</th><th>Сумма паблишеру</th>
      </tr></thead><tbody>${stats.map((s) => `<tr>
        <td><div class="partners-offer-title">${escapeHtml(s.title)}</div>
          <span class="partners-mono">${escapeHtml(s.public_id)}</span></td>
        <td>${s.clicks}</td><td>${s.conversions}</td><td>${s.amount}</td>
      </tr>`).join('')}</tbody></table></div>`;
    }
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  load().catch((e) => console.error(e));
})();
