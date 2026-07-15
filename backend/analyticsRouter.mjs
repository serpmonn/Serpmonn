import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const analyticsFile = path.join(__dirname, 'analytics', 'analytics.mjs');

/** Подключает реальный analytics, если файл есть (на сервере); в CI — пустой stub. */
async function loadAnalyticsRouter() {
    if (!fs.existsSync(analyticsFile)) {
        console.warn('[analytics] analytics.mjs отсутствует — используется пустой stub');
        return express.Router();
    }
    // Динамический URL, чтобы Vite/Vitest не резолвили модуль на этапе сборки
    const mod = await import(pathToFileURL(analyticsFile).href);
    return mod.analyticsRouter;
}

export const analyticsRouter = await loadAnalyticsRouter();
