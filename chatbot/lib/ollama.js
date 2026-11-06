// Minimal client for the local Ollama REST API (https://github.com/ollama/ollama/blob/main/docs/api.md)

export class OllamaError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message, { cause });
    this.status = status;
  }
}

export function createOllama(baseUrl) {
  const url = (path) => new URL(path, baseUrl).toString();

  async function request(path, body, signal) {
    let res;
    try {
      res = await fetch(url(path), {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      throw new OllamaError(`Cannot reach Ollama at ${baseUrl}. Is Ollama running?`, { cause: err });
    }
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error ?? ''; } catch { /* ignore */ }
      throw new OllamaError(detail || `Ollama returned HTTP ${res.status}`, { status: res.status });
    }
    return res;
  }

  return {
    baseUrl,

    async listModels() {
      const res = await request('/api/tags');
      const data = await res.json();
      return (data.models ?? []).map((m) => m.name);
    },

    async embed(model, input) {
      const res = await request('/api/embed', { model, input });
      const data = await res.json();
      return data.embeddings;
    },

    // Streams the assistant reply, yielding text fragments as they arrive.
    async *chat(model, messages, { signal, options } = {}) {
      const res = await request('/api/chat', { model, messages, stream: true, options }, signal);
      const decoder = new TextDecoder();
      let buffer = '';
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          const data = JSON.parse(line);
          if (data.error) throw new OllamaError(data.error);
          if (data.message?.content) yield data.message.content;
          if (data.done) return;
        }
      }
    },
  };
}

// True when `name` (e.g. "llama3.2") matches an installed model (e.g. "llama3.2:latest").
export function hasModel(installed, name) {
  const want = name.includes(':') ? name : `${name}:latest`;
  return installed.includes(name) || installed.includes(want);
}
