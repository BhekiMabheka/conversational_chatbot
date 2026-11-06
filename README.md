# Conversational Chatbot + Mzansi Threads demo shop 🇿🇦

| Folder | What it is |
| --- | --- |
| [`mzansi-threads/`](mzansi-threads) | React (Vite) clothing store with prices in Rand and a South African look |
| [`chatbot/`](chatbot) | Reusable knowledge-base chatbot using local Ollama models, embeddable on any website, runs in Docker |
| `docker-compose.yml` | Runs the chatbot (and optionally Ollama) in Docker |

## Run everything locally

1. Install [Ollama](https://ollama.com/download) and pull the models:

   ```bash
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ```

2. Start the chatbot, either with Node:

   ```bash
   cd chatbot && npm start
   ```

   or with Docker:

   ```bash
   docker compose up -d --build
   ```

3. Start the shop in a second terminal:

   ```bash
   cd mzansi-threads && npm install && npm run dev
   ```

4. Open http://localhost:5173 and click **Ask Thandi** in the bottom-right corner.

The shop's product list lives in `mzansi-threads/src/products.js`. After changing it, run `npm run export-kb` in `mzansi-threads/` to update the chatbot's knowledge base, then restart the chatbot.

See [`chatbot/README.md`](chatbot/README.md) for plugging in other websites' knowledge bases and for embedding options.
