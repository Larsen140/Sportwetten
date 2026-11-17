export const SYSTEM_PROMPT = `Du bist der KI-Experte von "LA Football", ein Sportwetten-Experte mit Spezialgebiet Fußball. Du arbeitest wie ein professioneller Wett-Trader: datengetrieben, präzise und ehrlich. Du kennst alle gängigen Märkte (1X2, Doppelte Chance, Draw No Bet, Asiatisches Handicap, Über/Unter, Beide treffen, Ecken, Karten, Torschützen, Halbzeit/Endstand) und weißt, wo Buchmacher typischerweise falsch liegen.

## Deine Arbeitsweise
1. **Daten zuerst.** Bevor du ein Spiel bewertest, recherchierst du aktuelle Informationen mit der Websuche: Form der letzten 5–10 Spiele, Heim-/Auswärtsbilanz, xG/xGA, direkte Duelle, Verletzungen und Sperren, voraussichtliche Aufstellungen, Motivation (Tabellensituation, Rotation wegen Europapokal, Derby), Wetter, Schiedsrichter-Tendenzen und aktuelle Quoten. Nutze mehrere Quellen und nenne sie. Wenn das Tool get_live_odds verfügbar ist, hol dir damit die echten Marktquoten.
2. **Eigene Wahrscheinlichkeiten.** Schätze für jeden Markt eine eigene Wahrscheinlichkeit (z. B. mit einem Poisson-Modell auf Basis von xG und Teamstärke) und rechne die faire Quote aus (faire Quote = 100 / Wahrscheinlichkeit in %). Entferne die Buchmacher-Marge, bevor du Quoten in Wahrscheinlichkeiten umrechnest.
3. **Value finden.** Vergleiche deine faire Quote mit der besten verfügbaren Buchmacherquote. Value in % = (Wahrscheinlichkeit × Quote − 1) × 100. Empfiehl bevorzugt Tipps mit positivem Value, nicht einfach die Favoriten. Achte auf Quotenbewegungen: Fällt eine Quote stark, weiß der Markt oft etwas.
4. **Kalibriert bleiben.** Gib realistische Wahrscheinlichkeiten an. Ein Experte liegt langfristig richtig, nicht bei jedem Tipp. Wenn die Datenlage dünn ist, sag das und senke die Konfidenz.
5. **Bankroll-Management.** Empfiehl Einsätze nach einem vorsichtigen Bruchteil des Kelly-Kriteriums (Viertel-Kelly), meist 0,5–3 % der Bankroll, bei Kombis weniger.

## Darstellung
- Für die Analyse eines einzelnen Spiels rufst du das Tool **show_match_analysis** auf. Die App zeigt das Ergebnis als Karte an.
- Wenn der Nutzer eine Kombi möchte, rufst du das Tool **show_kombi** auf. Jede Auswahl braucht eine Quote, eine Wahrscheinlichkeit und eine kurze, konkrete Begründung mit Daten. Die Gesamtwahrscheinlichkeit ist das Produkt der Einzelwahrscheinlichkeiten. Weise darauf hin, wenn Spiele korreliert sind.
- Wenn der Nutzer einen Screenshot eines Wettscheins schickt (z. B. von bet365), lies alle Auswahlen, Quoten und den Einsatz exakt ab und rufe **show_bet_slip** auf. Bewerte den Schein dabei ehrlich.
- Rufe die Tools erst auf, wenn du recherchiert hast. Schreibe vor oder nach der Karte nur eine kurze Einordnung in Markdown. Wiederhole dort nicht alle Zahlen der Karte.
- Wahrscheinlichkeiten gibst du in Prozent als Zahl an (z. B. 54.5), Quoten als Dezimalquote (z. B. 1.85).

## Analysen des Nutzers
Wenn der Nutzer dir eigene Analysen, Notizen oder Screenshots schickt, prüfst du sie wie ein strenger Mentor: Was ist stark, was fehlt, welche Annahmen sind falsch, wo liegt Value und wo nicht? Prüfe die Fakten mit der Websuche nach und gib eine klare Bewertung.

## Ehrlichkeit und Verantwortung
- Es gibt keine sicheren Tipps. Buchmacher haben eine Marge, und auch die beste Analyse verliert regelmäßig einzelne Wetten. Sag das klar, wenn der Nutzer nach "sicheren" Gewinnen fragt, aber sei dabei nicht belehrend.
- Rate von Verlustjagd und überhöhten Einsätzen ab.
- Erfinde keine Daten. Was du nicht recherchieren konntest, kennzeichnest du als Annahme.

Antworte immer auf Deutsch, kompakt und mit klarer Struktur.`;

const num = { type: 'number' };
const str = { type: 'string' };
const strArr = { type: 'array', items: str };

export const COMPETITIONS = {
  bundesliga: 'soccer_germany_bundesliga',
  bundesliga2: 'soccer_germany_bundesliga2',
  premier_league: 'soccer_epl',
  la_liga: 'soccer_spain_la_liga',
  serie_a: 'soccer_italy_serie_a',
  ligue_1: 'soccer_france_ligue_one',
  champions_league: 'soccer_uefa_champs_league',
  europa_league: 'soccer_uefa_europa_league',
};

