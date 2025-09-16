from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class Article(BaseModel):
    id: str
    group_id: Optional[str] = None
    language: str = Field(description="BCP-47 language tag, e.g., ru, en, zh")
    title: str
    summary: str
    content_markdown: str
    tags: List[str] = []
    topic: str
    created_at: datetime


class ArticleMeta(BaseModel):
    id: str
    group_id: Optional[str] = None
    language: str
    title: str
    summary: str
    tags: List[str] = []
    topic: str
    created_at: datetime


class EnqueueRequest(BaseModel):
    topic: str
    languages: Optional[List[str]] = None


class EnqueueResponse(BaseModel):
    enqueued: int
    group_id: str
    languages: List[str]


class ListArticlesResponse(BaseModel):
    total: int
    items: List[ArticleMeta]