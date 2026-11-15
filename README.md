# Volk

Echtzeit-Multiplayer-Aufbaustrategie im Pixelart-Stil, für ein paar Freunde und die Familie. Vorbild ist Civilization, aber ohne Runden: Alles läuft in Echtzeit mit Wartezeiten, die Welt läuft weiter, auch wenn niemand online ist.

- Live: https://volk.leifps.workers.dev (ein Push auf `main` deployt per Cloudflare Workers Builds)
- Demo ohne Server und ohne Konto: https://volk.leifps.workers.dev/?demo=1 (Zeitalter wählbar: `?demo=1&zeitalter=5`)

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/` | Worker (`worker.js`), Durable Object `Welt` (`welt.js`), testbare Server-Logik (`server.js`), Konten (`konten.js`) |
| `public/` | Statische Dateien: `index.html`, `style.css`, Client in `js/`, Schriften |
| `public/shared/` | Gemeinsamer Code für Client und Server: Hex-Geometrie, Zufall, Karte, Regeln/Formeln, Wegsuche, Uhr `jetzt()` |
| `public/shared/daten/` | Alle Spielinhalte als Daten (Forschungen, Einheiten, Gebäude, Wunder, Rohstoffe, Gelände, Verbesserungen, Beförderungen, Akteure). Format: `DATENFORMAT.md` |
| `public/shared/engine/` | Die Spiel-Engine (läuft im Durable Object, in den Tests und im Demo-Modus) |
| `public/js/grafik/` | Pixel-Sprites, alle im Code gezeichnet |
| `tests/` | `npm test` (Node-Test-Runner) |
| `tools/` | Balance-Simulation, Admin-Skript, Sprite-Galerie, Screenshots, Hub-Bilder, Browser-Tests |
| `hub-eintrag/` | Fertiges Paket für den Leif Game Hub (siehe `hub-eintrag/ANLEITUNG.md`) |

Wichtige Dokumente: `ENTSCHEIDUNGEN.md` (alle Entscheidungen und die Lastabschätzung), `ABNAHME.md` (was wie getestet ist), `FORTSCHRITT.md`.

## Lokal starten

```
npm install
npm run dev          # wrangler dev auf http://localhost:8787, mit Test-Zeitregler
npm test             # alle Tests (Karte, Daten, Kampf, Zeit, Server, Balance, Mehrspieler)
npm run balance      # Balance-Simulation (druckt Tabellen)
npm run browsertest  # Browser-Läufe mit Playwright gegen wrangler dev
```

Sprite-Galerie: einen statischen Server im Repo-Ordner starten (z. B. `python3 -m http.server 8000`) und `http://localhost:8000/tools/sprite-galerie.html` öffnen, oder `node tools/galerie-foto.mjs einheit galerie.png 3`.

## Zeit und der Test-Zeitregler

Jede Zeitabfrage läuft über `jetzt()` in `public/shared/uhr.js`. Tests setzen eine simulierte Uhr (`simulierteUhr()`), damit Stunden und Tage in Sekunden durchlaufen.

Für Browser-Tests gibt es einen **Test-Zeitregler**, der **nur lokal** funktioniert: `npm run dev` startet `wrangler dev --var ZEITFAKTOR_ERLAUBT:1`. Dann gilt:

```
curl -X POST localhost:8787/api/dev/zeit -d '{"faktor":60}'          # Spielzeit läuft 60-mal schneller
curl -X POST localhost:8787/api/dev/zeit -d '{"sprung_ms":3600000}'  # eine Stunde vorspringen
```

Im Deployment existiert die Variable nicht; der Endpunkt antwortet dann mit 404, und niemand kann die Zeit beeinflussen.

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

Spätere Änderungen an der Durable-Object-Klasse brauchen neue Migrations-Tags in `wrangler.jsonc`; die Klasse `Welt` nie umbenennen. Der Spielzustand hat ein Feld `version` für spätere Datenmigrationen.
