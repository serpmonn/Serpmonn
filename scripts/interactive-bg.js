// Лёгкий интерактивный фон: частицы реагируют на курсор
// Брендовые цвета: мягкие красные акценты на светлом фоне
(function initInteractiveBackground() {
  try {
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isCoarse || prefersReduced) return; // отключаем на мобильных и при ограничении анимации

    const devicePixelRatioCap = Math.min(window.devicePixelRatio || 1, 1.5);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });

    canvas.id = 'interactive-bg-canvas';
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
      pointerEvents: 'none',
    });

    // Вставляем в начало body, чтобы содержимое (z-index:1) было поверх
    const bodyEl = document.body;
    if (bodyEl.firstChild) {
      bodyEl.insertBefore(canvas, bodyEl.firstChild);
    } else {
      bodyEl.appendChild(canvas);
    }

    let width = 0, height = 0, running = true;
    const particles = [];
    const targetParticleCount = () => {
      const area = width * height;
      // увеличиваем плотность: ~ 1 частица на 20 000 px^2, кап 150
      return Math.max(50, Math.min(150, Math.floor(area / 20000)));
    };

    const mouse = { x: null, y: null };
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

    function resize() {
      width = Math.floor(window.innerWidth);
      height = Math.floor(window.innerHeight);
      canvas.width = Math.floor(width * devicePixelRatioCap);
      canvas.height = Math.floor(height * devicePixelRatioCap);
      ctx.setTransform(devicePixelRatioCap, 0, 0, devicePixelRatioCap, 0, 0);
      tuneParticles();
    }

    function createParticle() {
      const speed = 0.3 + Math.random() * 0.7; // 0.3..1.0 px/frame
      const angle = Math.random() * Math.PI * 2;
      const size = 1 + Math.random() * 2.2; // 1..3.2 px
      const px = Math.random() * width;
      const py = Math.random() * height;
      return {
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: size,
        o: 0.14 + Math.random() * 0.22, // opacity 0.14..0.36
      };
    }

    function tuneParticles() {
      const desired = targetParticleCount();
      if (particles.length < desired) {
        while (particles.length < desired) particles.push(createParticle());
      } else if (particles.length > desired) {
        particles.length = desired;
      }
    }

    function step() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      // Мягкий градиентный фон для глубины (очень тонкий)
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(220, 53, 69, 0.035)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.025)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const mx = mouse.x, my = mouse.y;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Реакция на курсор: усиленное мягкое отталкивание
        if (mx != null && my != null) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist2 = dx * dx + dy * dy;
          const radius = 160; // увеличенный радиус влияния
          if (dist2 < radius * radius) {
            const dist = Math.sqrt(dist2) || 1;
            const force = (radius - dist) / radius; // 0..1
            p.vx += (dx / dist) * force * 0.6;
            p.vy += (dy / dist) * force * 0.6;
          }
        }

        // Трение для стабилизации
        p.vx *= 0.984;
        p.vy *= 0.984;

        // Движение
        p.x += p.vx;
        p.y += p.vy;

        // Заворачивание у краёв
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Рисуем частицу
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 53, 69, ${p.o.toFixed(3)})`;
        ctx.shadowColor = 'rgba(220, 53, 69, 0.25)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      requestAnimationFrame(step);
    }

    function onVisibilityChange() {
      running = document.visibilityState !== 'hidden';
      if (running) requestAnimationFrame(step);
    }

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibilityChange);

    resize();
    requestAnimationFrame(step);
  } catch (_) {
    // fail silently
  }
})();