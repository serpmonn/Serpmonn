import express from 'express';
import axios from 'axios';		// Импорт библиотеки axios
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';		// Импорт модуля crypto

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const apiKey = process.env.API_KEY;
const unsplashApiKey = process.env.UNSPLASH_API_KEY;
const VK_APP_SECRET = process.env.SECRET_APP;
const VK_APP_SERVICE = process.env.SERVICE_KEY;

app.use(cors({
    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru', 'https://www.serpmonn.ru/main2.html'],
    credentials: true // Это позволит отправлять куки с запросами
}));
app.use(express.json()); // Middleware для обработки JSON-запросов 
app.use(express.urlencoded({ extended: true })); // Middleware для обработки URL-кодированных запросов

app.use((req, res, next) => {
    const allowedOrigins = ['https://serpmonn.ru', 'https://www.serpmonn.ru', 'https://www.serpmonn.ru/main2.html'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.options('*', (req, res) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.sendStatus(200);
});

// Функция для кодирования в base64 URL-safe 
function base64urlEncode(buffer) { 
    return buffer.toString('base64') 
	.replace(/\+/g, '-') 
	.replace(/\//g, '_') 
	.replace(/=+$/, ''); 
} 

// Функция для создания SHA-256 хэша
function sha256(plain) { 
    return crypto.createHash('sha256').update(plain).digest(); 
}

app.get('/news', async (req, res) => {
    const url = `https://gnews.io/api/v4/top-headlines?token=${apiKey}&lang=ru`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Ошибка загрузки новостей:', error);
        res.status(500).send('Ошибка загрузки новостей');
    }
});

app.get('/background', async (req, res) => {
    const url = `https://api.unsplash.com/photos/random?client_id=${unsplashApiKey}&query=background`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Ошибка загрузки фонового изображения:', error);
        res.status(500).send('Ошибка загрузки фонового изображения');
    }
});

app.get('/proxy/vkid_sdk_get_config', async (req, res) => {
    const access_token = req.query.access_token; // Извлекаем access_token из параметров запроса
    const app_id = req.query.app_id || '52459571'; // Значение по умолчанию

    if (!access_token) {
        return res.status(400).send('access_token is not defined');
    }

    const params = new URLSearchParams({
        app_id: app_id,
        access_token: access_token,
        v: '5.207'
    });

    const apiUrl = `https://id.vk.com/vkid_sdk_get_config?${params.toString()}`;
    console.log(`Запрос на ${apiUrl}`);
    try {
        const response = await fetch(apiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const data = await response.json();
        console.log('Ответ от VK:', data);
        res.json(data);
    } catch (error) {
        console.error('Ошибка запроса к VK API:', error);
        res.status(500).send('Ошибка запроса к VK API');
    }
});

// Новый маршрут для авторизации
app.get('/proxy/vk-auth', async (req, res) => {
    const apiUrl = `https://id.vk.com/oauth2/auth?${new URLSearchParams(req.query).toString()}`;
    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Ошибка запроса к VK API:', error);
        res.status(500).send('Ошибка запроса к VK API');
    }
});

app.get('/proxy/refresh', async (req, res) => {
    const refreshToken = req.query.refresh_token;

    if (!refreshToken) { 
	return res.status(400).send('Refresh token is required'); 
    }

    const apiUrl = `https://api.vk.com/method/oauth.refreshToken?refresh_token=${refreshToken}&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
	console.log('Ответ от VK:', data); // Логируем ответ для отладки
        res.json(data);
    } catch (error) {
        console.error('Ошибка запроса к VK API:', error);
        res.status(500).send('Ошибка запроса к VK API');
    }
});

app.get('/proxy/vk', async (req, res) => {
    const apiUrl = `https://api.vk.com/method/users.get?${new URLSearchParams(req.query).toString()}`;
    try {
        const response = await fetch(apiUrl, { mode: 'cors' });
	// Если нужен полный ответ, поменяй `mode` на 'cors'
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Ошибка запроса к API ВКонтакте:', error);
        res.status(500).send('Ошибка запроса к API ВКонтакте');
    }
});

// Маршрут для обмена авторизационного кода на токен доступа 
app.post('/getAccessToken', async (req, res) => { 
    const { code, deviceId, codeVerifier, codeChallenge } = req.body;

    console.log("Получен код:", code); // Логирование для отладки 
    console.log("Получен deviceId:", deviceId); // Логирование для отладки
    console.log("Получен codeVerifier:", codeVerifier); // Логирование для отладки
    console.log("Получен codeChallenge:", codeChallenge); //Логирование для отладки
 
    if (!code) { 
	return res.status(400).json({ error: 'Код не предоставлен' }); 
    } 
	    // Подготовка параметров запроса  
	    const params = new URLSearchParams({ 
		client_id: 52459571, 
		client_secret: VK_APP_SECRET, 
		redirect_uri: 'https://www.serpmonn.ru/main2.html', 
		code: code, 
		device_id: deviceId, 
		grant_type: 'authorization_code',
		//  code_сhallenge: codeChallenge,
		// code_verifier: codeVerifier,								// Добавляем code_verifier
		// service_key: VK_APP_SERVICE,								// Добавляем service_key
	    });

    try {
	console.log("Отправляем запрос с параметрами:", params.toString());

	const response = await axios.post('https://id.vk.com/oauth2/auth', params.toString(), { 
	   headers: { 
		'Content-Type': 'application/x-www-form-urlencoded' 
	   } 
	}); 

	console.log("Ответ от VK API (полный объект):", response); // Логируем весь ответ для отладки 
	console.log("Ответ от VK API (данные):", response.data); // Логируем данные ответа

	if (response && response.data) { 
	    const data = response.data; 
	    console.log("Получен access token:", data.access_token); 
	    res.json(data); 
	} else { 
	    console.error("Неправильный ответ от VK API"); 
	    res.status(500).json({ error: 'Неправильный ответ от VK API' }); 
	} 
    } catch (error) { 
	console.error("Ошибка при обмене кода на токен:");
	if (error.response) { 
	    console.error("Ответ от VK API:", error.response); 
	    console.error("Данные ошибки:", error.response.data || "Нет данных"); 
	    console.error("Статус ошибки:", error.response.status); 
	    console.error("Заголовки ошибки:", error.response.headers); 
	} else if (error.request) { 
	    console.error("Запрос был сделан, но ответа не получено:", error.request); 
	} else { 
	    console.error("Произошла ошибка при настройке запроса:", error.message); 
	} 
	res.status(500).json({ error: 'Не удалось обменять код на токен доступа' }); 
    } 
});

app.get('/proxy/stat_events_vkid_sdk', async (req, res) => {
    const access_token = req.query.access_token;						// Извлекаем токен из запроса 
    const device_id = req.query.device_id;							// Извлекаем device_id из запроса
    const code = req.query.code;								// Извлекаем код авторизации из запроса

    if (!code || !device_id || access_token) { 
	return res.status(400).send('Code, device_id, access_token обязательны'); 
    }

    const params = new URLSearchParams({
        app: '52459571', // Значение по умолчанию
	code: code,
	access_token: access_token,
	device_id: device_id, // Добавляем device_id в параметры запроса
        v: '5.207',
    });
    const apiUrl = `https://id.vk.com/stat_events_vkid_sdk?${params.toString()}`;
    console.log(`Запрос на ${apiUrl}`); // Логируем запрос
    console.log(`Параметры:`, params.toString()); 
    try {
        const response = await fetch(apiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const data = await response.json();
        console.log('Ответ от VK:', data); // Логируем ответ
	res.set('Access-Control-Allow-Origin', '*'); // Установка заголовка для решения проблемы с CORS
        res.json(data);
    } catch (error) {
        console.error('Ошибка запроса к VK API:', error);
        res.status(500).send('Ошибка запроса к VK API');
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
