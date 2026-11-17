// Demo-Modus: Läuft ohne API-Schlüssel, damit die Oberfläche getestet werden kann.
// Alle Daten hier sind Beispieldaten und keine echte Analyse.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function stream(text, send, pushText, speed = 12) {
  const tokens = text.match(/\S+\s*|\s+/g) ?? [];
  for (const t of tokens) {
    pushText(t);
    send({ type: 'text', text: t });
    await sleep(speed);
  }
}

const KOMBI = {
  title: 'DEMO · Bundesliga Value-Dreier',
  risk_level: 'mittel',
  legs: [
    {
      match: 'FC Bayern – VfB Stuttgart', kickoff: 'Sa 15:30', market: 'Über/Unter 2,5',
      pick: 'Über 2,5 Tore', odds: 1.45, probability: 74,
      reason: 'Bayern erzielt im Schnitt 2,9 xG zu Hause, Stuttgart lässt auswärts 1,6 xGA zu. 8 der letzten 10 Duelle mit 3+ Toren.',
    },
    {
      match: 'Bayer Leverkusen – SC Freiburg', kickoff: 'Sa 15:30', market: 'Beide treffen',
      pick: 'Ja', odds: 1.72, probability: 63,
      reason: 'Freiburg traf in 9 von 11 Auswärtsspielen, Leverkusen ohne zwei Stamm-Innenverteidiger.',
    },
    {
      match: 'RB Leipzig – 1. FC Union Berlin', kickoff: 'So 17:30', market: '1X2',
      pick: 'Leipzig', odds: 1.62, probability: 66,
      reason: 'Union mit 4 Auswärtsniederlagen in Folge, Leipzig 2,1 xG im Heimschnitt.',
    },
  ],
  total_odds: 4.04,
  combined_probability: 30.8,
  expected_value_percent: 24.4,
  stake_suggestion_percent: 1,
  summary: 'Drei Auswahlen mit jeweils positivem Value. Die Spiele sind kaum korreliert. DEMO-Daten – nicht zum Wetten verwenden.',
};

const ANALYSIS = {
  match: 'Borussia Dortmund – Eintracht Frankfurt',
  competition: 'Bundesliga (DEMO)',
  kickoff: 'Sa 18:30',
  probabilities: { home: 52, draw: 24, away: 24 },
  expected_goals: { home: 1.9, away: 1.3 },
  markets: [
    { market: 'Über/Unter 2,5', pick: 'Über 2,5', probability: 64, fair_odds: 1.56, bookmaker_odds: 1.7, value_percent: 8.8 },
    { market: 'Beide treffen', pick: 'Ja', probability: 62, fair_odds: 1.61, bookmaker_odds: 1.65, value_percent: 2.3 },
    { market: '1X2', pick: 'Dortmund', probability: 52, fair_odds: 1.92, bookmaker_odds: 1.85, value_percent: -3.8 },
    { market: 'Asiat. Handicap', pick: 'Frankfurt +1', probability: 76, fair_odds: 1.32, bookmaker_odds: 1.4, value_percent: 6.4 },
  ],
  key_factors: [
    'Dortmund mit 2,1 xG pro Heimspiel, aber 1,4 xGA – offene Spiele.',
    'Frankfurt erzielte in 7 der letzten 8 Spiele mindestens ein Tor.',
    'Im direkten Duell fielen zuletzt durchschnittlich 3,4 Tore.',
  ],
  risks: ['Rotation bei Dortmund wegen Champions League unter der Woche möglich.', 'Regen vorhergesagt.'],
  confidence: 7,
  verdict: 'Bester Value: Über 2,5 Tore zur Quote 1,70.',
};

export async function runDemo(text, send, uiMsg, pushText) {
  const wantsKombi = /kombi|schein|tipp/i.test(text);
  const thinking =
    'Demo-Modus aktiv: Ich simuliere die Recherche. Prüfe Form, xG-Werte, Verletzungen und Quoten … ' +
    'Vergleiche eigene Wahrscheinlichkeiten mit den Buchmacherquoten, um Value zu finden …';
  for (const w of thinking.split(' ')) {
    uiMsg.thinking += w + ' ';
    send({ type: 'thinking', text: w + ' ' });
    await sleep(25);
  }

  const queries = wantsKombi
    ? ['Bundesliga Spieltag Quoten', 'Bayern Stuttgart Verletzungen', 'Leverkusen Freiburg xG']
    : ['Dortmund Frankfurt Vorschau', 'Dortmund Verletzte aktuell'];
  for (const q of queries) {
    uiMsg.parts.push({ type: 'search', query: q });
    send({ type: 'search', query: q });
    await sleep(700);
  }

  await stream(
    '**Demo-Modus** – es ist noch kein API-Schlüssel hinterlegt. So sieht eine Antwort aus, sobald du `ANTHROPIC_API_KEY` in der `.env` einträgst. Die Zahlen unten sind **Beispieldaten**.\n\n',
    send, pushText,
  );

  const kind = wantsKombi ? 'kombi' : 'analysis';
  send({ type: 'card_loading', kind });
  await sleep(900);
  const data = wantsKombi ? KOMBI : ANALYSIS;
  uiMsg.parts.push({ type: 'card', kind, data });
  send({ type: 'card', kind, data });

  await stream(
    wantsKombi
      ? '\nDie Kombi setzt auf Tor-Märkte, weil dort die Buchmacher am häufigsten danebenliegen. Halte den Einsatz klein – auch mit Value verliert eine Dreierkombi in etwa 7 von 10 Fällen.'
      : '\nDer Sieg-Tipp auf Dortmund hat **keinen** Value – die Quote ist zu niedrig. Interessanter sind die Tor-Märkte.',
    send, pushText,
  );
}
