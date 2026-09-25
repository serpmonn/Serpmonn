/**
 * Цели для Яндекс.Директа (счётчик 98158791).
 * Идентификаторы: app_apk_download, app_rustore_click, app_play_click, promo_code_copy
 */
(function () {
  var YM_ID = 98158791;

  function reachGoal(name, params) {
    try {
      if (typeof window.ym === 'function') {
        window.ym(YM_ID, 'reachGoal', name, params || {});
      }
    } catch (e) {}
  }

  window.smReachGoal = reachGoal;

  if (!/\/app\/serpmonn-app\.html(?:[?#]|$)/.test(location.pathname)) return;

  function bind() {
    var apk = document.getElementById('cta-apk');
    var rustore = document.getElementById('cta-rustore');
    var play = document.getElementById('cta-play');
    if (apk) {
      apk.addEventListener('click', function () {
        reachGoal('app_apk_download');
      });
    }
    if (rustore) {
      rustore.addEventListener('click', function () {
        reachGoal('app_rustore_click');
      });
    }
    if (play) {
      play.addEventListener('click', function () {
        reachGoal('app_play_click');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
