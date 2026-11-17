// Browser-Variante für GitHub Pages: KI-Aufrufe direkt an Anthropic, Daten in IndexedDB auf dem Gerät.
import Anthropic from '@anthropic-ai/sdk';
import { MODEL, BET_STATUSES, createConversation, makeBet, runChatTurn } from '../../../shared/engine.js';
import { kv, requestPersistence } from './db.js';

const KEY_ANTHROPIC = 'lafb-anthropic-key';
const KEY_ODDS = 'lafb-odds-key';

function ls(key) {
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}

export function getKeys() {
  return { anthropic: ls(KEY_ANTHROPIC), odds: ls(KEY_ODDS) };
}

export function setKeys({ anthropic, odds }) {
  try {
    if (anthropic !== undefined) anthropic ? localStorage.setItem(KEY_ANTHROPIC, anthropic.trim()) : localStorage.removeItem(KEY_ANTHROPIC);
    if (odds !== undefined) odds ? localStorage.setItem(KEY_ODDS, odds.trim()) : localStorage.removeItem(KEY_ODDS);
  } catch { /* Speicher nicht verfügbar */ }
}

// Direkte Browser-Anfragen verlangen den Schlüssel im Header x-api-key
// (das SDK sendet ihn sonst nur als Bearer-Token, was Anthropic im Browser ablehnt).
const makeClient = (apiKey) => new Anthropic({
  apiKey,
  dangerouslyAllowBrowser: true,
  defaultHeaders: { 'x-api-key': apiKey },
});

// Prüft einen Schlüssel mit einem kostenlosen Aufruf (Modellliste)
export async function testAnthropicKey(apiKey) {
  try {
    await makeClient(apiKey).models.list({ limit: 1 });
    return { ok: true };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: 'Schlüssel ungültig.' };
    return { ok: false, error: err.message || 'Verbindung fehlgeschlagen.' };
  }
}

// ---------- Speicher ----------
const index = async () => (await kv.get('convo-index')) || [];
const saveIndex = (list) => kv.set('convo-index', list);
const loadBets = async () => (await kv.get('bets')) || [];
const saveBets = (list) => kv.set('bets', list);

async function saveConvo(convo) {
  await kv.set(`convo:${convo.id}`, convo);
  const list = (await index()).filter((c) => c.id !== convo.id);
  list.unshift({ id: convo.id, title: convo.title, updatedAt: convo.updatedAt });
  await saveIndex(list);
}

export const localApi = {
  status: async () => {
    requestPersistence();
    const k = getKeys();
    return { demo: !k.anthropic, model: MODEL, liveOdds: !!k.odds, authRequired: false, authed: true, static: true };
  },
  login: async () => ({ ok: true }),
  logout: async () => ({ ok: true }),
  conversations: async () => (await index()).sort((a, b) => b.updatedAt - a.updatedAt),
  conversation: async (id) => {
    const c = await kv.get(`convo:${id}`);
    if (!c) throw new Error('Nicht gefunden');
    return { id: c.id, title: c.title, ui: c.ui };
  },
  deleteConversation: async (id) => {
    await kv.del(`convo:${id}`);
    await saveIndex((await index()).filter((c) => c.id !== id));
    return { ok: true };
  },
  bets: loadBets,
  addBet: async (data) => {
    const bet = makeBet(data);
    await saveBets([bet, ...(await loadBets())]);
    return bet;
  },
  setBetStatus: async (id, status) => {
    const list = await loadBets();
    const bet = list.find((b) => b.id === id);
    if (!bet) throw new Error('Nicht gefunden');
    if (BET_STATUSES.includes(status)) {
      bet.status = status;
      bet.settledAt = status === 'open' ? null : Date.now();
    }
    await saveBets(list);
    return bet;
  },
  deleteBet: async (id) => {
    await saveBets((await loadBets()).filter((b) => b.id !== id));
    return { ok: true };
  },
};

export async function localStreamChat({ conversationId, text = '', images = [], mode = 'chat' }, onEvent, signal) {
  let convo = conversationId && (await kv.get(`convo:${conversationId}`));
  if (!convo) convo = createConversation(text);
  onEvent({ type: 'conversation', id: convo.id, title: convo.title });

  const k = getKeys();
  await runChatTurn({
    client: k.anthropic ? makeClient(k.anthropic) : null,
    convo, text, images, mode,
    send: onEvent,
    isAborted: () => !!signal?.aborted,
    oddsKey: k.odds,
    keyHint: 'Bitte in den Einstellungen prüfen.',
  });

  await saveConvo(convo);
  onEvent({ type: 'done' });
}

// ---------- Backup ----------
export async function exportBackup() {
  const list = await index();
  const conversations = [];
  for (const c of list) {
    const full = await kv.get(`convo:${c.id}`);
    if (full) conversations.push(full);
  }
  return { app: 'LA Football', version: 1, exportedAt: new Date().toISOString(), bets: await loadBets(), conversations };
}

export async function importBackup(data) {
  if (data?.app !== 'LA Football' || !Array.isArray(data.bets)) throw new Error('Keine gültige LA-Football-Sicherung.');
  const existing = await loadBets();
  const ids = new Set(existing.map((b) => b.id));
  await saveBets([...data.bets.filter((b) => !ids.has(b.id)), ...existing].sort((a, b) => b.createdAt - a.createdAt));
  for (const c of data.conversations || []) await saveConvo(c);
  return { bets: data.bets.length, conversations: (data.conversations || []).length };
}

export async function deleteAllData() {
  await kv.clear();
}
