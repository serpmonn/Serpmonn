(function initSerpmonnLettersBackground(){
  try {
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    canvas.id = 'serpmonn-letters-bg';

    Object.assign(canvas.style, {
      position: 'static', width: '100%', height: 'auto',
      zIndex: '1', pointerEvents: 'none', display: 'block'
    });

    const bodyEl = document.body;

    const newsBlock   = document.querySelector('.news-block');
    const searchCard  = document.querySelector('.search-card');

    if (newsBlock) {
      newsBlock.parentNode.insertBefore(canvas, newsBlock.nextSibling);
    } else if (searchCard) {
      searchCard.parentNode.insertBefore(canvas, searchCard);
    } else {
      if (bodyEl.firstChild) bodyEl.insertBefore(canvas, bodyEl.firstChild);
      else bodyEl.appendChild(canvas);
    }

    const lang = (document.documentElement.lang || 'en').toLowerCase();
    const text = lang === 'ru' ? 'Серпмонн' : 'Serpmonn';

    let width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const glyphs = [];

    const RED  = '#dc3545';
    const DARK = 'rgba(0,0,0,0.75)';

    const mouse = { x: null, y: null };
    window.addEventListener('mousemove', (e)=>{ if (isCoarse) return; mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener('mouseleave', ()=>{ mouse.x = null; mouse.y = null; });

    function resize(){
      width  = Math.floor(window.innerWidth);
      height = 120;
      canvas.width  = Math.floor(width  * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    }

    function layout(){
      glyphs.length = 0;
      const margin = Math.min(40, width * 0.05);
      const availableWidth = Math.max(0, width - margin * 2);
      const spacing = 8;

      let fontSize = Math.min(40, Math.max(16, Math.floor(availableWidth / (text.length * 1.4))));

      if (width < 480) fontSize = Math.max(24, Math.floor(fontSize * 0.9));
      else if (width > 1024) fontSize = Math.max(20, Math.floor(fontSize * 0.8));

      ctx.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
      ctx.textBaseline = 'middle';

      const widths = [...text].map(ch => ctx.measureText(ch).width);
      const totalTextWidth = widths.reduce((a,b)=>a+b,0) + spacing * (text.length - 1);

      let x = Math.floor((width - totalTextWidth) / 2);
      let y = Math.floor(height / 2);

      for (let i = 0; i < text.length; i++){
        const ch = text[i];
        const w = widths[i];
        const baseX = x, baseY = y;
        const color = i < 4 ? RED : DARK;
        glyphs.push({ ch, baseX, baseY, x: baseX, y: baseY, vx: 0, vy: 0, w, h: fontSize, color });
        x += w + spacing;
      }
    }

    const friction     = 0.86;
    const springK      = 0.08;
    const repelRadius  = 260;
    const repelStrength= 2.0;
    const maxOffset    = 96;

    function step(){
      ctx.clearRect(0,0,width,height);

      const grad = ctx.createLinearGradient(0,0,width,height);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,width,height);

      const mx = mouse.x, my = mouse.y;
      let canvasRect = null;
      try { canvasRect = canvas.getBoundingClientRect(); } catch(_) {}

      for (const g of glyphs){
        g.vx += (g.baseX - g.x) * springK;
        g.vy += (g.baseY - g.y) * springK;

        if (mx != null && my != null && canvasRect){
          const canvasX = mx - canvasRect.left;
          const canvasY = my - canvasRect.top;
          const dx = g.x + g.w/2 - canvasX;
          const dy = g.y - canvasY;
          const dist2 = dx*dx + dy*dy;
          if (dist2 < repelRadius * repelRadius){
            const dist = Math.sqrt(dist2) || 1;
            const force = (repelRadius - dist) / repelRadius;
            g.vx += (dx / dist) * force * repelStrength;
            g.vy += (dy / dist) * force * repelStrength;
          }
        }

        g.vx *= friction;
        g.vy *= friction;
        g.x += g.vx;
        g.y += g.vy;

        const offLen = Math.hypot(g.x - g.baseX, g.y - g.baseY);
        if (offLen > maxOffset){
          const scale = maxOffset / (offLen || 1);
          g.x = g.baseX + (g.x - g.baseX) * scale;
          g.y = g.baseY + (g.y - g.baseY) * scale;
        }

        ctx.shadowColor = g.color === RED ? 'rgba(220,53,69,0.35)' : 'rgba(0,0,0,0.15)';
        ctx.shadowBlur  = g.color === RED ? 16 : 8;
        ctx.fillStyle   = g.color;
        ctx.fillText(g.ch, g.x, g.y);
        ctx.shadowBlur  = 0;
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
