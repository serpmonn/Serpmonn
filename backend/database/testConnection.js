const connection = require('./config.js');

// Проверка соединения
connection.connect((err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
    return;
  }
  console.log('Успешное подключение к базе данных!');
  connection.end();  // Закрытие соединения
});

