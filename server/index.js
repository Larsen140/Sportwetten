import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildTools, CARD_TOOLS } from './prompt.js';
import { getLiveOdds, liveOddsEnabled } from './odds.js';
import { conversations, bets, saveConversations, saveBets, newId } from './store.js';
import { runDemo } from './demo.js';
import { authEnabled, isAuthed, login, logout, requireAuth } from './auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const MODEL = 'claude-opus-5-5';
const DEMO = !process.env.ANTHROPIC_API_KEY;
const client = DEMO ? null : new Anthropic();

const app = express();
app.disable('x-powered-by');

app.set('trust proxy', 1); // hinter Render/Proxy: korrekte IP und HTTPS-Erkennung

app.use(express.json({ limit: '25mb' }));

app.get('/api/status', (req, res) =>
  res.json({ demo: DEMO, model: MODEL, liveOdds: liveOddsEnabled(), authRequired: authEnabled(), authed: isAuthed(req) }));
app.post('/api/login', login);
app.post('/api/logout', logout);
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', requireAuth);

// ---------- Unterhaltungen ----------
app.get('/api/conversations', (_req, res) => {
  const list = Object.values(conversations)
    .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  res.json(list);
});

app.get('/api/conversations/:id', (req, res) => {
  const c = conversations[req.params.id];
  if (!c) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({ id: c.id, title: c.title, ui: c.ui });
});

app.delete('/api/conversations/:id', (req, res) => {
  delete conversations[req.params.id];
  saveConversations();
  res.json({ ok: true });
});

// ---------- Wetten ----------
app.get('/api/bets', (_req, res) => res.json(bets));

app.post('/api/bets', (req, res) => {
  const { title, legs, totalOdds, stake, source, bookmaker } = req.body ?? {};
  const odds = Number(totalOdds);
  const amount = Number(stake);
  if (!title || !(odds > 1) || !(amount > 0)) {
    return res.status(400).json({ error: 'Titel, Quote (> 1) und Einsatz (> 0) sind Pflicht.' });
  }
  const bet = {
    id: newId(),
    createdAt: Date.now(),
    title: String(title).slice(0, 120),
    legs: Array.isArray(legs) ? legs.slice(0, 20) : [],
    totalOdds: odds,
    stake: amount,
    status: 'open',
    source: ['ki', 'import'].includes(source) ? source : 'manuell',
    bookmaker: String(bookmaker || 'bet365').slice(0, 40),
  };
  bets.unshift(bet);
  saveBets();
  res.json(bet);
});

app.patch('/api/bets/:id', (req, res) => {
  const bet = bets.find((b) => b.id === req.params.id);
  if (!bet) return res.status(404).json({ error: 'Nicht gefunden' });
  if (['open', 'won', 'lost', 'void'].includes(req.body?.status)) {
    bet.status = req.body.status;
    bet.settledAt = bet.status === 'open' ? null : Date.now();
  }
  saveBets();
  res.json(bet);
});

app.delete('/api/bets/:id', (req, res) => {
  const i = bets.findIndex((b) => b.id === req.params.id);
  if (i >= 0) bets.splice(i, 1);
  saveBets();
  res.json({ ok: true });
});

// ---------- KI-Chat (Server-Sent Events) ----------
function validateCard(name, input) {
  if (!input || typeof input !== 'object') return false;
  if (name === 'show_kombi') return Array.isArray(input.legs) && input.legs.length > 0;
  if (name === 'show_match_analysis') return !!input.probabilities && Array.isArray(input.markets);
  if (name === 'show_bet_slip') return Array.isArray(input.legs) && input.legs.length > 0;
  return false;
}

function today() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin',
  });
}

app.post('/api/chat', async (req, res) => {
  const { conversationId, text = '', images = [], mode = 'chat' } = req.body ?? {};
  if (!text.trim() && images.length === 0) {
    return res.status(400).json({ error: 'Leere Nachricht' });
  }

  let convo = conversationId && conversations[conversationId];
  if (!convo) {
    convo = {
      id: newId(),
      title: (text.trim() || 'Bildanalyse').slice(0, 60),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      ui: [],
    };
    conversations[convo.id] = convo;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  send({ type: 'conversation', id: convo.id, title: convo.title });

  const prefix =
    mode === 'review'
      ? 'Hier ist meine eigene Analyse. Prüfe sie kritisch, recherchiere die Fakten nach und gib mir eine klare Bewertung mit Verbesserungen:\n\n'
      : '';
  const content = [
    ...images.slice(0, 6).map((img) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.data },
    })),
    { type: 'text', text: prefix + (text.trim() || 'Analysiere diesen Wettschein.') },
  ];
  convo.messages.push({ role: 'user', content });
  convo.ui.push({
    role: 'user',
    text,
    mode,
    images: images.slice(0, 6).map((i) => `data:${i.mediaType};base64,${i.data}`),
  });

  const uiMsg = { role: 'assistant', parts: [], thinking: '' };
  const pushText = (t) => {
    const last = uiMsg.parts.at(-1);
    if (last?.type === 'text') last.text += t;
    else uiMsg.parts.push({ type: 'text', text: t });
  };

  let aborted = false;
  res.on('close', () => { aborted = !res.writableEnded; });

  try {
    if (DEMO) {
      await runDemo(text, images.length > 0, send, uiMsg, pushText);
    } else {
      await runClaude(convo, send, uiMsg, pushText, () => aborted);
    }
  } catch (err) {
    const message =
      err instanceof Anthropic.AuthenticationError
        ? 'API-Schlüssel ungültig. Bitte ANTHROPIC_API_KEY in der .env prüfen.'
        : err instanceof Anthropic.RateLimitError
          ? 'Zu viele Anfragen – bitte kurz warten und erneut versuchen.'
          : err instanceof Anthropic.APIError
            ? `API-Fehler ${err.status}: ${err.message}`
            : `Fehler: ${err.message}`;
    console.error(err);
    uiMsg.parts.push({ type: 'error', text: message });
    send({ type: 'error', message });
  }

  convo.ui.push(uiMsg);
  convo.updatedAt = Date.now();
  saveConversations();
  send({ type: 'done' });
  res.end();
});

