#!/usr/bin/env python3
"""Локальный STT-сервис Serpmonn на faster-whisper."""

import os
import tempfile
import time
from flask import Flask, request, jsonify

from faster_whisper import WhisperModel

HOST = os.environ.get('WHISPER_HOST', '127.0.0.1')
PORT = int(os.environ.get('WHISPER_PORT', '8765'))
MODEL_SIZE = os.environ.get('WHISPER_MODEL', 'medium')
DEVICE = os.environ.get('WHISPER_DEVICE', 'cpu')
COMPUTE_TYPE = os.environ.get('WHISPER_COMPUTE_TYPE', 'int8')
NUM_THREADS = int(os.environ.get('WHISPER_THREADS', '4'))

app = Flask(__name__)

print(f'[whisper] Загрузка модели {MODEL_SIZE} ({DEVICE}, {COMPUTE_TYPE})...')
started = time.time()
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE, cpu_threads=NUM_THREADS)
print(f'[whisper] Модель загружена за {time.time() - started:.1f}s')


@app.get('/health')
def health():
    return jsonify({
        'status': 'ok',
        'model': MODEL_SIZE,
        'device': DEVICE,
        'compute_type': COMPUTE_TYPE,
    })


@app.post('/transcribe')
def transcribe():
    audio = request.get_data()
    if not audio:
        return jsonify({'error': 'Отсутствуют аудиоданные'}), 400

    lang = request.args.get('lang') or request.headers.get('X-Language')
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp.write(audio)
            tmp_path = tmp.name

        started = time.time()
        segments, info = model.transcribe(
            tmp_path,
            language=lang if lang and lang != 'auto' else None,
            beam_size=5,
            vad_filter=True,
        )
        text = ''.join(segment.text for segment in segments).strip()
        elapsed = time.time() - started

        print(f'[whisper] {info.language} ({info.language_probability:.2f}) '
              f'{elapsed:.2f}s -> "{text[:120]}"')

        return jsonify({
            'text': text,
            'language': info.language,
            'duration': round(elapsed, 3),
        })
    except Exception as exc:
        print(f'[whisper] Ошибка: {exc}')
        return jsonify({'error': 'Ошибка распознавания речи'}), 500
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


if __name__ == '__main__':
    app.run(host=HOST, port=PORT, threaded=True)
