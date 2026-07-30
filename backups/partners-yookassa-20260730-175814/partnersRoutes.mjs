import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  createPartnerUser,
  findPartnerByEmail,
  findPartnerById,
  makePublisherCode,
  listOffersByOwner,
  listPublishedOffers,
  findOfferById,
  insertOffer,
  updateOffer,
  unpublishOffer,
  findClickByClickId,
  insertConversion,
  findConversionById,
  statsForAdvertiser,
  statsForPublisher,
  ensurePartnerTables
} from './partnerModel.mjs';
import {
  setPartnerCookie,
  clearPartnerCookie,
  signPartnerToken,
  verifyPartnerToken,
  requireRole,
  isBootstrapAdminEmail
} from './partnerAuth.mjs';
import {
  PARTNER_FEE_RATE,
  MIN_PAYOUT_AMOUNT,
  CONVERSION_HOLD_DAYS,
  MAX_HOLD_DAYS,
  clampHoldDays,
  getWalletForUser,
  getNetworkWallet,
  settleConversion,
  releaseHeldConversions,
  createTopup,
  listTopupsForAdvertiser,
  createPayout,
  listPayoutsForPublisher
} from './partnerFinance.mjs';
import {
  notifyTopupCreated,
  notifyPayoutRequested,
  getTopupRequisites
} from './partnerNotify.mjs';

const router = Router();

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    company: u.company,
    contacts: u.contacts,
    publisherCode: u.publisher_code,
    status: u.status
  };
}

function normalizeCountry(raw) {
  const s = String(raw || 'RU').trim().toUpperCase();
  if (!s || s === 'RU' || s === 'RUS' || s === 'RUSSIA' || s === 'РФ') return 'RU';
  if (s === 'OTHER' || s === 'INTL' || s === 'WORLD') return 'OTHER';
  return s.slice(0, 64);
}

function isRussiaCountry(country) {
  return normalizeCountry(country) === 'RU';
}

function normalizeOfferBody(body) {
  const type = body.type === 'cpa' ? 'cpa' : 'promo';
  const title = String(body.title || '').trim().slice(0, 255);
  const landingUrl = String(body.landingUrl || body.landing_url || '').trim().slice(0, 1024);
  const promocode = body.promocode != null ? String(body.promocode).trim().slice(0, 128) : '';
  const country = normalizeCountry(body.country || body.country_code || 'RU');
  let erid = body.erid != null ? String(body.erid).trim().slice(0, 128) : '';
  if (!isRussiaCountry(country)) erid = '';
  const holdDays = clampHoldDays(
    body.holdDays != null ? body.holdDays : body.hold_days,
    CONVERSION_HOLD_DAYS
  );
  return {
    type,
    title,
    landingUrl,
    promocode: type === 'promo' ? promocode : null,
    imageUrl: body.imageUrl || body.image_url || null,
    conditions: body.conditions || null,
    category: body.category || null,
    country,
    erid: erid || null,
    validUntil: body.validUntil || body.valid_until || null,
    commissionText: body.commissionText || body.commission_text || null,
    holdDays
  };
}

