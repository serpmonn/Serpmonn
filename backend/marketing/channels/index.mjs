import * as manual from './manual.mjs';
import * as youtube from './youtube.mjs';
import { VK_CHANNELS } from './vk.mjs';
import * as telegram from './telegram.mjs';
import * as dzen from './dzen.mjs';

/** Реестр каналов. Новый канал = import + запись сюда. */
const CHANNELS = [...VK_CHANNELS, telegram, dzen, youtube, manual];

const byId = new Map(CHANNELS.map((c) => [c.id, c]));

export function listChannels() {
  return CHANNELS.map((c) => ({
    id: c.id,
    label: c.label,
    formats: c.formats || [],
    configured: Boolean(c.isConfigured?.()),
    enabled: Boolean(c.isConfigured?.())
  }));
}

export function getChannel(id) {
  return byId.get(String(id || '')) || null;
}

export async function channelHealth() {
  const out = [];
  for (const c of CHANNELS) {
    let health = { ok: false, detail: 'n/a' };
    try {
      health = await c.healthCheck();
    } catch (err) {
      health = { ok: false, detail: err.message || String(err) };
    }
    out.push({
      id: c.id,
      label: c.label,
      formats: c.formats || [],
      configured: Boolean(c.isConfigured?.()),
      ...health
    });
  }
  return out;
}

export { CHANNELS };
