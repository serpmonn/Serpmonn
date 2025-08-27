// Mobile enhancements: swipe navigation, pull-to-refresh, haptics, lazy images
// Keep code dependency-free and safe to include on any page

(function () {
  "use strict";

  function isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  // Haptics helper (vibration if supported)
  function haptic(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {}
  }

  // Lazy loading for images without loading="lazy"
  function setupLazyImages() {
    const images = Array.from(document.querySelectorAll("img"))
      .filter(img => !img.loading);

    // Add width/height to reduce layout shift if missing
    images.forEach(img => {
      if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
      if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");
    });
  }

  // Swipe navigation: left/right swipe to navigate between logical sections
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
        // Swipe right
        const ev = new CustomEvent("spn:swipe-right");
        window.dispatchEvent(ev);
      } else {
        // Swipe left
        const ev = new CustomEvent("spn:swipe-left");
        window.dispatchEvent(ev);
      }
      haptic(10);
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    // Default behavior: history back/forward if applicable
    window.addEventListener("spn:swipe-right", () => {
      if (history.length > 1) history.back();
    });
    window.addEventListener("spn:swipe-left", () => {
      // No-op by default; pages can listen and navigate
    });
  }

  // Pull-to-refresh for pages with a scrollable body
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
      indicator.textContent = "Pull to refresh";
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
        ensureIndicator().textContent = dy > threshold ? "Release to refresh" : "Pull to refresh";
      }
    }

    function onTouchEnd() {
      if (!pulling) return;
      const dy = currentY - startY;
      ensureIndicator().style.opacity = "0";
      if (dy > threshold) {
        haptic(20);
        // Let pages override via event; fallback to hard reload
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

  // Increase touch target sizes using a small runtime style for buttons/links
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

  // Optimize passive listeners to reduce scroll jank
  function setupPassiveScroll() {
    // No-op here; this file only uses passive listeners already
  }

  // Initialize once DOM is ready
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

