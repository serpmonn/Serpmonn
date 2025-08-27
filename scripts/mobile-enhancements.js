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

  // Pull-to-refresh для страниц с прокруткой у body
  function setupPullToRefresh() {
    if (!isTouchDevice()) return;
    const threshold = 70; // px
    let pulling = false;
    let startY = 0;
    let currentY = 0;
    let scrollStartTop = 0;
    let indicator;

    function ensureIndicator() {
      if (indicator) return indicator;
      indicator = document.createElement("div");
      indicator.style.position = "fixed";
      indicator.style.top = "8px";
      indicator.style.left = "50%";
      indicator.style.transform = "translateX(-50%)";
      indicator.style.padding = "6px 10px";
      indicator.style.borderRadius = "16px";
      indicator.style.background = "rgba(0,0,0,0.6)";
      indicator.style.color = "#fff";
      indicator.style.fontSize = "12px";
      indicator.style.zIndex = "9999";
      indicator.style.opacity = "0";
      indicator.style.transition = "opacity 150ms ease";
      indicator.textContent = "Потяните, чтобы обновить";
      document.body.appendChild(indicator);
      return indicator;
    }

    function onTouchStart(e) {
      if (document.scrollingElement && document.scrollingElement.scrollTop > 0) return;
      const t = e.touches[0];
      startY = t.clientY;
      scrollStartTop = document.scrollingElement ? document.scrollingElement.scrollTop : 0;
      pulling = scrollStartTop <= 0;
      currentY = startY;
    }

    function onTouchMove(e) {
      if (!pulling) return;
      const t = e.touches[0];
      currentY = t.clientY;
      const dy = currentY - startY;
      if (dy > 10) {
        ensureIndicator().style.opacity = "1";
        ensureIndicator().textContent = dy > threshold ? "Отпустите для обновления" : "Потяните, чтобы обновить";
      }
    }

    function onTouchEnd() {
      if (!pulling) return;
      const dy = currentY - startY;
      ensureIndicator().style.opacity = "0";
      if (dy > threshold) {
        haptic(20);
        // Страницы могут перехватить событие; по умолчанию — перезагрузка
        const ev = new CustomEvent("spn:pull-to-refresh");
        const canceled = !window.dispatchEvent(ev);
        if (!canceled) {
          location.reload();
        }
      }
      pulling = false;
      startY = 0;
      currentY = 0;
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
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
    setupPullToRefresh();
    injectTouchTargetStyles();
    setupPassiveScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

