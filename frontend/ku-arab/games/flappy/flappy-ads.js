// flappy-ads.js - Скрипт управления рекламой для игры "Flappy Bird"

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
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:9999;';
            
            // Создаем контейнер для рекламного контента
            var box = document.createElement('div');
            box.style.cssText = 'background:#1a2230;border:2px solid #2ecc71;border-radius:16px;padding:20px;text-align:center;max-width:90vw;max-height:90vh;position:relative;';
            
            // Заголовок рекламного блока
            var title = document.createElement('div');
            title.textContent = 'Реклама';
            title.style.cssText = 'color:#f1c40f;font-weight:bold;margin-bottom:15px;font-size:16px;';
            
            // Создаем рекламный блок
            var ins = document.createElement('ins');
            ins.className = 'mrg-tag';
            ins.setAttribute('data-ad-client', 'ad-1844883');
            ins.setAttribute('data-ad-slot', '1844883');
            
            // Создаем кнопку закрытия рекламы
            var btn = document.createElement('button');
            btn.textContent = 'Продолжить игру';
            btn.style.cssText = `
                background: linear-gradient(135deg, #2ecc71, #27ae60);
                border: none;
                color: white;
                padding: 10px 20px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                margin-top: 15px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
            `;
            
            // Эффекты при наведении
            btn.onmouseover = function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 20px rgba(46, 204, 113, 0.4)';
            };
            btn.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(46, 204, 113, 0.3)';
            };
            
            // Функция закрытия рекламы
            const closeAd = function() {
                ov.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => {
                    if (ov.parentNode) {
                        ov.remove();
                    }
                }, 300);
            };
            
            btn.onclick = closeAd;
            
            // Закрытие рекламы по нажатию клавиш управления
            const handleKeyPress = function(e) {
                const k = e.key.toLowerCase();
                if (k === ' ' || k === 'r' || k === 'к') {
                    closeAd();
                    // Убираем обработчик после закрытия
                    window.removeEventListener('keydown', handleKeyPress);
                }
            };
            
            // Добавляем обработчик клавиш
            window.addEventListener('keydown', handleKeyPress);
            
            // Добавляем CSS анимацию
            if (!document.getElementById('ad-styles')) {
                const style = document.createElement('style');
                style.id = 'ad-styles';
                style.textContent = `
                    @keyframes fadeOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Собираем структуру DOM
            box.appendChild(title);
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
        console.log('Ошибка при показе рекламы');
    }
};