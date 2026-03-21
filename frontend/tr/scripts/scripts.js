import { setCookie, getCookie } from './cookies.js';
import { loadNews } from './news.js';
import { generateCombinedBackground } from './backgroundGenerator.js';
import '/frontend/pwa/app.js';

// ======================================================================================================================
// МАРКДАУН РЕНДЕРЕР ДЛЯ КРАСИВОГО ФОРМАТИРОВАНИЯ ОТВЕТОВ ИИ
// ======================================================================================================================
function renderMarkdown(text) {
  let html = text;

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // списки
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');

  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  // Markdown-ссылки → <a class="md-link">
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>'
  );
  html = html.replace(/\n/g, '<br>');

  return html;
}

// ======================================================================================================================
// ИЗВЛЕЧЕНИЕ ССЫЛОК ИЗ HTML-ТЕКСТА
// ======================================================================================================================
function extractLinks(text) {
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g;
  const links = [];
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    try {
      const url = new URL(match[1]);
      links.push({
        url: match[1],
        text: match[2] || match[1]
      });
    } catch (e) {
      console.warn('Невалидный URL:', match[1]);
    }
  }

  return links.slice(0, 3);
}

// ======================================================================================================================
// ПОКАЗАТЬ АНИМАЦИЮ ЗАГРУЗКИ
// ======================================================================================================================
function showLoading() {
  const contentDiv = document.getElementById('ai-result-content');
  if (!contentDiv) return;

  contentDiv.innerHTML = `
    <div class="ai-loading">
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="loading-text">Serpmonn AI анализирует запрос...</div>
    </div>
  `;

  const timestampDiv = document.getElementById('ai-timestamp');
  if (timestampDiv) {
    timestampDiv.textContent = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// ======================================================================================================================
// ПОКАЗАТЬ РЕЗУЛЬТАТ ОТВЕТА ИИ
// ======================================================================================================================
function showResult(data) {
  const contentDiv = document.getElementById('ai-result-content');
  const container = document.getElementById('ai-result-container');
  let html = '';

  if (data.error) {
    html = `
      <div class="ai-error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${data.error}</div>
        <button class="retry-btn">
          Попробовать снова
        </button>
      </div>
    `;
  } else {
    const answer = data.answer || '';

    if (data.usedWebSearch) {
      html += `
        <div class="ai-search-badge">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          Использован веб‑поиск
        </div>
      `;
    }

    html += renderMarkdown(answer);

    if (Array.isArray(data.sources) && data.sources.length > 0) {
      html += `
        <div class="ai-sources">
          <div class="sources-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Источники
          </div>
          ${
            data.sources
              .slice(0, 4)
              .map(src => {
                let hostname = '';
                try { hostname = new URL(src.link).hostname; } catch (e) {}
                return `
                  <a href="${src.link}" target="_blank" rel="noopener" class="source-item">
                    <img src="https://www.google.com/s2/favicons?domain=${hostname}&sz=16" 
                         class="source-favicon" alt="">
                    <span class="source-title">${src.title || src.link}</span>
                    <span class="source-url">${hostname}</span>
                  </a>
                `;
              })
              .join('')
          }
        </div>
      `;
    } else {
      const links = extractLinks(html);
      if (links.length > 0) {
        html += `
          <div class="ai-sources">
            <div class="sources-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Источники
            </div>
            ${
              links.map(link => {
                let hostname = '';
                try { hostname = new URL(link.url).hostname; } catch (e) {}
                return `
                  <a href="${link.url}" target="_blank" rel="noopener" class="source-item">
                    <img src="https://www.google.com/s2/favicons?domain=${hostname}&sz=16" 
                         class="source-favicon" alt="">
                    <span class="source-title">${link.text || link.url}</span>
                    <span class="source-url">${hostname}</span>
                  </a>
                `;
              }).join('')
            }
          </div>
        `;
      }
    }
  }

  contentDiv.innerHTML = html;

  if (container) {
    container.style.display = 'block';
    container.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  setupActionButtons();
}

function showShareToast(message) {
  const toast = document.getElementById('ai-share-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.style.display = 'none';
    }, 200);
  }, 2000);
}

