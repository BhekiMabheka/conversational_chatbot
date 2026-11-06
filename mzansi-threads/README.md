# Mzansi Threads 🇿🇦

A simple React (Vite) clothing store with a South African look and feel.

- Prices in South African Rand (ZAR), formatted for `en-ZA` (e.g. `R 1 299,00`)
- 15% VAT included and shown at checkout
- Free delivery over R1 000, otherwise R99
- Category filters, search, size selection
- Slide-out "trolley" saved in localStorage
- Checkout form with SA provinces, 4-digit postal codes and SA cell number validation
- SA flag colours and local slang ("Howzit", "Lekker", "Sharp sharp")

## Run it

```bash
npm install
npm run dev
```

Build for production with `npm run build`.

## Chat assistant ("Thandi")

The site embeds the standalone chatbot from [`../chatbot`](../chatbot) (powered by local Ollama models). Start it with `npm start` in `../chatbot` (or `docker compose up -d` from the repo root) and the **Ask Thandi** button appears bottom-right.

- The chatbot URL defaults to `http://localhost:3001`. Change it with `VITE_CHATBOT_URL` (see `.env.example`).
- After editing products in `src/products.js`, run `npm run export-kb` so the chatbot knows the new products and prices.
