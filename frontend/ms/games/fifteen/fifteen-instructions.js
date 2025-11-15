// fifteen-instructions.js - Скрипт показа инструкций для игры "Пятнашки"

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
        if (localStorage.getItem('game_instructions_fifteen_shown') === '1') return;
        
        // Создаем оверлей для инструкций
        var ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:9998;';
        
        // Создаем контейнер для содержимого инструкций
        var box = document.createElement('div');
        box.style.cssText = 'max-width:90vw;background:#141821;color:#fff;border:1px solid #1f2632;border-radius:12px;padding:16px;text-align:left;';
        
        // Заголовок инструкций
        var h = document.createElement('h3');
        h.textContent = 'Как играть — Пятнашки';
        h.style.margin = '0 0 8px';
        
        // Текст инструкций
        var p = document.createElement('div');
        p.style.cssText = 'font-size:14px;line-height:1.5;white-space:pre-line';
        
        // Разные инструкции для мобильных и десктопных устройств
        p.textContent = isMobile() 
            ? '• Свайпы — перемещение плиток\n• Цель: расставить числа по порядку от 1 до 15\n• Пустая клетка должна быть в правом нижнем углу'
            : '• Стрелки или WASD — перемещение плиток\n• Цель: расставить числа по порядку от 1 до 15\n• Пустая клетка должна быть в правом нижнем углу\n• Чем меньше ходов и времени — тем лучше!';
        
        // Кнопка закрытия инструкций
        var btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = 'Понятно';
        btn.style.marginTop = '10px';
        btn.onclick = function() { 
            ov.remove(); // Удаляем оверлей
            localStorage.setItem('game_instructions_fifteen_shown', '1'); // Сохраняем флаг что инструкции показаны
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