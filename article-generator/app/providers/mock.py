import random
from datetime import datetime
from typing import List, Tuple

from .base import GenerationProvider


LOREM = (
    "В настоящее время многие разработчики интересуются новыми подходами к разработке ПО. "
    "В этой статье мы кратко рассмотрим ключевые тенденции и практики, которые помогут вам повысить продуктивность."
)

EN_LOREM = (
    "Developers today explore modern approaches to building software. "
    "This article outlines practical patterns that can help you ship faster with confidence."
)

ZH_LOREM = (
    "当今开发者正在探索构建软件的现代方法。"
    "本文概述了可帮助您更快更稳地交付的实用模式。"
)


class MockProvider(GenerationProvider):
    async def generate(self, topic: str, language: str) -> Tuple[str, str, List[str]]:
        seed = random.randint(1000, 9999)
        if language.startswith("ru"):
            base = LOREM
        elif language.startswith("zh"):
            base = ZH_LOREM
        else:
            base = EN_LOREM

        title = f"{topic.title()} — заметки #{seed}" if language.startswith("ru") else (
            f"{topic.title()} — 笔记 #{seed}" if language.startswith("zh") else f"{topic.title()} — notes #{seed}"
        )
        tags = [topic.lower(), "engineering", "insights"]
        sections = [
            f"# {title}",
            "",
            f"> {base}",
            "",
            "## Key Ideas",
            "- Use small, composable modules",
            "- Automate testing and deployment",
            "- Measure what matters",
            "",
            "## Conclusion",
            f"Generated at {datetime.utcnow().isoformat()}Z",
        ]
        content = "\n".join(sections)
        return title, content, tags