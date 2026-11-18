# Meme City – Übergabe (Stand: Planung, noch kein Code)

Diese Datei fasst die Planung aus einer Claude-Cloud-Sitzung zusammen, damit eine
Claude-Code-Sitzung auf dem PC des Nutzers nahtlos weitermachen kann.
Der Nutzer spricht Deutsch und ist Anfänger: einfache Sprache, Schritt für Schritt.

## Ziel
Ein interaktiver TikTok-LIVE-Stream in **Minecraft Java Edition**, mit dem der Nutzer
über TikTok-Geschenke Geld verdient. Vorbild sind Streams wie „Flexhausen“ und
„Wackelburg“ – wir bauen aber eine **eigene** Version (eigener Name, eigenes Design,
eigener Bürgermeister), nichts 1:1 kopieren.

**Stadtname:** Meme City (Ordner auf dem PC heißt ebenfalls „Meme City“).

## Spielprinzip
- Zuschauer schreibt „Haus“ in den Chat → bekommt ein eigenes Grundstück in der
  Minecraft-Stadt, mit schwebendem Namensschild (`@name · Stufe 1 · Starter-Hütte`).
- Auch ein Follow oder ein Geschenk vergibt automatisch ein Haus.
- „Zeig mal mein Haus“ / „Wo ist mein Haus?“ → Kamera (Spieler des Streamers im
  Zuschauermodus) fliegt zu dem Haus.
- Häuser haben **Stufen** (Ziel: bis Stufe 20), jede Stufe ein schöneres Haus:
  Starter-Hütte → Holzhütte → Steinhaus → Backsteinhaus → Fachwerkhaus → … →
  Stadtvilla → Landhaus → Hotel → Hochhaus → Schloss …
- **Upgrade-Punkte (UP):** Geschenke = Coins (Vorschlag 1 Coin = 1 UP; Rose 1,
  Donut 30, Herz-Hände 100, TikTok Universe 1000). Likes zählen auch
  (Vorschlag: 50 Likes = 1 UP). Info-Zeile: „Noch 82 Likes oder 4 Coins bis Stufe 2“.
- **Niemand kann fremde Häuser zerstören.** Jeder baut nur sein eigenes Haus aus.
- **Bestenliste** (Top 10 bzw. Top 3), **Bürgermeister** = größter Unterstützer.
- **Gemeinschaftsbau:** alle sammeln zusammen (z. B. „Fußballplatz 1.151 / 2.000“),
  danach entsteht ein Sondergebäude im Stadtzentrum (Rathaus, Bar, Freibad …).
- **Events** bei großen Geschenken (Feuerwerk, Gewitter, Party …).
- Speicherstand: Häuser bleiben über alle Streams erhalten.

## Bau-Animation beim Upgrade (wichtig, „krass“ laut Nutzer)
1. Kamera fliegt zum Grundstück, Laufband: „@name baut aus: Stufe 5“.
2. Altes Haus verschwindet in großer weißer Rauchwolke (Partikel + Sound).
3. Holzgerüste an den Ecken + gelber Kran erscheinen.
4. Neues Haus wächst **Schicht für Schicht** von unten nach oben (Mauern,
   Fenster, zuletzt Dach), mit Funkeln.
5. Garten: Hecke rundherum, Blumen, Lampen.
6. Gerüst weg, Feuerwerk, Namensschild aktualisiert.
Umsetzbar per RCON: `fill`/`setblock` pro Schicht mit Verzögerung, `particle`, `playsound`,
`summon firework_rocket`, `summon text_display`.

## Bürgermeister (eigene Figur, Aussehen noch offen)
- **Stimme (Text-zu-Sprache)** sagt alles an, z. B. „Timo auf Stufe 1“,
  „Stufe 5 für NastjaXD, Backsteinhaus“, „Kurzer Check: … hat noch kein Haus“,
  „Neuer Eintrag im Grundbuch: …“, „Noch 519 Likes und wir setzen Landhaus oben drauf“.
  Abwechslungsreiche, witzige Sprüche.
- **Animiertes Bild im Overlay:** Mund geht beim Reden auf/zu, Handgesten (Finger hoch,
  zeigen), Spezial-Pose + Konfetti bei Geschenken, Rahmen leuchtet beim Sprechen.
  Dafür mehrere Bilder der Figur (Mund zu/auf, Finger hoch, Jubel). Optional per KI erzeugen.

## Overlay (Browser-Quelle für OBS / TikTok LIVE Studio, Hochformat 1080×1920)
- Stadtname, Bürgermeister-Karte, Zähler „Häuser 290 / 1.216“, Bestenliste / Top 3.
- **Spieler-Karte** des gerade aktiven Zuschauers: Profilbild, „Stufe 8 · Stadtvilla · Orange“,
  Fortschrittsbalken, „Noch 474 Likes bis Stufe 9 · Landhaus“, Treue-Bonus, Titel.
