import express from 'express';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const router = express.Router();

const WHISPER_URL = process.env.WHISPER_URL || 'http://127.0.0.1:8765';
const WHISPER_TIMEOUT_MS = Number(process.env.WHISPER_TIMEOUT_MS || 120000);

// ======================================================================================================================
// КОНВЕРТАЦИЯ WEBM → WAV PCM 16kHz mono
// ======================================================================================================================
async function convertWebmToWav(webmBuffer) {
  const tmpDir = os.tmpdir();
  const inputFile = path.join(tmpDir, `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`);
  const outputFile = path.join(tmpDir, `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);

  try {
    await fs.writeFile(inputFile, webmBuffer);
    await execAsync(
      `ffmpeg -y -i "${inputFile}" -acodec pcm_s16le -ar 16000 -ac 1 "${outputFile}"`
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
// STT: РАСПОЗНАВАНИЕ РЕЧИ (локальный Whisper medium)
// ======================================================================================================================
router.post('/stt', async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Отсутствуют аудиоданные' });
    }
    const audioBuffer = req.body;

    console.log(`[STT] Получено ${audioBuffer.length} байт WebM`);

    let wavBuffer;
    try {
      wavBuffer = await convertWebmToWav(audioBuffer);
      console.log(`[STT] Конвертировано в ${wavBuffer.length} байт WAV`);
    } catch (convError) {
      console.error('[STT] Ошибка конвертации:', convError.message);
      return res.status(500).json({ error: 'Ошибка обработки аудио' });
    }

    const lang = typeof req.query.lang === 'string' ? req.query.lang : undefined;
    const whisperResp = await axios.post(
      `${WHISPER_URL}/transcribe`,
      wavBuffer,
      {
        headers: {
          'Content-Type': 'audio/wav',
          ...(lang ? { 'X-Language': lang } : {}),
        },
        timeout: WHISPER_TIMEOUT_MS,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const text = (whisperResp.data?.text || '').trim();
    console.log(`[STT] Распознано (${whisperResp.data?.language || 'auto'}, ${whisperResp.data?.duration || '?'}s): "${text}"`);

    res.json({ text });
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('[STT] Whisper-сервис недоступен:', WHISPER_URL);
      return res.status(503).json({ error: 'Сервис распознавания временно недоступен' });
    }

    console.error('[STT] Ошибка:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Ошибка распознавания речи',
      details: process.env.NODE_ENV === 'production' ? undefined : (error.response?.data || error.message),
    });
  }
});

// ======================================================================================================================
// TTS: не используется на фронте; Salute удалён
// ======================================================================================================================
router.post('/tts', (_req, res) => {
  res.status(501).json({ error: 'Синтез речи временно недоступен' });
});

export default router;
