#!/bin/bash

# Скрипт для обновления умной миграции лайков
# Выполняет все необходимые шаги для развёртывания

echo "🚀 Обновление умной миграции лайков..."

# 1. Обновить код
echo "📥 Обновление кода..."
git pull origin develop

# 2. Выполнить миграции MySQL
echo "🗄️ Выполнение миграций MySQL..."
mysql -u root -p << EOF
USE Serpmonn;

-- Миграция 1: Добавить session_id
ALTER TABLE likes 
ADD COLUMN session_id VARCHAR(255) NULL COMMENT 'Session ID для связи гостевых и авторизованных лайков';

CREATE INDEX idx_session_id ON likes (session_id);

CREATE INDEX idx_guest_session ON likes (session_id, like_type);

-- Миграция 2: Добавить поля истории
ALTER TABLE likes 
ADD COLUMN was_guest BOOLEAN DEFAULT FALSE COMMENT 'Был ли лайк изначально гостевым',
ADD COLUMN migrated_at TIMESTAMP NULL COMMENT 'Когда был мигрирован из гостевого в авторизованный';

CREATE INDEX idx_was_guest ON likes (was_guest);
CREATE INDEX idx_migrated_at ON likes (migrated_at);

SHOW COLUMNS FROM likes;
EOF

# 3. Перезапустить сервер
echo "🔄 Перезапуск сервера..."
pm2 restart all

# 4. Перезагрузить nginx
echo "🌐 Перезагрузка nginx..."
sudo nginx -s reload

echo "✅ Обновление завершено!"
echo ""
echo "📊 Доступные API endpoints:"
echo "  - POST /api/likes (лайки с миграцией)"
echo "  - GET /api/analytics/likes/conversion (статистика конверсии)"
echo "  - GET /api/analytics/likes/overall (общая статистика)"
echo "  - GET /api/analytics/likes/top-migrated (топ миграций)"
echo ""
echo "🧪 Для тестирования:"
echo "  node test-smart-migration.js"