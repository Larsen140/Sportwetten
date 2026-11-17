import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.APP_PASSWORD = 'geheim';
const { login, isAuthed, requireAuth } = await import('../server/auth.js');

function fakeRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.set = (k, v) => { res.headers[k] = v; return res; };
  return res;
}

test('Falsches Passwort wird abgelehnt', () => {
  const res = fakeRes();
  login({ ip: '1.1.1.1', body: { password: 'nein' } }, res);
  assert.equal(res.statusCode, 401);
});

test('Richtiges Passwort setzt Cookie, das danach akzeptiert wird', () => {
  const res = fakeRes();
  login({ ip: '2.2.2.2', body: { password: 'geheim' } }, res);
  assert.equal(res.statusCode, 200);
  const cookie = res.headers['Set-Cookie'].split(';')[0];
  assert.equal(isAuthed({ headers: { cookie } }), true);
  assert.equal(isAuthed({ headers: { cookie: 'lafb_session=falsch' } }), false);
});

test('Geschützte Route ohne Cookie liefert 401', () => {
  const res = fakeRes();
  let called = false;
  requireAuth({ headers: {} }, res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});

test('Nach 10 Fehlversuchen wird gesperrt', () => {
  for (let i = 0; i < 10; i++) login({ ip: '3.3.3.3', body: { password: 'x' } }, fakeRes());
  const res = fakeRes();
  login({ ip: '3.3.3.3', body: { password: 'geheim' } }, res);
  assert.equal(res.statusCode, 429);
});
