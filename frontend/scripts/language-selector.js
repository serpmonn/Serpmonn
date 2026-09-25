(function(){
    const LS_KEY = 'spn_lang';
    const LANGS_URL = '/frontend/i18n/languages.json';
    const RU_DEFAULT = '/frontend/main.html';

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
        const l = document.createElement('link');
        l.rel='stylesheet';
        l.href=href;
        document.head.appendChild(l);
    }

    function pageLangAllowlist(){
        const raw =
            document.documentElement.getAttribute('data-langs') ||
            (document.body && document.body.getAttribute('data-langs')) ||
            '';
        const codes = raw
            .trim()
            .split(/\s+/)
            .map((x) => x.toLowerCase())
            .filter(Boolean);
        return codes.length ? new Set(codes) : null;
    }

    function isNeonRunnerPath(pathname){
        return /(?:^|\/)(?:frontend\/)?downloads\/neon-runner(?:\/|$)/.test(pathname)
            || /^\/neon-runner(?:\/|$)/.test(pathname);
    }

    function isSerpholdPath(pathname){
        return /(?:^|\/)(?:frontend\/)?downloads\/serphold(?:\/|$)/.test(pathname)
            || /^\/serphold(?:\/|$)/.test(pathname);
    }

    function isApkLandingPath(pathname){
        return isNeonRunnerPath(pathname) || isSerpholdPath(pathname);
    }

    function neonRunnerLangFromPath(pathname){
        if (/neon-runner\/en(?:\/|$)/.test(pathname)) return 'en';
        if (isNeonRunnerPath(pathname)) return 'ru';
        return null;
    }

    function serpholdLangFromPath(pathname){
        if (/serphold\/en(?:\/|$)/.test(pathname)) return 'en';
        if (isSerpholdPath(pathname)) return 'ru';
        return null;
    }

    function apkLandingLangFromPath(pathname){
        return neonRunnerLangFromPath(pathname) || serpholdLangFromPath(pathname);
    }

    function neonRunnerTarget(lang){
        const safe = String(lang || '').replace(/[^a-z0-9-]/g, '');
        if (safe === 'en') return '/frontend/downloads/neon-runner/en/';
        if (safe === 'ru') return '/frontend/downloads/neon-runner/';
        return null;
    }

    function serpholdTarget(lang){
        const safe = String(lang || '').replace(/[^a-z0-9-]/g, '');
        if (safe === 'en') return '/frontend/downloads/serphold/en/';
        if (safe === 'ru') return '/frontend/downloads/serphold/';
        return null;
    }

    /** Путь страницы для языка (без навигации). null = для этого языка страницы нет. */
    function pathForLang(lang, list){
        try {
            const url = new URL(location.href);
            const parts = url.pathname.split('/').filter(Boolean);
            const idx = parts.indexOf('frontend');
            const supported = new Set((list||[]).map(l=>l.code));
            const safe = String(lang || '').replace(/[^a-z0-9-]/g, '');
            if (!safe) return null;

            if (isNeonRunnerPath(url.pathname)) {
                return neonRunnerTarget(safe);
            }
            if (isSerpholdPath(url.pathname)) {
                return serpholdTarget(safe);
            }

            if (idx === -1) {
                return (safe === 'ru') ? RU_DEFAULT : `/frontend/${safe}/index.html`;
            }

            const afterFrontend = parts.slice(idx + 1);
            const hasLangSeg = afterFrontend[0] && supported.has(afterFrontend[0]);
            const rest = hasLangSeg ? afterFrontend.slice(1) : afterFrontend;

            let processedRest = [...rest];
            if (safe !== 'ru' && processedRest.length > 0) {
                const lastSegment = processedRest[processedRest.length - 1];
                if (lastSegment === 'main.html') {
                    processedRest[processedRest.length - 1] = 'index.html';
                }
            }

            let targetParts;
            if (safe === 'ru') {
                if (processedRest.length === 0 || (processedRest.length === 1 && processedRest[0] === 'index.html')) {
                    targetParts = [];
                } else {
                    targetParts = ['frontend', ...processedRest];
                }
            } else {
                if (processedRest.length === 0 || (processedRest.length === 1 && processedRest[0] === 'index.html')) {
                    targetParts = ['frontend', safe];
                } else {
                    targetParts = ['frontend', safe, ...processedRest];
                }
            }

            let newPath = targetParts.length ? '/' + targetParts.join('/') : RU_DEFAULT;
            if (newPath === `/frontend/${safe}`) newPath += '/index.html';
            return newPath;
        } catch (_) {
            return null;
        }
    }

    function redirectToLang(lang, list){
        try {
            const target = pathForLang(lang, list);
            if (!target) return;
            const allow = pageLangAllowlist();
            if (allow && !allow.has(String(lang || '').toLowerCase())) return;

            const url = new URL(location.href);
            const norm = (p) => String(p || '')
                .replace(/\/index\.html$/i, '/')
                .replace(/\/?$/, '/');
            if (norm(target) === norm(url.pathname) || target === url.pathname) return;

            const suffix = url.search + url.hash;
            if (target === RU_DEFAULT) {
                location.assign(RU_DEFAULT + suffix);
            } else if (/^\/frontend\/[a-zA-Z0-9./_-]+$/.test(target) || /^\/neon-runner/.test(target)) {
                location.assign(target + suffix);
            }
        } catch(_) {}
    }

    function langsFromHreflang(){
        const codes = [];
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => {
            const h = String(el.getAttribute('hreflang') || '').toLowerCase();
            if (h && h !== 'x-default') codes.push(h);
        });
        return codes.length ? new Set(codes) : null;
    }

    /**
     * Языки с переводом этой страницы (не «файл 200 OK»).
     * 1) data-langs — явный список переведённых локалей (источник правды в njk)
     * 2) иначе — hreflang alternate на странице (тоже задаётся в njk)
     * 3) иначе — полный список (старые страницы без сигнала)
     */
    function resolveAvailableLangs(list){
        const allow = pageLangAllowlist() || langsFromHreflang();
        if (!allow) return list || [];
        return (list || []).filter((item) => allow.has(String(item.code || '').toLowerCase()));
    }

    function injectHreflang(list){
        if (isApkLandingPath(location.pathname)) return;

        Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).forEach(n=>n.remove());
        const base = location.origin + '/frontend/';
        (list || []).forEach(item=>{
            const l = document.createElement('link');
            l.rel = 'alternate';
            l.hreflang = item.code;

            let path = location.pathname.split('/').slice(3).join('/') || '';
            if (item.code !== 'ru' && path === 'main.html') {
                path = 'index.html';
            }

            l.href = base + (item.code === 'ru' ? '' : item.code + '/') + path;
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

    function populateSelector(select, list, currentLang){
        select.innerHTML = '';
        list.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.nativeName + (lang.englishName ? ' · ' + lang.englishName : '');
            if (lang.code === currentLang) option.selected = true;
            select.appendChild(option);
        });
    }

    function initLanguageSelector(){
        loadCSS('/frontend/styles/language-selector.css?v=1');

        const select = document.getElementById('langSelect');
        if (!select) {
            console.error('Элемент #langSelect не найден');
            return;
        }

        fetch(LANGS_URL, { cache: 'no-store' })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                return response.json();
            })
            .then((list) => {
                const pathLang = apkLandingLangFromPath(location.pathname);
                const allow = pageLangAllowlist() || langsFromHreflang();
                let currentLang = pathLang || getCurrentLang();
                if (pathLang) {
                    try { localStorage.setItem(LS_KEY, pathLang); } catch (_) {}
                    document.documentElement.lang = pathLang;
                    currentLang = pathLang;
                }

                const pageList = resolveAvailableLangs(list);

                if (pageList.length && !pageList.some((x) => x.code === currentLang)) {
                    currentLang = pageList.some((x) => x.code === 'ru')
                        ? 'ru'
                        : pageList[0].code;
                    try { localStorage.setItem(LS_KEY, currentLang); } catch (_) {}
                    document.documentElement.lang = currentLang;
                }

                populateSelector(select, pageList, currentLang);

                select.addEventListener('change', function() {
                    const lang = this.value;
                    if (allow && !allow.has(lang)) return;
                    if (!pageList.some((x) => x.code === lang)) return;
                    setLang(lang);

                    const selectedLang = pageList.find(l => l.code === lang) || list.find(l => l.code === lang);
                    if (selectedLang) {
                        document.documentElement.dir = selectedLang.rtl ? 'rtl' : 'ltr';
                        if (selectedLang.rtl) loadCSS('/frontend/styles/rtl.css?v=1');
                    }

                    redirectToLang(lang, pageList);
                    injectHreflang(pageList);
                });

                suggestByAcceptLanguage(pageList);
                applyDirForLang(currentLang);
                injectHreflang(pageList);
            })
            .catch(error => {
                console.error('Ошибка загрузки списка языков:', error);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanguageSelector);
    } else {
        setTimeout(initLanguageSelector, 100);
    }
})();
