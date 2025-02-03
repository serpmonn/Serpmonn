// Функция для генерации случайного градиента
export function generateRandomGradient() {
    return new Promise((resolve) => {
        const colors = ['#B0E0E6', '#ADD8E6', '#F0E68C', '#D3D3D3', '#FFE4B5']; // Более мягкие цвета
        const angle = Math.floor(Math.random() * 360);
        const color1 = colors[Math.floor(Math.random() * colors.length)];
        const color2 = colors[Math.floor(Math.random() * colors.length)];
        resolve(`linear-gradient(${angle}deg, ${color1}, ${color2})`);
    });
}

// Функция для генерации случайного паттерна с анимацией
export function generateRandomPattern() {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const colors = ['#B0E0E6', '#ADD8E6', '#F0E68C', '#D3D3D3', '#FFE4B5']; // Более мягкие цвета
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let time = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 50; i++) {
                const x = (Math.random() * canvas.width) + Math.sin(time + i) * 50;
                const y = (Math.random() * canvas.height) + Math.cos(time + i) * 50;
                const width = Math.random() * 30 + 10;
                const height = Math.random() * 30 + 10;
                const color = colors[Math.floor(Math.random() * colors.length)];

                ctx.fillStyle = color;
                ctx.fillRect(x, y, width, height);
            }

            time += 0.02;
            requestAnimationFrame(draw);
        }

        draw();
        resolve(canvas.toDataURL());
    });
}

// Функция для генерации случайных кругов с анимацией
export function generateRandomCircles() {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const colors = ['#B0E0E6', '#ADD8E6', '#F0E68C', '#D3D3D3', '#FFE4B5']; // Более мягкие цвета
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let time = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 30; i++) {
                const x = Math.random() * canvas.width + Math.sin(time + i) * 100;
                const y = Math.random() * canvas.height + Math.cos(time + i) * 100;
                const radius = Math.random() * 20 + 10 + Math.sin(time + i) * 5;
                const color = colors[Math.floor(Math.random() * colors.length)];

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2, false);
                ctx.fill();
            }

            time += 0.05;
            requestAnimationFrame(draw);
        }

        draw();
        resolve(canvas.toDataURL());
    });
}

// Функция для генерации случайных линий с анимацией
export function generateRandomLines() {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const colors = ['#B0E0E6', '#ADD8E6', '#F0E68C', '#D3D3D3', '#FFE4B5']; // Более мягкие цвета
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let time = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 30; i++) {
                const x1 = Math.random() * canvas.width + Math.sin(time + i) * 50;
                const y1 = Math.random() * canvas.height + Math.cos(time + i) * 50;
                const x2 = Math.random() * canvas.width + Math.cos(time + i) * 50;
                const y2 = Math.random() * canvas.height + Math.sin(time + i) * 50;
                const color = colors[Math.floor(Math.random() * colors.length)];

                ctx.strokeStyle = color;
                ctx.lineWidth = Math.random() * 3 + 1;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            time += 0.05;
            requestAnimationFrame(draw);
        }

        draw();
        resolve(canvas.toDataURL());
    });
}

// Функция для генерации случайных прямоугольников с анимацией
export function generateRandomRectangles() {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const colors = ['#B0E0E6', '#ADD8E6', '#F0E68C', '#D3D3D3', '#FFE4B5']; // Более мягкие цвета
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let time = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 20; i++) {
                const x = Math.random() * canvas.width + Math.sin(time + i) * 50;
                const y = Math.random() * canvas.height + Math.cos(time + i) * 50;
                const width = Math.random() * 50 + 20;
                const height = Math.random() * 50 + 20;
                const color = colors[Math.floor(Math.random() * colors.length)];

                ctx.fillStyle = color;
                ctx.fillRect(x, y, width, height);
            }

            time += 0.05;
            requestAnimationFrame(draw);
        }

        draw();
        resolve(canvas.toDataURL());
    });
}

// Функция для генерации случайных треугольников с анимацией
export function generateRandomTriangles() {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const colors = ['#B0E0E6', '#ADD8E6', '#F0E68C', '#D3D3D3', '#FFE4B5']; // Более мягкие цвета
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let time = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < 20; i++) {
                const x1 = Math.random() * canvas.width + Math.sin(time + i) * 50;
                const y1 = Math.random() * canvas.height + Math.cos(time + i) * 50;
                const x2 = Math.random() * canvas.width + Math.cos(time + i) * 50;
                const y2 = Math.random() * canvas.height + Math.sin(time + i) * 50;
                const x3 = Math.random() * canvas.width + Math.sin(time + i) * 25;
                const y3 = Math.random() * canvas.height + Math.cos(time + i) * 25;
                const color = colors[Math.floor(Math.random() * colors.length)];

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineTo(x3, y3);
                ctx.closePath();
                ctx.fill();
            }

            time += 0.05;
            requestAnimationFrame(draw);
        }

        draw();
        resolve(canvas.toDataURL());
    });
}

// Функция для комбинирования всех фонов с анимацией
export function generateCombinedBackground() {
    return Promise.all([
        generateRandomGradient(),
        generateRandomPattern(),
        generateRandomCircles(),
        generateRandomLines(),
        generateRandomRectangles(),
        generateRandomTriangles()
    ])
        .then(([gradient, pattern, circles, lines, rectangles, triangles]) => {
            const combinedBackground = `url(${pattern}), url(${circles}), url(${lines}), url(${rectangles}), url(${triangles}), ${gradient}`;
            document.body.style.background = combinedBackground;
        });
}

