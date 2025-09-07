#!/usr/bin/env node

// Тестовый скрипт для отладки лайков
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

async function testLikesAPI() {
  console.log('🔍 Тестирование API лайков...\n');
  
  // 1. Тест без токена (гостевой лайк)
  console.log('1️⃣ Тест гостевого лайка:');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'url=https://example.com/test-guest'
    });
    
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   Ошибка:', error.message);
  }
  
  console.log('\n2️⃣ Тест с заголовком x-user-id (имитация авторизованного):');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-user-id': 'test-user-123'
      },
      body: 'url=https://example.com/test-auth'
    });
    
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   Ошибка:', error.message);
  }
  
  console.log('\n3️⃣ Проверка GET запроса:');
  try {
    const response = await makeRequest(`${BASE_URL}/api/likes?url=https://example.com/test-guest`);
    console.log('   Статус:', response.status);
    console.log('   Ответ:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   Ошибка:', error.message);
  }
}

// Запуск тестов
testLikesAPI().catch(console.error);