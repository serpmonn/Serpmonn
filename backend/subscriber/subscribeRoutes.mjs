import express from 'express';
import bodyParser from 'body-parser';
import { subscribe } from './subscribeController.mjs';

const router = express.Router();

// Парсинг form-data
router.use(bodyParser.urlencoded({ extended: true }));

// Маршрут для подписки
router.post('/subscribe', subscribe);

export default router;