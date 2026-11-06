import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// A knowledge base is a folder of .md, .txt and .json files (sub-folders included).
// bot.json in the root of the folder is the assistant's configuration, not knowledge.
const MAX_CHUNK_CHARS = 1500;

const humanize = (key) => key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/^./, (c) => c.toUpperCase());

// Splits on "## " headings so retrieval returns focused passages. Text before the first ## is its own chunk.
function chunkMarkdown(file, markdown) {
  const lines = markdown.split(/\r?\n/);
  const docTitle = lines.find((l) => l.startsWith('# '))?.slice(2).trim() ?? path.basename(file, path.extname(file));
  const sections = [];
  let current = { title: docTitle, body: [] };
  for (const line of lines) {
    if (line.startsWith('# ')) continue;
    if (line.startsWith('## ')) {
      sections.push(current);
      current = { title: line.slice(3).trim(), body: [] };
    } else current.body.push(line);
  }
  sections.push(current);

  return sections
    .map((s) => ({ ...s, body: s.body.join('\n').trim() }))
    .filter((s) => s.body)
    .flatMap((s) => splitLong(s.body).map((part) => ({
      source: docTitle,
      title: s.title,
      text: s.title === docTitle ? `${docTitle}\n${part}` : `${docTitle} – ${s.title}\n${part}`,
    })));
}

// Plain text: groups paragraphs into chunks of up to MAX_CHUNK_CHARS.
function chunkText(file, text) {
  const title = path.basename(file, path.extname(file));
  return splitLong(text.trim()).map((part) => ({ source: title, title, text: `${title}\n${part}` }));
}

function splitLong(text) {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const parts = [];
  let current = '';
  for (const para of text.split(/\n\s*\n/)) {
    if (current && current.length + para.length > MAX_CHUNK_CHARS) { parts.push(current); current = ''; }
    current = current ? `${current}\n\n${para}` : para;
  }
  if (current) parts.push(current);
  return parts;
}

// JSON: an array of records (products, FAQs, branches...) or { "title": "...", "items": [...] }.
// Each record becomes its own chunk, and a list of all record names is added for "what do you have" questions.
function chunkJson(file, data) {
  const fallbackTitle = humanize(path.basename(file, '.json'));
  const title = Array.isArray(data) ? fallbackTitle : data.title ?? fallbackTitle;
  const items = Array.isArray(data) ? data : data.items;
  if (!Array.isArray(items)) throw new Error('expected an array, or an object with an "items" array');

  const format = (value) => (Array.isArray(value) ? value.join(', ')
    : value && typeof value === 'object' ? JSON.stringify(value) : String(value));
  const nameOf = (item, i) => item.name ?? item.title ?? item.question ?? `${title} item ${i + 1}`;

  const records = items.map((item, i) => {
    if (typeof item !== 'object' || item === null) return { source: title, title: `${title} ${i + 1}`, text: `${title}\n${item}` };
    const fields = Object.entries(item).filter(([k, v]) => v !== null && v !== '' && k !== 'id')
      .map(([k, v]) => `${humanize(k)}: ${format(v)}`);
    return { source: title, title: nameOf(item, i), text: `${title} – ${nameOf(item, i)}\n${fields.join('\n')}` };
  });

  const summaryFields = ['price', 'category'];
  const overview = {
    source: title,
    title: `All ${title}`,
    text: `${title} – full list (${items.length} entries)\n` + items.map((item, i) => {
      const extras = typeof item === 'object' && item
        ? summaryFields.filter((f) => item[f] != null).map((f) => item[f]).join(', ') : '';
      return `- ${typeof item === 'object' && item ? nameOf(item, i) : item}${extras ? ` (${extras})` : ''}`;
    }).join('\n'),
  };
  return items.length > 1 ? [overview, ...records] : records;
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((e) => {
    const full = path.join(dir, e.name);
    if (e.name.startsWith('.')) return [];
    return e.isDirectory() ? listFiles(full) : [full];
  }));
  return files.flat().sort();
}

export async function loadKnowledge(knowledgeDir) {
  const chunks = [];
  for (const file of await listFiles(knowledgeDir)) {
    const rel = path.relative(knowledgeDir, file);
    if (rel === 'bot.json') continue;
    const ext = path.extname(file).toLowerCase();
    try {
      const content = await readFile(file, 'utf8');
      const fileChunks = ext === '.md' ? chunkMarkdown(file, content)
        : ext === '.txt' ? chunkText(file, content)
        : ext === '.json' ? chunkJson(file, JSON.parse(content))
        : null;
      if (!fileChunks) continue;
      fileChunks.forEach((c, i) => chunks.push({ id: `${rel}#${i}`, file: rel, ...c }));
    } catch (err) {
      console.warn(`⚠ Skipping ${rel}: ${err.message}`);
    }
  }
  return chunks;
}

const DEFAULT_BOT = {
  assistantName: 'Assistant',
  organisation: 'our organisation',
  description: '',
  welcomeMessage: 'Hi! How can I help you today?',
  suggestions: [],
  contact: '',
  instructions: [],
  theme: { primary: '#2563eb', accent: '#f59e0b' },
  locale: 'en-US',
  timeZone: undefined,
};

export async function loadBotConfig(knowledgeDir) {
  try {
    const custom = JSON.parse(await readFile(path.join(knowledgeDir, 'bot.json'), 'utf8'));
    return { ...DEFAULT_BOT, ...custom, theme: { ...DEFAULT_BOT.theme, ...custom.theme } };
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`⚠ Could not read bot.json: ${err.message}`);
    return DEFAULT_BOT;
  }
}
