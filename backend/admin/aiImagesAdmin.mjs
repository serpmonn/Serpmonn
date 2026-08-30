/**
 * Admin: gallery of AI-generated images.
 */
import { createReadStream } from 'fs';
import { access, stat } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { extname } from 'path';
import {
  listAiGeneratedImages,
  getAiGeneratedImageById,
  deleteAiGeneratedImage,
  backfillAiGeneratedImagesFromDisk,
  ensureAiGeneratedImagesTable,
} from '../ai-search/ai-generated-images-store.mjs';
import { resolveAiGeneratedPath } from '../ai-search/ai-image-store.mjs';

let backfillStarted = false;

async function ensureReady() {
  await ensureAiGeneratedImagesTable();
  if (!backfillStarted) {
    backfillStarted = true;
    backfillAiGeneratedImagesFromDisk().catch((err) => {
      console.warn('[admin] ai-images backfill', err.message);
    });
  }
}

export async function listAiImagesAdmin(req, res) {
  try {
    await ensureReady();
    const result = await listAiGeneratedImages({
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json(result);
  } catch (err) {
    console.error('[admin] ai-images list', err);
    return res.status(500).json({ message: 'Ошибка загрузки галереи' });
  }
}

export async function streamAiImageAdmin(req, res) {
  try {
    await ensureReady();
    const id = String(req.params.id || '').trim();
    if (!/^[a-f0-9-]{36}$/i.test(id)) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const row = await getAiGeneratedImageById(id);
    if (!row) return res.status(404).json({ message: 'Не найдено' });

    const abs = resolveAiGeneratedPath(row.file_name);
    if (!abs) return res.status(400).json({ message: 'Некорректный путь' });
    await access(abs, fsConstants.R_OK);
    const st = await stat(abs);
    const ext = extname(abs).toLowerCase();
    const types = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    res.setHeader('Content-Type', row.content_type || types[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', st.size);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    createReadStream(abs).pipe(res);
  } catch (err) {
    console.error('[admin] ai-images stream', err.message);
    return res.status(404).json({ message: 'Файл не найден' });
  }
}

export async function deleteAiImageAdmin(req, res) {
  try {
    await ensureReady();
    const id = String(req.params.id || '').trim();
    if (!/^[a-f0-9-]{36}$/i.test(id)) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const ok = await deleteAiGeneratedImage(id);
    if (!ok) return res.status(404).json({ message: 'Не найдено' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin] ai-images delete', err);
    return res.status(500).json({ message: 'Ошибка удаления' });
  }
}
