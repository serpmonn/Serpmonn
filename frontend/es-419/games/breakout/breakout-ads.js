// breakout-ads.js - Рекламные функции для игры

window.showFullScreenAd = window.showFullScreenAd || function() {
    try {
        let ov = document.getElementById('game-ad-overlay');
        if (!ov) {
            // Создание оверлея для рекламы
            ov = document.createElement('div');
            ov.id = 'game-ad-overlay';
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:9999;';
            
            const box = document.createElement('div');
            box.style.cssText = 'background:#111;border:1px solid #222;border-radius:12px;padding:12px;text-align:center;max-width:90vw;max-height:90vh;';
            
            const ins = document.createElement('ins');
            ins.className = 'mrg-tag';
            ins.setAttribute('data-ad-client', 'ad-1844883');
            ins.setAttribute('data-ad-slot', '1844883');
            
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.textContent = 'Продолжить';
            btn.style.marginTop = '10px';
            btn.onclick = function() { ov.remove(); };
            
            box.appendChild(ins);
            box.appendChild(btn);
            ov.appendChild(box);
            document.body.appendChild(ov);
            
            (window.MRGtag = window.MRGtag || []).push({});
        } else {
            ov.style.display = 'flex';
            (window.MRGtag = window.MRGtag || []).push({});
        }
    } catch (_) {
        // Игнорируем ошибки рекламы
    }
};