# Knowledge-base Chatbot (local Ollama)

A small, dependency-free Node.js chatbot that answers questions from **your own knowledge base** using **local Ollama models**, and that can be embedded in **any website** with one script tag. It ships with the Mzansi Threads knowledge base ("Thandi") as an example.

```
Website ── <script src=".../widget.js"> ──► Chatbot server ──► Ollama (chat + embeddings)
                                               │
                                               └── knowledge/  (.md .txt .json + bot.json)
```

How it answers a question:
1. It searches the knowledge base for the most relevant passages. With an embedding model this is semantic search plus a keyword boost; without one it falls back to keyword (BM25) search.
2. It sends those passages to the Ollama chat model with strict "only answer from this" instructions.
3. It streams the reply back to the widget, along with the sources it used.

## Quick start (without Docker)

Requirements: [Node.js 18+](https://nodejs.org) and [Ollama](https://ollama.com/download).

```bash
ollama pull llama3.2          # chat model
ollama pull nomic-embed-text  # embedding model (optional, improves search)
cd chatbot
npm start
```

Open http://localhost:3001 for the standalone chat page.

## Run with Docker

From the repository root:

```bash
# Use the Ollama already installed on your computer
docker compose up -d --build

# …or run Ollama inside Docker too (models are downloaded automatically the first time)
OLLAMA_URL=http://ollama:11434 docker compose --profile ollama up -d --build
```

> **Linux hosts using their own Ollama:** Ollama only listens on 127.0.0.1 by default. Start it with `OLLAMA_HOST=0.0.0.0 ollama serve` so the container can reach it. Docker Desktop on Windows and macOS works as is.

## Plug in another website's knowledge base

Create a folder containing:

| File | Purpose |
| --- | --- |
| `bot.json` | Assistant name, welcome message, suggested questions, colours and extra rules (all optional) |
| `*.md` | Markdown documents. Each `## heading` section becomes a searchable passage |
| `*.txt` | Plain text, split into paragraphs |
| `*.json` | An array of records (products, FAQs, branches…) or `{ "title": "...", "items": [...] }` |

Sub-folders are fine. Example `bot.json`:

```json
{
  "assistantName": "Sipho",
  "organisation": "Braai Masters Butchery",
  "description": "a family butchery in Pretoria",
  "welcomeMessage": "Hi, I'm Sipho! Ask me about our meat, prices and delivery.",
  "suggestions": ["Do you deliver?", "What are your opening hours?"],
  "contact": "our team on 012 345 6789",
  "instructions": ["Prices are in ZAR."],
  "theme": { "primary": "#7a1f1f", "accent": "#f2b134" },
  "locale": "en-ZA",
  "timeZone": "Africa/Johannesburg"
}
```

Then point the bot at that folder:

```bash
# Docker
KNOWLEDGE_PATH=/path/to/their-knowledge docker compose up -d

# or plain Docker, one container per website
docker run -d -p 3002:3001 -v /path/to/their-knowledge:/app/knowledge:ro \
  -e OLLAMA_URL=http://host.docker.internal:11434 --add-host host.docker.internal:host-gateway \
  --name their-bot kb-chatbot

# without Docker
KNOWLEDGE_DIR=/path/to/their-knowledge npm start
```

Restart the bot after changing knowledge files. Embeddings are cached, so only new or changed passages are re-embedded.

## Embed on a website

Add this before `</body>`:

```html
<script src="http://localhost:3001/widget.js" defer></script>
```

Optional attributes:

| Attribute | Default | Description |
| --- | --- | --- |
| `data-api` | where `widget.js` is served from | URL of the chatbot server |
| `data-mode` | `floating` | `floating` chat bubble, or `inline` to fill a container |
| `data-target` | – | CSS selector of the container for `inline` mode, e.g. `#chat` |
| `data-position` | `right` | `left` or `right` for the bubble |
| `data-open` | `false` | `true` to open the chat on page load |

From JavaScript you can call `KBChat.open()`, `KBChat.close()`, `KBChat.toggle()` and `KBChat.ask("Do you deliver?")`. The widget renders in a Shadow DOM, so the website's CSS and the widget's styles don't affect each other.

## Configuration (environment variables)

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | HTTP port |
| `HOST` | `127.0.0.1` (`0.0.0.0` in Docker) | Interface to listen on |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server |
| `CHAT_MODEL` | `llama3.2` | Any Ollama chat model, e.g. `qwen2.5:7b`, `gemma3`, `mistral` |
| `EMBED_MODEL` | `nomic-embed-text` | Ollama embedding model (keyword search is used if missing) |
| `TOP_K` | `4` | Number of knowledge passages given to the model |
| `KNOWLEDGE_DIR` | `./knowledge` | Knowledge base folder |
| `ALLOWED_ORIGINS` | `*` | Comma-separated websites allowed to use the bot, e.g. `https://shop.co.za,https://www.shop.co.za` |

## API

| Method & path | Description |
| --- | --- |
| `GET /widget.js` | Embeddable widget |
| `GET /` | Standalone chat page |
| `GET /api/config` | Public bot settings (name, welcome message, suggestions, theme) |
| `GET /api/health` | Ollama/model status and the search mode in use |
| `POST /api/chat` | Body `{ "messages": [{ "role": "user", "content": "..." }] }`. Streams newline-delimited JSON: `sources`, then `token` events, then `done` (or `error`) |

## Going to production

- Set `ALLOWED_ORIGINS` to the real website domains.
- Put the bot behind HTTPS (e.g. a reverse proxy such as Caddy or Nginx). A site served over HTTPS can't load the widget from plain `http://`.
- There is no built-in rate limiting or authentication. Add it at the reverse proxy if the bot is publicly reachable, because every question uses CPU or GPU time on your Ollama machine.