function validateOffer(data) {
  if (!data.title || !data.landingUrl) return 'Нужны title и landingUrl';
  try {
    const u = new URL(data.landingUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return 'landingUrl должен быть http(s)';
  } catch {
    return 'Некорректный landingUrl';
  }
  if (data.type === 'promo' && !data.promocode) return 'Для promo нужен promocode';
  if (isRussiaCountry(data.country) && !data.erid) {
    return 'Для офферов в России нужен ERID (токен маркировки из ОРД)';
  }
  return null;
}

function walletPublic(w) {
  if (!w) return null;
  const balance = Number(w.balance || 0);
  const hold = Number(w.hold || 0);
  return {
    balance,
    hold,
    available: Math.round((balance - hold) * 100) / 100,
    currency: w.currency || 'RUB'
  };
}

// ——— Auth ———

router.post('/auth/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    let role = String(req.body.role || '').trim();
    const company = String(req.body.company || '').trim().slice(0, 255);
    const contacts = String(req.body.contacts || '').trim().slice(0, 512);

    if (!email || !password || password.length < 8) {
      return res.status(400).json({ message: 'Email и пароль (мин. 8 символов) обязательны' });
    }
    if (!['advertiser', 'publisher'].includes(role)) {
      return res.status(400).json({ message: 'role: advertiser или publisher' });
    }
    if (isBootstrapAdminEmail(email)) role = 'admin';

    const existing = await findPartnerByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email уже зарегистрирован' });

    const passwordHash = await bcrypt.hash(password, 10);
    const publisherCode = role === 'publisher' || role === 'admin' ? makePublisherCode() : null;
    const id = await createPartnerUser({
      email,
      passwordHash,
      role,
      company,
      contacts,
      publisherCode
    });
    const user = await findPartnerById(id);
    const token = await signPartnerToken({ id: user.id, role: user.role, email: user.email });
    setPartnerCookie(res, token);
    return res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    console.error('[partners] register', err);
    return res.status(500).json({ message: 'Ошибка регистрации' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await findPartnerByEmail(email);
    if (!user) return res.status(401).json({ message: 'Неверный email или пароль' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Неверный email или пароль' });
    if (user.status !== 'active') return res.status(403).json({ message: 'Аккаунт заблокирован' });
    const token = await signPartnerToken({ id: user.id, role: user.role, email: user.email });
    setPartnerCookie(res, token);
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('[partners] login', err);
    return res.status(500).json({ message: 'Ошибка входа' });
  }
});

router.post('/auth/logout', (req, res) => {
  clearPartnerCookie(res);
  return res.json({ ok: true });
});

router.get('/auth/me', verifyPartnerToken, async (req, res) => {
  const user = await findPartnerById(req.partner.id);
  return res.json({ user: publicUser(user) });
});

// ——— Wallet ———

router.get('/wallet', verifyPartnerToken, async (req, res) => {
  try {
    await ensurePartnerTables();
    await releaseHeldConversions().catch(() => {});
    const wallet = await getWalletForUser(req.partner.id);
    return res.json({
      wallet: walletPublic(wallet),
      feeRate: PARTNER_FEE_RATE,
      minPayout: MIN_PAYOUT_AMOUNT,
      holdDays: CONVERSION_HOLD_DAYS,
      maxHoldDays: MAX_HOLD_DAYS,
      topupRequisites: getTopupRequisites() || null
    });
  } catch (err) {
    console.error('[partners] wallet', err);
    return res.status(500).json({ message: 'Ошибка кошелька' });
  }
});

router.post(
  '/advertiser/topups',
  verifyPartnerToken,
  requireRole('advertiser', 'admin'),
  async (req, res) => {
    try {
      const amount = Number(req.body.amount);
      const id = await createTopup({ advertiserId: req.partner.id, amount });
      setImmediate(() => {
        notifyTopupCreated({
          topupId: id,
          amount,
          advertiserEmail: req.partner.email,
          company: req.partner.company,
          provider: 'manual'
        }).catch(() => {});
      });
      return res.status(201).json({ id, status: 'pending' });
    } catch (err) {
      return res.status(err.status || 500).json({ message: err.message || 'Ошибка' });
    }
  }
);

router.get(
  '/advertiser/topups',
  verifyPartnerToken,
  requireRole('advertiser', 'admin'),
  async (req, res) => {
    const topups = await listTopupsForAdvertiser(req.partner.id);
    return res.json({ topups });
  }
);

router.post(
  '/publisher/payouts',
  verifyPartnerToken,
  requireRole('publisher', 'admin'),
  async (req, res) => {
    try {
      const id = await createPayout({
        publisherId: req.partner.id,
        amount: Number(req.body.amount),
        method: req.body.method,
        requisites: req.body.requisites
      });
      setImmediate(() => {
        notifyPayoutRequested({
          payoutId: id,
          amount: Number(req.body.amount),
          publisherEmail: req.partner.email,
          method: req.body.method,
          requisites: req.body.requisites
        }).catch(() => {});
      });
      return res.status(201).json({ id, status: 'requested' });
    } catch (err) {
      return res.status(err.status || 500).json({ message: err.message || 'Ошибка' });
    }
  }
);

router.get(
  '/publisher/payouts',
  verifyPartnerToken,
  requireRole('publisher', 'admin'),
  async (req, res) => {
    const payouts = await listPayoutsForPublisher(req.partner.id);
    return res.json({ payouts });
  }
);

// ——— Advertiser ———

router.get(
  '/advertiser/offers',
  verifyPartnerToken,
  requireRole('advertiser', 'admin'),
  async (req, res) => {
    const offers = await listOffersByOwner(req.partner.id);
    return res.json({ offers });
  }
);

router.post(
  '/advertiser/offers',
  verifyPartnerToken,
  requireRole('advertiser', 'admin'),
  async (req, res) => {
    const data = normalizeOfferBody(req.body);
    const err = validateOffer(data);
    if (err) return res.status(400).json({ message: err });
    const created = await insertOffer({
      ownerId: req.partner.id,
      ...data,
      status: 'moderation'
    });
    const offer = await findOfferById(created.id);
    return res.status(201).json({ offer });
  }
);

router.put(
  '/advertiser/offers/:id',
  verifyPartnerToken,
  requireRole('advertiser', 'admin'),
  async (req, res) => {
    const id = Number(req.params.id);
    const existing = await findOfferById(id);
    if (!existing || existing.owner_id !== req.partner.id) {
      return res.status(404).json({ message: 'Оффер не найден' });
    }
    const data = normalizeOfferBody(req.body);
    const err = validateOffer(data);
    if (err) return res.status(400).json({ message: err });
    await updateOffer(id, req.partner.id, data);
    const offer = await findOfferById(id);
    return res.json({ offer });
  }
);


router.post(
  '/advertiser/offers/:id/unpublish',
  verifyPartnerToken,
  requireRole('advertiser', 'admin'),
  async (req, res) => {
    const id = Number(req.params.id);
    const existing = await findOfferById(id);
    if (!existing || existing.owner_id !== req.partner.id) {
      return res.status(404).json({ message: 'Оффер не найден' });
    }
    const ok = await unpublishOffer(id, req.partner.id);
    if (!ok) {
      return res.status(409).json({ message: 'Нельзя снять: уже черновик или неизвестный статус' });
    }
    const offer = await findOfferById(id);
    return res.json({ offer });
  }
);

router.get(
  '/advertiser/stats',
  verifyPartnerToken,
  requireRole('advertiser', 'admin'),
  async (req, res) => {
    const stats = await statsForAdvertiser(req.partner.id);
    return res.json({ stats });
  }
);

// ——— Publisher ———

router.get(
  '/publisher/offers',
  verifyPartnerToken,
  requireRole('publisher', 'admin'),
  async (req, res) => {
    const offers = await listPublishedOffers();
    const withLinks = offers.map((o) => ({
      ...o,
      trackPath: `/go/${o.public_id}?p=${encodeURIComponent(req.partner.publisherCode || '')}`
    }));
    return res.json({ offers: withLinks });
  }
);

router.get(
  '/publisher/stats',
  verifyPartnerToken,
  requireRole('publisher', 'admin'),
  async (req, res) => {
    const stats = await statsForPublisher(req.partner.id);
    return res.json({ stats });
  }
);

// ——— Postback (public) ———

router.all('/postback', async (req, res) => {
  try {
    await ensurePartnerTables();
    const src = { ...req.query, ...req.body };
    const clickId = String(src.click_id || src.clickId || '').trim();
    if (!clickId) return res.status(400).json({ message: 'click_id required' });
    const click = await findClickByClickId(clickId);
    if (!click) return res.status(404).json({ message: 'click not found' });
    const amount = src.amount != null && src.amount !== '' ? Number(src.amount) : null;
    const currency = String(src.currency || 'RUB').slice(0, 8);
    const status = String(src.status || 'confirmed').slice(0, 32);
    const id = await insertConversion({
      clickId,
      offerId: click.offer_id,
      publisherId: click.publisher_id,
      amount: Number.isFinite(amount) ? amount : null,
      currency,
      status,
      raw: src
    });

    let settlement = null;
    if (status === 'confirmed' && Number.isFinite(amount) && amount > 0) {
      const offer = await findOfferById(click.offer_id);
      settlement = await settleConversion({
        conversionId: id,
        advertiserId: offer?.owner_id,
        publisherId: click.publisher_id,
        publisherAmount: amount,
        currency,
        holdDays: offer?.hold_days
      });
      if (!settlement.settled && settlement.reason === 'insufficient_funds') {
        const conv = await findConversionById(id);
        return res.status(402).json({
          ok: false,
          id,
          conversion: conv,
          settlement,
          message: 'Недостаточно средств на балансе рекламодателя'
        });
      }
    }

    return res.json({ ok: true, id, settlement, feeRate: PARTNER_FEE_RATE });
  } catch (err) {
    console.error('[partners] postback', err);
    return res.status(500).json({ message: 'postback error' });
  }
});

export default router;
