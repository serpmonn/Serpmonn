import {
  listModerationOffers,
  findOfferById,
  setOfferStatus
} from '../partners/partnerModel.mjs';

function isRussiaCountry(country) {
  const s = String(country || 'RU').trim().toUpperCase();
  return !s || s === 'RU' || s === 'RUS' || s === 'RUSSIA' || s === 'РФ';
}

function missingEridForRu(offer) {
  return isRussiaCountry(offer?.country) && !String(offer?.erid || '').trim();
}

export async function listPartnerModeration(_req, res) {
  try {
    const offers = await listModerationOffers();
    const withFlags = (offers || []).map((o) => ({
      ...o,
      eridRequired: isRussiaCountry(o.country),
      eridMissing: missingEridForRu(o)
    }));
    return res.json({ offers: withFlags });
  } catch (err) {
    console.error('[admin] partners moderation list', err);
    return res.status(500).json({ message: 'Ошибка загрузки очереди' });
  }
}

export async function approvePartnerOffer(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const offer = await findOfferById(id);
    if (!offer) return res.status(404).json({ message: 'Оффер не найден' });
    if (offer.status !== 'moderation') {
      return res.status(409).json({ message: 'Оффер не в очереди модерации' });
    }
    if (missingEridForRu(offer) && !req.body?.confirmMissingErid) {
      return res.status(409).json({
        message:
          'Оффер для России без ERID. Для маркировки рекламы (ОРД) токен нужен. Одобрить всё равно?',
        code: 'MISSING_ERID',
        requireConfirm: true
      });
    }
    await setOfferStatus(id, 'published');
    return res.json({ offer: await findOfferById(id) });
  } catch (err) {
    console.error('[admin] partners approve', err);
    return res.status(500).json({ message: 'Ошибка одобрения' });
  }
}

export async function rejectPartnerOffer(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const offer = await findOfferById(id);
    if (!offer) return res.status(404).json({ message: 'Оффер не найден' });
    if (offer.status !== 'moderation') {
      return res.status(409).json({ message: 'Оффер не в очереди модерации' });
    }
    const reason = String(req.body?.reason || '').trim().slice(0, 512) || 'Отклонено';
    await setOfferStatus(id, 'rejected', reason);
    return res.json({ offer: await findOfferById(id) });
  } catch (err) {
    console.error('[admin] partners reject', err);
    return res.status(500).json({ message: 'Ошибка отклонения' });
  }
}
