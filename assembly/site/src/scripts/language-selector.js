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
    
    function isNeonRunnerPath(pathname){
        return /(?:^|\/)(?:frontend\/)?downloads\/neon-runner(?:\/|$)/.test(pathname)
            || /^\/neon-runner(?:\/|$)/.test(pathname);
    }

    function neonRunnerLangFromPath(pathname){
        if (/neon-runner\/en(?:\/|$)/.test(pathname)) return 'en';
        if (isNeonRunnerPath(pathname)) return 'ru';
        return null;
    }

    function neonRunnerTarget(lang){
        const safe = String(lang || '').replace(/[^a-z0-9-]/g, '');
        if (safe === 'en') return '/frontend/downloads/neon-runner/en/';
        if (safe === 'ru') return '/frontend/downloads/neon-runner/';
        // Только RU/EN лендинги — остальные языки уводим на главную локали
        return safe === 'ru' || !safe ? RU_DEFAULT : `/frontend/${safe}/index.html`;
    }

    function redirectToLang(lang, list){
        try {
            const url = new URL(location.href);
            const parts = url.pathname.split('/').filter(Boolean);
            const idx = parts.indexOf('frontend');
            const supported = new Set((list||[]).map(l=>l.code));
            const suffix = url.search + url.hash;

            // Neon Runner: EN живёт в .../neon-runner/en/, не в /frontend/en/...
            if (isNeonRunnerPath(url.pathname)) {
                const target = neonRunnerTarget(lang);
                const norm = (p) => String(p || '')
                    .replace(/\/index\.html$/i, '/')
                    .replace(/\/?$/, '/');
                if (target && norm(target) !== norm(url.pathname)) {
                    location.assign(target + suffix);
                }
                return;
            }
            
            if (idx === -1) {
                // Нет /frontend в пути: переходим на домашнюю для локали
                const home = (lang === 'ru') ? RU_DEFAULT : `/frontend/${String(lang).replace(/[^a-z0-9-]/g, '')}/index.html`;
                if (home === RU_DEFAULT || home.startsWith('/frontend/')) location.assign(home);
                return;
            }
            
            const afterFrontend = parts.slice(idx + 1);
            const hasLangSeg = afterFrontend[0] && supported.has(afterFrontend[0]);
            const rest = hasLangSeg ? afterFrontend.slice(1) : afterFrontend;
            
            // 🔧 ИСПРАВЛЕНИЕ: заменяем main.html на index.html для не-русских языков
            let processedRest = [...rest];
            if (lang !== 'ru' && processedRest.length > 0) {
                const lastSegment = processedRest[processedRest.length - 1];
                if (lastSegment === 'main.html') {
                    processedRest[processedRest.length - 1] = 'index.html';
                }
            }
            
            let targetParts;
            if (lang === 'ru') {
                // RU — без языкового сегмента
                if (processedRest.length === 0 || (processedRest.length === 1 && processedRest[0] === 'index.html')) {
                    targetParts = [];
                } else {
                    targetParts = ['frontend', ...processedRest];
                }
            } else {
                // Нелокальные: добавляем сегмент языка
                if (processedRest.length === 0 || (processedRest.length === 1 && processedRest[0] === 'index.html')) {
                    targetParts = ['frontend', lang];
                } else {
                    targetParts = ['frontend', lang, ...processedRest];
                }
            }
            
            let newPath = targetParts.length ? '/' + targetParts.join('/') : RU_DEFAULT;
            // Если попали на каталог локали без файла — добавим index.html
            if (newPath === `/frontend/${lang}`) newPath += '/index.html';
            if (newPath !== url.pathname) {
                const pathOnly = newPath.split('?')[0];
                if (pathOnly === RU_DEFAULT) {
                    location.assign(RU_DEFAULT + suffix);
                } else if (/^\/frontend\/[a-zA-Z0-9./_-]+$/.test(pathOnly)) {
                    location.assign(pathOnly + suffix);
                }
            }
        } catch(_) {}
    }
    
    function injectHreflang(list, currentLang){
        // У Neon уже стоят правильные hreflang на /neon-runner и /neon-runner/en —
        // стандартная схема /frontend/{lang}/... их ломает.
        if (isNeonRunnerPath(location.pathname)) return;

        Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).forEach(n=>n.remove());
        const base = location.origin + '/frontend/';
        list.forEach(item=>{
            const l = document.createElement('link');
            l.rel = 'alternate';
            l.hreflang = item.code;
            
            // 🔧 ИСПРАВЛЕНИЕ: заменяем main.html на index.html для не-русских языков в hreflang
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
        // Очищаем текущие опции
        select.innerHTML = '';
        
        // Добавляем опции из списка языков
        list.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.nativeName + (lang.englishName ? ' · ' + lang.englishName : '');
            
            // Устанавливаем выбранным текущий язык
            if (lang.code === currentLang) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
    }
    
    function initLanguageSelector(){
        // Загружаем стили для селектора языка
        loadCSS('/frontend/styles/language-selector.css?v=1');
        
        const select = document.getElementById('langSelect');
        if (!select) {
            console.error('Элемент #langSelect не найден');
            return;
        }
        
        // Загружаем список языков
        fetch(LANGS_URL, { cache: 'no-store' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(list => {
                const pathLang = neonRunnerLangFromPath(location.pathname);
                const currentLang = pathLang || getCurrentLang();
                if (pathLang) {
                    try { localStorage.setItem(LS_KEY, pathLang); } catch (_) {}
                    document.documentElement.lang = pathLang;
                }
                
                // Заполняем селектор
                populateSelector(select, list, currentLang);
                
                // Добавляем обработчик изменения
                select.addEventListener('change', function() {
                    const lang = this.value;
                    setLang(lang);
                    
                    // Применяем направление текста для нового языка
                    const selectedLang = list.find(l => l.code === lang);
                    if (selectedLang) {
                        document.documentElement.dir = selectedLang.rtl ? 'rtl' : 'ltr';
                        if (selectedLang.rtl) {
                            loadCSS('/frontend/styles/rtl.css?v=1');
                        }
                    }
                    
                    // Редирект на страницу с новым языком
                    redirectToLang(lang, list);
                    
                    // Обновляем hreflang теги
                    injectHreflang(list, lang);
                });
                
                // Предлагаем язык на основе браузера
                suggestByAcceptLanguage(list);
                
                // Применяем направление текста для текущего языка
                applyDirForLang(currentLang);
                
                // Инициализируем hreflang теги
                injectHreflang(list, currentLang);
            })
            .catch(error => {
                console.error('Ошибка загрузки списка языков:', error);
            });
    }
    
    // Запускаем инициализацию
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanguageSelector);
    } else {
        setTimeout(initLanguageSelector, 100);
    }
})();