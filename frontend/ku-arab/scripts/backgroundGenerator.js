// Blob gradient background — тёплые пятна в цвете бренда (#f47059)
export function generateCombinedBackground() {
    const existing = document.getElementById('serpmonn-bg-canvas');
    if (existing) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'serpmonn-bg-canvas';
    canvas.style.cssText = [
        'position:fixed',
        'inset:0',
        'width:100%',
        'height:100%',
        'z-index:-1',
        'pointer-events:none',
    ].join(';');
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');

    const blobs = [
        { x: 0.15, y: 0.20, r: 0.40, c: [244, 112,  89] },
        { x: 0.80, y: 0.30, r: 0.35, c: [255, 180, 160] },
        { x: 0.50, y: 0.85, r: 0.38, c: [255, 200, 180] },
        { x: 0.05, y: 0.70, r: 0.30, c: [244, 140, 110] },
        { x: 0.90, y: 0.75, r: 0.32, c: [255, 160, 140] },
    ];

    let t = 0;
    let rafId;

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
        const w = canvas.width, h = canvas.height;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        blobs.forEach((b, i) => {
            const x = (b.x + Math.sin(t * 0.3 + i * 1.2) * 0.07) * w;
            const y = (b.y + Math.cos(t * 0.25 + i * 0.8) * 0.07) * h;
            const r = b.r * Math.min(w, h);
            const [R, G, B] = b.c;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, `rgba(${R},${G},${B},0.18)`);
            grad.addColorStop(1, `rgba(${R},${G},${B},0)`);

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        });

        t += 0.007;
        rafId = requestAnimationFrame(draw);
    }

    draw();

    // Экспортируем стоп-функцию на случай если понадобится
    canvas._stop = () => { cancelAnimationFrame(rafId); };
}
