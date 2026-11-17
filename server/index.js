// Server-Variante (Render, Docker, eigener Computer). Für GitHub Pages läuft dieselbe Logik im Browser.
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { MODEL, BET_STATUSES, createConversation, makeBet, runChatTurn } from '../shared/engine.js';
import { conversations, bets, saveConversations, saveBets } from './store.js';
import { authEnabled, isAuthed, login, logout, requireAuth } from './auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const DEMO = !process.env.ANTHROPIC_API_KEY;
const ODDS_KEY = process.env.ODDS_API_KEY || '';
const client = DEMO ? null : new Anthropic();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // hinter Render/Proxy: korrekte IP und HTTPS-Erkennung
app.use(express.json({ limit: '25mb' }));

app.get('/api/status', (req, res) =>
  res.json({ demo: DEMO, model: MODEL, liveOdds: !!ODDS_KEY, authRequired: authEnabled(), authed: isAuthed(req) }));
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
  try {
    const bet = makeBet(req.body);
    bets.unshift(bet);
    saveBets();
    res.json(bet);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/bets/:id', (req, res) => {
  const bet = bets.find((b) => b.id === req.params.id);
  if (!bet) return res.status(404).json({ error: 'Nicht gefunden' });
  if (BET_STATUSES.includes(req.body?.status)) {
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
app.post('/api/chat', async (req, res) => {
  const { conversationId, text = '', images = [], mode = 'chat' } = req.body ?? {};
  if (!String(text).trim() && images.length === 0) {
    return res.status(400).json({ error: 'Leere Nachricht' });
  }

  let convo = conversationId && conversations[conversationId];
  if (!convo) {
    convo = createConversation(text);
    conversations[convo.id] = convo;
  }

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  send({ type: 'conversation', id: convo.id, title: convo.title });

  let aborted = false;
  res.on('close', () => { aborted = !res.writableEnded; });

  await runChatTurn({
    client, convo, text: String(text), images, mode, send,
    isAborted: () => aborted,
    oddsKey: ODDS_KEY,
    keyHint: 'Bitte ANTHROPIC_API_KEY in der Konfiguration prüfen.',
  });

  saveConversations();
  send({ type: 'done' });
  res.end();
});

// ---------- Frontend ausliefern (Produktion) ----------
const dist = path.join(here, '..', 'dist');
app.use(express.static(dist));
app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(PORT, () => {
  console.log(`⚽ LA Football läuft auf http://localhost:${PORT}${DEMO ? '  (DEMO-Modus: kein API-Schlüssel)' : ''}`);
});
