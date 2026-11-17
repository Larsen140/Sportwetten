# ⚽ Oracle – KI-Analyse für Fußballwetten

Eine Webapp mit einem KI-Analysten (Claude), der live im Internet recherchiert, Spiele analysiert, Wahrscheinlichkeiten berechnet, Value-Wetten findet und Kombis baut.

## Funktionen

- **KI-Analyst (Chat):** Frag nach Spielanalysen, Kombis oder Quoten. Oracle sucht im Web nach Form, xG, Verletzungen, Aufstellungen und Quoten.
- **Analyse-Karten:** Wahrscheinlichkeiten für 1/X/2, erwartete Tore, Märkte mit fairer Quote und Value, Gründe, Risiken und Konfidenz.
- **Kombi-Wettscheine:** Jede Auswahl mit Quote, Wahrscheinlichkeit und Begründung, dazu Gesamtquote, Trefferwahrscheinlichkeit, Erwartungswert und Einsatz-Empfehlung.
- **Eigene Analysen prüfen:** Schalte auf „Meine Analyse prüfen“ und füge Text oder Screenshots (z. B. vom Wettschein) ein. Oracle prüft sie kritisch.
- **Wettschein & Dashboard:** Wetten speichern, als gewonnen oder verloren markieren, Gewinnkurve, ROI und Trefferquote verfolgen.
- **Design:** Animierter Partikel-Hintergrund, Glow-Effekte, Konfetti bei Gewinnen und synthetisierte Soundeffekte (abschaltbar).

## Starten

Voraussetzung: [Node.js](https://nodejs.org) ab Version 20.

```bash
npm install
cp .env.example .env      # dann deinen API-Schlüssel eintragen
npm run dev               # Entwicklung: http://localhost:5173
```

Für den Dauerbetrieb:

```bash
npm run build
npm start                 # http://localhost:8787
```

Ohne `ANTHROPIC_API_KEY` läuft die App im **Demo-Modus** mit Beispieldaten. Einen Schlüssel bekommst du unter https://console.anthropic.com.

## Technik

- Frontend: React, Vite, Framer Motion
- Backend: Node.js mit Express, Claude API (`@anthropic-ai/sdk`) mit Websuche und Web-Abruf
- Daten (Chats und Wetten) liegen lokal in `data/` als JSON-Dateien.

## Hinweis

Oracle liefert Wahrscheinlichkeiten und keine Garantien. Buchmacher haben eine Marge, und auch gute Analysen verlieren regelmäßig einzelne Wetten. Wette nur mit Geld, dessen Verlust du verkraften kannst. 18+
