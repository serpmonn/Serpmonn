import { query } from '../database/config.mjs';
import { STORE_APPS, STORE_IDS } from './store-catalog.mjs';

let tablesReady = false;

export async function ensureStoreClickTables() {
  if (tablesReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS store_clicks (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      app_id      VARCHAR(64) NOT NULL,
      store_id    VARCHAR(32) NOT NULL,
      ip          VARCHAR(64) NULL,
      ua          VARCHAR(160) NULL,
      referer     VARCHAR(255) NULL,
      clicked_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_store_clicks_app_store (app_id, store_id),
      KEY idx_store_clicks_day (clicked_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  tablesReady = true;
}

export async function logStoreClick({ appId, storeId, ip, ua, referer }) {
  await ensureStoreClickTables();
  const safeApp = String(appId || '').trim().slice(0, 64);
  const safeStore = String(storeId || '').trim().slice(0, 32);
  if (!safeApp || !safeStore) return;
  await query(
    `INSERT INTO store_clicks (app_id, store_id, ip, ua, referer) VALUES (?, ?, ?, ?, ?)`,
    [
      safeApp,
      safeStore,
      ip ? String(ip).slice(0, 64) : null,
      ua ? String(ua).slice(0, 160) : null,
      referer ? String(referer).slice(0, 255) : null
    ]
  );
}

/**
 * Клики по магазинам: всего и за N дней (уники IP + hits).
 */
export async function getStoreClickStats({ days = 30 } = {}) {
  await ensureStoreClickTables();
  const d = Math.max(1, Math.min(365, Number(days) || 30));

  const rows = await query(
    `SELECT app_id, store_id,
            COUNT(*) AS hits,
            COUNT(DISTINCT ip) AS uniq_ip
     FROM store_clicks
     WHERE clicked_at >= DATE_SUB(NOW(3), INTERVAL ? DAY)
     GROUP BY app_id, store_id`,
    [d]
  );

  const byKey = new Map();
  for (const r of rows) {
    byKey.set(`${r.app_id}:${r.store_id}`, {
      hits: Number(r.hits || 0),
      uniqIp: Number(r.uniq_ip || 0)
    });
  }

  const products = STORE_APPS.map((app) => {
    const stores = {};
    for (const sid of STORE_IDS) {
      const hasUrl = sid === 'rustore' ? Boolean(app.rustore) : Boolean(app.play);
      const stats = byKey.get(`${app.id}:${sid}`) || { hits: 0, uniqIp: 0 };
      stores[sid] = {
        configured: hasUrl,
        hits: hasUrl ? stats.hits : null,
        uniqIp: hasUrl ? stats.uniqIp : null
      };
    }
    return {
      id: app.id,
      label: app.label,
      packageName: app.packageName,
      stores
    };
  });

  return {
    days: d,
    products,
    note:
      'Клики с лендингов через /out/store/… . Установки RuStore/Play появятся после ключей API (пока недоступны).'
  };
}
