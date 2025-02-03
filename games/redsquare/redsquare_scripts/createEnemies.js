		/**
	 * Создаёт указанное количество врагов и добавляет их на игровое поле.
	 * @param {number} num - Количество врагов, которых нужно создать.
	 * @param {Object} options - Объект с зависимостями.
	 * @param {number} options.speed - Скорость анимации движения врагов.
	 * @param {HTMLElement} options.gameArea - HTML-элемент, представляющий игровое поле.
	 * @param {Array} options.enemies - Массив, в который будут добавлены созданные враги.
	 */

	export const createEnemies = (num, { speed, gameArea, enemies }) => {
	    // Цикл для создания заданного количества врагов
	    for (let i = 1; i <= num; i++) {
	        // Создаём HTML-элемент для врага
	        const enemy = document.createElement('div');
	        enemy.classList.add('enemy'); // Добавляем класс "enemy" для стилизации
	        enemy.id = `enemy${i}`; // Присваиваем уникальный идентификатор

	        // Устанавливаем стиль анимации: скорость и имя анимации
	        enemy.style.animationDuration = `${speed}s`;
	        enemy.style.animationName = `move${i}`;

	        // Добавляем врага на игровое поле
	        gameArea.appendChild(enemy);

	        // Сохраняем созданного врага в массив для дальнейшего использования
	        enemies.push(enemy);
	    }
	};
