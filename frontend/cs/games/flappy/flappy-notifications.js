// flappy-notifications.js - Система уведомлений для игры "Flappy Bird"

// Глобальная переменная для управления уведомлениями
window.flappyNotifications = {
    isNotificationActive: false,
    
    /**
     * Показывает случайное мотивационное уведомление после проигрыша
     */
    showMotivationalNotification: function() {
        // Если уже есть активное уведомление или игра не в процессе - выходим
        if (this.isNotificationActive || !window.flappyGame || !window.flappyGame.started) return;
        
        // 20% шанс показать уведомление после проигрыша (еще реже)
        if (Math.random() < 0.2) {
            this.showCompactNotification();
        }
    },
    
    /**
     * Показывает компактное уведомление с случайным сообщением
     */
    showCompactNotification: function() {
        this.isNotificationActive = true;
        
        const messages = (window.i18n && window.i18n.motivationalMessages) || [
            "Try again! 💪",
            "You're getting better! 🚀",
            "Next record is close! ⭐",
            "Focus! 🎯",
            "New challenge! 🌟",
            "You'll beat the record! 🔥",
            "Find your rhythm! 🎵",
            "You've got this! 💫"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // Создаем компактное уведомление
        const notification = document.createElement('div');
        notification.id = 'flappy-notification';
        notification.style.cssText = `
            position: fixed;
            top: 70px;
            right: 10px;
            background: rgba(40, 40, 60, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 180px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 12px;
            line-height: 1.3;
            border: 1px solid rgba(255,255,255,0.1);
            animation: slideInRight 0.3s ease-out;
            backdrop-filter: blur(5px);
            border-left: 3px solid #2ecc71;
        `;
        
        // Текст уведомления
        const message = document.createElement('div');
        message.textContent = randomMessage;
        
        // Собираем уведомление
        notification.appendChild(message);
        document.body.appendChild(notification);
        
        // Автоматическое закрытие через 3 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                    window.flappyNotifications.isNotificationActive = false;
                }, 300);
            }
        }, 3000);
    },
    
    /**
     * Показывает уведомление о новом рекорде (только если рекорд > 10)
     */
    showNewRecordNotification: function(score) {
        // Не показываем для низких рекордов
        if (score < 10) return;
        
        this.isNotificationActive = true;
        
        const notification = document.createElement('div');
        notification.id = 'flappy-record-notification';
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 10px;
            background: rgba(46, 204, 113, 0.9);
            color: white;
            padding: 10px 14px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 12px;
            line-height: 1.3;
            border: 1px solid rgba(255,255,255,0.2);
            animation: slideInRight 0.3s ease-out;
            backdrop-filter: blur(5px);
            max-width: 160px;
        `;
        
        const content = document.createElement('div');
        const tpl = (window.i18n && window.i18n.recordNotificationHtml) || '🎉 <strong>Record: {score}</strong>';
        content.innerHTML = tpl.replace('{score}', String(score));
        
        notification.appendChild(content);
        document.body.appendChild(notification);
        
        // Автозакрытие через 4 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                    window.flappyNotifications.isNotificationActive = false;
                }, 300);
            }
        }, 4000);
    }
};

// Добавляем CSS анимации один раз
if (!document.getElementById('compact-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'compact-notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}