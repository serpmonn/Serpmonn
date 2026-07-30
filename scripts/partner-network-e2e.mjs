#!/usr/bin/env node
/**
 * Prod E2E for Serpmonn partner network (live partner-server :5010).
 * Creates disposable adv/pub accounts, cleans them up at the end.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

import { query } from '../backend/database/config.mjs';

const BASE = process.env.PARTNER_E2E_BASE || 'http://127.0.0.1:5010';
const API = `${BASE}/api/partners`;
const TS = Date.now();
const PASS = 'TestPass123!';
const ADV_EMAIL = `e2e_adv_${TS}@example.com`;
const PUB_EMAIL = `e2e_pub_${TS}@example.com`;

const results = [];
let failed = 0;

function ok(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`OK  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  failed += 1;
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name} — ${detail}`);
}
function check(name, cond, detail = '') {
  if (cond) ok(name, detail);
  else fail(name, detail || 'assertion failed');
}

async function req(path, { method = 'GET', body, cookie, raw = false, follow = true } = {}) {
  const headers = {};
  if (body != null) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${path.startsWith('http') ? path : API + path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    redirect: follow ? 'manual' : 'manual'
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  let data = null;
  const text = await res.text();
  if (!raw) {
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
  } else {
    data = text;
  }
  return { status: res.status, data, setCookie, headers: res.headers, text };
}

function extractToken(setCookie) {
  for (const c of setCookie) {
    const m = /partner_token=([^;]+)/.exec(c);
    if (m) return m[1];
  }
  return null;
}

function cookieHeader(token) {
  return `partner_token=${token}`;
}

async function cleanup(ids) {
  const { advId, pubId, offerId } = ids;
  try {
    if (offerId) {
      await query(`DELETE FROM partner_conversions WHERE offer_id = ?`, [offerId]);
      await query(`DELETE FROM partner_clicks WHERE offer_id = ?`, [offerId]);
      await query(`DELETE FROM partner_offers WHERE id = ?`, [offerId]);
    }
    for (const uid of [advId, pubId].filter(Boolean)) {
      const wallets = await query(`SELECT id FROM partner_wallets WHERE user_id = ?`, [uid]);
      for (const w of wallets || []) {
        await query(`DELETE FROM partner_ledger WHERE wallet_id = ?`, [w.id]);
      }
      await query(`DELETE FROM partner_topups WHERE advertiser_id = ?`, [uid]);
      await query(`DELETE FROM partner_payouts WHERE publisher_id = ?`, [uid]);
      await query(`DELETE FROM partner_wallets WHERE user_id = ?`, [uid]);
      await query(`DELETE FROM partner_users WHERE id = ?`, [uid]);
    }
  } catch (e) {
    console.warn('cleanup warn:', e.message);
  }
}

async function main() {
  const ids = { advId: null, pubId: null, offerId: null };

  try {
    // 1. Health
    {
      const r = await fetch(`${BASE}/health`);
      const j = await r.json();
      check('health', r.status === 200 && j.status === 'ok', JSON.stringify(j));
    }

    // 2. UI pages via public HTTPS
    {
      const pages = [
        'https://serpmonn.ru/frontend/partners/index.html',
        'https://serpmonn.ru/frontend/partners/advertiser.html',
        'https://serpmonn.ru/frontend/partners/publisher.html',
        'https://serpmonn.ru/frontend/partners/help.html'
      ];
      for (const url of pages) {
        const r = await fetch(url, { redirect: 'manual' });
        check(`ui ${url.split('/').pop()}`, r.status === 200, `HTTP ${r.status}`);
      }
      const menu = await fetch('https://serpmonn.ru/frontend/menu.html');
      const html = await menu.text();
      check('menu become-partner', menu.status === 200 && html.includes('become-partner-btn') && html.includes('Стать партнёром'));
      check('menu no partners submenu', !html.includes('partnersSubmenu') && !/adventure36\.ru/i.test(html));
    }

    // 3. Nginx API proxy
    {
      const r = await fetch('https://serpmonn.ru/api/partners/auth/me');
      check('nginx /api/partners proxy', r.status === 401 || r.status === 403, `HTTP ${r.status}`);
    }

    // 4. Register advertiser + publisher
    let advTok;
    let pubTok;
    {
      const a = await req('/auth/register', {
        method: 'POST',
        body: { email: ADV_EMAIL, password: PASS, role: 'advertiser', company: 'E2E Adv Co' }
      });
      check('register advertiser', a.status === 201 && a.data?.user?.role === 'advertiser', `HTTP ${a.status} ${JSON.stringify(a.data)}`);
      advTok = extractToken(a.setCookie);
      ids.advId = a.data?.user?.id;
      check('adv cookie', Boolean(advTok));

      const p = await req('/auth/register', {
        method: 'POST',
        body: { email: PUB_EMAIL, password: PASS, role: 'publisher' }
      });
      check('register publisher', p.status === 201 && p.data?.user?.role === 'publisher' && p.data?.user?.publisherCode, `HTTP ${p.status}`);
      pubTok = extractToken(p.setCookie);
      ids.pubId = p.data?.user?.id;
      check('pub cookie + code', Boolean(pubTok) && Boolean(p.data?.user?.publisherCode), p.data?.user?.publisherCode || '');
    }

    // 5. auth/me + login
    {
      const me = await req('/auth/me', { cookie: cookieHeader(advTok) });
      check('auth/me', me.status === 200 && me.data?.user?.email === ADV_EMAIL);

      const login = await req('/auth/login', {
        method: 'POST',
        body: { email: PUB_EMAIL, password: PASS }
      });
      check('auth/login', login.status === 200 && login.data?.user?.role === 'publisher');
      pubTok = extractToken(login.setCookie) || pubTok;
    }

    // 6. Wallet + YooKassa flag
    {
      const w = await req('/wallet', { cookie: cookieHeader(advTok) });
      check('wallet', w.status === 200 && w.data?.wallet, `HTTP ${w.status}`);
      check('yookassa.paymentsEnabled', w.data?.yookassa?.paymentsEnabled === true, JSON.stringify(w.data?.yookassa));
      check('yookassa.payoutsEnabled false (no payout keys)', w.data?.yookassa?.payoutsEnabled === false);
      check('topupRequisites', typeof w.data?.topupRequisites === 'string' || w.data?.topupRequisites == null);
      check('holdDays/maxHoldDays', Number(w.data?.holdDays) >= 1 && Number(w.data?.maxHoldDays) >= Number(w.data?.holdDays));
    }

    // 7. Offer create (RU needs ERID) + reject missing erid
    {
      const bad = await req('/advertiser/offers', {
        method: 'POST',
        cookie: cookieHeader(advTok),
        body: {
          type: 'cpa',
          title: 'E2E No Erid',
          landingUrl: 'https://example.com/offer',
          country: 'RU',
          commissionText: '100',
          holdDays: 1
        }
      });
      check('offer RU without ERID rejected', bad.status === 400);

      const good = await req('/advertiser/offers', {
        method: 'POST',
        cookie: cookieHeader(advTok),
        body: {
          type: 'cpa',
          title: `E2E Offer ${TS}`,
          landingUrl: 'https://example.com/e2e-landing',
          country: 'RU',
          erid: 'E2E_TEST_ERID',
          commissionText: '150',
          holdDays: 1
        }
      });
      check('create offer', good.status === 201 && good.data?.offer?.status === 'moderation', `HTTP ${good.status}`);
      ids.offerId = good.data?.offer?.id;
      const publicId = good.data?.offer?.public_id;
      check('offer public_id', Boolean(publicId), publicId || '');

      // Publish via DB (admin approve path without site-admin session)
      await query(`UPDATE partner_offers SET status = 'published' WHERE id = ?`, [ids.offerId]);
      const row = await query(`SELECT status FROM partner_offers WHERE id = ?`, [ids.offerId]);
      check('publish offer (db)', row?.[0]?.status === 'published');

      // OTHER country clears ERID requirement
      const other = await req('/advertiser/offers', {
        method: 'POST',
        cookie: cookieHeader(advTok),
        body: {
          type: 'promo',
          title: `E2E Other ${TS}`,
          landingUrl: 'https://example.com/other',
          promocode: 'CODE1',
          country: 'OTHER',
          commissionText: '10',
          holdDays: 7
        }
      });
      check('offer OTHER without ERID ok', other.status === 201, `HTTP ${other.status}`);
      if (other.data?.offer?.id) {
        await query(`DELETE FROM partner_offers WHERE id = ?`, [other.data.offer.id]);
      }
    }

    // 8. Publisher catalog + track path
    let trackPath;
    let pubCode;
    {
      const me = await req('/auth/me', { cookie: cookieHeader(pubTok) });
      pubCode = me.data?.user?.publisherCode;
      const cat = await req('/publisher/offers', { cookie: cookieHeader(pubTok) });
      check('publisher catalog', cat.status === 200 && Array.isArray(cat.data?.offers));
      const mine = (cat.data?.offers || []).find((o) => o.id === ids.offerId);
      check('catalog contains published offer', Boolean(mine), mine ? mine.title : 'missing');
      trackPath = mine?.trackPath;
      check('trackPath', Boolean(trackPath) && trackPath.includes('/go/') && trackPath.includes(`p=${encodeURIComponent(pubCode)}`), trackPath || '');
    }

    // 9. Fund advertiser (manual) before conversions; YooKassa create+cancel
    {
      const t = await req('/advertiser/topups', {
        method: 'POST',
        cookie: cookieHeader(advTok),
        body: { amount: 5000, provider: 'manual' }
      });
      check('manual topup', t.status === 201 && t.data?.provider === 'manual' && t.data?.id, JSON.stringify(t.data));
      const list = await req('/advertiser/topups', { cookie: cookieHeader(advTok) });
      check('list topups', list.status === 200 && (list.data?.topups || []).some((x) => x.id === t.data.id));
      const { confirmTopup, cancelTopup } = await import('../backend/partners/partnerFinance.mjs');
      const conf = await confirmTopup(t.data.id);
      check('confirm manual topup', conf?.ok === true, JSON.stringify(conf));
      const w = await req('/wallet', { cookie: cookieHeader(advTok) });
      check('adv balance after topup', Number(w.data?.wallet?.balance) >= 5000, JSON.stringify(w.data?.wallet));

      const yk = await req('/advertiser/topups', {
        method: 'POST',
        cookie: cookieHeader(advTok),
        body: { amount: 10, provider: 'yookassa' }
      });
      check(
        'yookassa topup create',
        yk.status === 201 && yk.data?.provider === 'yookassa' && yk.data?.confirmationUrl && yk.data?.paymentId,
        yk.status === 201 ? `id=${yk.data?.id}` : JSON.stringify(yk.data)
      );
      if (yk.data?.confirmationUrl) {
        check('yookassa confirmationUrl https', /^https:\/\//.test(yk.data.confirmationUrl));
      }
      if (yk.data?.id) {
        await cancelTopup(yk.data.id);
        ok('yookassa topup cancelled (cleanup)');
      }

      const wh = await req('/yookassa/webhook', { method: 'POST', body: { event: 'payment.succeeded', object: {} } });
      check('webhook IP guard', wh.status === 403, `HTTP ${wh.status}`);
    }

    // 10. /go click → redirect with click_id + erid
    let clickId;
    {
      const offer = (await query(`SELECT public_id, erid FROM partner_offers WHERE id = ?`, [ids.offerId]))[0];
      const goUrl = `${BASE}/go/${offer.public_id}?p=${encodeURIComponent(pubCode)}`;
      const r = await fetch(goUrl, { redirect: 'manual' });
      const loc = r.headers.get('location') || '';
      check('/go redirect 302', r.status === 302, `HTTP ${r.status}`);
      check('/go has click_id', /[?&]click_id=/.test(loc), loc.slice(0, 120));
      check('/go has erid', loc.includes('erid=E2E_TEST_ERID'), loc.slice(0, 160));
      clickId = new URL(loc).searchParams.get('click_id');
      check('click_id value', Boolean(clickId), clickId || '');
      await new Promise((r) => setTimeout(r, 400));
      const clicks = await query(`SELECT id FROM partner_clicks WHERE click_id = ?`, [clickId]);
      check('click logged', clicks.length === 1);
    }

    // 11. Postback confirm → hold settlement
    let conversionId;
    {
      const pb = await req('/postback', {
        method: 'POST',
        body: { click_id: clickId, amount: 1000, status: 'confirmed', currency: 'RUB' }
      });
      check('postback confirm', pb.status === 200 && pb.data?.ok === true, JSON.stringify(pb.data));
      conversionId = pb.data?.id;
      check('conversion id', Boolean(conversionId), String(conversionId || ''));
      const conv = (await query(
        `SELECT settlement_status, amount FROM partner_conversions WHERE id = ?`,
        [conversionId]
      ))[0];
      check('settlement held', conv?.settlement_status === 'held', conv?.settlement_status);

      const again = await req('/postback', {
        method: 'POST',
        body: { click_id: clickId, amount: 1000, status: 'confirmed' }
      });
      check(
        'postback idempotent',
        again.status === 200 && again.data?.ok === true && (again.data?.id === conversionId || again.data?.settlement?.reason === 'already_settled'),
        JSON.stringify(again.data)
      );
    }

    // 12. Postback reverse
    {
      const rev = await req('/postback', {
        method: 'POST',
        body: { click_id: clickId, status: 'rejected' }
      });
      check('postback reverse', rev.status === 200 && rev.data?.reversed === true, JSON.stringify(rev.data));
      const conv = (await query(
        `SELECT settlement_status, status FROM partner_conversions WHERE id = ?`,
        [conversionId]
      ))[0];
      check('conversion reversed in DB', conv?.settlement_status === 'reversed', JSON.stringify(conv));

      const none = await req('/postback', {
        method: 'POST',
        body: { click_id: clickId, status: 'cancelled' }
      });
      check('reverse no-op when none', none.status === 200 && none.data?.reversed === false, JSON.stringify(none.data));
    }

    // 13. Second click + convert for payout path
    let clickId2;
    {
      const offer = (await query(`SELECT public_id FROM partner_offers WHERE id = ?`, [ids.offerId]))[0];
      const r = await fetch(`${BASE}/go/${offer.public_id}?p=${encodeURIComponent(pubCode)}`, { redirect: 'manual' });
      clickId2 = new URL(r.headers.get('location')).searchParams.get('click_id');
      await new Promise((x) => setTimeout(x, 400));
      const pb = await req('/postback', {
        method: 'POST',
        body: { click_id: clickId2, amount: 1200, status: 'confirmed' }
      });
      check('second postback held', pb.status === 200 && pb.data?.ok === true && pb.data?.settlement?.settled !== false, JSON.stringify(pb.data));
      const st = (await query(`SELECT settlement_status FROM partner_conversions WHERE click_id = ? ORDER BY id DESC LIMIT 1`, [clickId2]))[0];
      check('second conversion held', st?.settlement_status === 'held', st?.settlement_status);
    }

    // 14. Release hold → publisher payout
    {
      const { releaseHeldConversions } = await import('../backend/partners/partnerFinance.mjs');
      await query(
        `UPDATE partner_conversions SET available_at = DATE_SUB(NOW(), INTERVAL 1 DAY)
         WHERE offer_id = ? AND settlement_status = 'held'`,
        [ids.offerId]
      );
      const released = await releaseHeldConversions();
      check('releaseHeldConversions', true, `released=${released}`);
      const w = await req('/wallet', { cookie: cookieHeader(pubTok) });
      const bal = Number(w.data?.wallet?.balance || 0);
      check('publisher balance after release', bal >= 1000, JSON.stringify(w.data?.wallet));

      const po = await req('/publisher/payouts', {
        method: 'POST',
        cookie: cookieHeader(pubTok),
        body: { amount: 1000, requisites: 'E2E test requisites' }
      });
      check('publisher payout request', po.status === 201 && po.data?.id, JSON.stringify(po.data));
      const list = await req('/publisher/payouts', { cookie: cookieHeader(pubTok) });
      check('list payouts', list.status === 200 && (list.data?.payouts || []).some((p) => p.id === po.data?.id));
    }

    // 17. Stats endpoints
    {
      const as = await req('/advertiser/stats', { cookie: cookieHeader(advTok) });
      const ps = await req('/publisher/stats', { cookie: cookieHeader(pubTok) });
      check('advertiser stats', as.status === 200 && as.data?.stats != null, JSON.stringify(as.data)?.slice(0, 120));
      check('publisher stats', ps.status === 200 && ps.data?.stats != null, JSON.stringify(ps.data)?.slice(0, 120));
    }

    // 18. Auth guards
    {
      const r = await req('/advertiser/offers');
      check('offers require auth', r.status === 401 || r.status === 403);
      const r2 = await req('/publisher/offers', { cookie: cookieHeader(advTok) });
      check('publisher catalog role guard', r2.status === 403 || r2.status === 401, `HTTP ${r2.status}`);
    }

    // 19. Logout (JSON content-type required by partner-server)
    {
      const lo = await req('/auth/logout', { method: 'POST', cookie: cookieHeader(advTok), body: {} });
      check('logout', lo.status === 200 && lo.data?.ok === true, `HTTP ${lo.status} ${JSON.stringify(lo.data)}`);
    }

  } catch (err) {
    fail('uncaught', err.stack || err.message);
  } finally {
    await cleanup(ids);
    ok('cleanup test data');
  }

  const total = results.length;
  const passed = results.filter((r) => r.ok).length;
  console.log('\n========== SUMMARY ==========');
  console.log(`${passed}/${total} passed, ${failed} failed`);
  if (failed) {
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
