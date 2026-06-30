import express from 'express';
import axios from 'axios';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const router = express.Router();

const SALUTE_AUTH_KEY = process.env.SALUTE_AUTH_KEY;
// codeql[js/disabled-certificate-validation] — Sberbank SaluteSpeech API использует самоподписанный сертификат
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

let saluteToken = null;
let saluteTokenExpires = 0;

// ======================================================================================================================
// ПОЛУЧЕНИЕ ТОКЕНА SALUTESPEECH
// ======================================================================================================================
async function getSaluteToken() {
  if (saluteToken && Date.now() < (saluteTokenExpires - 60000)) {
    return saluteToken;
  }

  try {
    const response = await axios.post(
      'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
      'scope=SALUTE_SPEECH_PERS',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'RqUID': uuidv4(),
          'Authorization': `Basic ${SALUTE_AUTH_KEY.trim()}`
        },
        httpsAgent
      }
    );

    saluteToken = response.data.access_token;
    saluteTokenExpires = Date.now() + 29 * 60 * 1000;
    
    console.log('[SALUTE] Токен получен, истекает:', new Date(saluteTokenExpires).toLocaleString('ru-RU'));
    
    return saluteToken;
  } catch (e) {
    console.error('[SALUTE] Ошибка авторизации:', e.response?.data || e.message);
    throw new Error('Не удалось получить токен SaluteSpeech');
  }
}

// ======================================================================================================================
// КОНВЕРТАЦИЯ WEBM → WAV PCM (как в VK боте)
// ======================================================================================================================
async function convertWebmToWav(webmBuffer) {
  const tmpDir = os.tmpdir();
  const inputFile = path.join(tmpDir, `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`);
  const outputFile = path.join(tmpDir, `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);

  try {
    await fs.writeFile(inputFile, webmBuffer);
    await execAsync(
      `ffmpeg -i "${inputFile}" -acodec pcm_s16le -ar 16000 -ac 1 "${outputFile}"`
    );
    const wavBuffer = await fs.readFile(outputFile);
    await fs.unlink(inputFile).catch(() => {});
    await fs.unlink(outputFile).catch(() => {});
    return wavBuffer;
  } catch (error) {
    await fs.unlink(inputFile).catch(() => {});
    await fs.unlink(outputFile).catch(() => {});
    throw error;
  }
}

// ======================================================================================================================
// STT: РАСПОЗНАВАНИЕ РЕЧИ ИЗ АУДИО
// ======================================================================================================================
router.post('/stt', async (req, res) => {
  try {
    const token = await getSaluteToken();
    if (!token) {
      return res.status(503).json({ error: 'Сервис распознавания временно недоступен' });
    }
    const audioBuffer = req.body;
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Отсутствуют аудиоданные' });
    }
    console.log(`[STT] Получено ${audioBuffer.length} байт WebM`);
    let wavBuffer;
    try {
      wavBuffer = await convertWebmToWav(audioBuffer);
      console.log(`[STT] Конвертировано в ${wavBuffer.length} байт WAV`);
    } catch (convError) {
      console.error('[STT] Ошибка конвертации:', convError.message);
      return res.status(500).json({ error: 'Ошибка обработки аудио' });
    }
    const sttResp = await axios.post(
      'https://smartspeech.sber.ru/rest/v1/speech:recognize',
      wavBuffer,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'audio/x-pcm;bit=16;rate=16000',
          Accept: 'application/json'
        },
        httpsAgent,
        timeout: 30000
      }
    );
    const result = sttResp.data;
    let text = '';
    if (Array.isArray(result?.result) && result.result.length > 0) {
      text = result.result[0];
    } else {
      text = result?.result?.text || result?.result?.alternatives?.[0]?.text || '';
    }
    const trimmedText = text.trim();
    console.log(`[STT] Распознано: "${trimmedText}"`);
    res.json({ text: trimmedText });
  } catch (error) {
    console.error('[STT] Ошибка:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Ошибка распознавания речи',
      details: process.env.NODE_ENV === 'production' ? undefined : (error.response?.data || error.message)
    });
  }
});

// ======================================================================================================================
// TTS: СИНТЕЗ РЕЧИ ИЗ ТЕКСТА
// ======================================================================================================================
router.post('/tts', async (req, res) => {
  try {
    const token = await getSaluteToken();
    const { text } = req.body;

    // Явная проверка типа: text должен быть строкой, не массивом (защита от type confusion)
    if (!text || typeof text !== 'string' || Array.isArray(text)) {
      return res.status(400).json({ error: 'Отсутствует текст для озвучивания' });
    }

    const safeText = text.length > 3900 ? text.slice(0, 3900) + '...' : text;
    console.log(`[TTS] Синтез речи для текста (${safeText.length} символов)`);

    const ttsResp = await axios.post(
      'https://smartspeech.sber.ru/rest/v1/text:synthesize?format=wav16&voice=Pon_24000',
      safeText,
      {
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/text',
          'Accept': 'audio/x-wav'
        },
        httpsAgent,
        timeout: 30000
      }
    );

    console.log(`[TTS] Получено ${ttsResp.data.byteLength} байт аудио`);
    res.set('Content-Type', 'audio/x-wav');
    res.set('Content-Disposition', 'attachment; filename="speech.wav"');
    res.send(Buffer.from(ttsResp.data));
  } catch (error) {
    console.error('[TTS] Ошибка:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Ошибка синтеза речи',
      details: process.env.NODE_ENV === 'production' ? undefined : (error.response?.data || error.message)
    });
  }
});

export default router;
