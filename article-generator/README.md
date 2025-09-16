# Article Generator Service

A FastAPI microservice that generates articles in the background and exposes them via a REST API. Articles are stored on disk with metadata for easy consumption by a frontend.

## Quickstart

1. Create and edit your env:
```bash
cp .env.example .env
```

2. Choose provider in `.env`:
- `PROVIDER_TYPE=mock` – no external deps
- `PROVIDER_TYPE=openai` – needs `OPENAI_API_KEY`
- `PROVIDER_TYPE=ollama` – needs local Ollama server

3. Install deps and run:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

4. Endpoints:
- `GET /health` – service status
- `GET /articles` – list articles (query: `limit`, `offset`, `language`)
- `GET /articles/{article_id}` – get single article
- `POST /enqueue` – enqueue topic for generation `{ "topic": "...", "languages": ["ru","en"] }`

## Configuration

Environment variables (see `.env.example`):
- `PROVIDER_TYPE` – `mock` (default), `openai`, or `ollama`
- `LANGUAGES` – comma-separated list of language codes
- `STORAGE_DIR` – where to store data (JSON files)
- `GENERATOR_INTERVAL_SECONDS` – background generation cadence
- `MAX_ARTICLES` – max number of articles to retain (oldest pruned)
- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`
- Ollama: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`

## Docker

```bash
docker build -t article-generator .
docker run --rm -p 8080:8080 --env-file .env -v $(pwd)/data:/app/data article-generator
```

## Notes
- Default provider is `mock` and requires no external credentials.
- Output is stored under `STORAGE_DIR` as `index.json` and `articles/{id}.json`.
- The background scheduler will periodically generate articles even if no topics are enqueued.