// ======================================================================================================================
// НАСТРОЙКА ИНТЕРАКТИВНЫХ КНОПОК ДЕЙСТВИЙ
// ======================================================================================================================
function setupActionButtons() {
  // 1. Копировать ответ
  const copyBtn = document.querySelector('.ai-action-btn[title^="Копировать"]');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const content = document.getElementById('ai-result-content')?.textContent || '';
      if (!content) return;

      try {
        await navigator.clipboard.writeText(content);
        copyBtn.dataset.state = 'copied';
        copyBtn.style.borderColor = '#10b981';
        setTimeout(() => {
          copyBtn.dataset.state = '';
          copyBtn.style.borderColor = '';
        }, 2000);
      } catch (err) {
        console.error('Ошибка копирования:', err);
      }
    }, { once: true });
  }

  // 2. Поделиться
  const shareBtn = document.querySelector('.ai-action-btn[title^="Поделиться"]');
  if (shareBtn) {
    let isSharing = false;
    const resultEl = document.getElementById('ai-result-content');

    const openShareModal = () => {
      const modal = document.getElementById('ai-share-modal');
      if (!modal || !resultEl) return;

      const dialog = modal.querySelector('.ai-share-dialog');
      const closeBtn = modal.querySelector('.ai-share-close');
      const backdrop = modal.querySelector('.ai-share-backdrop');
      const tgLink = modal.querySelector('.ai-share-telegram');
      const vkLink = modal.querySelector('.ai-share-vk');

      const quickTg = modal.querySelector('.ai-share-pill.ai-share-telegram');
      const quickVk = modal.querySelector('.ai-share-pill.ai-share-vk');
      const quickCopy = modal.querySelector('.ai-share-pill.ai-share-copy');

      const pageUrl = window.location.href.split('#')[0];
      const answerText = resultEl.textContent.trim().substring(0, 300);

      // Ссылки
      if (tgLink) {
        tgLink.href =
          `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}` +
          `&text=${encodeURIComponent(answerText)}`;
      }

      if (vkLink) {
        vkLink.href =
          `https://vk.com/share.php?url=${encodeURIComponent(pageUrl)}` +
          `&title=${encodeURIComponent('Ответ от Serpmonn AI')}` +
          `&comment=${encodeURIComponent(answerText)}`;
      }

      // Быстрые круглые кнопки
      if (quickTg && tgLink) quickTg.onclick = () => tgLink.click();
      if (quickVk && vkLink) quickVk.onclick = () => vkLink.click();

      if (quickCopy) {
        quickCopy.onclick = async () => {
          try {
            await navigator.clipboard.writeText(pageUrl);
            showShareToast('Ссылка на ответ скопирована');
          } catch (e) {
            console.error('Clipboard error', e);
          }
        };
      }

      const close = () => {
        modal.removeAttribute('data-open');
        setTimeout(() => { modal.style.display = 'none'; }, 150);
        document.removeEventListener('keydown', onEsc);
      };
      const onEsc = (e) => {
        if (e.key === 'Escape') close();
      };

      if (closeBtn) closeBtn.onclick = close;
      if (backdrop) backdrop.onclick = close;

      modal.style.display = 'flex';
      modal.setAttribute('data-open', 'true');
      if (dialog) dialog.focus();
      document.addEventListener('keydown', onEsc);
    };

    shareBtn.addEventListener('click', async () => {
      if (!resultEl) return;

      // 1) Пытаемся вызвать системный share везде, где он есть (мобилка или десктоп)
      if (navigator.share && !isSharing) {
        isSharing = true;
        try {
          await navigator.share({
            title: 'Serpmonn AI',
            text: resultEl.textContent.trim().substring(0, 200),
            url: window.location.href
          });
          isSharing = false;
          return; // нативный share отработал → свою модалку не показываем
        } catch (err) {
          // если юзер сам отменил, тоже просто выходим
          if (err && err.name === 'AbortError') {
            isSharing = false;
            return;
          }
          console.warn('navigator.share не сработал, fallback на модалку', err);
          isSharing = false;
          // и идём в fallback
        }
      }

      // 2) Если API нет или упал → показываем свою модалку
      openShareModal();
    });
  }

  // 3. Лайк/дизлайк
  document.querySelectorAll('.feedback-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const isLike = this.classList.contains('like');

      this.style.background = isLike ? '#ecfdf5' : '#fef2f2';
      this.style.borderColor = isLike ? '#10b981' : '#ef4444';
      this.style.color = isLike ? '#047857' : '#dc2626';

      console.log(`Feedback: ${isLike ? 'like' : 'dislike'}`);

      setTimeout(() => {
        this.style.background = '';
        this.style.borderColor = '';
        this.style.color = '';
      }, 3000);
    });
  });
}


