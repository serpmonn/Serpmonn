(function initSerpmonnLettersBackground(){
  try {
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return; // Уважение к настройкам

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    canvas.id = 'serpmonn-letters-bg';
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
      pointerEvents: 'none',
    });

    // Вставляем в начало body
    const bodyEl = document.body;
    if (bodyEl.firstChild) bodyEl.insertBefore(canvas, bodyEl.firstChild); else bodyEl.appendChild(canvas);

    let width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const letters = 'SERPMONN'.split('');
    const glyphs = [];
    const baseColor = '#dc3545';

    function resize(){
      width = Math.floor(window.innerWidth);
      height = Math.floor(window.innerHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
      draw(0,0,false);
    }

    function layout(){
      glyphs.length = 0;
      const margin = Math.min(40, width * 0.05);
      const availableWidth = width - margin * 2;
      const spacing = 8;
      let fontSize = Math.min(140, Math.max(40, Math.floor(availableWidth / (letters.length * 0.7))));
      if (width < 480) fontSize = Math.max(28, Math.floor(fontSize * 0.7));
      ctx.font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
      ctx.textBaseline = 'middle';
      const totalTextWidth = letters.reduce((acc, ch)=> acc + ctx.measureText(ch).width + spacing, -spacing);
      let x = (width - totalTextWidth) / 2;
      const y = height * 0.2; // верхняя часть экрана
      for (const ch of letters){
        const metrics = ctx.measureText(ch);
        const w = metrics.width;
        glyphs.push({ ch, x, y, w, h: fontSize });
        x += w + spacing;
      }
    }

    const mouse = { x: null, y: null };
    window.addEventListener('mousemove', (e)=>{ if(isCoarse) return; mouse.x=e.clientX; mouse.y=e.clientY; draw(mouse.x, mouse.y, true); }, {passive:true});
    window.addEventListener('mouseleave', ()=>{ mouse.x=null; mouse.y=null; draw(0,0,false); });

    function draw(mx, my, hasMouse){
      ctx.clearRect(0,0,width,height);
      // тонкий градиентный фон
      const grad = ctx.createLinearGradient(0,0,width,height);
      grad.addColorStop(0,'rgba(220,53,69,0.03)');
      grad.addColorStop(1,'rgba(0,0,0,0.02)');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,width,height);

      for (const g of glyphs){
        // базовый цвет букв (полупрозрачный серый)
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillText(g.ch, g.x, g.y);

        if (hasMouse){
          const cx = g.x + g.w/2;
          const cy = g.y;
          const dx = (mx - cx);
          const dy = (my - cy);
          const dist = Math.sqrt(dx*dx + dy*dy);
          const radius = Math.max(120, Math.min(220, Math.min(width,height)*0.25));
          if (dist < radius){
            const t = 1 - dist / radius; // 0..1
            const glow = 12 + t * 24; // 12..36
            ctx.shadowColor = baseColor;
            ctx.shadowBlur = glow;
            ctx.fillStyle = 'rgba(220,53,69,' + (0.15 + t * 0.55).toFixed(3) + ')';
            ctx.fillText(g.ch, g.x, g.y);
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    window.addEventListener('resize', resize);
    resize();
  } catch(_){ /* noop */ }
})();