import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STOPWORDS = new Set(('a an and are as at be but by can do does for from have how i if in is it me my of on or ' +
  'so that the their there this to was we what when where which who why will with you your our us any').split(' '));

const tokenize = (text) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/).filter((t) => t.length > 1 && !STOPWORDS.has(t))
  .map((t) => (t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t)); // crude plural folding

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// BM25 keyword search: works without any embedding model.
class KeywordIndex {
  constructor(chunks) {
    this.docs = chunks.map((c) => tokenize(c.text));
    this.avgLen = this.docs.reduce((s, d) => s + d.length, 0) / (this.docs.length || 1);
    this.df = new Map();
    for (const doc of this.docs) for (const t of new Set(doc)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
  }

  scores(query) {
    const terms = [...new Set(tokenize(query))];
    const N = this.docs.length, k1 = 1.4, b = 0.75;
    return this.docs.map((doc) => {
      let score = 0;
      for (const t of terms) {
        const tf = doc.filter((x) => x === t).length;
        if (!tf) continue;
        const idf = Math.log(1 + (N - this.df.get(t) + 0.5) / (this.df.get(t) + 0.5));
        score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * doc.length / this.avgLen));
      }
      return score;
    });
  }
}

export class Retriever {
  constructor(chunks, { ollama, embedModel, cacheDir }) {
    this.chunks = chunks;
    this.ollama = ollama;
    this.embedModel = embedModel;
    this.cacheFile = path.join(cacheDir, `embeddings-${embedModel.replace(/[^\w.-]/g, '_')}.json`);
    this.keyword = new KeywordIndex(chunks);
    this.vectors = null;
    this.lastAttempt = 0;
  }

  get mode() { return this.vectors ? 'embeddings' : 'keyword'; }

  // Embeds every chunk once (cached on disk). Falls back to keyword search if the embed model is unavailable.
  async init() {
    this.lastAttempt = Date.now();
    const hash = (text) => createHash('sha256').update(text).digest('hex');
    let cache = {};
    try { cache = JSON.parse(await readFile(this.cacheFile, 'utf8')); } catch { /* no cache yet */ }

    try {
      const missing = this.chunks.filter((c) => !cache[hash(c.text)]);
      if (missing.length) {
        const vectors = await this.ollama.embed(this.embedModel, missing.map((c) => c.text));
        missing.forEach((c, i) => { cache[hash(c.text)] = vectors[i]; });
        await mkdir(path.dirname(this.cacheFile), { recursive: true });
        await writeFile(this.cacheFile, JSON.stringify(cache));
      }
      this.vectors = this.chunks.map((c) => cache[hash(c.text)]);
      console.log(`✓ Embedded ${this.chunks.length} knowledge chunks with "${this.embedModel}"`);
    } catch (err) {
      this.vectors = null;
      console.warn(`⚠ Embedding model "${this.embedModel}" unavailable (${err.message}). Using keyword search.`);
    }
  }

  async search(query, k = 4) {
    // If Ollama/the embed model wasn't ready at startup, retry at most once a minute.
    if (!this.vectors && Date.now() - this.lastAttempt > 60_000) await this.init();

    const keywordScores = this.keyword.scores(query);
    let scores = keywordScores;
    if (this.vectors) {
      try {
        const [q] = await this.ollama.embed(this.embedModel, [query]);
        const maxKw = Math.max(...keywordScores) || 1;
        // Hybrid: semantic similarity plus a small boost for exact keyword matches (product names, codes).
        scores = this.vectors.map((v, i) => cosine(q, v) + 0.15 * (keywordScores[i] / maxKw));
      } catch (err) {
        console.warn(`⚠ Query embedding failed (${err.message}); using keyword search for this question.`);
      }
    }

    return scores.map((score, i) => ({ chunk: this.chunks[i], score }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((r) => r.chunk);
  }
}
