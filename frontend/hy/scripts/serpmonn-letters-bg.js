(function initSerpmonnLettersBackground(){                                                                 // Самовызывающаяся функция — запускается сразу после загрузки скрипта
  try {                                                                                                    // Защита от любых ошибок — страница не упадёт
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;                  // Определяет тач-устройство (телефон/планшет)
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;  // Проверяет настройку «уменьшить движение» в ОС
    if (prefersReduced) return;                                                                            // Если включена экономия анимации — скрипт завершается

    const canvas = document.createElement('canvas');                                                       // Создаётся элемент canvas для рисования
    const ctx = canvas.getContext('2d', { alpha: true });                                                  // Получается 2D-контекст с прозрачностью
    canvas.id = 'serpmonn-letters-bg';                                                                     // Устанавливается id для элемента

    Object.assign(canvas.style, {                                                                          // Применяются стили к canvas сразу пачкой
      position: 'static', width: '100%', height: 'auto',                                                   // Ширина 100%, высота подстраивается
      zIndex: '1', pointerEvents: 'none', display: 'block'                                                 // Лежит под контентом, не ловит клики
    });

    const bodyEl = document.body;                                                                          // Ссылка на body для удобства

    const newsContainer = document.querySelector('.news-container');                                       // Находит блок с заголовком и описанием
    const searchCard    = document.querySelector('.search-card');                                          // Находит блок с поисковой формой

    if (newsContainer && searchCard) {                                                                     // Если оба блока найдены
      newsContainer.parentNode.insertBefore(canvas, newsContainer.nextSibling);                            // canvas вставляется после .news-container
    } else {                                                                                               // Иначе (fallback на случай странной структуры)
      if (bodyEl.firstChild) bodyEl.insertBefore(canvas, bodyEl.firstChild);                               // Вставка в начало body
      else bodyEl.appendChild(canvas);                                                                     // Или в конец, если body пуст
    }

    let width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);                          // Переменные размеров + ограниченный dpr
    const text = 'Serpmonn';                                                                               // Текст, который будет анимирован
    const glyphs = [];                                                                                     // Массив объектов — по одному на каждую букву

    const RED  = '#dc3545';                                                                                // Красный цвет для букв S e r p
    const DARK = 'rgba(0,0,0,0.75)';                                                                       // Тёмный полупрозрачный для m o n n

    const mouse = { x: null, y: null };                                                                    // Объект для хранения координат курсора
    window.addEventListener('mousemove', (e)=>{ if (isCoarse) return; mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });  // Отслеживание мыши (только на не-тач)
    window.addEventListener('mouseleave', ()=>{ mouse.x = null; mouse.y = null; });                        // Сброс координат при уходе курсора с окна

    function resize(){                                                                                     // Функция пересчёта размеров при изменении окна
      width  = Math.floor(window.innerWidth);                                                              // Текущая ширина окна
      height = 120;                                                                                        // Фиксированная высота зоны букв
      canvas.width  = Math.floor(width  * dpr);                                                            // Физическая ширина canvas (Retina)
      canvas.height = Math.floor(height * dpr);                                                            // Физическая высота canvas
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);                                                              // Масштабирование контекста под плотность пикселей
      layout();                                                                                            // Пересчёт позиций букв
    }

    function layout(){                                                                                     // Расстановка букв по центру canvas
      glyphs.length = 0;                                                                                   // Очистка старых букв
      const margin = Math.min(40, width * 0.05);                                                           // Отступы слева/справа
      const availableWidth = Math.max(0, width - margin * 2);                                              // Доступная ширина для текста
      const spacing = 8;                                                                                   // Расстояние между буквами

      let fontSize = Math.min(40, Math.max(16, Math.floor(availableWidth / (text.length * 1.4))));         // Подбор размера шрифта

      if (width < 480) fontSize = Math.max(24, Math.floor(fontSize * 0.9));                                // Увеличение на мобильных
      else if (width > 1024) fontSize = Math.max(20, Math.floor(fontSize * 0.8));                          // Уменьшение на десктопах

      ctx.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;        // Установка жирного шрифта
      ctx.textBaseline = 'middle';                                                                         // Выравнивание по вертикальному центру

      const widths = [...text].map(ch => ctx.measureText(ch).width);                                       // Ширина каждой буквы
      const totalTextWidth = widths.reduce((a,b)=>a+b,0) + spacing * (text.length - 1);                    // Общая ширина слова

      let x = Math.floor((width - totalTextWidth) / 2);                                                    // Центрирование по горизонтали
      let y = Math.floor(height / 2);                                                                      // Центрирование по вертикали

      for (let i = 0; i < text.length; i++){                                                               // Проход по каждой букве
        const ch = text[i];
        const w = widths[i];
        const baseX = x, baseY = y;
        const color = i < 4 ? RED : DARK;                                                                  // Первые 4 — красные, остальные тёмные
        glyphs.push({ ch, baseX, baseY, x: baseX, y: baseY, vx: 0, vy: 0, w, h: fontSize, color });        // Добавление буквы в массив
        x += w + spacing;                                                                                  // Сдвиг позиции
      }
    }

    const friction     = 0.86;                                                                             // Трение — затухание движения
    const springK      = 0.08;                                                                             // Сила возврата к базе (пружина)
    const repelRadius  = 260;                                                                              // Радиус отталкивания от курсора
    const repelStrength= 2.0;                                                                              // Сила отталкивания
    const maxOffset    = 96;                                                                               // Максимальное отклонение от центра

    function step(){                                                                                       // Главный цикл анимации (~60 fps)
      ctx.clearRect(0,0,width,height);                                                                     // Очистка canvas перед кадром

      const grad = ctx.createLinearGradient(0,0,width,height);                                             // Диагональный градиент
      grad.addColorStop(0, 'rgba(0,0,0,0)');                                                             // Полностью прозрачный в начале
      grad.addColorStop(1, 'rgba(0,0,0,0)');                                                             // Полностью прозрачный в конце
      ctx.fillStyle = grad;                                                                                // Назначение градиента
      ctx.fillRect(0,0,width,height);                                                                      // Заливка слабым фоном

      const mx = mouse.x, my = mouse.y;                                                                    // Координаты курсора
      let canvasRect = null;                                                                               // Позиция canvas на странице
      try { canvasRect = canvas.getBoundingClientRect(); } catch(_) {}                                     // Получение координат (с защитой)

      for (const g of glyphs){                                                                             // Обработка каждой буквы
        g.vx += (g.baseX - g.x) * springK;                                                                 // Сила возврата по X
        g.vy += (g.baseY - g.y) * springK;                                                                 // Сила возврата по Y

        if (mx != null && my != null && canvasRect){                                                       // Если курсор есть
          const canvasX = mx - canvasRect.left;                                                            // Локальная X внутри canvas
          const canvasY = my - canvasRect.top;                                                             // Локальная Y внутри canvas
          const dx = g.x + g.w/2 - canvasX;                                                                // Расстояние по X от центра буквы
          const dy = g.y - canvasY;                                                                        // Расстояние по Y
          const dist2 = dx*dx + dy*dy;                                                                     // Квадрат расстояния
          if (dist2 < repelRadius * repelRadius){                                                          // Курсор в зоне отталкивания
            const dist = Math.sqrt(dist2) || 1;                                                            // Реальное расстояние
            const force = (repelRadius - dist) / repelRadius;                                              // Сила отталкивания
            g.vx += (dx / dist) * force * repelStrength;                                                   // Ускорение по X
            g.vy += (dy / dist) * force * repelStrength;                                                   // Ускорение по Y
          }
        }

        g.vx *= friction;                                                                                  // Трение по X
        g.vy *= friction;                                                                                  // Трение по Y
        g.x += g.vx;                                                                                       // Движение по X
        g.y += g.vy;                                                                                       // Движение по Y

        const offLen = Math.hypot(g.x - g.baseX, g.y - g.baseY);                                           // Текущее отклонение
        if (offLen > maxOffset){                                                                           // Если слишком далеко
          const scale = maxOffset / (offLen || 1);                                                         // Коэффициент ограничения
          g.x = g.baseX + (g.x - g.baseX) * scale;                                                         // Ограничение по X
          g.y = g.baseY + (g.y - g.baseY) * scale;                                                         // Ограничение по Y
        }

        ctx.shadowColor = g.color === RED ? 'rgba(220,53,69,0.35)' : 'rgba(0,0,0,0.15)';                   // Цвет тени
        ctx.shadowBlur  = g.color === RED ? 16 : 8;                                                        // Размытие тени
        ctx.fillStyle   = g.color;                                                                         // Цвет буквы
        ctx.fillText(g.ch, g.x, g.y);                                                                      // Рисование буквы
        ctx.shadowBlur  = 0;                                                                               // Сброс тени
      }

      requestAnimationFrame(step);                                                                         // Следующий кадр
    }

    function onVisibility(){                                                                               // Обработчик видимости вкладки
      if (document.visibilityState === 'visible') requestAnimationFrame(step);                             // Возобновление при возвращении
    }

    window.addEventListener('resize', resize);                                                             // Подписка на изменение размера окна
    document.addEventListener('visibilitychange', onVisibility);                                           // Подписка на смену видимости вкладки
    resize();                                                                                              // Первый пересчёт размеров
    requestAnimationFrame(step);                                                                           // Запуск анимации
  } catch(_){ /* noop */ }                                                                                 // Игнорирование ошибок
})();