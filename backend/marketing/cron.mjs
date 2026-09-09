#!/usr/bin/env node
/**
 * Cron маркетинг-дайджеста.
 *
 * Usage:
 *   node backend/marketing/cron.mjs              # generate today's digest
 *   node backend/marketing/cron.mjs --date=2026-09-08
 *   node backend/marketing/cron.mjs --publish-due  # автопубликация due + Telegram
 *   node backend/marketing/cron.mjs --seed
 *
 * Crontab (MSK):
 *   5 7 * * * cd /var/www/serpmonn.ru && /usr/bin/node backend/marketing/cron.mjs >> /var/log/serpmonn-marketing.log 2>&1
 *   every 5 min: node backend/marketing/cron.mjs --publish-due >> /var/log/serpmonn-marketing.log 2>&1
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  openSync,
  closeSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync
} from 'fs';
import { seedDefaultCampaigns } from './campaigns.mjs';
import {
  generateDigestForDate,
  moscowDateString,
  publishDueFullAuto,
  publishDeferredChannels
} from './digest.mjs';
import { ensureMarketingTables } from './queue.mjs';
import { ensurePlatformTables } from './platforms.mjs';
import { refreshReachMetrics, ensureReachColumns } from './reach.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: process.env.NODE_ENV === 'production'
    ? '/var/www/serpmonn.ru/backend/.env'
    : resolve(__dirname, '../.env')
});

function arg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  if (process.argv.includes(`--${name}`)) return true;
  return null;
}

function pidAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Не запускать два одинаковых режима параллельно (stale lock снимаем). */
function tryLock(name) {
  const path = `/tmp/serpmonn-marketing-${name}.lock`;
  const claim = () => {
    const fd = openSync(path, 'wx');
    try {
      writeFileSync(fd, String(process.pid));
    } finally {
      closeSync(fd);
    }
    const unlock = () => {
      try {
        if (existsSync(path) && String(readFileSync(path, 'utf8')).trim() === String(process.pid)) {
          unlinkSync(path);
        }
      } catch { /* ignore */ }
    };
    process.once('exit', unlock);
    return unlock;
  };

  try {
    return claim();
  } catch (err) {
    if (err?.code !== 'EEXIST') throw err;
    try {
      const oldPid = Number(String(readFileSync(path, 'utf8') || '').trim());
      if (!pidAlive(oldPid)) {
        unlinkSync(path);
        return claim();
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}

async function main() {
  const mode = arg('publish-due')
    ? 'publish-due'
    : arg('seed')
      ? 'seed'
      : arg('refresh-reach')
        ? 'refresh-reach'
        : 'generate';

  const unlock = tryLock(mode);
  if (!unlock) {
    console.log(`[marketing-cron] skip: already running (${mode})`);
    return;
  }

  try {
    await ensureMarketingTables();
    await ensurePlatformTables();
    await ensureReachColumns();

    if (arg('seed')) {
      const camps = await seedDefaultCampaigns();
      console.log('[marketing-cron] seeded campaigns:', camps.map((c) => c.slug).join(', '));
      return;
    }

    if (arg('publish-due')) {
      const r = await publishDueFullAuto();
      const deferred = await publishDeferredChannels();
      console.log('[marketing-cron] publish-due:', JSON.stringify({ ...r, deferredExtra: deferred }));
      return;
    }

    if (arg('refresh-reach')) {
      const r = await refreshReachMetrics({ limit: 50 });
      console.log('[marketing-cron] refresh-reach:', JSON.stringify(r));
      return;
    }

    const date = arg('date') || moscowDateString();
    const force = Boolean(arg('force'));
    console.log(`[marketing-cron] generate digest ${date} force=${force}`);
    const result = await generateDigestForDate(date, { force });
    console.log(
      '[marketing-cron] done',
      JSON.stringify({
        digestDate: result.digestDate,
        created: result.created,
        skipped: result.skipped.length,
        errors: result.errors
      })
    );
    if (result.errors?.length) process.exitCode = 1;
  } finally {
    unlock();
  }
}

main()
  .then(() => {
    // mysql pool держит event loop — без exit cron зависает
    process.exit(process.exitCode || 0);
  })
  .catch((err) => {
    console.error('[marketing-cron] fatal', err);
    process.exit(1);
  });
