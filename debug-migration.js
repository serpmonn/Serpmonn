#!/usr/bin/env node

// Отладочный скрипт для проверки миграции лайков
import https from 'https';
import { URL } from 'url';

const BASE_URL = 'https://serpmonn.ru';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function debugMigration() {
  console.log('🔍 Отладка миграции лайков...\n');
  
  const testUrl = 'https://example.com/debug-migration';
  const sessionId = 'debug_session_' + Date.now();
  
  console.log(`📝 Тестовые данные:`);
  console.log(`   URL: ${testUrl}`);
  console.log(`   Session ID: ${sessionId}\n`);
  
  // 1. Создать гостевой лайк
  console.log('1️⃣ Создание гостевого лайка:');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(testUrl)}&session_id=${sessionId}`
    });
    
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
    
    if (response.data.status === 'ok' && response.data.accepted) {
      console.log('   ✅ Гостевой лайк создан успешно');
    } else {
      console.log('   ❌ Ошибка создания гостевого лайка');
      return;
    }
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
    return;
  }
  
  // 2. Проверить состояние после гостевого лайка
  console.log('\n2️⃣ Проверка состояния после гостевого лайка:');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes?url=${encodeURIComponent(testUrl)}`);
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
  }
  
  // 3. Создать авторизованный лайк с тем же session_id (должна произойти миграция)
  console.log('\n3️⃣ Создание авторизованного лайка (миграция):');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-user-id': 'debug-user-123'
      },
      body: `url=${encodeURIComponent(testUrl)}&session_id=${sessionId}`
    });
    
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
    
    if (response.data.migrated) {
      console.log('   ✅ Миграция прошла успешно!');
    } else if (response.data.accepted) {
      console.log('   ⚠️ Лайк принят, но миграция не произошла');
    } else {
      console.log('   ❌ Лайк не принят');
    }
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
  }
  
  // 4. Проверить финальное состояние
  console.log('\n4️⃣ Финальное состояние:');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes?url=${encodeURIComponent(testUrl)}`);
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
    
    const counts = response.data.counts;
    if (counts) {
      console.log(`   📊 Итоговые счётчики:`);
      console.log(`      Гостевые: ${counts.guest}`);
      console.log(`      Авторизованные: ${counts.auth}`);
      console.log(`      Общий: ${counts.total}`);
      
      if (counts.auth > 0 && counts.guest === 0) {
        console.log('   ✅ Миграция работает правильно!');
      } else if (counts.auth > 0 && counts.guest > 0) {
        console.log('   ⚠️ Есть и гостевые, и авторизованные лайки (возможно, дублирование)');
      } else {
        console.log('   ❌ Миграция не сработала');
      }
    }
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
  }
}

// Запуск отладки
debugMigration().catch(console.error);