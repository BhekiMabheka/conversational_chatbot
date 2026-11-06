/*!
 * Knowledge-base chat widget. Embed on any website with:
 *   <script src="https://YOUR-BOT-HOST/widget.js" defer></script>
 *
 * Optional attributes on the <script> tag:
 *   data-api="https://bot.example.com"   chatbot server URL (defaults to where widget.js was loaded from)
 *   data-mode="floating" | "inline"      floating bubble (default) or a full panel inside data-target
 *   data-target="#chat"                  container for inline mode
 *   data-position="right" | "left"       side of the screen for the floating bubble
 *   data-open="true"                     start with the chat open
 *
 * JavaScript API: window.KBChat.open(), .close(), .toggle(), .ask("question")
 */
(() => {
  if (window.KBChat) return;
  const script = document.currentScript;
  const opts = script?.dataset ?? {};
  const api = (opts.api || new URL(script.src).origin).replace(/\/$/, '');
  const inline = opts.mode === 'inline';
  const storageKey = `kb-chat:${api}`;

  const css = `
    :host { all: initial; --primary: #2563eb; --accent: #f59e0b; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
    * { box-sizing: border-box; font-family: inherit; }
    .launcher { position: fixed; bottom: 20px; ${opts.position === 'left' ? 'left' : 'right'}: 20px; z-index: 2147483000;
      display: flex; align-items: center; gap: 8px; border: 0; border-radius: 999px; padding: 14px 20px;
      background: var(--primary); color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
      box-shadow: 0 6px 20px rgba(0,0,0,.25); border-bottom: 3px solid var(--accent); transition: transform .15s; }
    .launcher:hover { transform: translateY(-2px); }
    .panel { display: flex; flex-direction: column; background: #fff; color: #222; overflow: hidden; }
    .panel.floating { position: fixed; bottom: 84px; ${opts.position === 'left' ? 'left' : 'right'}: 20px; z-index: 2147483001;
      width: min(380px, calc(100vw - 24px)); height: min(580px, calc(100vh - 110px)); border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,.28); transform-origin: bottom right; transition: opacity .2s, transform .2s; }
    .panel.floating.hidden { opacity: 0; transform: scale(.9) translateY(10px); pointer-events: none; }
    .panel.inline { width: 100%; height: 100%; min-height: 480px; border-radius: 16px; box-shadow: 0 6px 24px rgba(0,0,0,.12); }
    header { background: var(--primary); color: #fff; padding: 14px 16px; display: flex; align-items: center; gap: 10px; border-bottom: 4px solid var(--accent); }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); color: #111; display: grid; place-items: center; font-weight: 800; }
    .title { flex: 1; line-height: 1.2; } .title b { display: block; font-size: 15px; } .title small { opacity: .85; font-size: 12px; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #9ca3af; margin-right: 4px; }
    .dot.ok { background: #4ade80; } .dot.bad { background: #f87171; }
    .icon-btn { background: none; border: 0; color: #fff; font-size: 18px; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
    .icon-btn:hover { background: rgba(255,255,255,.15); }
    .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #f7f7f5; }
    .msg { max-width: 85%; padding: 10px 13px; border-radius: 14px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; word-wrap: break-word; }
    .msg.assistant { background: #fff; align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .msg.user { background: var(--primary); color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
    .msg.error { background: #fdecea; color: #8a1c13; align-self: stretch; max-width: 100%; font-size: 13px; }
    .sources { font-size: 11px; color: #6b7280; margin-top: 6px; white-space: normal; }
    .typing span { display: inline-block; width: 7px; height: 7px; margin: 0 2px; border-radius: 50%; background: #9ca3af; animation: blink 1.2s infinite; }
    .typing span:nth-child(2) { animation-delay: .2s; } .typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
    .suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 10px; background: #f7f7f5; }
    .suggestions button { border: 1.5px solid var(--primary); color: var(--primary); background: #fff; border-radius: 999px;
      padding: 6px 11px; font-size: 12.5px; cursor: pointer; }
    .suggestions button:hover { background: var(--primary); color: #fff; }
    form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; background: #fff; }
    textarea { flex: 1; resize: none; border: 1.5px solid #ddd; border-radius: 12px; padding: 10px 12px; font-size: 14px; max-height: 110px; outline: none; }
    textarea:focus { border-color: var(--accent); }
    .send { border: 0; border-radius: 12px; background: var(--accent); color: #111; font-weight: 700; padding: 0 16px; cursor: pointer; font-size: 14px; }
    .send:disabled { opacity: .5; cursor: default; }
    .footer { font-size: 10.5px; color: #9ca3af; text-align: center; padding: 0 0 8px; background: #fff; }
  `;

  const host = document.createElement('div');
  host.className = 'kb-chat-widget';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>${css}</style>
    ${inline ? '' : '<button class="launcher" part="launcher" aria-label="Open chat">💬 <span class="launcher-label">Chat with us</span></button>'}
    <section class="panel ${inline ? 'inline' : 'floating hidden'}" role="dialog" aria-label="Chat">
      <header>
        <div class="avatar">?</div>
        <div class="title"><b class="name">Assistant</b><small><span class="dot"></span><span class="status">Connecting…</span></small></div>
        <button class="icon-btn reset" title="Start a new chat" aria-label="Start a new chat">↺</button>
        ${inline ? '' : '<button class="icon-btn close" title="Close" aria-label="Close chat">✕</button>'}
      </header>
      <div class="messages" aria-live="polite"></div>
      <div class="suggestions"></div>
      <form>
        <textarea rows="1" placeholder="Type your question…" aria-label="Your message" maxlength="2000"></textarea>
        <button class="send" type="submit">Send</button>
      </form>
      <div class="footer">AI assistant · answers may be imperfect, please confirm important details</div>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const panel = $('.panel'), list = $('.messages'), input = $('textarea'), sendBtn = $('.send'), chips = $('.suggestions');
  let config = { assistantName: 'Assistant', welcomeMessage: 'Hi! How can I help you today?', suggestions: [] };
  let history = [];
  let busy = false;
  try { history = JSON.parse(sessionStorage.getItem(storageKey)) ?? []; } catch { history = []; }
  const save = () => { try { sessionStorage.setItem(storageKey, JSON.stringify(history.slice(-20))); } catch { /* storage full/blocked */ } };

  // Safe, tiny formatter: escapes HTML, then supports **bold** and links.
  const format = (text) => text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  function addBubble(role, text, sources) {
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    el.innerHTML = format(text);
    if (sources?.length) {
      const s = document.createElement('div');
      s.className = 'sources';
      s.textContent = `Sources: ${[...new Set(sources.map((x) => x.source))].join(' · ')}`;
      el.appendChild(s);
    }
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
    return el;
  }

  function render() {
    list.innerHTML = '';
    addBubble('assistant', config.welcomeMessage);
    history.forEach((m) => addBubble(m.role, m.content));
    chips.innerHTML = '';
    if (!history.length) {
      (config.suggestions ?? []).forEach((q) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = q;
        b.onclick = () => ask(q);
        chips.appendChild(b);
      });
    }
  }

  function setStatus(ok, text) {
    $('.dot').className = `dot ${ok ? 'ok' : 'bad'}`;
    $('.status').textContent = text;
  }

  async function ask(question) {
    question = question.trim();
    if (!question || busy) return;
    busy = true;
    sendBtn.disabled = true;
    chips.innerHTML = '';
    history.push({ role: 'user', content: question });
    addBubble('user', question);
    input.value = '';
    autosize();

    const bubble = addBubble('assistant', '');
    bubble.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
    let answer = '', sources = [], failed = null;

    try {
      const res = await fetch(`${api}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server error (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.type === 'sources') sources = evt.sources;
          else if (evt.type === 'token') { answer += evt.content; bubble.innerHTML = format(answer); list.scrollTop = list.scrollHeight; }
          else if (evt.type === 'error') failed = evt.message;
        }
      }
    } catch (err) {
      failed = err.message === 'Failed to fetch' ? `Can't reach the chat server at ${api}.` : err.message;
    }

    if (failed && !answer) {
      bubble.remove();
      history.pop(); // let the user retry the same question
      addBubble('error', `⚠ ${failed}`);
      input.value = question;
    } else {
      bubble.remove();
      addBubble('assistant', answer, sources);
      history.push({ role: 'assistant', content: answer });
      save();
    }
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  function autosize() { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 110)}px`; }

  const open = () => { panel.classList.remove('hidden'); setTimeout(() => input.focus(), 50); };
  const close = () => panel.classList.add('hidden');
  const toggle = () => (panel.classList.contains('hidden') ? open() : close());

  $('form').addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
  $('.reset').addEventListener('click', () => { if (busy) return; history = []; save(); render(); });
  if (!inline) {
    $('.launcher').addEventListener('click', toggle);
    $('.close').addEventListener('click', close);
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  async function init() {
    try {
      const res = await fetch(`${api}/api/config`);
      config = { ...config, ...(await res.json()) };
    } catch { /* keep defaults */ }
    const { theme = {}, assistantName } = config;
    if (theme.primary) host.style.setProperty('--primary', theme.primary);
    if (theme.accent) host.style.setProperty('--accent', theme.accent);
    $('.name').textContent = assistantName;
    $('.avatar').textContent = assistantName.charAt(0).toUpperCase();
    const label = $('.launcher-label');
    if (label) label.textContent = `Ask ${assistantName}`;
    render();

    try {
      const health = await (await fetch(`${api}/api/health`)).json();
      if (health.status === 'ok') setStatus(true, 'Online');
      else if (health.ollama !== 'ok') setStatus(false, 'Offline – AI model server not running');
      else setStatus(false, `Model "${health.chatModel.name}" not installed`);
    } catch {
      setStatus(false, 'Offline');
    }
  }

  const mount = () => {
    const target = inline && opts.target ? document.querySelector(opts.target) : document.body;
    (target ?? document.body).appendChild(host);
    init();
    if (opts.open === 'true' && !inline) open();
  };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  window.KBChat = { open, close, toggle, ask: (q) => { if (!inline) open(); return ask(q); } };
})();