const LIVE_ODDS_TOOL = {
  name: 'get_live_odds',
  description:
    'Liefert aktuelle Quoten (1X2 und Über/Unter) mehrerer Buchmacher für die kommenden Spiele eines Wettbewerbs. Nutze das, um echte Marktquoten und die beste verfügbare Quote zu finden.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['competition', 'team_filter'],
    properties: {
      competition: { type: 'string', enum: Object.keys(COMPETITIONS) },
      team_filter: {
        type: 'string',
        description: 'Optionaler Teamname, um nur passende Spiele zu bekommen. Leerer String für alle Spiele.',
      },
    },
  },
};

const CARD_TOOL_DEFS = [
  {
    name: 'show_match_analysis',
    description:
      'Zeigt dem Nutzer eine Analysekarte für ein einzelnes Fußballspiel. Aufrufen, nachdem das Spiel recherchiert wurde.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'match', 'competition', 'kickoff', 'probabilities', 'expected_goals',
        'markets', 'key_factors', 'risks', 'confidence', 'verdict',
      ],
      properties: {
        match: { type: 'string', description: 'z. B. "FC Bayern – Borussia Dortmund"' },
        competition: str,
        kickoff: { type: 'string', description: 'Datum und Uhrzeit, z. B. "Sa, 22.11. 18:30"' },
        probabilities: {
          type: 'object',
          additionalProperties: false,
          required: ['home', 'draw', 'away'],
          properties: { home: num, draw: num, away: num },
          description: 'Wahrscheinlichkeiten 1/X/2 in Prozent, Summe 100',
        },
        expected_goals: {
          type: 'object',
          additionalProperties: false,
          required: ['home', 'away'],
          properties: { home: num, away: num },
        },
        markets: {
          type: 'array',
          description: 'Die interessantesten Märkte (3–6), sortiert nach Value',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['market', 'pick', 'probability', 'fair_odds', 'bookmaker_odds', 'value_percent'],
            properties: {
              market: { type: 'string', description: 'z. B. "Über/Unter 2,5"' },
              pick: { type: 'string', description: 'z. B. "Über 2,5"' },
              probability: num,
              fair_odds: num,
              bookmaker_odds: { type: 'number', description: 'Beste gefundene Quote, 0 wenn unbekannt' },
              value_percent: num,
            },
          },
        },
        key_factors: { ...strArr, description: 'Die wichtigsten Gründe mit konkreten Daten' },
        risks: { ...strArr, description: 'Was gegen die Einschätzung spricht' },
        confidence: { type: 'integer', description: 'Konfidenz 1–10' },
        verdict: { type: 'string', description: 'Fazit in einem Satz mit dem Top-Tipp' },
      },
    },
  },
  {
    name: 'show_kombi',
    description:
      'Zeigt dem Nutzer eine Kombiwette als Wettschein-Karte. Aufrufen, nachdem alle Spiele recherchiert wurden.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'title', 'risk_level', 'legs', 'total_odds', 'combined_probability',
        'expected_value_percent', 'stake_suggestion_percent', 'summary',
      ],
      properties: {
        title: { type: 'string', description: 'Kurzer Name, z. B. "Bundesliga Value-Dreier"' },
        risk_level: { type: 'string', enum: ['niedrig', 'mittel', 'hoch'] },
        legs: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['match', 'kickoff', 'market', 'pick', 'odds', 'probability', 'reason'],
            properties: {
              match: str,
              kickoff: str,
              market: str,
              pick: str,
              odds: num,
              probability: { type: 'number', description: 'Eigene Wahrscheinlichkeit in Prozent' },
              reason: { type: 'string', description: 'Begründung in 1–2 Sätzen mit Daten' },
            },
          },
        },
        total_odds: num,
        combined_probability: { type: 'number', description: 'Gesamtwahrscheinlichkeit in Prozent' },
        expected_value_percent: num,
        stake_suggestion_percent: { type: 'number', description: 'Empfohlener Einsatz in % der Bankroll' },
        summary: str,
      },
    },
  },
  {
    name: 'show_bet_slip',
    description:
      'Zeigt einen vom Nutzer per Screenshot geschickten Wettschein (z. B. von bet365) als Karte an, damit er ihn in seinen Tracker übernehmen kann. Alle Werte exakt vom Schein ablesen.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['bookmaker', 'legs', 'total_odds', 'stake', 'assessment', 'rating'],
      properties: {
        bookmaker: { type: 'string', description: 'z. B. "bet365"; "unbekannt", wenn nicht erkennbar' },
        legs: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['match', 'market', 'pick', 'odds', 'probability'],
            properties: {
              match: str,
              market: str,
              pick: str,
              odds: num,
              probability: { type: 'number', description: 'Deine geschätzte Wahrscheinlichkeit in Prozent' },
            },
          },
        },
        total_odds: num,
        stake: { type: 'number', description: 'Einsatz in Euro laut Schein, 0 wenn nicht erkennbar' },
        assessment: { type: 'string', description: 'Ehrliche Bewertung des Scheins in 2–3 Sätzen' },
        rating: { type: 'string', enum: ['stark', 'okay', 'schwach'] },
      },
    },
  },
];

const WEB_TOOLS = [
  { type: 'web_search_20260209', name: 'web_search', max_uses: 12 },
  { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 6 },
];

export function buildTools({ liveOdds }) {
  return [...WEB_TOOLS, ...(liveOdds ? [LIVE_ODDS_TOOL] : []), ...CARD_TOOL_DEFS];
}

export const CARD_TOOLS = {
  show_match_analysis: 'analysis',
  show_kombi: 'kombi',
  show_bet_slip: 'slip',
};
