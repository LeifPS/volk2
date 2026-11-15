# Volk

Rundenbasierte Aufbaustrategie im Pixelart-Stil, für ein paar Freunde und die Familie: ein Civilization-Klon. Man spielt eine Partie wie ein Brettspiel mit ein paar Menschen und/oder KI-Völkern, reihum Zug für Zug (mit Zugzeit-Konto). Von den anderen sieht man nur „X ist am Zug“.

**Version 2 (Repo `volk2`)** ersetzt die Echtzeit-Welt von `volk` durch Partien mit Lobby. Siege: Eroberung, Wissenschaft (Fusionsforschung), Punkte beim Rundenlimit. KI-Stufen: Leicht, Normal, Schwer und drei Boni-Stufen.

- Worker-Name `volk2` (nach dem Verbinden des Repos mit Cloudflare Workers Builds deployt jeder Push auf `main`; erwartete Adresse `volk2.<konto>.workers.dev`)
- Demo ohne Server und ohne Konto: `/?demo=1` (läuft noch im alten Echtzeit-Modus, Zeitalter wählbar: `?demo=1&zeitalter=5`)

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/` | Worker (`worker.js`), Durable Objects `Lobby` (`lobby.js`: Konten, Partien-Liste, Einstellungen) und `Partie` (`server.js`: eine Partie je Objekt, WebSocket, Zugzeit-Alarm), `dos.js`, Konten (`konten.js`) |
| `public/` | Statische Dateien: `index.html`, `style.css`, Client in `js/`, Schriften |
| `public/shared/` | Gemeinsamer Code für Client und Server: Hex-Geometrie, Zufall, Karte, Regeln/Formeln, Wegsuche, Uhr `jetzt()` |
| `public/shared/daten/` | Alle Spielinhalte als Daten (Forschungen, Einheiten, Gebäude, Wunder, Rohstoffe, Gelände, Verbesserungen, Beförderungen, Akteure). Format: `DATENFORMAT.md` |
| `public/shared/engine/` | Die Spiel-Engine (läuft im Durable Object, in den Tests und im Demo-Modus); `runden.js` enthält Zugreihenfolge, Zugzeit-Konto, Siege, KI-Ersatz |
| `public/js/grafik/` | Pixel-Sprites, alle im Code gezeichnet |
| `tests/` | `npm test` (Node-Test-Runner) |
| `tools/` | Balance-Simulation, Admin-Skript, Sprite-Galerie, Screenshots, Hub-Bilder, Browser-Tests |
| `hub-eintrag/` | Fertiges Paket für den Leif Game Hub (siehe `hub-eintrag/ANLEITUNG.md`) |

Wichtige Dokumente: `ENTSCHEIDUNGEN.md` (alle Entscheidungen und die Lastabschätzung), `ABNAHME.md` (was wie getestet ist), `FORTSCHRITT.md`.

## Lokal starten

```
npm install
npm run dev          # wrangler dev auf http://localhost:8787
npm test             # alle Tests (Karte, Daten, Kampf, Zeit, Server, Balance, Mehrspieler)
npm run balance      # Balance-Simulation Echtzeit-Modus (druckt Tabellen)
npm run balance:runden  # Rundenmodus: Dauer in Runden + Langlauf mit KI
npm run browsertest  # Browser-Läufe mit Playwright gegen wrangler dev
```

Sprite-Galerie: einen statischen Server im Repo-Ordner starten (z. B. `python3 -m http.server 8000`) und `http://localhost:8000/tools/sprite-galerie.html` öffnen, oder `node tools/galerie-foto.mjs einheit galerie.png 3`.

## Runden, Zeit und Zugzeit

Eine Partie läuft in **Runden**. Im Zug gibt der Spieler Befehle und beendet ihn; KI-Völker ziehen sofort. Sind alle durch, rechnet die Welt `rundeMs` Spielzeit weiter (Spieltempo: Episch 1 Std, Normal 2 Std, Schnell 4 Std, Blitz 8 Std je Runde). In der Spielzeit werden Bauten, Forschungen und Wachstum fertig. Einheiten bewegen sich mit Bewegungspunkten je Runde.

Das **Zugzeit-Konto** (nur bei mehr als einem Menschen) misst echte Zeit: Standard 24 Std Start, +1 Std je beendetem Zug, höchstens 24 Std; alles vom Host einstellbar. Läuft das Konto im eigenen Zug ab, wird der Zug beendet (Alarm im Durable Object). Wer `verpasstMax` Züge in Folge verpasst, wird durch die KI ersetzt und gilt als verloren. Tests setzen die Zeit direkt (`befehl(vid, b, jetztEcht)`), ein Zeitregler ist nicht mehr nötig.

## Admin (Passwort zurücksetzen, sperren, löschen, Statistik)

Nur aktiv, wenn das Secret gesetzt ist:

```
npx wrangler secret put ADMIN_TOKEN       # ein langes, zufälliges Passwort (mind. 16 Zeichen)
ADMIN_TOKEN=... node tools/admin.mjs statistik
ADMIN_TOKEN=... node tools/admin.mjs passwort <benutzername> <neues-passwort>
ADMIN_TOKEN=... node tools/admin.mjs sperren <benutzername>
ADMIN_TOKEN=... node tools/admin.mjs entsperren <benutzername>
ADMIN_TOKEN=... node tools/admin.mjs loeschen <benutzername>
```

## Veröffentlichen

1. `git push origin main` (Cloudflare baut und deployt automatisch mit `wrangler deploy`).
2. Optional: `npx wrangler secret put ADMIN_TOKEN`.
3. Hub-Eintrag: siehe `hub-eintrag/ANLEITUNG.md`.

Spätere Änderungen an den Durable-Object-Klassen brauchen neue Migrations-Tags in `wrangler.jsonc`; die Klassen `Lobby` und `Partie` nie umbenennen. Der Spielzustand hat ein Feld `version` für spätere Datenmigrationen.
