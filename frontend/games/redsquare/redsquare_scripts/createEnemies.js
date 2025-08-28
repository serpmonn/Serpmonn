		/**
	 * Создаёт указанное количество врагов и добавляет их на игровое поле.
	 * @param {number} num - Количество врагов, которых нужно создать.
	 * @param {Object} options - Объект с зависимостями.
	 * @param {number} options.speed - Скорость анимации движения врагов.
	 * @param {HTMLElement} options.gameArea - HTML-элемент, представляющий игровое поле.
	 * @param {Array} options.enemies - Массив, в который будут добавлены созданные враги.
	 */

	export const createEnemies = (num, { speed, gameArea, enemies }) => {
	    for (let i = 1; i <= num; i++) {																	// Цикл для создания заданного количества врагов
	        const enemy = document.createElement('div');													// Создаём HTML-элемент для врага
	        enemy.classList.add('enemy'); 																	// Добавляем класс "enemy" для стилизации
	        enemy.id = `enemy${i}`; 																		// Присваиваем уникальный идентификатор

	        enemy.style.animationDuration = `${speed}s`;													// Устанавливаем стиль анимации: скорость и имя анимации
	        enemy.style.animationName = `move${i}`;

	        gameArea.appendChild(enemy);																	// Добавляем врага на игровое поле

	        enemies.push(enemy);																	        // Сохраняем созданного врага в массив для дальнейшего использования
	    }
	};
