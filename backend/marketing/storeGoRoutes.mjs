/** Редиректы в RuStore / Google Play с учётом кликов: /out/store/:app/:store */

import { storeTargetUrl } from '../marketing/store-catalog.mjs';
import { ensureStoreClickTables, logStoreClick } from '../marketing/store-clicks.mjs';

export function storeGoRoutes(app) {
  ensureStoreClickTables().catch((err) => {
    console.error('[store-go] tables', err?.message || err);
  });

  app.get('/out/store/:app/:store', (req, res) => {
    const appId = String(req.params.app || '').trim();
    const storeId = String(req.params.store || '').trim().toLowerCase();
    const dest = storeTargetUrl(appId, storeId);

    if (!dest) {
      return res.status(404).send('Store link not found');
    }

    const ip =
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.ip;
    const ua = req.headers['user-agent'] || null;
    const referer = req.headers.referer || req.headers.referrer || null;

    setImmediate(() => {
      logStoreClick({ appId, storeId, ip, ua, referer }).catch((e) => {
        console.error('[store-go] click log', e.message);
      });
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, dest);
  });
}
