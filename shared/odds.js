// Live-Quoten über The Odds API (https://the-odds-api.com), optional. Läuft auf dem Server und im Browser.
// Kosten pro Aufruf: Anzahl Märkte × Anzahl Regionen = 2 × 2 = 4 Credits.
import { COMPETITIONS } from './prompt.js';

const BASE = 'https://api.the-odds-api.com/v4';
const cache = new Map(); // Ergebnisse 10 Minuten zwischenspeichern, um Credits zu sparen
const TTL = 10 * 60 * 1000;

function best(bookmakers, marketKey, outcomeName, point) {
  let top = null;
  for (const bm of bookmakers) {
    const market = bm.markets?.find((m) => m.key === marketKey);
    const o = market?.outcomes?.find((x) => x.name === outcomeName && (point === undefined || x.point === point));
    if (o && (!top || o.price > top.price)) top = { price: o.price, bookmaker: bm.title };
  }
  return top;
}

function summarize(event) {
  const bms = event.bookmakers || [];
  const h2h = ['home_team', 'Draw', 'away_team'].map((k) => {
    const name = k === 'Draw' ? 'Draw' : event[k];
    return best(bms, 'h2h', name);
  });
  return {
    match: `${event.home_team} – ${event.away_team}`,
    kickoff: new Date(event.commence_time).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
    bookmakers_count: bms.length,
    best_odds_1x2: { home: h2h[0], draw: h2h[1], away: h2h[2] },
    best_odds_over_2_5: best(bms, 'totals', 'Over', 2.5),
    best_odds_under_2_5: best(bms, 'totals', 'Under', 2.5),
    all_bookmakers_1x2: bms.slice(0, 12).map((bm) => ({
      bookmaker: bm.title,
      odds: bm.markets?.find((m) => m.key === 'h2h')?.outcomes?.map((o) => `${o.name}: ${o.price}`).join(', '),
    })),
  };
}

export async function getLiveOdds({ competition, team_filter }, apiKey) {
  if (!apiKey) return { error: 'Kein Quoten-API-Schlüssel hinterlegt. Bitte die Websuche nutzen.' };
  const sport = COMPETITIONS[competition];
  if (!sport) return { error: `Unbekannter Wettbewerb: ${competition}` };

  const cached = cache.get(sport);
  let events;
  if (cached && Date.now() - cached.at < TTL) {
    events = cached.events;
  } else {
    const url = new URL(`${BASE}/sports/${sport}/odds/`);
    url.searchParams.set('regions', 'eu,uk');
    url.searchParams.set('markets', 'h2h,totals');
    url.searchParams.set('oddsFormat', 'decimal');
    url.searchParams.set('apiKey', apiKey); // Query-Parameter statt Header: vermeidet CORS-Preflight im Browser
    const res = await fetch(url);
    if (!res.ok) {
      return { error: `Quoten-API antwortet mit ${res.status}. Bitte stattdessen die Websuche nutzen.` };
    }
    events = await res.json();
    cache.set(sport, { at: Date.now(), events });
  }

  const filter = String(team_filter || '').toLowerCase().trim();
  const list = events
    .filter((e) => !filter || `${e.home_team} ${e.away_team}`.toLowerCase().includes(filter))
    .slice(0, 12)
    .map(summarize);
  return { competition, source: 'The Odds API', events: list };
}
