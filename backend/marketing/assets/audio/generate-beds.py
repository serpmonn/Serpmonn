#!/usr/bin/env python3
"""
Оригинальные короткие bed-лупы для Shorts (без сторонних треков / Content ID).
Генерирует WAV ~14с; ffmpeg потом режет и микширует под длительность ролика.
"""

from __future__ import annotations

import math
import os
import struct
import wave

DIR = os.path.dirname(os.path.abspath(__file__))
SR = 44100
DUR = 14.0


def env_adsr(t: float, dur: float, a=0.01, d=0.08, s=0.7, r=0.2) -> float:
    if t < 0 or t > dur:
        return 0.0
    if t < a:
        return t / a
    if t < a + d:
        return 1.0 - (1.0 - s) * ((t - a) / d)
    if t < dur - r:
        return s
    return s * max(0.0, (dur - t) / r)


def tone(t: float, freq: float, amp: float = 1.0) -> float:
    return amp * math.sin(2 * math.pi * freq * t)


def soft_clip(x: float) -> float:
    return math.tanh(x * 1.2)


def write_wav(path: str, samples: list[float]) -> None:
    peak = max((abs(x) for x in samples), default=1.0) or 1.0
    norm = 0.72 / peak
    with wave.open(path, "w") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = bytearray()
        for i, s in enumerate(samples):
            v = int(max(-1.0, min(1.0, soft_clip(s * norm))) * 32767)
            # лёгкий стерео-сдвиг
            r = int(max(-1.0, min(1.0, soft_clip(s * norm * 0.96))) * 32767)
            if (i // 64) % 2:
                r = int(r * 0.98)
            frames += struct.pack("<hh", v, r)
        w.writeframes(frames)


def bed_games(n: int) -> list[float]:
    # аркадный пентатоник, бодрый
    scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
    out = [0.0] * n
    step = int(SR * 0.22)
    for i in range(n):
        t = i / SR
        note = scale[(i // step) % len(scale)]
        local = (i % step) / SR
        out[i] += tone(t, note, 0.22) * env_adsr(local, step / SR, 0.005, 0.04, 0.55, 0.08)
        out[i] += tone(t, note * 2, 0.07) * env_adsr(local, step / SR)
        out[i] += tone(t, 110.0, 0.08) * (0.5 + 0.5 * math.sin(2 * math.pi * 2.2 * t))
        # hi-hat tick
        if (i % (step // 2)) < int(0.012 * SR):
            out[i] += (hash(i) % 1000 / 1000.0 - 0.5) * 0.12
    return out


def bed_neon(n: int) -> list[float]:
    # кибер / пульс
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        pulse = 0.5 + 0.5 * math.sin(2 * math.pi * 1.75 * t)
        out[i] += tone(t, 55.0, 0.2) * pulse
        out[i] += tone(t, 110.0, 0.12) * pulse
        out[i] += tone(t, 440.0 + 20 * math.sin(2 * math.pi * 0.4 * t), 0.06)
        out[i] += tone(t, 880.0, 0.03) * (0.3 + 0.7 * pulse)
        if int(t * 8) % 8 == 0 and (i % int(SR / 8)) < int(0.03 * SR):
            out[i] += tone(local_t := (i % int(SR / 8)) / SR, 220.0, 0.18) * env_adsr(local_t, 0.08)
    return out


def bed_serphold(n: int) -> list[float]:
    # фэнтези-пады
    chords = [
        [196.00, 246.94, 293.66],
        [174.61, 220.00, 261.63],
        [146.83, 196.00, 246.94],
        [164.81, 207.65, 246.94],
    ]
    out = [0.0] * n
    bar = int(SR * 3.5)
    for i in range(n):
        t = i / SR
        ch = chords[(i // bar) % len(chords)]
        for f in ch:
            out[i] += tone(t, f, 0.09)
            out[i] += tone(t, f * 0.5, 0.05)
        out[i] *= 0.55 + 0.45 * math.sin(2 * math.pi * 0.12 * t)
    return out


def bed_promocodes(n: int) -> list[float]:
    # светлый «рекламный» мажор
    melody = [392.00, 440.00, 493.88, 523.25, 493.88, 440.00, 392.00, 349.23]
    out = [0.0] * n
    step = int(SR * 0.28)
    for i in range(n):
        t = i / SR
        f = melody[(i // step) % len(melody)]
        local = (i % step) / SR
        out[i] += tone(t, f, 0.18) * env_adsr(local, step / SR, 0.01, 0.05, 0.6, 0.1)
        out[i] += tone(t, f * 1.5, 0.05) * env_adsr(local, step / SR)
        out[i] += tone(t, 98.0, 0.1)
    return out


def bed_partners(n: int) -> list[float]:
    # спокойный корпоративный пэд
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        out[i] += tone(t, 130.81, 0.12)
        out[i] += tone(t, 164.81, 0.08)
        out[i] += tone(t, 196.00, 0.07)
        out[i] += tone(t, 261.63, 0.04) * (0.6 + 0.4 * math.sin(2 * math.pi * 0.25 * t))
    return out


def bed_honey(n: int) -> list[float]:
    # тёплый мягкий
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        out[i] += tone(t, 174.61, 0.14)
        out[i] += tone(t, 220.00, 0.09)
        out[i] += tone(t, 261.63, 0.06)
        out[i] += tone(t, 329.63, 0.035) * (0.5 + 0.5 * math.sin(2 * math.pi * 0.15 * t))
    return out


def bed_default(n: int) -> list[float]:
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        out[i] += tone(t, 220.0, 0.1)
        out[i] += tone(t, 330.0, 0.06)
        out[i] += tone(t, 440.0, 0.04) * (0.5 + 0.5 * math.sin(2 * math.pi * 0.5 * t))
    return out


BEDS = {
    "games.wav": bed_games,
    "neon_runner.wav": bed_neon,
    "serphold.wav": bed_serphold,
    "promocodes.wav": bed_promocodes,
    "partners.wav": bed_partners,
    "honey.wav": bed_honey,
    "default.wav": bed_default,
}


def main() -> None:
    n = int(SR * DUR)
    fade = int(0.4 * SR)
    for name, fn in BEDS.items():
        samples = fn(n)
        for i in range(fade):
            samples[i] *= i / fade
            samples[-1 - i] *= i / fade
        path = os.path.join(DIR, name)
        write_wav(path, samples)
        print("wrote", path, f"{os.path.getsize(path)} bytes")


if __name__ == "__main__":
    main()
