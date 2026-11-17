import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ODDS_API_KEY = 'test';
const { getLiveOdds } = await import('../server/odds.js');

const EVENTS = [{
  id: '1', commence_time: '2026-11-21T14:30:00Z', home_team: 'Bayern Munich', away_team: 'VfB Stuttgart',
  bookmakers: [
    { title: 'Pinnacle', markets: [
      { key: 'h2h', outcomes: [{ name: 'Bayern Munich', price: 1.40 }, { name: 'Draw', price: 5.2 }, { name: 'VfB Stuttgart', price: 7.0 }] },
      { key: 'totals', outcomes: [{ name: 'Over', price: 1.45, point: 2.5 }, { name: 'Under', price: 2.8, point: 2.5 }] },
    ] },
    { title: 'Unibet', markets: [
      { key: 'h2h', outcomes: [{ name: 'Bayern Munich', price: 1.43 }, { name: 'Draw', price: 5.0 }, { name: 'VfB Stuttgart', price: 7.5 }] },
    ] },
  ],
}, { id: '2', commence_time: '2026-11-21T14:30:00Z', home_team: 'Mainz', away_team: 'Freiburg', bookmakers: [] }];

test('Live-Quoten: beste Quote je Ausgang und Teamfilter', async () => {
  let calledUrl;
  globalThis.fetch = async (url, opts) => {
    calledUrl = String(url);
    assert.equal(opts.headers['x-api-key'], 'test');
    return { ok: true, json: async () => EVENTS };
  };
  const res = await getLiveOdds({ competition: 'bundesliga', team_filter: 'bayern' });
  assert.match(calledUrl, /soccer_germany_bundesliga\/odds/);
  assert.equal(res.events.length, 1);
  const e = res.events[0];
  assert.deepEqual(e.best_odds_1x2.home, { price: 1.43, bookmaker: 'Unibet' });
  assert.deepEqual(e.best_odds_1x2.draw, { price: 5.2, bookmaker: 'Pinnacle' });
  assert.deepEqual(e.best_odds_over_2_5, { price: 1.45, bookmaker: 'Pinnacle' });
});

test('Unbekannter Wettbewerb liefert Fehler statt Absturz', async () => {
  const res = await getLiveOdds({ competition: 'kreisliga', team_filter: '' });
  assert.ok(res.error);
});
