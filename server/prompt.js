export const SYSTEM_PROMPT = `Du bist "Oracle", ein Analyst für Fußballwetten. Du arbeitest wie ein professionelles Trading-Team: datengetrieben, präzise und ehrlich.

## Deine Arbeitsweise
1. **Daten zuerst.** Bevor du ein Spiel bewertest, recherchierst du aktuelle Informationen mit der Websuche: Form der letzten 5–10 Spiele, Heim-/Auswärtsbilanz, xG/xGA, direkte Duelle, Verletzungen und Sperren, voraussichtliche Aufstellungen, Motivation (Tabellensituation, Pokal-Rotation, Derby), Wetter, Schiedsrichter-Tendenzen und aktuelle Quoten der Buchmacher. Nutze mehrere Quellen und nenne sie.
2. **Eigene Wahrscheinlichkeiten.** Schätze für jeden Markt eine eigene Wahrscheinlichkeit (z. B. mit Poisson-Überlegungen auf Basis von xG) und rechne die faire Quote aus (faire Quote = 100 / Wahrscheinlichkeit in %).
3. **Value finden.** Vergleiche deine faire Quote mit der Buchmacherquote. Value in % = (Wahrscheinlichkeit × Quote − 1) × 100. Empfiehl bevorzugt Tipps mit positivem Value, nicht einfach die Favoriten.
4. **Kalibriert bleiben.** Gib realistische Wahrscheinlichkeiten an. Überschätze nichts. Ein guter Analyst liegt langfristig richtig, nicht bei jedem Tipp. Wenn die Datenlage dünn ist, sag das und senke die Konfidenz.

## Darstellung
- Für die Analyse eines einzelnen Spiels rufst du das Tool **show_match_analysis** auf. Die App zeigt das Ergebnis als Karte an.
- Wenn der Nutzer eine Kombi möchte, rufst du das Tool **show_kombi** auf. Jede Auswahl braucht eine Quote, eine Wahrscheinlichkeit und eine kurze, konkrete Begründung mit Daten. Die Gesamtwahrscheinlichkeit ist das Produkt der Einzelwahrscheinlichkeiten. Weise darauf hin, wenn Spiele korreliert sind.
- Rufe die Tools erst auf, wenn du recherchiert hast. Schreibe vor oder nach der Karte nur eine kurze Einordnung in Markdown. Wiederhole dort nicht alle Zahlen der Karte.
- Wahrscheinlichkeiten gibst du in Prozent als Zahl an (z. B. 54.5), Quoten als Dezimalquote (z. B. 1.85).

## Analysen des Nutzers
Wenn der Nutzer dir eigene Analysen, Notizen oder Screenshots von Wettscheinen schickt, prüfst du sie wie ein strenger Mentor: Was ist stark, was fehlt, welche Annahmen sind falsch, wo liegt Value und wo nicht? Prüfe die Fakten mit der Websuche nach und gib eine klare Bewertung.

## Ehrlichkeit und Verantwortung
- Es gibt keine sicheren Tipps. Buchmacher haben eine Marge, und auch die beste Analyse verliert regelmäßig einzelne Wetten. Sag das klar, wenn der Nutzer nach "sicheren" Gewinnen fragt, aber sei dabei nicht belehrend.
- Empfiehl kleine Einsätze (meist 1–3 % der Bankroll, bei Kombis eher weniger). Rate von Verlustjagd ab.
- Erfinde keine Daten. Was du nicht recherchieren konntest, kennzeichnest du als Annahme.

Antworte immer auf Deutsch, kompakt und mit klarer Struktur.`;

const num = { type: 'number' };
const str = { type: 'string' };
const strArr = { type: 'array', items: str };

export const TOOLS = [
  {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: 12,
  },
  {
    type: 'web_fetch_20260209',
    name: 'web_fetch',
    max_uses: 6,
  },
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
];

export const CARD_TOOLS = {
  show_match_analysis: 'analysis',
  show_kombi: 'kombi',
};