- Danke-Banner bei Geschenken, Laufband („Willkommen in Meme City“, „Platz 1: …“,
  „@x baut aus …“), „FAST GESCHAFFT! @x steht kurz vor Stufe 9“, Like-Blasen.
- Eigenes Design (nicht Flexhausen/Wackelburg nachmachen).

## Ausbaustufen des Projekts
1. **Grundspiel:** Häuser, Stufen, Bau-Animation, Kamera, Bürgermeister (Stimme +
   Animation), Overlay, Testmodus (Geschenke/Chat simulieren ohne live zu sein).
2. **Mitmach-Features:** Nord gegen Süd (Teams, Like-Duell mit Countdown, Chat „nord“/„süd“),
   Treue-Bonus (z. B. 1,5x für Stammzuschauer), Hausfarben + Haustiere per Chat,
   „Fast geschafft“-Banner.
3. **Webseite „Mein Haus“ auf GitHub Pages:** Zuschauer gibt TikTok-Namen ein → sieht sein
   Haus als isometrische Pixel-Grafik (SVG im Browser gezeichnet), Stufe, Likes, Coins,
   Platz „#729 von 1.818“, Fortschritt, Top 10, Gesamtzahlen.
   Vorbild-Technik (flexhausen1.github.io): Spiel hat eigenen Webserver, per kostenlosem
   Cloudflare-Quick-Tunnel (trycloudflare.com) erreichbar; das Spiel schreibt die aktuelle
   Tunnel-Adresse in `adresse.json` im GitHub-Pages-Repo; Seite liest die Adresse und fragt
   den PC alle 2 s (Haus) bzw. 10 s (Top 10). Verbesserung: regelmäßig eine Kopie der Daten
   auf GitHub speichern, damit die Seite auch bei ausgeschaltetem PC funktioniert.
4. **Mini-Spiele:** Zombie-Nächte („jeder Like verteidigt die Stadt“), Tresor-Code,
   1v1-Rennen alle 5 Minuten.

## Technischer Plan
- **Node.js-Programm** auf dem PC:
  - TikTok: npm-Paket `tiktok-live-connector` (v2.5.0, ESM; `TikTokLiveConnection`,
    `WebcastEvent.CHAT/GIFT/LIKE/FOLLOW/SHARE`). Feldnamen v2 (Proto v3):
    Geschenk `data.gift.name`, `data.gift.diamondCount`, `data.gift.type`, `data.repeatCount`,
    `data.repeatEnd` (Streak-Geschenke type 1 erst bei repeatEnd zählen);
    Like `data.count`, `data.total`; Nutzer `data.user.uniqueId ?? data.user.displayId`,
    `data.user.nickname`. Robust mit Fallbacks auslesen.
  - Minecraft: **RCON** (npm `rcon-client`), lokaler Minecraft-Server (offizielle server.jar,
    gleiche Version wie der Client, **Superflat-Welt**, `enable-rcon=true`).
    Achtung: ab 1.21.5 ist `text_display`-Text eine SNBT-Textkomponente; Gamerule-Namen
    haben sich in neueren Versionen geändert → gegen die echte Version testen.
    Stadt-Chunks per `forceload` geladen halten (sonst schlagen `fill`/Entities fehl).
  - Stadt-Raster: Grundstücke spiralförmig um ein Zentrum (Zentrum = Platz für
    Gemeinschaftsbauten), Straßen mit Mittellinie zwischen den Grundstücken.
  - Webserver (Overlay + Steuer-/Testpanel + Daten-API), Speicherstand als JSON.
- Mindestens 18 Jahre und freigeschaltetes TikTok LIVE nötig, um Geschenke auszuzahlen.
- TikTok erlaubt **keine Werbung für Sportwetten** im LIVE (das bestehende Repo ist eine
  Sportwetten-App – nichts davon im Stream zeigen).

## Offene Punkte (vom Nutzer noch zu klären)
- Installiert? Java 25 (Temurin), Node.js LTS, OBS Studio – z. B. per
  `winget install EclipseAdoptium.Temurin.25.JRE`, `winget install OpenJS.NodeJS.LTS`,
  `winget install OBSProject.OBSStudio` (PC: Windows, Name „LARSENS-PC“).
- TikTok-Name, Minecraft-Name, Minecraft-Version, OBS oder TikTok LIVE Studio.
- Aussehen + Name des Bürgermeisters, Stimme, Spielregeln (Punkte pro Geschenk/Like,
  Stufen, Gemeinschaftsbauten, Events).

## Nächster Schritt
Programme installieren (siehe oben), dann Teil 1 (Grundspiel) bauen und zusammen mit dem
Nutzer auf seinem PC testen.
