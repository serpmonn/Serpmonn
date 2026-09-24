(function () {
  const LS_KEY = 'spn_theme';
  const THEMES_ATTR = 'data-themes';

  function themeList() {
    const raw =
      document.documentElement.getAttribute(THEMES_ATTR) ||
      (document.body && document.body.getAttribute(THEMES_ATTR)) ||
      '';
    return raw
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function pageSupportsThemes() {
    return themeList().length > 1;
  }

  function systemTheme() {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (_) {
      return 'light';
    }
  }

  function storedTheme() {
    try {
      const t = localStorage.getItem(LS_KEY);
      return t === 'light' || t === 'dark' ? t : null;
    } catch (_) {
      return null;
    }
  }

  function resolveTheme() {
    return storedTheme() || systemTheme();
  }

  function syncPictureSources(theme) {
    document.querySelectorAll('source[media*="prefers-color-scheme"]').forEach((source) => {
      if (!source.dataset.spnMedia) {
        source.dataset.spnMedia = source.getAttribute('media') || '';
      }
      const orig = source.dataset.spnMedia;
      const wantsDark = /prefers-color-scheme:\s*dark/.test(orig);
      const wantsLight = /prefers-color-scheme:\s*light/.test(orig);
      if (wantsDark) source.setAttribute('media', theme === 'dark' ? 'all' : 'not all');
      else if (wantsLight) source.setAttribute('media', theme === 'light' ? 'all' : 'not all');
    });
    document.querySelectorAll('picture img').forEach((img) => {
      const src = img.getAttribute('src');
      if (!src) return;
      img.setAttribute('src', src);
    });
  }

  function updateToggleUi(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    btn.hidden = false;
    btn.setAttribute('data-theme-current', theme);
    const nextLabel =
      theme === 'dark'
        ? btn.getAttribute('data-label-light') || 'Light theme'
        : btn.getAttribute('data-label-dark') || 'Dark theme';
    btn.setAttribute('aria-label', nextLabel);
    btn.title = nextLabel;
  }

  function applyTheme(theme, persist) {
    if (theme !== 'light' && theme !== 'dark') theme = 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try {
      document.documentElement.style.colorScheme = theme;
    } catch (_) {}
    syncPictureSources(theme);
    updateToggleUi(theme);
    if (persist) {
      try {
        localStorage.setItem(LS_KEY, theme);
      } catch (_) {}
    }
    try {
      window.dispatchEvent(new CustomEvent('spn-theme-changed', { detail: { theme } }));
    } catch (_) {}
  }

  function toggleTheme() {
    const current =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark', true);
  }

  function initToggleButton() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn || btn.dataset.spnThemeBound === '1') return;
    btn.dataset.spnThemeBound = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleTheme();
    });
  }

  function init() {
    if (!pageSupportsThemes()) {
      const btn = document.getElementById('themeToggleBtn');
      if (btn) btn.hidden = true;
      return;
    }
    applyTheme(resolveTheme(), false);
    initToggleButton();

    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
        if (!storedTheme()) applyTheme(systemTheme(), false);
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (_) {}
  }

  window.spnThemeToggle = {
    init,
    applyTheme,
    resolveTheme,
    pageSupportsThemes,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Меню подгружается асинхронно — кнопка появляется позже
  const obs = new MutationObserver(() => {
    if (document.getElementById('themeToggleBtn')) {
      init();
    }
  });
  try {
    obs.observe(document.documentElement, { childList: true, subtree: true });
    const stop = setInterval(function () {
      const btn = document.getElementById('themeToggleBtn');
      if (btn && btn.dataset.spnThemeBound === '1') {
        obs.disconnect();
        clearInterval(stop);
      }
    }, 500);
    setTimeout(function () { clearInterval(stop); obs.disconnect(); }, 15000);
  } catch (_) {}
})();
