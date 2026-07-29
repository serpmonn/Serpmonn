import {
  listModerationOffers,
  findOfferById,
  setOfferStatus
} from '../partners/partnerModel.mjs';

export async function listPartnerModeration(_req, res) {
  try {
    const offers = await listModerationOffers();
    return res.json({ offers });
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
