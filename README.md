# ⚽ LA Football – KI-Sportwetten-Experte

LA Football ist eine Webapp mit einem KI-Sportwetten-Experten für Fußball (Claude von Anthropic). Er recherchiert live im Internet, analysiert Spiele, berechnet Wahrscheinlichkeiten, findet Value-Wetten und baut Kombis.

## Funktionen

| Bereich | Was es kann |
|---|---|
| **KI-Experte (Chat)** | Spielanalysen, Kombis, Quotenvergleich und Bankroll-Strategie. Er sucht im Web nach Form, xG, Verletzungen, Aufstellungen und Quoten und zeigt seine Suchanfragen und Quellen live an. |
| **Analyse-Karten** | Wahrscheinlichkeiten für 1/X/2, erwartete Tore, Märkte mit fairer Quote, Buchmacherquote und Value, Gründe, Risiken und Konfidenz |
| **Kombi-Wettscheine** | Pro Auswahl Quote, Wahrscheinlichkeit und Begründung. Dazu Gesamtquote, Trefferwahrscheinlichkeit, Erwartungswert und Einsatz-Empfehlung (Viertel-Kelly) |
| **bet365-Import** | Screenshot des Wettscheins hochladen: Die KI liest Auswahlen, Quoten und Einsatz aus, bewertet den Schein und übernimmt ihn per Klick in den Tracker |
| **Eigene Analysen prüfen** | Modus „Meine Analyse prüfen“: Die KI prüft deine Analyse kritisch und recherchiert die Fakten nach |
| **Live-Quoten (optional)** | Echte Quoten vieler Buchmacher über The Odds API, mit automatischer Suche nach der besten Quote |
| **Wettschein & Dashboard** | Wetten mit Buchmacher speichern, als gewonnen oder verloren markieren, Gewinnkurve, ROI, Trefferquote und größter Gewinn |
| **Design** | Animierter Partikel-Hintergrund, Glow-Effekte, animierte Zahlen und Diagramme, Konfetti bei Gewinnen, Soundeffekte (abschaltbar), für Handy optimiert |

## Schnellstart

Voraussetzung: [Node.js](https://nodejs.org) ab Version 20.

```bash
npm install
cp .env.example .env      # API-Schlüssel eintragen (siehe unten)
npm run dev               # Entwicklung: http://localhost:5173
```

Für den Dauerbetrieb:

```bash
npm run build
npm start                 # http://localhost:8787
```

Mit Docker:

```bash
docker build -t la-football .
docker run -p 8787:8787 --env-file .env -v la-football-data:/app/data la-football
```

## Konfiguration (`.env`)

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `ANTHROPIC_API_KEY` | ja* | Schlüssel von https://console.anthropic.com. Ohne ihn läuft die App im **Demo-Modus** mit Beispieldaten. |
| `ODDS_API_KEY` | nein | Schlüssel von https://the-odds-api.com für Live-Quoten. Die kostenlose Stufe hat 500 Credits pro Monat, ein Abruf kostet 4 Credits und wird 10 Minuten zwischengespeichert. |
| `APP_PASSWORD` | nein | Passwortschutz, wenn die App im Internet erreichbar ist. Der Benutzername ist beliebig. |
| `PORT` | nein | Port des Servers, Standard 8787 |

## bet365

bet365 bietet keine öffentliche Schnittstelle, über die externe Apps Wetten platzieren oder Kontodaten lesen können. Automatisierter Zugriff auf das Konto ist laut den Nutzungsbedingungen von bet365 nicht erlaubt. LA Football verbindet sich deshalb so, wie es erlaubt ist:

- **Wettschein-Import per Screenshot:** Die KI liest den Schein aus und übernimmt ihn in den Tracker.
- **„Bei bet365 öffnen“:** Jede Kombi hat einen Link zu bet365. Dort platzierst du die Wette selbst.
- **Buchmacher-Feld:** Jede Wette speichert ihren Buchmacher, bet365 ist voreingestellt.

The Odds API liefert für Fußball keine bet365-Quoten, dafür die Quoten vieler anderer Buchmacher.

## Entwicklung

```bash
npm test                  # automatische Tests (Statistiken, Live-Quoten)
```

GitHub Actions führt bei jedem Push die Tests und den Build aus (`.github/workflows/ci.yml`).

**Aufbau**

```
server/
  index.js     Express-Server, KI-Chat (Streaming), Wetten-API, Passwortschutz
  prompt.js    Experten-Systemprompt und Tool-Definitionen
  odds.js      Live-Quoten (The Odds API)
  demo.js      Demo-Modus ohne API-Schlüssel
  store.js     Speicherung als JSON in data/
client/src/
  App.jsx                 Layout, Navigation, Gewinn-Effekte
  components/Chat.jsx     KI-Chat mit Live-Recherche-Anzeige
  components/Cards.jsx    Analyse-, Kombi- und Wettschein-Karten
  components/Dashboard.jsx, Bets.jsx, ProfitChart.jsx, StakeModal.jsx
  sound.js                Soundeffekte (Web Audio, keine Dateien)
test/                     Automatische Tests
```

**Technik:** React 19, Vite, Framer Motion, Express 5, Claude API (`claude-opus-5-5` mit Websuche, Web-Abruf und adaptivem Denken)

## Hinweis

LA Football liefert Wahrscheinlichkeiten und keine Garantien. Buchmacher haben eine Marge, und auch gute Analysen verlieren regelmäßig einzelne Wetten. Wette nur mit Geld, dessen Verlust du verkraften kannst. 18+ · Hilfe bei Spielsucht: BZgA-Hotline 0800 1 37 27 00 (kostenlos).
