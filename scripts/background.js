let pieces = [];

export async function loadBackgroundImage() {
    try {
        const response = await fetch('https://www.serpmonn.ru/background', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const imageUrl = data.urls.full;
        createPuzzlePieces(imageUrl);
        window.addEventListener('resize', () => updatePuzzlePieces(imageUrl));
    } catch (error) {
        console.error('Ошибка загрузки фонового изображения:', error);
    }
}

export function createPuzzlePieces(imageUrl) {
    const rows = 4;
    const cols = 4;
    const pieceWidth = window.innerWidth / cols;
    const pieceHeight = window.innerHeight / rows;
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const piece = document.createElement('div');
            piece.classList.add('puzzle-piece');
            piece.style.width = `${pieceWidth}px`;
            piece.style.height = `${pieceHeight}px`;
            piece.style.left = `${col * pieceWidth}px`;
            piece.style.top = `${row * pieceHeight}px`;
            piece.style.backgroundImage = `url(${imageUrl})`;
            piece.style.backgroundSize = `${window.innerWidth}px ${window.innerHeight}px`;
            piece.style.backgroundPosition = `-${col * pieceWidth}px -${row * pieceHeight}px`;
            fragment.appendChild(piece);
            pieces.push(piece);
        }
    }

    document.body.appendChild(fragment);

    // Перемешиваем массив кусочков
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }

    // Устанавливаем задержку для каждого кусочка
    pieces.forEach((piece, index) => {
        setTimeout(() => {
            piece.style.opacity = 1;
        }, index * 200);
    });
}

export function updatePuzzlePieces(imageUrl) {
    const rows = 4;
    const cols = 4;
    const pieceWidth = window.innerWidth / cols;
    const pieceHeight = window.innerHeight / rows;

    pieces.forEach((piece, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        piece.style.width = `${pieceWidth}px`;
        piece.style.height = `${pieceHeight}px`;
        piece.style.left = `${col * pieceWidth}px`;
        piece.style.top = `${row * pieceHeight}px`;
        piece.style.backgroundImage = `url(${imageUrl})`;
        piece.style.backgroundSize = `${window.innerWidth}px ${window.innerHeight}px`;
        piece.style.backgroundPosition = `-${col * pieceWidth}px -${row * pieceHeight}px`;
    });
}
