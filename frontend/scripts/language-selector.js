(function(){
	const LS_KEY = 'spn_lang';
	const LANGS_URL = '/frontend/i18n/languages.json';

	function getCurrentLang(){
		return (localStorage.getItem(LS_KEY) || document.documentElement.lang || 'ru').toLowerCase();
	}
	function setLang(lang){
		localStorage.setItem(LS_KEY, lang);
		document.documentElement.lang = lang;
		applyDirForLang(lang);
	}
	function applyDirForLang(lang){
		try {
			fetch(LANGS_URL, { cache: 'no-store' }).then(r=>r.json()).then(list=>{
				const item = list.find(x=>x.code===lang);
				document.documentElement.dir = item && item.rtl ? 'rtl' : 'ltr';
				if (item && item.rtl) {
					loadCSS('/frontend/styles/rtl.css?v=1');
				}
			});
		} catch(_) {}
	}
	function loadCSS(href){
		if (document.querySelector('link[href="'+href+'"]')) return;
		const l = document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l);
	}
    function createSelector(list){
        const container = document.createElement('div');
        container.className = 'menu-item lang-selector-item lang-selector-container';
        const icon = document.createElement('span');
        icon.className = 'tool-icon';
        icon.textContent = '🌐';
        const select = document.createElement('select');
		select.className = 'lang-selector';
		const current = getCurrentLang();
		list.forEach(l=>{
			const opt = document.createElement('option');
			opt.value = l.code;
			opt.textContent = l.nativeName + (l.englishName ? ' · '+l.englishName : '');
			if (l.code === current) opt.selected = true;
			select.appendChild(opt);
		});
		select.addEventListener('change', (e)=>{
			const lang = e.target.value;
			setLang(lang);
			redirectToLang(lang, list);
			injectHreflang(list, lang);
		});
        container.appendChild(icon);
        container.appendChild(select);
		return container;
	}
    function redirectToLang(lang, list){
		try {
			const url = new URL(location.href);
            const parts = url.pathname.split('/').filter(Boolean);
            const idx = parts.indexOf('frontend');
            const supported = new Set((list||[]).map(l=>l.code));
            if (idx === -1) {
                // no /frontend in path: go to localized home
                if (lang === 'ru') { location.href = '/'; }
                else { location.href = `/frontend/${lang}/index.html`; }
                return;
            }
			const next = parts[idx+1];
			const hasLangSeg = next && supported.has(next);
			if (hasLangSeg) {
				if (lang === 'ru') {
					// remove locale segment for ru default
					parts.splice(idx+1, 1);
				} else {
					parts[idx+1] = lang;
				}
			} else {
				if (lang !== 'ru') {
					parts.splice(idx+1, 0, lang);
				}
			}
			let newPath = '/' + parts.join('/');
			if (newPath !== url.pathname) location.href = newPath + url.search + url.hash;
		} catch(_) {}
	}
	function injectHreflang(list, currentLang){
		Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).forEach(n=>n.remove());
		const base = location.origin + '/frontend/';
		list.forEach(item=>{
			const l = document.createElement('link');
			l.rel = 'alternate';
			l.hreflang = item.code;
			l.href = base + (item.code === 'ru' ? '' : item.code + '/')
				+ (location.pathname.split('/').slice(3).join('/') || '');
			document.head.appendChild(l);
		});
		const xd = document.createElement('link');
		xd.rel = 'alternate';
		xd.hreflang = 'x-default';
		xd.href = base;
		document.head.appendChild(xd);
	}
	function suggestByAcceptLanguage(list){
		try {
			const stored = localStorage.getItem(LS_KEY);
			if (stored) return;
			const nav = navigator.languages || [navigator.language];
			const found = nav.map(x=>x.toLowerCase()).map(x=> list.find(l=>l.code===x || x.startsWith(l.code))).find(Boolean);
			if (found && found.code !== getCurrentLang()) {
				localStorage.setItem(LS_KEY, found.code);
			}
		} catch(_) {}
	}
	function mountSelector(){
		// ensure styles
		loadCSS('/frontend/styles/language-selector.css?v=1');
		fetch(LANGS_URL, { cache: 'no-store' }).then(r=>r.json()).then(list=>{
			const sel = createSelector(list);
			const attach = () => {
				const menu = document.getElementById('menuContainer');
				if (menu) {
					if (!menu.querySelector('.lang-selector-container')) {
						menu.insertBefore(sel, menu.firstChild);
					}
					injectHreflang(list, getCurrentLang());
					suggestByAcceptLanguage(list);
					applyDirForLang(getCurrentLang());
					return true;
				}
				return false;
			};
			if (!attach()) {
				const mo = new MutationObserver(() => { if (attach()) mo.disconnect(); });
				mo.observe(document.documentElement, { childList: true, subtree: true });
			}
		}).catch(()=>{});
	}
	document.addEventListener('DOMContentLoaded', mountSelector);
})();