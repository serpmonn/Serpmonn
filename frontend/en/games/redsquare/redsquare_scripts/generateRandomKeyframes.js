	// Функция для генерации случайных ключевых кадров анимации
	// Принимает объект параметров, где styleSheet — это таблица стилей, в которую добавляются правила
	export const generateRandomKeyframes = ({ styleSheet }) => {
	    // Если таблица стилей не передана, выбрасываем ошибку
	    if (!styleSheet) {
	        throw new Error("No stylesheet provided for adding keyframes.");
	    }

	    // Генерируем 3 различных анимации
	    for (let i = 1; i <= 3; i++) {
	        // Определяем CSS-код для анимации
	        const keyframes = `
	            @keyframes move${i} {
	                0% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
	                25% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
	                50% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
	                75% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
	                100% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
	            }
	        `;
	        try {
	            // Пытаемся добавить правило анимации в указанную таблицу стилей
	            styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
	        } catch (error) {
	            // Если возникает ошибка (например, CORS), выводим сообщение в консоль
	            console.error(`Failed to add keyframes: ${error.message}`);
	        }
	    }
	};

