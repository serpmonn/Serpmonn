// Продовый клиент лайков: интегрируется с результатами поиска и API /api/likes
// Поддерживает гостевые и авторизованные лайки с персистентным хранилищем

const LIKES_ENDPOINT = '/api/likes';

// Генерируем уникальный session_id для связи гостевых и авторизованных лайков
function getOrCreateSessionId() {
  try {
    let sessionId = localStorage.getItem('likes_session_id');
    console.log('[likes] Current session ID:', sessionId);
    
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('likes_session_id', sessionId);
      console.log('[likes] Created new session ID:', sessionId);
    }
    
    return sessionId;
  } catch (error) {
    console.error('[likes] Error with localStorage:', error);
    // Fallback: генерируем session_id без localStorage
    const fallbackId = 'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log('[likes] Using fallback session ID:', fallbackId);
    return fallbackId;
  }
}

function stableUrlFromResultNode(node) {
  try {
    const link = node.querySelector('.gs-title a, a.gs-title');
    if (!link || !link.href) return null;
    const u = new URL(link.href);
    // Убираем трекинг-параметры для стабильного ключа
    ['gclid','fbclid','yclid','msclkid'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchCounts(url) {
  try {
    const qs = new URLSearchParams({ url: encodeURIComponent(url) }).toString();
    const r = await fetch(`${LIKES_ENDPOINT}?${qs}`, { 
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    });
    if (!r.ok) return { guest: 0, auth: 0, total: 0, weight_auth: 3 };
    const j = await r.json();
    if (j.status !== 'ok') return { guest: 0, auth: 0, total: 0, weight_auth: 3 };
    const c = j.counts || { guest: 0, auth: 0, total: 0 };
    return { 
      guest: Number(c.guest||0), 
      auth: Number(c.auth||0), 
      total: Number(c.total||0), 
      weight_auth: Number(j.weight_auth||3) 
    };
  } catch (error) {
    console.warn('Ошибка получения счётчиков лайков:', error);
    return { guest: 0, auth: 0, total: 0, weight_auth: 3 };
  }
}

async function sendLike(url) {
  try {
    const sessionId = getOrCreateSessionId();
    console.log('[likes] Sending like for URL:', url, 'with session ID:', sessionId);
    
    const params = new URLSearchParams({ 
      url: url,
      session_id: sessionId
    });
    // user_id автоматически определяется сервером из JWT токена
    
    const r = await fetch(LIKES_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString(),
      credentials: 'same-origin'
    });
    
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    console.log('[likes] Server response:', j);
    
    if (j.status !== 'ok') throw new Error(j.message || 'Ошибка API');
    
    const c = j.counts || { guest: 0, auth: 0, total: 0 };
    return { 
      guest: Number(c.guest||0), 
      auth: Number(c.auth||0), 
      total: Number(c.total||0), 
      type: j.type,
      accepted: j.accepted 
    };
  } catch (error) {
    console.error('Ошибка отправки лайка:', error);
    throw error;
  }
}

function createLikeBadge(initial, liked) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `like-badge${liked ? ' liked' : ''}`;
  btn.innerHTML = `❤ <span class="count">${initial.total}</span> <span class="subcount" title="подтверждённых">(✓ ${initial.auth})</span>`;
  
  // Стили для кнопки лайка
  btn.style.cssText = `
    border: 1px solid #e1e5e9;
    border-radius: 20px;
    padding: 4px 10px;
    background: #f8f9fa;
    cursor: pointer;
    font-size: 12px;
    margin-top: 4px;
    transition: all 0.2s ease;
    color: #495057;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  `;
  
  if (liked) {
    btn.style.background = '#ffecef';
    btn.style.borderColor = '#ffc2cb';
  }
  
  return btn;
}

function markLiked(url) {
  try {
    const key = 'spn_liked_urls';
    const set = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    set.add(url);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (error) {
    console.warn('Ошибка сохранения лайка в localStorage:', error);
  }
}

function isLiked(url) {
  try {
    const key = 'spn_liked_urls';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(arr) && arr.includes(url);
  } catch {
    return false;
  }
}

// Получение ID пользователя из JWT токена (автоматически через cookies)
function getCurrentUserId() {
  // Пользователь авторизован автоматически через JWT токен в cookies
  // Сервер сам определит user_id из токена, нам не нужно передавать его явно
  return null; // Пусть сервер сам определяет из JWT
}

async function enhanceResult(node) {
  const url = stableUrlFromResultNode(node);
  if (!url) return;

  const container = document.createElement('div');
  container.className = 'like-container';
  node.appendChild(container);

  const liked = isLiked(url);
  const counts = await fetchCounts(url);

  const btn = createLikeBadge(counts, liked);
  container.appendChild(btn);

  let busy = false;
  btn.addEventListener('click', async () => {
    if (busy) return;
    
    // Проверяем, авторизован ли пользователь
    const isAuthenticated = document.cookie.includes('token=');
    
    if (isLiked(url) && !isAuthenticated) {
      // Блокируем только для неавторизованных пользователей
      btn.style.opacity = '0.6';
      setTimeout(() => btn.style.opacity = '1', 1000);
      return;
    }
    
    // Для авторизованных пользователей разрешаем повторные лайки (для миграции)
    
    busy = true;
    btn.style.opacity = '0.6';
    
    try {
      const result = await sendLike(url);
      
      // Обновляем счётчики
      btn.querySelector('.count').textContent = String(result.total);
      const sub = btn.querySelector('.subcount');
      if (sub) sub.textContent = `(✓ ${result.auth})`;
      
      btn.classList.add('liked');
      btn.style.background = '#ffecef';
      btn.style.borderColor = '#ffc2cb';
      btn.style.color = '#dc3545';
      
      // Сохраняем в localStorage только гостевые лайки
      if (result.type === 'guest') {
        markLiked(url);
        console.log('👍 Гостевой лайк добавлен');
      } else if (result.type === 'auth') {
        if (result.migrated) {
          console.log('🎉 Миграция произошла! Гостевой лайк превратился в авторизованный');
        } else {
          console.log('✅ Авторизованный лайк добавлен');
        }
      }
    } catch (error) {
      console.error('Ошибка при добавлении лайка:', error);
      // Можно показать уведомление пользователю
    } finally {
      busy = false;
      btn.style.opacity = '1';
    }
  });
}

function scanAndEnhance() {
  const results = document.querySelectorAll('.gsc-webResult.gsc-result');
  results.forEach(node => {
    if (node.__spnLiked) return;
    node.__spnLiked = true;
    enhanceResult(node);
  });
}

function bootWhenCseReady() {
  // Запускаем несколько раз, так как CSE рендерится асинхронно и при пагинации
  scanAndEnhance();
  const obs = new MutationObserver(() => scanAndEnhance());
  obs.observe(document.body, { childList: true, subtree: true });
}

// Запуск после готовности DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootWhenCseReady);
} else {
  bootWhenCseReady();
}