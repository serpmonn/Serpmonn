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

const LINE = /^(\S+) .*?"(GET [^"]+)" (\d{3}) /;

let cache = null;
let cacheAt = 0;
const TTL_MS = 10 * 60 * 1000;

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

async function scan() {
  const acc = new Map(PRODUCTS.map((p) => [p.id, new Set()]));

  let names = [];
  try {
    names = await readdir(LOG_DIR);
  } catch {
    return {
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
      if (m[3] !== '200' && m[3] !== '206') continue;
      const id = productId(requestPath(m[2]));
      if (!id) continue;
      acc.get(id).add(m[1]);
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    note: 'Сколько разных адресов скачало файл с сайта. Магазины (RuStore, Google Play) сюда не входят.',
    products: PRODUCTS.map((p) => ({
      id: p.id,
      label: p.label,
      downloads: acc.get(p.id).size
    }))
  };
}

export async function getGameDownloadStats() {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  cache = await scan();
  cacheAt = Date.now();
  return cache;
}
