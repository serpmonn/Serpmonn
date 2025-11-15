// coins-ads.js - Скрипт управления рекламой для игры "Монетки"

/**
 * Функция для показа полноэкранной рекламы
 * Создает оверлей с рекламным блоком
 */
window.showFullScreenAd = window.showFullScreenAd || function() {
    try {
        // Проверяем, не существует ли уже оверлей с рекламой
        var ov = document.getElementById('game-ad-overlay');
        if (!ov) {
            // Создаем новый оверлей для рекламы
            ov = document.createElement('div');
            ov.id = 'game-ad-overlay';
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:9999;';
            
            // Создаем контейнер для рекламного контента
            var box = document.createElement('div');
            box.style.cssText = 'background:#111;border:1px solid #222;border-radius:12px;padding:12px;text-align:center;max-width:90vw;max-height:90vh;';
            
            // Создаем рекламный блок
            var ins = document.createElement('ins');
            ins.className = 'mrg-tag';
            ins.setAttribute('data-ad-client', 'ad-1844883');
            ins.setAttribute('data-ad-slot', '1844883');
            
            // Создаем кнопку закрытия рекламы
            var btn = document.createElement('button');
            btn.className = 'btn';
            btn.textContent = 'Продолжить';
            btn.style.marginTop = '10px';
            btn.onclick = function() { 
                ov.remove(); // Удаляем оверлей при клике
            };
            
            // Собираем структуру DOM
            box.appendChild(ins);
            box.appendChild(btn);
            ov.appendChild(box);
            document.body.appendChild(ov);
            
            // Инициализируем рекламный блок
            (window.MRGtag = window.MRGtag || []).push({});
        } else {
            // Если оверлей уже существует, просто показываем его и обновляем рекламу
            ov.style.display = 'flex';
            (window.MRGtag = window.MRGtag || []).push({});
        }
    } catch (_) {
        // Игнорируем ошибки при работе с рекламой
    }
};