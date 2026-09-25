/** Скачивания приложений с сайта (nginx access). Только для админки. */

import { createReadStream } from 'fs';
import { readdir } from 'fs/promises';
import { createInterface } from 'readline';
import { createGunzip } from 'zlib';
import { join } from 'path';

const LOG_DIR = '/var/log/nginx';

const PRODUCTS = [
  { id: 'serpmonn', label: 'Serpmonn' },
  { id: 'messenger', label: 'Serpmonn Messenger' },
  { id: 'neon-runner', label: 'Neon Runner' },
  { id: 'serphold', label: 'Serphold' },
  { id: 'animals', label: 'Animals' }
];

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

/** remote_addr … [time_local] "GET path HTTP/…" status */
const LINE =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "(GET [^"]+)" (\d{3}) /;

const cacheByDays = new Map();
const TTL_MS = 10 * 60 * 1000;

function clampDays(raw) {
  const n = Number(raw);
  if (![7, 30, 90].includes(n)) return 30;
  return n;
}

function parseNginxDate(str) {
  // 23/Aug/2026:07:10:40 +0300
  const m = String(str || '').match(
    /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})?/
  );
  if (!m) return null;
  const mon = MONTHS[m[2]];
  if (mon == null) return null;
  const d = new Date(
    Number(m[3]),
    mon,
    Number(m[1]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6])
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

function requestPath(getLine) {
  const raw = getLine.replace(/^GET\s+/, '').replace(/\s+HTTP\/\d(?:\.\d)?$/, '').split('?')[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function productId(path) {
  const p = path.toLowerCase();
  if (!p.includes('/frontend/downloads/')) return null;
  if (p.includes('/yandex-games/')) return null;
  if (p.includes('messenger') && (p.endsWith('.apk') || p.endsWith('.exe'))) return 'messenger';
  if (p.includes('neon-runner') && p.endsWith('.apk')) return 'neon-runner';
  if (p.includes('/serphold/') && p.endsWith('.apk')) return 'serphold';
  if (p.includes('/animals/') && p.endsWith('.zip')) return 'animals';
  if (p.endsWith('.apk') && (p.includes('/serpmonn/') || /\/serpmonn[.-]/.test(p))) return 'serpmonn';
  return null;
}

function periodNote(days) {
  const base =
    'Сколько разных IP скачало APK / ZIP с сайта (не магазины RuStore / Google Play).';
  return `${base} Период: последние ${days} дн.`;
}

async function scan(days) {
  const acc = new Map(PRODUCTS.map((p) => [p.id, new Set()]));
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  let names = [];
  try {
    names = await readdir(LOG_DIR);
  } catch {
    return {
      days,
      note: 'Нет доступа к логам сайта.',
      products: PRODUCTS.map((p) => ({ ...p, downloads: 0 }))
    };
  }

  const files = names.filter((n) => n === 'access.log' || n.startsWith('access.log.'));

  for (const name of files) {
    const path = join(LOG_DIR, name);
    const stream = name.endsWith('.gz')
      ? createReadStream(path).pipe(createGunzip())
      : createReadStream(path);
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.includes('/frontend/downloads/')) continue;
      const m = LINE.exec(line);
      if (!m) continue;
      if (m[4] !== '200' && m[4] !== '206') continue;
      const when = parseNginxDate(m[2]);
      if (!when || when < from || when > to) continue;
      const id = productId(requestPath(m[3]));
      if (!id) continue;
      acc.get(id).add(m[1]);
    }
  }

  return {
    days,
    updatedAt: new Date().toISOString(),
    note: periodNote(days),
    products: PRODUCTS.map((p) => ({
      id: p.id,
      label: p.label,
      downloads: acc.get(p.id).size
    }))
  };
}

/**
 * @param {{ days?: number }} opts
 */
export async function getGameDownloadStats({ days } = {}) {
  const d = clampDays(days);
  const hit = cacheByDays.get(d);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await scan(d);
  cacheByDays.set(d, { at: Date.now(), data });
  return data;
}