// ======================================================================================================================
// РЕКЛАМНЫЙ БЛОК: ОБРАБОТКА ins.mrg-tag
// ======================================================================================================================
function handleIns(ins) {
  if (!ins || ins.__handled) return;
  ins.__handled = true;

  setTimeout(function () {
    const has = !!ins.querySelector('iframe');
    if (!has) {
      (window.MRGtag = window.MRGtag || []).push({});
    }
    setTimeout(function () {
      if (!ins.querySelector('iframe')) {
        const p = ins.closest(
          '.ad-top-banner,.ad-leaderboard,.promo-ad-inline,#mobile-anchor-ad'
        );
        if (p) p.style.display = 'none';
      }
    }, 2000);
  }, 2000);
}

function initAdObserver() {
  document.querySelectorAll('ins.mrg-tag').forEach(handleIns);

  const mo = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes &&
        m.addedNodes.forEach(function (n) {
          if (n.querySelectorAll) {
            n.querySelectorAll('ins.mrg-tag').forEach(handleIns);
          }
        });
    });
  });

  mo.observe(document.documentElement, { childList: true, subtree: true });
}

// ======================================================================================================================
// ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ
// ======================================================================================================================
function initPage() {
  const newsContainer = document.getElementById('news-container');
  if (!newsContainer) {
    console.error('Не найден контейнер новостей');
    return;
  }

  function setupEventListeners() {
    newsContainer.addEventListener('click', function () {
      this.classList.toggle('expanded');
    });

    const searchForm = document.getElementById('ai-search-form');
    searchForm.addEventListener('submit', async e => {
      e.preventDefault();

      const input = searchForm.querySelector('input[name="q"]');
      const query = input.value.trim();

      if (!query) {
        console.log('Пустой запрос');
        return;
      }

      showLoading();
      const container = document.getElementById('ai-result-container');
      if (container) {
        container.style.display = 'block';
      }

      try {
        const response = await fetch('/ai-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          credentials: 'include',                                                                                                                                                                           // вот это нужно, чтобы браузер послал cookie token
          body: JSON.stringify({ q: query })
        });

        if (!response.ok) {
        let errData = null;
        try {
          errData = await response.json();
        } catch (_) {}

        if (errData && errData.error) {
          if (errData.needAuth) {
            showResult({ error: errData.error });

            return;
          }

          showResult({ error: errData.error });
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

        const data = await response.json();
        const answer = data.answer || '';

        showResult({
          answer,
          usedWebSearch: data.usedWebSearch === true,
          sources: data.sources || []
        });
      } catch (error) {
        console.error('Ошибка при запросе к ИИ:', error);
        showResult({
          error: 'Ошибка связи с ИИ. Проверьте консоль или попробуйте позже.'
        });
      }
    });
  }

  async function loadPageData() {
    try {
      await Promise.allSettled([loadNews(), generateCombinedBackground()]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  }

  setupEventListeners();
  loadPageData();
  initAdObserver();
}

document.addEventListener('DOMContentLoaded', initPage);