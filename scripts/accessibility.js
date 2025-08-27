// Доступность: быстрые настройки для слабовидящих пользователей
// Режимы: крупный шрифт, высокий контраст, подчёркнутые ссылки, меньше анимаций
// Сохраняются в localStorage и применяются на всех страницах

(function(){
  "use strict";

  const STORAGE_KEY = "spn_a11y_prefs";
  const PREFS_DEFAULT = { largeText:false, highContrast:false, underlineLinks:false, reduceMotion:false };

  function loadPrefs(){
    try { return Object.assign({}, PREFS_DEFAULT, JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")); } catch(_){ return {...PREFS_DEFAULT}; }
  }

  function savePrefs(p){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch(_){} }

  function applyPrefs(p){
    const root = document.documentElement;
    root.classList.toggle("a11y-large-text", !!p.largeText);
    root.classList.toggle("a11y-high-contrast", !!p.highContrast);
    root.classList.toggle("a11y-underline-links", !!p.underlineLinks);
    root.classList.toggle("a11y-reduce-motion", !!p.reduceMotion);
  }

  function injectStyles(){
    if (document.getElementById("spn-a11y-styles")) return;
    const style = document.createElement("style");
    style.id = "spn-a11y-styles";
    style.textContent = `
      /* Крупный текст */
      .a11y-large-text body { font-size: 18px; }
      .a11y-large-text h1 { font-size: 2.2em; }
      .a11y-large-text h2 { font-size: 1.8em; }
      .a11y-large-text h3 { font-size: 1.4em; }
      .a11y-large-text button, .a11y-large-text input, .a11y-large-text select { font-size: 1.05em; }

      /* Высокий контраст */
      .a11y-high-contrast body { background: #000 !important; color: #fff !important; }
      .a11y-high-contrast a { color: #00e5ff !important; }
      .a11y-high-contrast .card, .a11y-high-contrast .container, .a11y-high-contrast .menu-container { background: #111 !important; color:#fff !important; border-color:#555 !important; }
      .a11y-high-contrast button { background:#fff !important; color:#000 !important; border:2px solid #fff !important; }

      /* Подчёркивание ссылок */
      .a11y-underline-links a { text-decoration: underline !important; text-underline-offset: 0.15em; }

      /* Меньше анимаций */
      .a11y-reduce-motion *, .a11y-reduce-motion *::before, .a11y-reduce-motion *::after { transition: none !important; animation: none !important; }
    `;
    document.head.appendChild(style);
  }

  function buildUi(p){
    if (document.getElementById("spn-a11y-panel")) return;
    const panel = document.createElement("div");
    panel.id = "spn-a11y-panel";
    panel.style.position = "fixed";
    panel.style.bottom = "16px";
    panel.style.right = "16px";
    panel.style.zIndex = "100000";
    panel.style.background = "rgba(0,0,0,0.9)";
    panel.style.color = "#fff";
    panel.style.padding = "10px 12px";
    panel.style.borderRadius = "10px";
    panel.style.minWidth = "220px";
    panel.style.fontSize = "14px";
    panel.style.display = "none";

    function row(label, key){
      const id = `spn-a11y-${key}`;
      const wrap = document.createElement("label");
      wrap.style.display = "flex";
      wrap.style.alignItems = "center";
      wrap.style.justifyContent = "space-between";
      wrap.style.gap = "10px";
      wrap.style.margin = "6px 0";
      const span = document.createElement("span"); span.textContent = label;
      const input = document.createElement("input"); input.type = "checkbox"; input.id = id; input.checked = !!p[key];
      input.addEventListener("change", ()=>{ p[key]=input.checked; savePrefs(p); applyPrefs(p); });
      wrap.appendChild(span); wrap.appendChild(input);
      return wrap;
    }

    panel.appendChild(row("Крупный шрифт", "largeText"));
    panel.appendChild(row("Высокий контраст", "highContrast"));
    panel.appendChild(row("Подчёркивать ссылки", "underlineLinks"));
    panel.appendChild(row("Меньше анимаций", "reduceMotion"));

    const menuBtn = document.getElementById("spn-a11y-open");
    if (menuBtn) {
      menuBtn.addEventListener("click", (e)=>{
        e.preventDefault();
        panel.style.display = panel.style.display === "none" ? "block" : "none";
      });
    }

    document.body.appendChild(panel);
  }

  function init(){
    injectStyles();
    const prefs = loadPrefs();
    applyPrefs(prefs);
    buildUi(prefs);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();

