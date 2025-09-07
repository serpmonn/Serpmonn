#!/usr/bin/env node

// Отладочный скрипт для проверки дедупликации лайков
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

async function debugDeduplication() {
  console.log('🔍 Отладка дедупликации лайков...\n');
  
  const testUrl = 'https://example.com/debug-dedup';
  const sessionId = 'dedup_session_' + Date.now();
  
  console.log(`📝 Тестовые данные:`);
  console.log(`   URL: ${testUrl}`);
  console.log(`   Session ID: ${sessionId}\n`);
  
  // 1. Первый гостевой лайк
  console.log('1️⃣ Первый гостевой лайк:');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(testUrl)}&session_id=${sessionId}`
    });
    
    console.log('   Статус:', response.status);
    console.log('   Принят:', response.data.accepted);
    console.log('   Тип:', response.data.type);
    
    if (response.data.accepted) {
      console.log('   ✅ Первый гостевой лайк принят');
    } else {
      console.log('   ❌ Первый гостевой лайк отклонён');
    }
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
    return;
  }
  
  // 2. Второй гостевой лайк (должен быть отклонён)
  console.log('\n2️⃣ Второй гостевой лайк (должен быть отклонён):');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(testUrl)}&session_id=${sessionId}`
    });
    
    console.log('   Статус:', response.status);
    console.log('   Принят:', response.data.accepted);
    console.log('   Тип:', response.data.type);
    
    if (!response.data.accepted) {
      console.log('   ✅ Второй гостевой лайк правильно отклонён (дедупликация работает)');
    } else {
      console.log('   ❌ Второй гостевой лайк принят (дедупликация НЕ работает!)');
    }
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
  }
  
  // 3. Авторизованный лайк (должна произойти миграция)
  console.log('\n3️⃣ Авторизованный лайк (миграция):');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-user-id': 'dedup-user-123'
      },
      body: `url=${encodeURIComponent(testUrl)}&session_id=${sessionId}`
    });
    
    console.log('   Статус:', response.status);
    console.log('   Принят:', response.data.accepted);
    console.log('   Тип:', response.data.type);
    console.log('   Мигрирован:', response.data.migrated);
    
    if (response.data.migrated) {
      console.log('   ✅ Миграция произошла');
    } else if (response.data.accepted) {
      console.log('   ⚠️ Лайк принят, но миграция не произошла');
    } else {
      console.log('   ❌ Лайк отклонён');
    }
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
  }
  
  // 4. Второй авторизованный лайк (должен быть отклонён)
  console.log('\n4️⃣ Второй авторизованный лайк (должен быть отклонён):');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-user-id': 'dedup-user-123'
      },
      body: `url=${encodeURIComponent(testUrl)}&session_id=${sessionId}`
    });
    
    console.log('   Статус:', response.status);
    console.log('   Принят:', response.data.accepted);
    console.log('   Тип:', response.data.type);
    
    if (!response.data.accepted) {
      console.log('   ✅ Второй авторизованный лайк правильно отклонён (дедупликация работает)');
    } else {
      console.log('   ❌ Второй авторизованный лайк принят (дедупликация НЕ работает!)');
    }
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
  }
  
  // 5. Финальное состояние
  console.log('\n5️⃣ Финальное состояние:');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes?url=${encodeURIComponent(testUrl)}`);
    console.log('   Статус:', response.status);
    console.log('   Счётчики:', JSON.stringify(response.data.counts, null, 2));
  } catch (error) {
    console.log('   ❌ Ошибка:', error.message);
  }
}

// Запуск отладки
debugDeduplication().catch(console.error);