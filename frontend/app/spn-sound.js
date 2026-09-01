/**
 * UI sounds for Serpmonn Android app shell (Web Audio — no asset files).
 */
(function (global) {
  const KEY = 'spn_ui_sound';
  let ctx = null;
  let unlocked = false;

  function isEnabled() {
    try {
      return localStorage.getItem(KEY) !== 'off';
    } catch (_) {
      return true;
    }
  }

  function setEnabled(on) {
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch (_) {}
  }

  function ensureCtx() {
    if (!isEnabled()) return null;
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, gain, delaySec) {
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const peak = gain || 0.04;
    osc.connect(g);
    g.connect(c.destination);
    const t0 = c.currentTime + (delaySec || 0);
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const presets = {
    tap: () => tone(520, 0.035, 'sine', 0.028),
    notify: () => {
      tone(660, 0.07, 'sine', 0.042);
      tone(880, 0.09, 'sine', 0.036, 0.08);
    },
    success: () => {
      tone(523, 0.06, 'sine', 0.032);
      tone(784, 0.1, 'sine', 0.032, 0.07);
    },
    error: () => tone(220, 0.13, 'triangle', 0.038),
    send: () => tone(740, 0.045, 'sine', 0.03),
    record: () => tone(380, 0.05, 'sine', 0.025),
  };

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    ensureCtx();
  }

  function play(name) {
    if (!isEnabled()) return;
    unlock();
    const fn = presets[name];
    if (fn) {
      try { fn(); } catch (_) {}
    }
  }

  global.addEventListener('pointerdown', unlock, { once: true, passive: true });
  global.addEventListener('keydown', unlock, { once: true });

  global.spnSound = {
    play,
    setEnabled,
    isEnabled,
    unlock,
    preview: () => play('notify'),
  };
})(window);
