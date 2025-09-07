#!/usr/bin/env node

// Тестовый скрипт для проверки умной миграции лайков
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

async function testSmartMigration() {
  console.log('🧪 Тестирование умной миграции лайков...\n');
  
  const testUrl = 'https://example.com/test-smart-migration';
  const sessionId = 'test_session_' + Date.now();
  
  // 1. Тест гостевого лайка
  console.log('1️⃣ Создание гостевого лайка:');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(testUrl)}&session_id=${sessionId}`
    });
    
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   Ошибка:', error.message);
  }
  
  // 2. Тест авторизованного лайка с тем же session_id (имитация миграции)
  console.log('\n2️⃣ Авторизованный лайк с тем же session_id (миграция):');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-user-id': 'test-user-migration'
      },
      body: `url=${encodeURIComponent(testUrl)}&session_id=${sessionId}`
    });
    
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
    
    if (response.data.migrated) {
      console.log('   ✅ Миграция прошла успешно!');
    }
  } catch (error) {
    console.log('   Ошибка:', error.message);
  }
  
  // 3. Проверка финального состояния
  console.log('\n3️⃣ Проверка финального состояния:');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes?url=${encodeURIComponent(testUrl)}`);
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   Ошибка:', error.message);
  }
  
  // 4. Тест аналитики
  console.log('\n4️⃣ Проверка аналитики:');
  try {
    const response = await makeRequest(`${BASE_URL}/api/analytics/likes/conversion`);
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   Ошибка:', error.message);
  }
}

// Запуск тестов
testSmartMigration().catch(console.error);