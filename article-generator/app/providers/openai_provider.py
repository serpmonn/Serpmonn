import os
from typing import List, Tuple

from openai import AsyncOpenAI

from .base import GenerationProvider


PROMPT_TEMPLATE = (
    "You are a helpful writer. Write a well-structured technical blog post in {language} about the topic: '{topic}'. "
    "Include: a short abstract, 3-5 sections with headings, code examples if relevant, and a concise conclusion. "
    "Return only Markdown, no preambles."
)


essay_system = "You are an expert technical writer and software engineer."


class OpenAIProvider(GenerationProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        key = api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            raise RuntimeError("OPENAI_API_KEY is required for OpenAIProvider")
        self.client = AsyncOpenAI(api_key=key)
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def generate(self, topic: str, language: str) -> Tuple[str, str, List[str]]:
        prompt = PROMPT_TEMPLATE.format(language=language, topic=topic)
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": essay_system},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
        )
        content = (resp.choices[0].message.content or "").strip()
        first_line = content.splitlines()[0].lstrip("# ").strip() if content else topic.title()
        title = first_line if len(first_line) > 3 else topic.title()
        tags = [topic.lower(), "generated", language]
        return title, content, tags