async function runClaude(convo, send, uiMsg, pushText, isAborted) {
  const system = `${SYSTEM_PROMPT}\n\nHeute ist ${today()}.`;

  for (let step = 0; step < 10; step++) {
    if (isAborted()) return;

    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: 'high' },
      cache_control: { type: 'ephemeral' },
      system,
      tools: buildTools({ liveOdds: liveOddsEnabled() }),
      messages: convo.messages,
    });

    // Partielle JSON-Eingaben der Server-Tools sammeln, um Suchanfragen live anzuzeigen
    const partial = {};
    for await (const event of stream) {
      if (isAborted()) { stream.abort(); return; }
      if (event.type === 'content_block_start') {
        const b = event.content_block;
        if (b.type === 'server_tool_use') partial[event.index] = { name: b.name, json: '' };
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
          const results = b.content
            .filter((r) => r.type === 'web_search_result')
            .slice(0, 6)
            .map((r) => ({ title: r.title, url: r.url }));
          send({ type: 'sources', results });
          const s = [...uiMsg.parts].reverse().find((p) => p.type === 'search');
          if (s) s.results = results;
        }
        if (b.type === 'tool_use' && CARD_TOOLS[b.name]) {
          send({ type: 'card_loading', kind: CARD_TOOLS[b.name] });
        }
        if (b.type === 'tool_use' && b.name === 'get_live_odds') {
          uiMsg.parts.push({ type: 'odds' });
          send({ type: 'odds' });
        }
      } else if (event.type === 'content_block_delta') {
        const d = event.delta;
        if (d.type === 'thinking_delta') {
          uiMsg.thinking += d.thinking;
          send({ type: 'thinking', text: d.thinking });
        } else if (d.type === 'text_delta') {
          pushText(d.text);
          send({ type: 'text', text: d.text });
        } else if (d.type === 'input_json_delta' && partial[event.index]) {
          partial[event.index].json += d.partial_json;
        }
      } else if (event.type === 'content_block_stop' && partial[event.index]) {
        const { name, json } = partial[event.index];
        let input = {};
        try { input = JSON.parse(json || '{}'); } catch { /* unvollständig */ }
        if (name === 'web_search' && input.query) {
          uiMsg.parts.push({ type: 'search', query: input.query });
          send({ type: 'search', query: input.query });
        } else if (name === 'web_fetch' && input.url) {
          uiMsg.parts.push({ type: 'fetch', url: input.url });
          send({ type: 'fetch', url: input.url });
        }
        delete partial[event.index];
      }
    }

    const message = await stream.finalMessage();
    convo.messages.push({ role: 'assistant', content: message.content });

    if (message.stop_reason === 'refusal') {
      throw new Error('Die KI hat diese Anfrage abgelehnt. Bitte formuliere sie anders.');
    }
    if (message.stop_reason === 'pause_turn') continue; // Server-Tools fortsetzen

    const toolUses = message.content.filter((b) => b.type === 'tool_use');
    if (message.stop_reason !== 'tool_use' || toolUses.length === 0) {
      if (message.stop_reason === 'max_tokens') pushText('\n\n_(Antwort wurde abgeschnitten.)_');
      return;
    }

    const results = await Promise.all(toolUses.map(async (tu) => {
      if (tu.name === 'get_live_odds') {
        try {
          const data = await getLiveOdds(tu.input || {});
          const last = [...uiMsg.parts].reverse().find((p) => p.type === 'odds');
          if (last) last.label = `${data.events?.length ?? 0} Spiele · ${tu.input?.competition}`;
          send({ type: 'odds_done', label: last?.label });
          return { type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(data), is_error: !!data.error };
        } catch (err) {
          return { type: 'tool_result', tool_use_id: tu.id, is_error: true, content: `Quoten nicht verfügbar: ${err.message}` };
        }
      }
      const kind = CARD_TOOLS[tu.name];
      if (!kind || !validateCard(tu.name, tu.input)) {
        return {
          type: 'tool_result', tool_use_id: tu.id, is_error: true,
          content: 'Ungültige Eingabe – bitte vollständig erneut aufrufen.',
        };
      }
      uiMsg.parts.push({ type: 'card', kind, data: tu.input });
      send({ type: 'card', kind, data: tu.input });
      return { type: 'tool_result', tool_use_id: tu.id, content: 'Karte wurde dem Nutzer angezeigt.' };
    }));
    convo.messages.push({ role: 'user', content: results });
  }
}

// ---------- Frontend ausliefern (Produktion) ----------
const dist = path.join(here, '..', 'dist');
app.use(express.static(dist));
app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(PORT, () => {
  console.log(`⚽ LA Football läuft auf http://localhost:${PORT}${DEMO ? '  (DEMO-Modus: kein API-Schlüssel)' : ''}`);
});
