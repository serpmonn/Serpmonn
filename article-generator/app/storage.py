import json
import os
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from uuid import uuid4

from .models import Article, ArticleMeta


class FileStorage:
    def __init__(self, root_dir: str, max_articles: int) -> None:
        self.root = Path(root_dir)
        self.articles_dir = self.root / "articles"
        self.index_file = self.root / "index.json"
        self.max_articles = max_articles
        self._lock = threading.Lock()
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        self.articles_dir.mkdir(parents=True, exist_ok=True)
        if not self.index_file.exists():
            self._write_index({"items": [], "total": 0})

    def _read_index(self) -> Dict:
        if not self.index_file.exists():
            return {"items": [], "total": 0}
        with self.index_file.open("r", encoding="utf-8") as f:
            return json.load(f)

    def _write_index(self, data: Dict) -> None:
        tmp = self.index_file.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        tmp.replace(self.index_file)

    def save_article(self, article: Article) -> None:
        with self._lock:
            # Write article file
            art_path = self.articles_dir / f"{article.id}.json"
            with art_path.open("w", encoding="utf-8") as f:
                json.dump(article.model_dump(), f, ensure_ascii=False, indent=2, default=str)

            # Update index
            index = self._read_index()
            meta = ArticleMeta(
                id=article.id,
                group_id=article.group_id,
                language=article.language,
                title=article.title,
                summary=article.summary,
                tags=article.tags,
                topic=article.topic,
                created_at=article.created_at,
            )
            index_items: List[Dict] = index.get("items", [])
            index_items.append(meta.model_dump())
            # Sort newest first
            index_items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            # Prune if needed
            if self.max_articles > 0 and len(index_items) > self.max_articles:
                to_remove = index_items[self.max_articles :]
                for it in to_remove:
                    path = self.articles_dir / f"{it['id']}.json"
                    if path.exists():
                        try:
                            path.unlink()
                        except OSError:
                            pass
                index_items = index_items[: self.max_articles]
            index["items"] = index_items
            index["total"] = len(index_items)
            self._write_index(index)

    def list_articles(self, *, limit: int = 20, offset: int = 0, language: Optional[str] = None) -> Dict:
        index = self._read_index()
        items: List[Dict] = index.get("items", [])
        if language:
            items = [it for it in items if it.get("language") == language]
        total = len(items)
        return {
            "total": total,
            "items": items[offset : offset + limit],
        }

    def get_article(self, article_id: str) -> Optional[Article]:
        path = self.articles_dir / f"{article_id}.json"
        if not path.exists():
            return None
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            return Article.model_validate(data)

    @staticmethod
    def new_id() -> str:
        return uuid4().hex