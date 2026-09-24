#!/usr/bin/env python3
"""Serpmonn app preview Shorts (~30s, 9:16) — RU and EN from Play screenshots."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/var/www/serpmonn.ru/backend/marketing")
OUT_PREVIEW = ROOT / "out" / "shorts-preview"
OUT_SHORTS = ROOT / "out" / "shorts"
FONT_DIR = ROOT / "brand" / "fonts"
AUDIO = ROOT / "assets" / "audio" / "default-9.mp3"
ICON = ROOT / "brand" / "icons" / "3d" / "app-icon-512-white.png"

W, H = 1080, 1920
FPS = 30
SCENE_SEC = 4.5  # 6 scenes × 4.5 = 27 + end 3 = 30
END_SEC = 3.0

RU_DIR = ROOT / "store-private" / "play-screenshots"
EN_DIR = ROOT / "brand" / "play-screenshots-en"

SCENES = [
    # file stem, caption RU, caption EN (skip empty search screen — too blank on camera)
    ("02-search-answer", "Ответы AI", "AI answers"),
    ("03-news", "Новости", "News"),
    ("04-tools", "Инструменты", "Tools"),
    ("05-games", "Игры", "Games"),
    ("07-feed", "Лента находок", "Findings"),
    ("06-profile", "Профиль", "Profile"),
]


def font(size: int, kind: str = "bold") -> ImageFont.FreeTypeFont:
    names = {
        "bold": "Montserrat-Bold.ttf",
        "semi": "Montserrat-SemiBold.ttf",
        "medium": "Montserrat-Medium.ttf",
    }
    path = FONT_DIR / names.get(kind, names["bold"])
    if not path.is_file():
        path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    return ImageFont.truetype(str(path), size=size)


def cover_crop(src: Path, out: Path) -> None:
    im = Image.open(src).convert("RGB")
    sw, sh = im.size
    target = W / H
    if sw / sh > target:
        nw = int(sh * target)
        left = (sw - nw) // 2
        im = im.crop((left, 0, left + nw, sh))
    else:
        nh = int(sw / target)
        top = (sh - nh) // 2
        im = im.crop((0, top, sw, top + nh))
    im = im.resize((W, H), Image.Resampling.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "PNG", optimize=True)


def make_caption_overlay(text: str, out: Path) -> None:
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    # soft bottom gradient
    grad_top = int(H * 0.62)
    for y in range(grad_top, H):
        t = (y - grad_top) / max(1, H - grad_top)
        a = int(170 * t * t)
        draw.line([(0, y), (W, y)], fill=(0, 0, 0, a))
    f = font(64, "bold")
    bbox = draw.textbbox((0, 0), text, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (W - tw) // 2
    y = H - 280
    draw.text((x + 3, y + 4), text, font=f, fill=(0, 0, 0, 160))
    draw.text((x, y), text, font=f, fill=(255, 255, 255, 255))
    base.save(out)


def make_end_card(lang: str, out: Path) -> None:
    # light warm-gray ground + logo + wordmark
    bg = Image.new("RGB", (W, H), (245, 246, 248))
    draw = ImageDraw.Draw(bg)
    icon = Image.open(ICON).convert("RGBA").resize((420, 420), Image.Resampling.LANCZOS)
    ix = (W - icon.width) // 2
    iy = int(H * 0.28)
    bg.paste(icon, (ix, iy), icon)
    title = "Serpmonn"
    sub = "Android app" if lang == "en" else "Приложение"
    f1 = font(72, "bold")
    f2 = font(36, "medium")
    for text, f, yy, fill in (
        (title, f1, iy + icon.height + 48, (28, 28, 30)),
        (sub, f2, iy + icon.height + 130, (110, 114, 122)),
    ):
        bbox = draw.textbbox((0, 0), text, font=f)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, yy), text, font=f, fill=fill)
    bg.save(out)


def render_scene_clip(frame: Path, overlay: Path, sec: float, out_mp4: Path, zoom_end: float = 1.08) -> None:
    frames = max(1, int(sec * FPS))
    # zoompan z grows slowly; d = number of output frames
    vf = (
        f"[0:v]scale={W}:{H},setsar=1[base];"
        f"[1:v]scale={W}:{H},format=rgba[ov];"
        f"[base]zoompan=z='min(zoom+0.00035\\,{zoom_end})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        f":d={frames}:s={W}x{H}:fps={FPS},format=rgba[z];"
        f"[z][ov]overlay=0:0:format=auto,format=yuv420p"
    )
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-loop", "1", "-t", f"{sec:.3f}", "-i", str(frame),
            "-loop", "1", "-t", f"{sec:.3f}", "-i", str(overlay),
            "-filter_complex", vf,
            "-t", f"{sec:.3f}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS),
            "-an", str(out_mp4),
        ]
    )


def concat_and_mix(clips: list[Path], audio: Path, out: Path, duration: float) -> None:
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{c}'\n" for c in clips), encoding="utf-8")
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-f", "concat", "-safe", "0", "-i", str(lst),
            "-stream_loop", "-1", "-i", str(audio),
            "-t", f"{duration:.3f}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS),
            "-c:a", "aac", "-b:a", "160k",
            "-af", "afade=t=in:st=0:d=0.6,afade=t=out:st={:.2f}:d=1.2,volume=0.55".format(duration - 1.2),
            "-shortest",
            "-movflags", "+faststart",
            str(out),
        ]
    )
    lst.unlink(missing_ok=True)


def build_lang(lang: str) -> Path:
    src_dir = RU_DIR if lang == "ru" else EN_DIR
    with tempfile.TemporaryDirectory(prefix=f"app-preview-{lang}-") as tmp:
        tmp_p = Path(tmp)
        clips: list[Path] = []
        for i, (stem, cap_ru, cap_en) in enumerate(SCENES):
            src = src_dir / f"{stem}.png"
            if not src.is_file():
                raise SystemExit(f"missing {src}")
            frame = tmp_p / f"frame-{i:02d}.png"
            ov = tmp_p / f"ov-{i:02d}.png"
            clip = tmp_p / f"clip-{i:02d}.mp4"
            cover_crop(src, frame)
            make_caption_overlay(cap_ru if lang == "ru" else cap_en, ov)
            zoom = 1.06 + (i % 3) * 0.015
            render_scene_clip(frame, ov, SCENE_SEC, clip, zoom_end=zoom)
            clips.append(clip)

        end_frame = tmp_p / "end.png"
        end_ov = tmp_p / "end-ov.png"
        end_clip = tmp_p / "end.mp4"
        make_end_card(lang, end_frame)
        # transparent empty overlay
        Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(end_ov)
        render_scene_clip(end_frame, end_ov, END_SEC, end_clip, zoom_end=1.02)
        clips.append(end_clip)

        total = SCENE_SEC * len(SCENES) + END_SEC
        name = f"app-preview-{lang}-serpmonn.mp4"
        out = OUT_PREVIEW / name
        OUT_PREVIEW.mkdir(parents=True, exist_ok=True)
        OUT_SHORTS.mkdir(parents=True, exist_ok=True)
        concat_and_mix(clips, AUDIO, out, total)
        shutil.copy2(out, OUT_SHORTS / name)
        # Do NOT copy to frontend/ — only after explicit publish request
        return out


def main() -> None:
    if not AUDIO.is_file():
        raise SystemExit(f"missing audio {AUDIO}")
    paths = []
    for lang in ("ru", "en"):
        p = build_lang(lang)
        paths.append(p)
        print("OK", p, os.path.getsize(p))
    print("done", *[str(p) for p in paths])


if __name__ == "__main__":
    main()
