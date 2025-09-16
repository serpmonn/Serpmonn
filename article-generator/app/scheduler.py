import asyncio
from datetime import datetime
from typing import Iterable, List, Optional

from .models import Article
from .providers.base import GenerationProvider
from .storage import FileStorage


class ArticleScheduler:
    def __init__(
        self,
        provider: GenerationProvider,
        storage: FileStorage,
        languages: List[str],
        interval_seconds: int,
    ) -> None:
        self.provider = provider
        self.storage = storage
        self.languages = languages
        self.interval_seconds = interval_seconds
        self.queue: asyncio.Queue[tuple[str, Optional[List[str]]]] = asyncio.Queue()
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def enqueue(self, topic: str, languages: Optional[List[str]] = None) -> None:
        await self.queue.put((topic, languages))

    async def _loop(self) -> None:
        while self._running:
            try:
                try:
                    topic, langs = await asyncio.wait_for(self.queue.get(), timeout=self.interval_seconds)
                except asyncio.TimeoutError:
                    topic, langs = self._pick_periodic_topic(), None
                use_langs = langs or self.languages
                await self._generate_for_topic(topic, use_langs)
            except Exception:
                # Avoid crashing the loop; log in real systems
                await asyncio.sleep(1)

    def _pick_periodic_topic(self) -> str:
        # A simple rotating pool; in real life fetch from RSS/trends/db
        topics = [
            "microservices",
            "event-driven architecture",
            "testing pyramid",
            "observability",
            "kubernetes networking",
            "frontend performance",
            "database indexing",
        ]
        idx = int(datetime.utcnow().timestamp() // self.interval_seconds) % len(topics)
        return topics[idx]

    async def _generate_for_topic(self, topic: str, languages: Iterable[str]) -> None:
        group_id = FileStorage.new_id()
        for lang in languages:
            title, content_md, tags = await self.provider.generate(topic, lang)
            summary = self._make_summary(content_md)
            article = Article(
                id=FileStorage.new_id(),
                group_id=group_id,
                language=lang,
                title=title,
                summary=summary,
                content_markdown=content_md,
                tags=tags,
                topic=topic,
                created_at=datetime.utcnow(),
            )
            self.storage.save_article(article)

    def _make_summary(self, content_markdown: str, max_len: int = 240) -> str:
        clean = content_markdown.replace("\n", " ").strip()
        return (clean[: max_len - 1] + "…") if len(clean) > max_len else clean