import os
import asyncio
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models import EnqueueRequest, EnqueueResponse, ListArticlesResponse
from .providers.mock import MockProvider
from .providers.base import GenerationProvider
from .providers.openai_provider import OpenAIProvider
from .providers.ollama_provider import OllamaProvider
from .scheduler import ArticleScheduler
from .storage import FileStorage


app = FastAPI(title="Article Generator", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency wiring
_storage = FileStorage(settings.storage_dir, settings.max_articles)


def _build_provider() -> GenerationProvider:
    if settings.provider_type == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required when PROVIDER_TYPE=openai")
        return OpenAIProvider(api_key=settings.openai_api_key, model=settings.openai_model)
    if settings.provider_type == "ollama":
        return OllamaProvider(base_url=settings.ollama_base_url, model=settings.ollama_model)
    return MockProvider()


_provider = _build_provider()
_scheduler = ArticleScheduler(
    provider=_provider,
    storage=_storage,
    languages=settings.languages,
    interval_seconds=settings.generator_interval_seconds,
)


@app.on_event("startup")
async def on_startup() -> None:
    await _scheduler.start()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await _scheduler.stop()


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "provider": settings.provider_type,
        "languages": settings.languages,
        "storage_dir": settings.storage_dir,
    }


@app.get("/articles", response_model=ListArticlesResponse)
async def list_articles(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), language: Optional[str] = None):
    data = _storage.list_articles(limit=limit, offset=offset, language=language)
    return ListArticlesResponse(total=data["total"], items=data["items"])  # type: ignore[arg-type]


@app.get("/articles/{article_id}")
async def get_article(article_id: str):
    art = _storage.get_article(article_id)
    if not art:
        raise HTTPException(status_code=404, detail="Article not found")
    return art


@app.post("/enqueue", response_model=EnqueueResponse)
async def enqueue(req: EnqueueRequest):
    use_langs: List[str] = req.languages or settings.languages
    group_id = FileStorage.new_id()
    # Put individual tasks for each language into the queue
    for lang in use_langs:
        await _scheduler.enqueue(req.topic, [lang])
    return EnqueueResponse(enqueued=len(use_langs), group_id=group_id, languages=use_langs)