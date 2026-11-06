import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOllama, hasModel, OllamaError } from './lib/ollama.js';
import { loadBotConfig, loadKnowledge } from './lib/knowledge.js';
import { Retriever } from './lib/retriever.js';
import { buildSystemPrompt } from './lib/prompt.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '127.0.0.1',
  ollamaUrl: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434',
  chatModel: process.env.CHAT_MODEL ?? 'llama3.2',
  embedModel: process.env.EMBED_MODEL ?? 'nomic-embed-text',
  topK: Number(process.env.TOP_K ?? 4),
  knowledgeDir: path.resolve(process.env.KNOWLEDGE_DIR ?? path.join(here, 'knowledge')),
  cacheDir: path.resolve(process.env.CACHE_DIR ?? path.join(here, '.cache')),
  // Comma-separated list of websites allowed to embed the widget, or * for any.
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim()).filter(Boolean),
  maxHistory: 10,
  maxMessageChars: 2000,
};

const ollama = createOllama(config.ollamaUrl);
const bot = await loadBotConfig(config.knowledgeDir);
const chunks = await loadKnowledge(config.knowledgeDir);
if (!chunks.length) console.warn(`⚠ No knowledge files found in ${config.knowledgeDir}`);
const retriever = new Retriever(chunks, { ollama, embedModel: config.embedModel, cacheDir: config.cacheDir });
await retriever.init();

const staticFiles = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/widget.js': ['widget.js', 'text/javascript; charset=utf-8'],
};

function setCors(req, res) {
  const origin = req.headers.origin;
  if (config.allowedOrigins.includes('*')) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

async function readJsonBody(req, limit = 64 * 1024) {
  let size = 0;
  const parts = [];
  for await (const part of req) {
    size += part.length;
    if (size > limit) throw Object.assign(new Error('Request too large'), { status: 413 });
    parts.push(part);
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

function validateMessages(body) {
  const messages = body?.messages;
  if (!Array.isArray(messages) || !messages.length) throw Object.assign(new Error('"messages" must be a non-empty array'), { status: 400 });
  const clean = messages.slice(-config.maxHistory).map((m) => {
    if (!['user', 'assistant'].includes(m?.role) || typeof m.content !== 'string') {
      throw Object.assign(new Error('Each message needs a role of "user" or "assistant" and string content'), { status: 400 });
    }
    return { role: m.role, content: m.content.slice(0, config.maxMessageChars) };
  });
  if (clean.at(-1).role !== 'user') throw Object.assign(new Error('The last message must be from the user'), { status: 400 });
  return clean;
}

function friendlyError(err) {
  if (err instanceof OllamaError && err.status === 404) {
    return `The model "${config.chatModel}" isn't installed. Run: ollama pull ${config.chatModel}`;
  }
  if (err instanceof OllamaError) return err.message;
  return 'Something went wrong while answering. Please try again.';
}

async function handleChat(req, res) {
  const messages = validateMessages(await readJsonBody(req));

  // Use the latest question plus the previous one so follow-ups ("and for sale items?") find the right context.
  const userTurns = messages.filter((m) => m.role === 'user').slice(-2).map((m) => m.content);
  const context = await retriever.search(userTurns.join('\n'), config.topK);

  const controller = new AbortController();
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });

  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' });
  const send = (obj) => res.write(JSON.stringify(obj) + '\n');
  send({ type: 'sources', sources: [...new Map(context.map((c) => [c.source + c.title, { source: c.source, title: c.title }])).values()] });

  try {
    const prompt = [{ role: 'system', content: buildSystemPrompt(bot, context) }, ...messages];
    for await (const token of ollama.chat(config.chatModel, prompt, { signal: controller.signal, options: { temperature: 0.2 } })) {
      send({ type: 'token', content: token });
    }
    send({ type: 'done' });
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('Chat error:', err.message);
    send({ type: 'error', message: friendlyError(err) });
  }
  res.end();
}

async function handleHealth(res) {
  let ollamaStatus = 'unreachable', models = [];
  try { models = await ollama.listModels(); ollamaStatus = 'ok'; } catch { /* unreachable */ }
  sendJson(res, 200, {
    status: ollamaStatus === 'ok' && hasModel(models, config.chatModel) ? 'ok' : 'degraded',
    ollama: ollamaStatus,
    chatModel: { name: config.chatModel, installed: hasModel(models, config.chatModel) },
    embedModel: { name: config.embedModel, installed: hasModel(models, config.embedModel) },
    retrieval: retriever.mode,
    knowledgeChunks: chunks.length,
  });
}

const publicConfig = () => ({
  assistantName: bot.assistantName,
  organisation: bot.organisation,
  welcomeMessage: bot.welcomeMessage,
  suggestions: bot.suggestions,
  theme: bot.theme,
});

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.method === 'GET' && staticFiles[pathname]) {
      const [file, type] = staticFiles[pathname];
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      return res.end(await readFile(path.join(here, 'public', file)));
    }
    if (req.method === 'GET' && pathname === '/api/config') return sendJson(res, 200, publicConfig());
    if (req.method === 'GET' && pathname === '/api/health') return await handleHealth(res);
    if (req.method === 'POST' && pathname === '/api/chat') return await handleChat(req, res);
    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    if (res.headersSent) return res.end();
    sendJson(res, err.status ?? 500, { error: err.status ? err.message : 'Internal server error' });
    if (!err.status) console.error(err);
  }
});

server.listen(config.port, config.host, () => {
  console.log(`\n🤖 ${bot.assistantName} (${bot.organisation}) is live at http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`);
  console.log(`   Knowledge: ${config.knowledgeDir} (${chunks.length} chunks, ${retriever.mode} search)`);
  console.log(`   Ollama:    ${config.ollamaUrl}  chat=${config.chatModel}  embed=${config.embedModel}`);
  console.log(`   Embed on any site: <script src="http://localhost:${config.port}/widget.js" defer></script>\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
