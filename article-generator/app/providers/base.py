from abc import ABC, abstractmethod
from typing import List, Tuple


class GenerationProvider(ABC):
    @abstractmethod
    async def generate(self, topic: str, language: str) -> Tuple[str, str, List[str]]:
        """
        Generate an article for the given topic and language.
        Returns (title, markdown_content, tags).
        """
        raise NotImplementedError