import { showGameFullscreenAd, applyMailAdAttrs, pushMailAdTag, createMailAdElement } from "/frontend/scripts/mail-ads-config.js";
import { ensureMailAdsScript } from "/frontend/scripts/mail-ads-loader.js";
import { ensureYandexAdsScript, onYandexReady } from "/frontend/scripts/yandex-ads-loader.js";
import { waitForFill } from "/frontend/scripts/ad-pool.js";

const YANDEX_FS_BLOCK = "R-A-19576747-3";

function isNarrow() {
  return (window.innerWidth || document.documentElement.clientWidth || 0) <= 768;
}

function toast(msg) {
  let el = document.getElementById("obryv-ad-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "obryv-ad-toast";
    el.style.cssText = "position:fixed;left:50%;bottom:1.4rem;transform:translateX(-50%);z-index:10000;padding:0.55rem 1rem;border-radius:10px;background:rgba(0,0,0,.82);color:#e8eef8;font:600 0.86rem/1.3 system-ui,sans-serif;pointer-events:none;opacity:0;transition:opacity .2s";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
}
function hideToast() {
  const el = document.getElementById("obryv-ad-toast");
  if (el) el.style.opacity = "0";
}

function showVkOverlayFallback(done) {
  let ov = document.getElementById("obryv-ad-overlay");
  if (ov) ov.remove();
  ov = document.createElement("div");
  ov.id = "obryv-ad-overlay";
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;z-index:9999;";
  const box = document.createElement("div");
  box.style.cssText = "background:#111;border:1px solid #333;border-radius:12px;padding:14px;text-align:center;max-width:92vw;";
  const ins = document.createElement("ins");
  applyMailAdAttrs(ins, "fullscreen");
  ins.style.display = "inline-block";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Продолжить";
  btn.style.cssText = "margin-top:12px;padding:0.5rem 1rem;border-radius:8px;border:1px solid #444;background:#1a2330;color:#e8eef8;font:600 0.9rem system-ui;cursor:pointer;";
  let filled = false;
  btn.onclick = () => {
    ov.remove();
    hideToast();
    done(filled); // reward only if fill appeared
  };
  box.appendChild(ins);
  box.appendChild(btn);
  ov.appendChild(box);
  document.body.appendChild(ov);
  ensureMailAdsScript();
  pushMailAdTag();
  waitForFill(ins, 3500).then((ok) => {
    filled = !!ok;
    if (!ok) btn.textContent = "Продолжить (реклама не загрузилась)";
  });
}

/**
 * options.onClose — ad shown / completed (reward OK)
 * options.onSkip  — no fill / error (no reward)
 */
export function showObryvFullscreenAd(options = {}) {
  const onClose = typeof options.onClose === "function" ? options.onClose : () => {};
  const onSkip = typeof options.onSkip === "function" ? options.onSkip : onClose;

  let settled = false;
  const done = (shown) => {
    if (settled) return;
    settled = true;
    hideToast();
    if (shown) onClose({ shown: true });
    else onSkip({ shown: false });
  };

  toast("Загрузка рекламы…");
  console.info("[obryv-ads] show fullscreen", { narrow: isNarrow() });

  const watchdog = setTimeout(() => {
    console.warn("[obryv-ads] watchdog — fallback overlay");
    showVkOverlayFallback(done);
  }, 4500);

  const platform = isNarrow() ? "touch" : "desktop";

  ensureYandexAdsScript();
  onYandexReady(() => {
    try {
      if (!window.Ya?.Context?.AdvManager?.render) {
        clearTimeout(watchdog);
        showVkOverlayFallback(done);
        return;
      }
      const ok = window.Ya.Context.AdvManager.render({
        blockId: YANDEX_FS_BLOCK,
        type: "fullscreen",
        platform,
        onClose: () => {
          clearTimeout(watchdog);
          console.info("[obryv-ads] yandex onClose");
          done(true);
        },
        onError: () => {
          clearTimeout(watchdog);
          console.warn("[obryv-ads] yandex onError — fallback");
          showVkOverlayFallback(done);
        },
      });
      // if render returns false-ish, still wait for callbacks / watchdog
      if (ok === false) {
        clearTimeout(watchdog);
        showVkOverlayFallback(done);
      }
    } catch (err) {
      clearTimeout(watchdog);
      console.warn("[obryv-ads] yandex throw", err);
      showVkOverlayFallback(done);
    }
  });

  // Mobile: also kick shared helper as parallel attempt if Yandex silent
  if (isNarrow()) {
    try {
      showGameFullscreenAd({
        onClose: () => {
          clearTimeout(watchdog);
          done(true);
        },
      });
    } catch (_) {}
  }
}

window.showFullScreenAd = showObryvFullscreenAd;

/** Small banner for menu / pause only — never during active play. */
export function mountObryvSoftBanner(container) {
  if (!container) return;
  if (container.dataset.adMounted === "1") {
    ensureMailAdsScript();
    pushMailAdTag();
    return;
  }
  container.dataset.adMounted = "1";
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;justify-content:center;margin-top:0.75rem;min-height:50px;overflow:hidden;";
  const ins = createMailAdElement("top", {
    style: "display:inline-block;min-width:280px;min-height:50px;max-width:100%;",
  });
  wrap.appendChild(ins);
  container.appendChild(wrap);
  ensureMailAdsScript();
  pushMailAdTag();
}

export function syncObryvSoftBanners(visible) {
  document.querySelectorAll(".obryv-soft-ad").forEach((el) => {
    el.style.display = visible ? "block" : "none";
    if (visible) mountObryvSoftBanner(el);
  });
}

window.mountObryvSoftBanner = mountObryvSoftBanner;
window.syncObryvSoftBanners = syncObryvSoftBanners;
