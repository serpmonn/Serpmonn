from typing import List, Tuple
import httpx

from .base import GenerationProvider


PROMPT_TEMPLATE = (
    "You are a helpful writer. Write a well-structured technical blog post in {language} about the topic: '{topic}'. "
    "Include: a short abstract, 3-5 sections with headings, code examples if relevant, and a concise conclusion. "
    "Return only Markdown, no preambles."
)


essay_system = "You are an expert technical writer and software engineer."


class OllamaProvider(GenerationProvider):
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.1:8b") -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate(self, topic: str, language: str) -> Tuple[str, str, List[str]]:
        prompt = PROMPT_TEMPLATE.format(language=language, topic=topic)
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": essay_system},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{self.base_url}/v1/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = (data["choices"][0]["message"]["content"] or "").strip()
        first_line = content.splitlines()[0].lstrip("# ").strip() if content else topic.title()
        title = first_line if len(first_line) > 3 else topic.title()
        tags = [topic.lower(), "generated", language]
        return title, content, tags