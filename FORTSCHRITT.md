# Fortschritt (Arbeitsgedächtnis)

## Erledigt
- Fundament: wrangler.jsonc, Worker + Durable Object `Welt` (SQLite, Eimer-Speicherung), Konten (PBKDF2), WebSocket-Hibernation, Alarm auf nächstes Ereignis, Admin-Endpunkte + `tools/admin.mjs`, Test-Zeitregler (nur mit `ZEITFAKTOR_ERLAUBT`).
- Gemeinsamer Code `public/shared/` (Hex, Zufall, Karte 192×120, Regeln, A*, Uhr) und Daten (242 Forschungen, 96 Einheiten, 79 Gebäude, 8 Wunder, 33 Beförderungen, 50 Verbesserungen, 46 Rohstoffe, 23 Gelände, 5 KI, 12 Stadtstaaten, 6 Barbarenlager).
- Engine komplett (Wirtschaft, Bau, Forschung, Bewegung, Kampf, Diplomatie, Handel, KI, Stadtstaaten, Barbaren, Raubtiere, Natur, Jahreszeiten, Ansicht/Deltas).
- Alle Sprites, Galerie. Client: Renderer, Eingabe, HUD, alle Fenster (Forschungsbaum, Stadt, Reich, Diplomatie/Handel, Rangliste, Lexikon, Hilfe, Einstellungen), Tutorial, Chiptune-Audio, Demo-Modus.
- Tests: 48/48 (`npm test`), Browser-Läufe 27/27 (`npm run browsertest`), Balance-Simulation (ganzer Baum ~27 Tage).
- Hub-Paket: Icon, Favicon, Banner-Prompt + Zuschnitt-Skript, games-eintrag.json, ANLEITUNG.md, 10 Screenshots, Trailer (37 s).
- Doku: README, ENTSCHEIDUNGEN (inkl. Lastabschätzung), ABNAHME.

## Offen / nächste Schritte
- Code-Review eingearbeitet (14 Fehler behoben, Regressionstests). Tests 56/56, Browser 27/27.
- Push nach GitHub ist in dieser Umgebung nicht erlaubt → Leif pusht von Hand.
