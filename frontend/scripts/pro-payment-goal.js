/**
 * Цель Директа: оплата Serpmonn Pro (ЮKassa уже прошла, plan=pro).
 * Идентификатор в Метрике: payment_success
 */
(function () {
  var YM_ID = 98158791;
  var GOAL = 'payment_success';
  var CHECKOUT_KEY = 'serpmonn_pro_checkout';
  var DONE_KEY = 'serpmonn_payment_success_ids';
  var DAY_MS = 24 * 60 * 60 * 1000;

  function ensureMetrika() {
    if (typeof window.ym === 'function' && window.__smYmInit) return;
    window.__smYmInit = true;
    var m = window;
    m.ym =
      m.ym ||
      function () {
        (m.ym.a = m.ym.a || []).push(arguments);
      };
    m.ym.l = 1 * new Date();
    var src = 'https://mc.yandex.ru/metrika/tag.js';
    if (![].some.call(document.scripts, function (s) { return s.src === src; })) {
      var k = document.createElement('script');
      k.async = 1;
      k.src = src;
      var a = document.getElementsByTagName('script')[0];
      if (a && a.parentNode) a.parentNode.insertBefore(k, a);
      else document.head.appendChild(k);
    }
    m.ym(YM_ID, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true
    });
  }

  function readDone() {
    try {
      return JSON.parse(localStorage.getItem(DONE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function markDone(id) {
    var done = readDone();
    if (done.indexOf(id) !== -1) return;
    done.push(id);
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify(done));
    } catch (e) {}
  }

  function justActivated(user) {
    if (!user || !user.is_pro_active || !user.pro_until) return false;
    var left = new Date(user.pro_until).getTime() - Date.now();
    return left >= 28 * DAY_MS && left <= 32 * DAY_MS;
  }

  function fire(user) {
    var id = String(user.id || '') + ':' + String(user.pro_until || '');
    if (!id || readDone().indexOf(id) !== -1) return false;
    ensureMetrika();
    try {
      window.ym(YM_ID, 'reachGoal', GOAL, { currency: 'RUB', order_price: 2499 });
    } catch (e) {}
    markDone(id);
    try {
      sessionStorage.removeItem(CHECKOUT_KEY);
    } catch (e) {}
    return true;
  }

  async function poll() {
    var checkout = null;
    try {
      checkout = sessionStorage.getItem(CHECKOUT_KEY);
    } catch (e) {}
    if (!checkout) return;

    for (var i = 0; i < 12; i++) {
      try {
        var resp = await fetch('/profile/info', { credentials: 'include' });
        if (resp.ok) {
          var user = await resp.json();
          if (justActivated(user) && fire(user)) return;
        }
      } catch (e) {}
      await new Promise(function (r) {
        setTimeout(r, 2500);
      });
    }
  }

  if (!/\/tariffs\/success\.html(?:[?#]|$)/.test(location.pathname)) return;
  poll();
})();
