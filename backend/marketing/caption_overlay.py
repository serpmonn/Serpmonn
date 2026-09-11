#!/usr/bin/env python3
"""Подписи для Shorts: градиент + заголовок + ссылка как текст (не кнопка)."""

from __future__ import annotations

import argparse
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
WHITE = (255, 255, 255, 255)
LINK = (220, 224, 232, 235)  # светло-серый, не «кнопка»
LINK_LINE = (255, 255, 255, 90)
FONT_DIR = "/var/www/serpmonn.ru/backend/marketing/brand/fonts"


def find_font(kind: str = "bold") -> str:
    names = {
        "bold": ["Montserrat-Bold.ttf", "DejaVuSans-Bold.ttf"],
        "semi": ["Montserrat-SemiBold.ttf", "Montserrat-Bold.ttf", "DejaVuSans-Bold.ttf"],
        "medium": ["Montserrat-Medium.ttf", "Montserrat-SemiBold.ttf", "DejaVuSans.ttf"],
    }
    search = [
        FONT_DIR,
        "/var/www/serpmonn.ru/frontend/fonts",
        "/usr/share/fonts/truetype/dejavu",
    ]
    for base in search:
        for name in names.get(kind, names["bold"]):
            p = os.path.join(base, name)
            if os.path.isfile(p):
                return p
    raise SystemExit("font not found")


def load_font(size: int, kind: str = "bold") -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(find_font(kind), size=size)


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int, max_lines: int = 2) -> list[str]:
    words = (text or "").replace("\n", " ").split()
    if not words:
        return ["Serpmonn"]
    lines: list[str] = []
    cur = ""
    probe = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    for i, w in enumerate(words):
        trial = f"{cur} {w}".strip()
        bbox = probe.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_width:
            cur = trial
            continue
        if cur:
            lines.append(cur)
        if len(lines) >= max_lines - 1:
            rest = " ".join(words[i:])
            while True:
                bbox = probe.textbbox((0, 0), rest, font=font)
                if bbox[2] - bbox[0] <= max_width or len(rest) < 5:
                    break
                rest = rest[:-2].rstrip(" .,;:") + "…"
            lines.append(rest)
            return lines[:max_lines]
        cur = w
    if cur:
        lines.append(cur)
    return lines[:max_lines]


def make_overlay(title: str, cta: str, out_path: str) -> None:
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)

    grad_top = int(H * 0.50)
    for y in range(grad_top, H):
        t = (y - grad_top) / max(1, (H - grad_top))
        a = int(min(210, (t**1.45) * 220))
        draw.line([(0, y), (W, y)], fill=(6, 8, 14, a))

    title_font = load_font(64, "bold")
    max_w = W - 140
    lines = wrap_text((title or "Serpmonn").strip(), title_font, max_w, max_lines=2)

    sizes = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        sizes.append((bbox[2] - bbox[0], bbox[3] - bbox[1]))
    line_gap = 10
    block_h = sum(h for _, h in sizes) + line_gap * max(0, len(lines) - 1)

    cta_text = (cta or "").strip().replace("https://", "").replace("http://", "")
    cta_font = load_font(28, "medium")
    cta_h = 0
    underline_gap = 10
    underline_h = 2
    if cta_text:
        cb = draw.textbbox((0, 0), cta_text, font=cta_font)
        cta_h = (cb[3] - cb[1]) + underline_gap + underline_h

    gap_title_cta = 36
    total = block_h + (gap_title_cta + cta_h if cta_text else 0)
    y0 = int(H * 0.72) - total // 2
    y0 = max(int(H * 0.64), min(y0, int(H * 0.78)))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        [80, y0 - 60, W - 80, y0 + total + 90],
        fill=(0, 0, 0, 90),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=28))
    base = Image.alpha_composite(base, glow)
    draw = ImageDraw.Draw(base)

    y = y0
    for i, line in enumerate(lines):
        tw, th = sizes[i]
        x = (W - tw) // 2
        draw.text((x + 3, y + 4), line, font=title_font, fill=(0, 0, 0, 160))
        draw.text((x, y), line, font=title_font, fill=WHITE)
        y += th + line_gap

    if cta_text:
        y += gap_title_cta - line_gap
        cb = draw.textbbox((0, 0), cta_text, font=cta_font)
        tw = cb[2] - cb[0]
        th = cb[3] - cb[1]
        x = (W - tw) // 2
        # Просто текст ссылки — без pill/заливки (на видео не кликабельно)
        draw.text((x + 1, y + 2), cta_text, font=cta_font, fill=(0, 0, 0, 120))
        draw.text((x, y), cta_text, font=cta_font, fill=LINK)
        # Тонкая светлая черта под URL (намёк на ссылку, не кнопка)
        uy = y + th + underline_gap
        draw.line([(x, uy), (x + tw, uy)], fill=LINK_LINE, width=underline_h)

    base.save(out_path, "PNG")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True)
    ap.add_argument("--cta", default="")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    make_overlay(args.title, args.cta, args.out)


if __name__ == "__main__":
    main()
