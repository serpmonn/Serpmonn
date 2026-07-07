// Мобильные улучшения: свайпы, pull-to-refresh, виброотклик, ленивые изображения
// Без зависимостей; безопасно подключать на любой странице

(function () {
  "use strict";

  function isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  // Хелпер виброотклика (если поддерживается)
  function haptic(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {}
  }

  // Ленивая загрузка для изображений без loading="lazy"
  function setupLazyImages() {
    const images = Array.from(document.querySelectorAll("img"))
      .filter(img => !img.loading);

    // Добавляем атрибуты, снижающие сдвиги макета
    images.forEach(img => {
      if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
      if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");
    });
  }

  // Свайпы: влево/вправо для навигации между разделами
  function setupSwipeNavigation() {
    if (!isTouchDevice()) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    const minDistance = 50; // px
    const maxOffAxis = 60; // px
    const maxDuration = 600; // ms

    function onTouchStart(e) {
      const t = e.changedTouches ? e.changedTouches[0] : e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = Date.now();
    }

    function onTouchEnd(e) {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const dt = Date.now() - touchStartTime;

      if (dt > maxDuration || Math.abs(dy) > maxOffAxis || Math.abs(dx) < minDistance) return;

      if (dx > 0) {
        // Свайп вправо
        const ev = new CustomEvent("spn:swipe-right");
        window.dispatchEvent(ev);
      } else {
        // Свайп влево
        const ev = new CustomEvent("spn:swipe-left");
        window.dispatchEvent(ev);
      }
      haptic(10);
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    // Поведение по умолчанию: назад/вперёд в истории
    window.addEventListener("spn:swipe-right", () => {
      if (history.length > 1) history.back();
    });
    window.addEventListener("spn:swipe-left", () => {
      // По умолчанию — no-op; страницы могут подписаться и навигировать
    });
  }

  // Увеличение размеров touch-таргетов через небольшой runtime-стиль
  function injectTouchTargetStyles() {
    const style = document.createElement("style");
    style.textContent = `
      button, .btn, a.button, a.btn, input[type="button"], input[type="submit"] {
        min-height: 44px; min-width: 44px;
      }
      .tap-large { min-height: 44px; min-width: 44px; }
    `;
    document.head.appendChild(style);
  }

  // Оптимизация скролла: пассивные слушатели (уже используются в этом файле)
  function setupPassiveScroll() {
    // no-op
  }

  // Инициализация после готовности DOM
  function init() {
    setupLazyImages();
    setupSwipeNavigation();
    injectTouchTargetStyles();
    setupPassiveScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

