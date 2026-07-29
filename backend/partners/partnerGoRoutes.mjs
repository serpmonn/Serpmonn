import {
  ensurePartnerTables,
  findOfferByPublicId,
  findPublisherByCode,
  makeClickId,
  logPartnerClick
} from './partnerModel.mjs';

/**
 * GET /go/:publicId?p=publisherCode
 * Publisher code required (MVP: direct only on publisher inventory).
 */
export function partnerGoRoutes(app) {
  app.get('/go/:publicId', async (req, res) => {
    try {
      await ensurePartnerTables();
      const publicId = String(req.params.publicId || '').trim();
      const publisherCode = String(req.query.p || '').trim();

      if (!publicId) return res.status(400).send('Bad request');
      if (!publisherCode) {
        return res.status(400).send('Publisher code required (?p=)');
      }

      const offer = await findOfferByPublicId(publicId);
      if (!offer || offer.status !== 'published') {
        return res.status(404).send('Offer not found');
      }

      const publisher = await findPublisherByCode(publisherCode);
      if (!publisher) {
        return res.status(400).send('Unknown publisher');
      }

      const clickId = makeClickId();
      const ip = req.headers['x-real-ip'] || req.ip || null;
      const ua = req.headers['user-agent'] || null;

      setImmediate(() => {
        logPartnerClick({
          clickId,
          offerId: offer.id,
          publisherId: publisher.id,
          ip: ip ? String(ip).slice(0, 64) : null,
          ua: ua ? String(ua).slice(0, 255) : null
        }).catch((e) => console.error('[partners] click log', e.message));
      });

      let target;
      try {
        target = new URL(offer.landing_url);
      } catch {
        return res.status(500).send('Bad landing url');
      }
      if (!target.searchParams.has('click_id')) {
        target.searchParams.set('click_id', clickId);
      }
      if (!target.searchParams.has('subid')) {
        target.searchParams.set('subid', clickId);
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.redirect(302, target.toString());
    } catch (err) {
      console.error('[partners] /go', err);
      return res.status(500).send('Error');
    }
  });
}
