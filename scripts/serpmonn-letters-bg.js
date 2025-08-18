(function initSerpmonnLettersBackground(){
  try {
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // уважаем системные настройки

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    canvas.id = 'serpmonn-letters-bg';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      zIndex: '0', pointerEvents: 'none'
    });

    const bodyEl = document.body;
    if (bodyEl.firstChild) bodyEl.insertBefore(canvas, bodyEl.firstChild); else bodyEl.appendChild(canvas);

    let width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const text = 'Serpmonn'; // Заглавная S, остальное строчные
    const glyphs = [];

    const RED = '#dc3545';
    const DARK = 'rgba(0,0,0,0.75)';

    const mouse = { x: null, y: null };
    window.addEventListener('mousemove', (e)=>{ if (isCoarse) return; mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener('mouseleave', ()=>{ mouse.x = null; mouse.y = null; });

    function resize(){
      width = Math.floor(window.innerWidth);
      height = Math.floor(window.innerHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    }

    function layout(){
      glyphs.length = 0;
      const margin = Math.min(40, width * 0.05);
      const availableWidth = Math.max(0, width - margin * 2);
      const spacing = 10;
      // Подбираем размер шрифта так, чтобы слово поместилось
      let fontSize = Math.min(140, Math.max(36, Math.floor(availableWidth / (text.length * 0.7))));
      if (width < 480) fontSize = Math.max(28, Math.floor(fontSize * 0.8));
      ctx.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
      ctx.textBaseline = 'middle';
      const widths = [...text].map(ch => ctx.measureText(ch).width);
      const totalTextWidth = widths.reduce((a,b)=>a+b,0) + spacing * (text.length - 1);
      let x = Math.floor((width - totalTextWidth) / 2);
      // Размещаем над поисковой строкой: ориентир ~ верхняя треть
      const y = Math.floor(height * 0.16);
      for (let i = 0; i < text.length; i++){
        const ch = text[i];
        const w = widths[i];
        const baseX = x, baseY = y;
        const color = i < 4 ? RED : DARK; // первые 4 буквы красные
        glyphs.push({ ch, baseX, baseY, x: baseX, y: baseY, vx: 0, vy: 0, w, h: fontSize, color });
        x += w + spacing;
      }
    }

    const friction = 0.86;        // трение
    const springK = 0.08;          // сила возврата к базе
    const repelRadius = 220;       // увеличенный радиус отталкивания курсором
    const repelStrength = 1.6;     // увеличенная сила отталкивания
    const maxOffset = 72;          // больший предел смещения от базы

    function step(){
      // фон
      ctx.clearRect(0,0,width,height);
      const grad = ctx.createLinearGradient(0,0,width,height);
      grad.addColorStop(0,'rgba(220,53,69,0.03)');
      grad.addColorStop(1,'rgba(0,0,0,0.02)');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,width,height);

      const mx = mouse.x, my = mouse.y;
      for (const g of glyphs){
        // Сила возврата к базовой позиции (пружина)
        const dxBase = g.baseX - g.x;
        const dyBase = g.baseY - g.y;
        g.vx += dxBase * springK;
        g.vy += dyBase * springK;

        // Отталкивание от курсора
        if (mx != null && my != null){
          const dx = g.x + g.w/2 - mx; // от центра буквы
          const dy = g.y - my;
          const dist2 = dx*dx + dy*dy;
          if (dist2 < repelRadius * repelRadius){
            const dist = Math.sqrt(dist2) || 1;
            const force = (repelRadius - dist) / repelRadius; // 0..1
            const fx = (dx / dist) * force * repelStrength;
            const fy = (dy / dist) * force * repelStrength;
            g.vx += fx;
            g.vy += fy;
          }
        }

        // Применяем трение
        g.vx *= friction;
        g.vy *= friction;

        // Обновляем позицию
        g.x += g.vx;
        g.y += g.vy;

        // Ограничиваем максимальное смещение от базы
        const offX = g.x - g.baseX;
        const offY = g.y - g.baseY;
        const offLen = Math.hypot(offX, offY);
        if (offLen > maxOffset){
          const scale = maxOffset / (offLen || 1);
          g.x = g.baseX + offX * scale;
          g.y = g.baseY + offY * scale;
        }

        // Рисуем букву
        ctx.shadowColor = g.color === RED ? 'rgba(220,53,69,0.35)' : 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = g.color === RED ? 16 : 8;
        ctx.fillStyle = g.color;
        ctx.fillText(g.ch, g.x, g.y);
        ctx.shadowBlur = 0;
      }

      requestAnimationFrame(step);
    }

    function onVisibility(){
      if (document.visibilityState === 'visible') requestAnimationFrame(step);
    }

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    requestAnimationFrame(step);
  } catch(_){ /* noop */ }
})();