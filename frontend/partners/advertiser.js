(function () {
  const I = window.PartnersI18n;
  if (I) I.apply();
  const t = (key, vars) => (I ? I.t(key, vars) : key);
  const authUrl = () => (I ? I.authUrl() : '/frontend/partners/index.html');
  const helpEl = document.getElementById('cabinetHelpLink');
  if (helpEl && I) helpEl.href = I.helpUrl('advertiser');
  const postbackHelp = document.getElementById('postbackHelpLink');
  if (postbackHelp && I) postbackHelp.href = I.helpUrl('tracking');

  const who = document.getElementById('who');
  const offersEl = document.getElementById('offers');
  const statsEl = document.getElementById('stats');
  const kpisEl = document.getElementById('kpis');
  const form = document.getElementById('offerForm');
  const formMsg = document.getElementById('formMsg');
  const promoWrap = document.getElementById('promoWrap');
  const offerType = document.getElementById('offerType');
  const offerCountry = document.getElementById('offerCountry');
  const eridWrap = document.getElementById('eridWrap');
  const eridOptional = document.getElementById('eridOptional');
  const eridHint = document.getElementById('eridHint');
  const offerErid = document.getElementById('offerErid');
  const editOfferId = document.getElementById('editOfferId');
  const offerFormTitle = document.getElementById('offerFormTitle');
  const offerFormHint = document.getElementById('offerFormHint');
  const offerSubmitBtn = document.getElementById('offerSubmitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  let offersCache = [];
  let defaultHoldDays = 7;
  let maxHoldDays = 180;

  function isRussiaCountry(code) {
    const s = String(code || 'RU').trim().toUpperCase();
    return !s || s === 'RU' || s === 'RUS' || s === 'RUSSIA';
  }

  function syncEridField() {
    const ru = isRussiaCountry(offerCountry?.value);
    if (eridOptional) eridOptional.hidden = ru;
    if (offerErid) {
      offerErid.required = ru;
      if (!ru) offerErid.value = '';
    }
    if (eridHint) {
      eridHint.textContent = ru ? t('offer.eridHintRu') : t('offer.eridHintOther');
    }
    if (eridWrap) eridWrap.hidden = false;
  }

  const STATUS_LABELS = {
    published: t('status.published'),
    moderation: t('status.moderation'),
    rejected: t('status.rejected'),
    draft: t('status.draft')
  };

  function badge(status) {
    const label = STATUS_LABELS[status] || status;
    return `<span class="partners-badge partners-badge--${status}">${label}</span>`;
  }

  function typeBadge(type) {
    const label = type === 'cpa' ? t('offer.cpa') : t('offer.promo');
    return `<span class="partners-badge partners-badge--${type === 'cpa' ? 'cpa' : 'promo'}">${label}</span>`;
  }

  function emptyState(text, ctaLabel, ctaAction) {
    const actionAttr = ctaAction ? ` data-empty-action="${ctaAction}"` : '';
    const btn = ctaLabel
      ? `<button type="button" class="partners-btn partners-btn--sm js-empty-cta"${actionAttr}>${ctaLabel}</button>`
      : '';
    return `<div class="partners-empty"><p>${text}</p>${btn}</div>`;
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

  offerType.addEventListener('change', () => {
    promoWrap.hidden = offerType.value === 'cpa';
  });
  offerCountry?.addEventListener('change', syncEridField);
  syncEridField();

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/auth/logout', { method: 'POST', body: '{}' });
    location.href = authUrl();
  });

  const postbackBase = `${location.origin}/api/partners/postback`;
  const postbackUrlEl = document.getElementById('postbackUrl');
  const postbackExampleEl = document.getElementById('postbackExample');
  postbackUrlEl.textContent = `${postbackBase}?click_id={CLICK_ID}&amount={AMOUNT}&status=confirmed`;
  postbackExampleEl.textContent = `${postbackBase}?click_id=abc123&amount=500&status=confirmed`;
  const postbackReject = document.getElementById('postbackRejectHint');
  if (postbackReject) {
    postbackReject.textContent = t('postback.reject', {
      url: `${postbackBase}?click_id={CLICK_ID}&status=rejected`
    });
  }

  document.getElementById('copyPostbackBtn').addEventListener('click', async () => {
    const btn = document.getElementById('copyPostbackBtn');
    try {
      await navigator.clipboard.writeText(postbackUrlEl.textContent);
      btn.textContent = t('postback.copied');
      setTimeout(() => { btn.textContent = t('postback.copy'); }, 1500);
    } catch {
      btn.textContent = t('postback.copyFail');
    }
  });

  function clearEditMode() {
    editOfferId.value = '';
    form.reset();
    promoWrap.hidden = false;
    if (offerCountry) offerCountry.value = 'RU';
    setField('holdDays', defaultHoldDays);
    syncEridField();
    syncHoldFieldLimits();
    offerFormTitle.textContent = t('offer.new');
    offerFormHint.textContent = t('offer.hint');
    offerSubmitBtn.textContent = t('offer.submit');
    cancelEditBtn.hidden = true;
    formMsg.hidden = true;
    document.getElementById('offerFormSection')?.classList.remove('is-editing');
  }

  function syncHoldFieldLimits() {
    const el = form.elements.namedItem('holdDays');
    if (!el) return;
    el.min = '0';
    el.max = String(maxHoldDays);
  }

  function setField(name, value) {
    const el = form.elements.namedItem(name);
    if (el && 'value' in el) el.value = value == null ? '' : String(value);
  }

  function scrollToOfferForm() {
    showSection('offers');
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
    setField('country', isRussiaCountry(offer.country) ? 'RU' : 'OTHER');
    setField('erid', offer.erid || '');
    setField('commissionText', offer.commission_text || '');
    setField('holdDays', offer.hold_days != null ? offer.hold_days : defaultHoldDays);
    setField('conditions', offer.conditions || '');
    const typeEl = form.elements.namedItem('type');
    promoWrap.hidden = typeEl && typeEl.value === 'cpa';
    syncEridField();
    offerFormTitle.textContent = t('offer.edit');
    offerFormHint.textContent = t('offer.editHint');
    offerSubmitBtn.textContent = t('offer.save');
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
      country: fd.get('country') || 'RU',
      erid: fd.get('erid'),
      commissionText: fd.get('commissionText'),
      holdDays: fd.get('holdDays'),
      conditions: fd.get('conditions')
    };
    const id = String(fd.get('editId') || '').trim();
    try {
      if (id) {
        await api(`/advertiser/offers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        formMsg.textContent = t('offer.saved');
      } else {
        await api('/advertiser/offers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        formMsg.textContent = t('offer.sent');
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
        <span class="partners-kpi__label">${t('kpi.offers')}</span>
        <div class="partners-kpi__value">${offers.length}</div>
      </div>
      <div class="partners-kpi">
        <span class="partners-kpi__label">${t('kpi.clicks')}</span>
        <div class="partners-kpi__value">${clicks}</div>
      </div>
      <div class="partners-kpi">
        <span class="partners-kpi__label">${t('kpi.conversions')}</span>
        <div class="partners-kpi__value">${conversions}</div>
      </div>`;
  }

  async function loadWallet() {
    const { wallet, feeRate, holdDays, maxHoldDays: maxHold, yookassa, topupRequisites } = await api('/wallet');
    defaultHoldDays = Number.isFinite(Number(holdDays)) ? Number(holdDays) : 7;
    maxHoldDays = Number.isFinite(Number(maxHold)) ? Number(maxHold) : 180;
    syncHoldFieldLimits();
    const holdInput = form.elements.namedItem('holdDays');
    if (holdInput && !editOfferId.value) setField('holdDays', defaultHoldDays);

    const bal = `${Number(wallet.balance).toLocaleString('ru-RU')} ₽`;
    document.getElementById('walletBalance').textContent = bal;
    const moneyBal = document.getElementById('moneyBalance');
    if (moneyBal) moneyBal.textContent = bal;

    const feePct = Math.round((feeRate || 0.1) * 100);
    const mult = (1 + (feeRate || 0.1)).toFixed(1);
    const feeHint = document.getElementById('moneyFeeHint');
    if (feeHint) {
      feeHint.textContent = t('money.advHintFee', {
        fee: feePct,
        mult,
        max: maxHoldDays
      });
    }

    const payOk = Boolean(yookassa?.paymentsEnabled);
    const btn = document.getElementById('topupSubmitBtn');
    if (btn) btn.textContent = payOk ? t('topup.submitYk') : t('topup.submitManual');

    const reqBox = document.getElementById('topupRequisites');
    const reqText = document.getElementById('topupRequisitesText');
    if (reqBox && reqText) {
      const req = String(topupRequisites || '').trim();
      if (req) {
        reqText.textContent = req;
        reqBox.hidden = false;
      } else {
        reqText.textContent = '';
        reqBox.hidden = true;
      }
    }

    const { topups } = await api('/advertiser/topups');
    const list = document.getElementById('topupsList');
    if (!list) return;
    if (!topups.length) {
      list.innerHTML = emptyState(t('topup.empty'), t('money.openTopup'), 'open-topup');
      bindEmptyCtas(list);
      return;
    }
    list.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
      <th>${t('th.id')}</th><th>${t('th.amount')}</th><th>${t('th.provider')}</th><th>${t('th.status')}</th><th>${t('th.date')}</th>
    </tr></thead><tbody>${topups.map((row) => `<tr>
      <td>${row.id}</td><td>${row.amount}</td><td>${escapeHtml(row.provider || 'manual')}</td>
      <td>${escapeHtml(row.status)}</td>
      <td>${escapeHtml(String(row.created_at || '').slice(0, 19))}</td>
    </tr>`).join('')}</tbody></table></div>`;
  }

  const topupDrawer = document.getElementById('topupDrawer');
  function openTopup() { topupDrawer.hidden = false; }
  function closeTopup() { topupDrawer.hidden = true; }
  document.getElementById('openTopupBtn').addEventListener('click', openTopup);
  document.getElementById('moneyTopupBtn')?.addEventListener('click', openTopup);
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
      const data = await api('/advertiser/topups', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(fd.get('amount')), provider: 'yookassa' })
      });
      if (data.confirmationUrl) {
        msg.hidden = false;
        msg.classList.add('is-ok');
        msg.textContent = t('topup.redirect');
        location.href = data.confirmationUrl;
        return;
      }
      msg.hidden = false;
      msg.classList.add('is-ok');
      const topupId = data.id != null ? data.id : data.topupId;
      msg.textContent = topupId != null
        ? t('topup.pendingId', { id: topupId })
        : t('topup.pending');
      e.target.reset();
      await loadWallet();
    } catch (err) {
      msg.hidden = false;
      msg.classList.remove('is-ok');
      msg.textContent = err.message;
    }
  });

  function bindEmptyCtas(root) {
    root.querySelectorAll('.js-empty-cta').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-empty-action');
        if (action === 'create-offer') {
          showSection('offers');
          scrollToOfferForm();
        } else if (action === 'open-topup') {
          openTopup();
        } else if (action === 'goto-offers') {
          showSection('offers');
        }
      });
    });
  }

  async function load() {
    const me = await api('/auth/me');
    if (me.user.role !== 'advertiser' && me.user.role !== 'admin') {
      location.href = authUrl();
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
      offersEl.innerHTML = emptyState(t('offer.empty'), t('offer.emptyCta'), 'create-offer');
      bindEmptyCtas(offersEl);
    } else {
      offersCache = offers;
      offersEl.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
        <th>${t('th.id')}</th><th>${t('th.type')}</th><th>${t('th.name')}</th><th>${t('catalog.commission')}</th><th>${t('offer.holdDays')}</th><th>${t('th.status')}</th><th>${t('th.link')}</th><th></th>
      </tr></thead><tbody>${offers.map((o) => {
        const canUnpublish = ['published', 'moderation', 'rejected'].includes(o.status);
        const hold = o.hold_days != null ? o.hold_days : defaultHoldDays;
        return `<tr data-offer-id="${o.id}">
        <td class="partners-mono">${escapeHtml(o.public_id)}</td>
        <td>${typeBadge(o.type)}</td>
        <td><div class="partners-offer-title">${escapeHtml(o.title)}</div>
          ${o.promocode ? `<div class="partners-mono">${escapeHtml(o.promocode)}</div>` : ''}
          ${o.reject_reason ? `<div class="partners-msg">${escapeHtml(o.reject_reason)}</div>` : ''}
        </td>
        <td>${escapeHtml(o.commission_text || '—')}</td>
        <td>${escapeHtml(String(hold))}</td>
        <td>${badge(o.status)}</td>
        <td class="partners-mono">${escapeHtml(o.landing_url)}</td>
        <td class="partners-row-actions">
          <button type="button" class="partners-btn partners-btn--ghost partners-btn--sm js-edit-offer">${t('offer.editBtn')}</button>
          ${canUnpublish
            ? `<button type="button" class="partners-btn partners-btn--ghost partners-btn--sm js-unpublish-offer">${
                o.status === 'published' ? t('offer.unpublish') : t('offer.toDraft')
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
            alert(t('offer.notFound'));
            return;
          }
          startEdit(offer);
        });
      });
      offersEl.querySelectorAll('.js-unpublish-offer').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.closest('tr').getAttribute('data-offer-id'));
          const offer = offersCache.find((x) => Number(x.id) === id);
          const label = offer?.status === 'published' ? t('offer.confirmUnpublish') : t('offer.confirmDraft');
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
      statsEl.innerHTML = emptyState(t('stats.emptyAdv'), t('stats.emptyAdvCta'), 'goto-offers');
      bindEmptyCtas(statsEl);
    } else {
      statsEl.innerHTML = `<div class="partners-table-wrap"><table class="partners-table"><thead><tr>
        <th>${t('stats.offer')}</th><th>${t('stats.clicks')}</th><th>${t('stats.conversions')}</th><th>${t('stats.toPublisher')}</th>
        <th>${t('stats.charged')}</th><th>${t('stats.settlement')}</th>
      </tr></thead><tbody>${stats.map((s) => {
        const settlement = [
          s.settled ? `ok ${s.settled}` : null,
          s.held ? `hold ${s.held}` : null,
          s.failed ? `fail ${s.failed}` : null,
          s.reversed ? `rev ${s.reversed}` : null
        ].filter(Boolean).join(' · ') || '—';
        return `<tr>
        <td><div class="partners-offer-title">${escapeHtml(s.title)}</div>
          <span class="partners-mono">${escapeHtml(s.public_id)}</span></td>
        <td>${s.clicks}</td><td>${s.conversions}</td><td>${s.amount}</td>
        <td>${Number(s.charged || 0).toLocaleString('ru-RU')}</td>
        <td>${escapeHtml(settlement)}</td>
      </tr>`;
      }).join('')}</tbody></table></div>`;
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
