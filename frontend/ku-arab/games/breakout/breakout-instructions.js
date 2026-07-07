// breakout-instructions.js - Показ инструкций к игре

(function() {
    'use strict';
    
    /**
     * Проверяет мобильное устройство
     */
    function isMobile() {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth < 768);
    }

    /**
     * Показывает инструкции для игры
     */
    function showInstructions() {
        // Проверяем, показывались ли уже инструкции
        if (localStorage.getItem('game_instructions_breakout_shown') === '1') return;
        
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:9998;';
        
        const box = document.createElement('div');
        box.style.cssText = 'max-width:90vw;background:#141821;color:#fff;border:1px solid #1f2632;border-radius:12px;padding:16px;text-align:left;';
        
        const h = document.createElement('h3');
        h.textContent = 'Как играть — Арканоид';
        h.style.margin = '0 0 8px';
        
        const p = document.createElement('div');
        p.style.cssText = 'font-size:14px;line-height:1.5;white-space:pre-line';
        
        // Разные инструкции для мобильных и десктопов
        p.textContent = isMobile() 
            ? '• Двигайте платформу пальцем по экрану\n• Старт — кнопка «Старт», Пауза — «Старт», Заново — «R» (если доступно)'
            : '• ← → или A/D — платформа\n• Пробел — старт/пауза\n• R — заново';
        
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = 'Понятно';
        btn.style.marginTop = '10px';
        btn.onclick = function() {
            ov.remove();
            localStorage.setItem('game_instructions_breakout_shown', '1');
        };
        
        box.appendChild(h);
        box.appendChild(p);
        box.appendChild(btn);
        ov.appendChild(box);
        document.body.appendChild(ov);
    }

    // Показываем инструкции при загрузке DOM
    document.addEventListener('DOMContentLoaded', showInstructions);
})();