# Руководство по вкладу в проект Serpmonn

Спасибо за ваш интерес к проекту Serpmonn! Мы приветствуем вклад от сообщества.

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- MySQL 8.0+
- Git
- PM2 (для продакшена)

### Настройка локальной среды разработки

1. **Клонирование репозитория**
   ```bash
   git clone https://github.com/serpmonn/Serpmonn.git
   cd Serpmonn
   ```

2. **Установка зависимостей**
   ```bash
   npm install
   ```

3. **Настройка базы данных**
   ```bash
   # Создайте базу данных MySQL
   mysql -u root -p
   CREATE DATABASE serpmonn_dev;
   CREATE USER 'serpmonn_dev'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON serpmonn_dev.* TO 'serpmonn_dev'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Настройка переменных окружения**
   ```bash
   cp .env.example .env
   # Отредактируйте .env файл с вашими настройками
   ```

5. **Запуск в режиме разработки**
   ```bash
   npm run dev
   ```

## �� Процесс разработки

### 1. Создание ветки
```bash
git checkout -b feature/your-feature-name
# или
git checkout -b fix/your-bug-fix
```

### 2. Внесение изменений
- Следуйте стандартам кодирования (см. ниже)
- Пишите тесты для новой функциональности
- Обновляйте документацию при необходимости

### 3. Коммиты
Используйте [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Новые функции
git commit -m "feat: add user authentication system"

# Исправления багов
git commit -m "fix: resolve login validation issue"

# Документация
git commit -m "docs: update API documentation"

# Рефакторинг
git commit -m "refactor: improve database connection handling"

# Тесты
git commit -m "test: add unit tests for auth controller"
```

### 4. Отправка изменений
```bash
git push origin feature/your-feature-name
```

### 5. Создание Pull Request
1. Перейдите на GitHub
2. Создайте Pull Request
3. Заполните шаблон PR
4. Дождитесь проверки CI/CD

## 📝 Стандарты кодирования

### JavaScript/Node.js
- Используйте ES6+ синтаксис
- Следуйте [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Используйте `const` и `let` вместо `var`
- Используйте стрелочные функции где возможно
- Добавляйте JSDoc комментарии для функций

```javascript
/**
 * Аутентифицирует пользователя
 * @param {string} email - Email пользователя
 * @param {string} password - Пароль пользователя
 * @returns {Promise<Object>} Объект с токеном и данными пользователя
 */
const authenticateUser = async (email, password) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid password');
    }
    
    return {
      token: generateToken(user),
      user: user.toJSON()
    };
  } catch (error) {
    throw error;
  }
};
```

### HTML/CSS
- Используйте семантическую разметку
- Следуйте BEM методологии для CSS
- Используйте CSS Grid и Flexbox
- Обеспечивайте доступность (accessibility)

### База данных
- Используйте миграции для изменений схемы
- Следуйте соглашениям по именованию
- Добавляйте индексы для оптимизации запросов

## 🧪 Тестирование

### Запуск тестов
```bash
# Все тесты
npm test

# Тесты с покрытием
npm run test:coverage

# Тесты в режиме watch
npm run test:watch
```

### Написание тестов
```javascript
describe('User Authentication', () => {
  it('should authenticate valid user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const result = await authenticateUser(userData.email, userData.password);
    
    expect(result).toHaveProperty('token');
    expect(result.user).toHaveProperty('email', userData.email);
  });
  
  it('should reject invalid credentials', async () => {
    await expect(
      authenticateUser('invalid@example.com', 'wrongpassword')
    ).rejects.toThrow('Invalid credentials');
  });
});
```

## 📚 Документация

### API документация
- Используйте JSDoc для документирования функций
- Обновляйте README.md при добавлении новых функций
- Создавайте примеры использования

### Комментарии в коде
```javascript
// Хороший комментарий
// Проверяем, что пользователь имеет права администратора
if (user.role !== 'admin') {
  throw new Error('Insufficient permissions');
}

// Плохой комментарий
// Проверяем роль
if (user.role !== 'admin') {
  throw new Error('Insufficient permissions');
}
```

## 🔒 Безопасность

### Общие принципы
- Никогда не коммитьте секретные ключи
- Используйте переменные окружения для конфигурации
- Валидируйте все пользовательские входные данные
- Используйте HTTPS в продакшене
- Регулярно обновляйте зависимости

### Проверка безопасности
```bash
# Проверка уязвимостей в зависимостях
npm audit

# Исправление уязвимостей
npm audit fix
```

## 🚀 Развертывание

### Продакшен
```bash
# Сборка проекта
npm run build

# Запуск с PM2
npm start

# Мониторинг
pm2 status
pm2 logs
```

### Docker (если используется)
```bash
# Сборка образа
docker build -t serpmonn .

# Запуск контейнера
docker run -p 3000:3000 serpmonn
```

## 🤝 Коммуникация

### Issues
- Используйте шаблоны для создания issues
- Предоставляйте подробную информацию о проблеме
- Включайте скриншоты для UI проблем

### Pull Requests
- Следуйте шаблону PR
- Добавляйте тесты для новой функциональности
- Обновляйте документацию
- Отвечайте на комментарии ревьюеров

## 📞 Получение помощи

- Создайте Issue на GitHub
- Обратитесь к документации в README.md
- Проверьте существующие Issues и PR

## 🎯 Рекомендации

1. **Начните с малого** - исправьте простую ошибку или добавьте небольшую функцию
2. **Общайтесь** - задавайте вопросы в Issues
3. **Тестируйте** - убедитесь, что ваши изменения работают
4. **Документируйте** - обновляйте документацию при необходимости
5. **Будьте терпеливы** - ревью кода может занять время

Спасибо за ваш вклад в проект Serpmonn! 🚀
