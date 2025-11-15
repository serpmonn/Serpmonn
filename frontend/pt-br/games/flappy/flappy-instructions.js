// flappy-instructions.js - Скрипт показа инструкций для игры "Flappy Bird"

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
     * Показывает инструкции по центру экрана
     */
    function showCenteredInstructions() {
        // Проверяем, показывались ли уже инструкции
        if (localStorage.getItem('game_instructions_flappy_shown') === '1') return;
        
        // Создаем оверлей для инструкций по центру экрана
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            background: #1a2230;
            border: 2px solid #2ecc71;
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            max-width: 320px;
            width: 90%;
            color: white;
        `;
        
        const title = document.createElement('div');
        title.textContent = '💡 Управление - Flappy Bird';
        title.style.cssText = 'font-weight: bold; margin-bottom: 16px; color: #f1c40f; font-size: 18px;';
        
        const text = document.createElement('div');
        text.style.cssText = 'font-size: 14px; line-height: 1.6; margin-bottom: 20px; text-align: left;';
        
        if (isMobile()) {
            text.innerHTML = `
                <div style="margin-bottom: 10px;">👆 <strong>Тап по экрану</strong> - взмах крыльев</div>
                <div style="margin-bottom: 10px;">🔄 <strong>Кнопка "Заново"</strong> - перезапуск игры</div>
                <div>🎯 <strong>Цель:</strong> Пролетайте между трубами</div>
            `;
        } else {
            text.innerHTML = `
                <div style="margin-bottom: 10px;">🔼 <strong>ПРОБЕЛ или ЛКМ</strong> - взмах крыльев</div>
                <div style="margin-bottom: 10px;">🔄 <strong>Клавиша R</strong> - перезапуск игры</div>
                <div style="margin-bottom: 10px;">🔄 <strong>Кнопка "Заново"</strong> - перезапуск игры</div>
                <div>🎯 <strong>Цель:</strong> Пролетайте между трубами</div>
            `;
        }
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Начать играть!';
        closeBtn.style.cssText = `
            background: #2ecc71;
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 12px;
            transition: all 0.3s ease;
        `;
        
        closeBtn.onmouseover = function() {
            this.style.background = '#27ae60';
            this.style.transform = 'translateY(-2px)';
        };
        closeBtn.onmouseout = function() {
            this.style.background = '#2ecc71';
            this.style.transform = 'translateY(0)';
        };
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.style.cssText = 'display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer;';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.marginRight = '8px';
        
        checkboxLabel.appendChild(checkbox);
        checkboxLabel.appendChild(document.createTextNode('Больше не показывать'));
        
        closeBtn.onclick = function() {
            if (checkbox.checked) {
                localStorage.setItem('game_instructions_flappy_shown', '1');
            }
            overlay.remove();
        };
        
        instructions.appendChild(title);
        instructions.appendChild(text);
        instructions.appendChild(closeBtn);
        instructions.appendChild(checkboxLabel);
        overlay.appendChild(instructions);
        document.body.appendChild(overlay);
    }

    // Показываем инструкции когда DOM загружен
    document.addEventListener('DOMContentLoaded', showCenteredInstructions);
})();