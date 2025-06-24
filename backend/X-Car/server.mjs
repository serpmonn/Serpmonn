import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'leads.json');

app.use(cors());
app.use(express.json());

// Функция для инициализации файла
const initDataFile = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
      console.log(`Файл успешно создан: ${DATA_FILE}`);
    }
    
    // Проверка возможности чтения/записи
    fs.accessSync(DATA_FILE, fs.constants.R_OK | fs.constants.W_OK);
    console.log('Доступ к файлу подтвержден');
  } catch (err) {
    console.error('❌ Ошибка инициализации файла:', err);
    console.log('Попытка создать файл по пути:', DATA_FILE);
    console.log('Текущая рабочая директория:', process.cwd());
    process.exit(1);
  }
};

// Инициализируем файл при запуске
initDataFile();

app.post('/xcar-drivers', (req, res) => {
  try {
    const newLead = {
      ...req.body,
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    // Чтение файла
    const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
    const leads = JSON.parse(fileContent);
    
    // Добавление новой записи
    leads.push(newLead);
    
    // Запись в файл
    fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), 'utf8');
    
    console.log('✅ Новая заявка:', newLead.name, newLead.phone);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Ошибка обработки заявки:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/', (req, res) => {
  res.send('Сервер для сбора заявок X-Car работает!');
});

const PORT = 5500;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Файл данных: ${DATA_FILE}`);
});