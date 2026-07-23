import slotsData from './mail-ad-slots.json' with { type: 'json' };
import { ensureMailAdsScript, pushMailAdTag } from './mail-ads-loader.js';
import { renderYandexFullscreen, waitForFill } from './ad-pool.js';

const SLOT_IDS = Object.fromEntries(
  Object.entries(slotsData.slots).map(([key, slot]) => [key, slot.id])
);

export function getMailAdSlotId(slotKey) {
  const id = SLOT_IDS[slotKey];
  if (!id) {
    throw new Error(`Unknown mail ad slot: ${slotKey}`);
  }
  return id;
}

export function getMailAdClientId(slotKeyOrId) {
  const id = SLOT_IDS[slotKeyOrId] || slotKeyOrId;
  return `ad-${id}`;
}

export function applyMailAdAttrs(element, slotKey) {
  const id = getMailAdSlotId(slotKey);
  element.classList.add('mrg-tag');
  element.setAttribute('data-ad-client', getMailAdClientId(id));
  element.setAttribute('data-ad-slot', id);
  return element;
}

export function createMailAdElement(slotKey, options = {}) {
  const ins = document.createElement('ins');
  applyMailAdAttrs(ins, slotKey);
  if (options.style) {
    ins.style.cssText = options.style;
  }
  if (options.className) {
    ins.className = `mrg-tag ${options.className}`.trim();
  }
  for (const [name, value] of Object.entries(options.attrs || {})) {
    ins.setAttribute(name, value);
  }
  return ins;
}

export { pushMailAdTag };

export async function showGameFullscreenAd(options = {}) {
  try {
    const isVkMini =
      Boolean(window.__SPN_VK_MINI__) ||
      document.documentElement.classList.contains('vk-mini-embed') ||
      document.body?.classList?.contains('vk-mini-embed') ||
      /(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search) ||
      /vk_app_id=\d+/.test(window.location.search);
    if (isVkMini) {
      if (typeof options.onClose === 'function') options.onClose();
      return;
    }

    let ov = document.getElementById('game-ad-overlay');
    const yandexCfg = slotsData.slots.fullscreen?.yandex;
    const poolEnabled = slotsData.pool?.enabled !== false;

    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'game-ad-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:9999;';

      const box = document.createElement('div');
      box.style.cssText = options.boxStyle || 'background:#111;border:1px solid #222;border-radius:12px;padding:12px;text-align:center;max-width:90vw;max-height:90vh;';

      const ins = document.createElement('ins');
      applyMailAdAttrs(ins, 'fullscreen');

      const btn = document.createElement('button');
      btn.className = options.buttonClass || 'btn';
      btn.textContent = options.continueLabel
        || (window.i18n && window.i18n.continueAd)
        || 'Continue';
      btn.style.marginTop = '10px';
      btn.onclick = function() {
        ov.remove();
        if (typeof options.onClose === 'function') {
          options.onClose();
        }
      };

      box.appendChild(ins);
      box.appendChild(btn);
      ov.appendChild(box);
      document.body.appendChild(ov);

      ensureMailAdsScript();
      const filled = await waitForFill(ins);

      if (!filled && poolEnabled && yandexCfg?.blockId && renderYandexFullscreen({ onClose: options.onClose })) {
        ov.remove();
        return;
      }

      if (!filled) {
        ov.remove();
        if (typeof options.onClose === 'function') {
          options.onClose();
        }
      }
    } else {
      ov.style.display = 'flex';
      pushMailAdTag();
      const ins = ov.querySelector('ins.mrg-tag');
      if (ins) {
        const filled = await waitForFill(ins);
        if (!filled && poolEnabled && yandexCfg?.blockId && renderYandexFullscreen({ onClose: options.onClose })) {
          ov.remove();
        }
      }
    }
  } catch (_) {}
}

export { SLOT_IDS as MAIL_AD_SLOT_IDS, slotsData as MAIL_AD_SLOTS };

if (typeof window !== 'undefined') {
  window.MailAds = {
    getSlotId: getMailAdSlotId,
    getClientId: getMailAdClientId,
    applyAttrs: applyMailAdAttrs,
    createElement: createMailAdElement,
    push: pushMailAdTag,
    showFullscreen: showGameFullscreenAd,
    slots: SLOT_IDS
  };
  window.showFullScreenAd = window.showFullScreenAd || showGameFullscreenAd;
}
