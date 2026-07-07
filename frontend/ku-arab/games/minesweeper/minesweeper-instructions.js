// minesweeper-instructions.js - Скрипт показа инструкций для игры "Сапёр"

(function() {
    'use strict';
    
    /**
     * Проверяет является ли устройство мобильным
     * @returns {boolean} true если мобильное устройство
     */
    function isMobile() { 
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth < 768); 
    }

    /**
     * Показывает инструкции для игры
     */
    function showInstructions() {
        // Проверяем, показывались ли уже инструкции (чтобы не показывать каждый раз)
        if (localStorage.getItem('game_instructions_mines_shown') === '1') return;
        
        // Создаем оверлей для инструкций
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:9998;';
        
        // Создаем контейнер для содержимого инструкций
        const box = document.createElement('div');
        box.style.cssText = 'max-width:90vw;background:#141821;color:#fff;border:1px solid #1f2632;border-radius:12px;padding:16px;text-align:left;';
        
        // Заголовок инструкций
        const h = document.createElement('h3');
        h.textContent = 'Как играть — Сапёр';
        h.style.margin = '0 0 8px';
        
        // Текст инструкций
        const p = document.createElement('div');
        p.style.cssText = 'font-size:14px;line-height:1.5;white-space:pre-line';
        
        // Разные инструкции для мобильных и десктопных устройств
        if (isMobile()) {
            p.textContent = '• Короткий тап — открыть\n• Долгий тап (≥0.4с) — флаг';
        } else {
            p.textContent = '• ЛКМ — открыть\n• ПКМ или Shift — флаг\n• Первый клик безопасный';
        }
        
        // Кнопка закрытия инструкций
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = 'Понятно';
        btn.style.marginTop = '10px';
        btn.onclick = function() { 
            // Сохраняем настройку чтобы больше не показывать
            localStorage.setItem('game_instructions_mines_shown', '1');
            ov.remove(); // Удаляем оверлей
        };
        
        // Собираем структуру DOM
        box.appendChild(h);
        box.appendChild(p);
        box.appendChild(btn);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }

    // Показываем инструкции когда DOM полностью загружен
    document.addEventListener('DOMContentLoaded', showInstructions);
})();