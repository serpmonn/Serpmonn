import express from 'express';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const router = express.Router();

const SUPPORTED = [
  'ru', 'en', 'ar', 'az', 'be', 'bg', 'bn', 'cs', 'da', 'de',
  'el', 'es', 'fi', 'fil', 'fr', 'he', 'hi', 'hu', 'hy', 'id',
  'it', 'ja', 'ka', 'kk', 'ko', 'ms', 'nb', 'nl', 'pl', 'pt-br',
  'pt-pt', 'ro', 'sr', 'sv', 'th', 'tr', 'ur', 'uz', 'vi',
  'zh-cn', 'fa', 'es-419', 'ps', 'sd', 'ug', 'dv', 'ks', 'ku-arab', 'yi'
];

router.get('/i18n/:locale', (req, res) => {
  const requested = (req.params.locale || req.get('X-User-Lang') || 'en').toLowerCase();
  const base = requested.split('-')[0]; // zh-cn → zh

  const locale = SUPPORTED.includes(requested)
    ? requested
    : SUPPORTED.includes(base)
    ? base
    : 'en';

  try {
    const messages = require(
      path.resolve(__dirname, '../../shared/i18n', `${locale}.json`)
    );
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(messages);
  } catch (err) {
    console.error(`[i18n] Файл ${locale}.json не найден:`, err.message);
    try {
      const fallback = require(path.resolve(__dirname, '../../shared/i18n', 'en.json'));
      res.json(fallback);
    } catch {
      res.status(500).json({ error: 'i18n unavailable' });
    }
  }
});

export default router;