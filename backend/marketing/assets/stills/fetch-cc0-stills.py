#!/usr/bin/env python3
"""
Скачать CC0-сток для Shorts fallback (только license=cc0 через Openverse).
Никаких NC/ND/BY-SA — только CC0 / Public Domain Zero.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.parse
import urllib.request

OUT_ROOT = "/var/www/serpmonn.ru/backend/marketing/assets/stills"
UA = "SerpmonnMarketing/1.0 (CC0 stills cache; contact sergei@serpmonn.ru)"
PER_PRODUCT = 10

# Несколько запросов на продукт — больше шансов набрать 10 уникальных CC0
QUERIES = {
    "games": [
        "game controller",
        "arcade joystick",
        "colorful geometric abstract",
        "pixel art abstract",
    ],
    "neon_runner": [
        "neon lights city",
        "neon tunnel",
        "cyberpunk neon",
        "purple blue neon",
    ],
    "serphold": [
        "medieval castle tower",
        "stone fortress",
        "fantasy castle",
        "castle ruins path",
    ],
    "promocodes": [
        "shopping bags",
        "gift box",
        "colorful abstract sale",
        "paper notes desk",
    ],
    "partners": [
        "handshake silhouette",
        "network nodes abstract",
        "business meeting abstract",
        "connection lines abstract",
    ],
    "honey": [
        "honeycomb",
        "honey jar",
        "natural honey",
        "bees honey",
    ],
    "default": [
        "abstract gradient",
        "technology abstract",
        "modern minimal abstract",
        "blue orange abstract",
    ],
}

# отсев явных брендов / лого / скринов UI
BLOCK = re.compile(
    r"(logo|trademark|microsoft|apple|google|amazon|nike|coca|pepsi|"
    r"marvel|disney|pokemon|minecraft|fortnite|instagram|facebook|"
    r"screenshot|iphone|samsung|playstation|xbox|nintendo)",
    re.I,
)


def openverse_search(q: str, page: int = 1) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            "q": q,
            "license": "cc0",
            "page_size": 20,
            "page": page,
            "mature": "false",
        }
    )
    url = f"https://api.openverse.org/v1/images/?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=45) as res:
        data = json.loads(res.read().decode("utf-8"))
    return list(data.get("results") or [])


def is_ok(item: dict) -> bool:
    lic = str(item.get("license") or "").lower().replace(" ", "")
    if lic not in ("cc0", "pdm", "cc0-1.0", "publicdomain"):
        # Openverse license=cc0 filter should already enforce; keep strict
        if "cc0" not in lic and lic not in ("pdm", "cc0"):
            return False
    title = str(item.get("title") or "")
    tags = " ".join(
        t.get("name", "") if isinstance(t, dict) else str(t)
        for t in (item.get("tags") or [])
    )
    blob = f"{title} {tags} {item.get('id','')}"
    if BLOCK.search(blob):
        return False
    w = int(item.get("width") or 0)
    h = int(item.get("height") or 0)
    if w and h and (w < 600 or h < 600):
        return False
    url = item.get("url") or item.get("thumbnail")
    if not url or not str(url).startswith("http"):
        return False
    return True


def download(url: str, dest: str) -> bool:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            data = res.read()
            ctype = (res.headers.get("Content-Type") or "").lower()
        if len(data) < 8_000:
            return False
        if "png" in ctype or url.lower().endswith(".png"):
            ext = ".png"
        elif "webp" in ctype:
            ext = ".webp"
        else:
            ext = ".jpg"
        if not dest.endswith(ext):
            dest = os.path.splitext(dest)[0] + ext
        with open(dest, "wb") as f:
            f.write(data)
        return True
    except Exception as e:
        print("  download fail", e)
        return False


def collect_for_product(product: str) -> list[dict]:
    seen = set()
    picked = []
    for q in QUERIES[product]:
        if len(picked) >= PER_PRODUCT:
            break
        try:
            results = openverse_search(q)
        except Exception as e:
            print(f"  search fail [{q}]: {e}")
            time.sleep(1.5)
            continue
        time.sleep(1.0)  # вежливо к API
        for item in results:
            if len(picked) >= PER_PRODUCT:
                break
            iid = item.get("id") or item.get("url")
            if not iid or iid in seen:
                continue
            if not is_ok(item):
                continue
            seen.add(iid)
            picked.append(item)
    return picked


def main() -> None:
    os.makedirs(OUT_ROOT, exist_ok=True)
    manifest = {}
    for product in QUERIES:
        print(f"== {product} ==")
        d = os.path.join(OUT_ROOT, product)
        os.makedirs(d, exist_ok=True)
        # очистить старые стоки этого прогона
        for name in os.listdir(d):
            if re.match(r"^\d{2}\.(jpg|jpeg|png|webp)$", name, re.I):
                os.remove(os.path.join(d, name))
        items = collect_for_product(product)
        saved = []
        n = 0
        for item in items:
            if n >= PER_PRODUCT:
                break
            n += 1
            dest = os.path.join(d, f"{n:02d}.jpg")
            url = item.get("url")
            ok = download(url, dest)
            # download may change extension
            actual = dest
            for ext in (".jpg", ".png", ".webp"):
                cand = os.path.splitext(dest)[0] + ext
                if os.path.isfile(cand) and os.path.getsize(cand) > 8000:
                    actual = cand
                    break
            if not ok and not os.path.isfile(actual):
                n -= 1
                continue
            # если скачали как png — переименуем уже учтено
            meta = {
                "file": os.path.basename(actual),
                "id": item.get("id"),
                "title": item.get("title"),
                "license": item.get("license"),
                "license_version": item.get("license_version"),
                "creator": item.get("creator"),
                "foreign_landing_url": item.get("foreign_landing_url"),
                "url": url,
                "provider": item.get("provider"),
                "source": "openverse",
            }
            saved.append(meta)
            print(f"  saved {meta['file']} ({meta['license']}) {meta['title']!r}"[:120])
            time.sleep(0.4)
        with open(os.path.join(d, "SOURCES.json"), "w", encoding="utf-8") as f:
            json.dump(saved, f, ensure_ascii=False, indent=2)
        manifest[product] = len(saved)
        print(f"  total {len(saved)}")
    with open(os.path.join(OUT_ROOT, "MANIFEST.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print("MANIFEST", manifest)


if __name__ == "__main__":
    main()
