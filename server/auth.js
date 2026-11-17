// Passwortschutz mit Login-Seite und Cookie (funktioniert auch als iPhone-Home-Bildschirm-App)
import crypto from 'node:crypto';

const COOKIE = 'lafb_session';
const attempts = new Map(); // IP -> { count, since }
const WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export const authEnabled = () => !!process.env.APP_PASSWORD;

function token() {
  return crypto.createHmac('sha256', process.env.APP_PASSWORD).update('la-football-session-v1').digest('hex');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function readCookie(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return decodeURIComponent(v.join('='));
  }
  return '';
}

export function isAuthed(req) {
  return !authEnabled() || safeEqual(readCookie(req), token());
}

// Schützt alle /api-Routen außer Status und Login
export function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'Bitte anmelden.', auth: true });
}

export function login(req, res) {
  if (!authEnabled()) return res.json({ ok: true });
  const ip = req.ip;
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && now - a.since < WINDOW && a.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Zu viele Versuche. Bitte in 15 Minuten erneut probieren.' });
  }
  if (!safeEqual(req.body?.password ?? '', process.env.APP_PASSWORD)) {
    const entry = a && now - a.since < WINDOW ? a : { count: 0, since: now };
    entry.count += 1;
    attempts.set(ip, entry);
    return res.status(401).json({ error: 'Falsches Passwort.' });
  }
  attempts.delete(ip);
  const secure = req.secure ? '; Secure' : '';
  res.set('Set-Cookie', `${COOKIE}=${token()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`);
  res.json({ ok: true });
}

export function logout(req, res) {
  res.set('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
}
