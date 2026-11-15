# Volk im Leif Game Hub eintragen

Alles in diesem Ordner ist fertig vorbereitet. Ausnahme: das Banner (siehe Schritt 1).

## 1. Banner erzeugen (einmalig)
1. Den Text-Prompt aus `banner-prompt.md` in Gemini einfügen (Spiel ist jetzt rundenbasiert, im Prompt „Echtzeit“ weglassen) und ein Bild erzeugen.
2. Das Bild hierher holen und zuschneiden: `python3 tools/banner-zuschneiden.py ~/Downloads/<bild>.png hub-eintrag/volk-wallpaper.webp`. Das Ergebnis hat 2000 × 400 Pixel und ist WebP. Pillow wird gebraucht: `pip3 install pillow`.

## 2. Dateien in das Hub-Repo kopieren
Im Hub-Repo (`LeifPS/Leif-Game-Hub`):
- `hub-eintrag/volk-icon.webp` → `public/screens/volk-icon.webp`
- `hub-eintrag/volk-wallpaper.webp` → `public/screens/volk-wallpaper.webp`
- `hub-eintrag/shots/1.webp … 10.webp` → `public/screens/shots/volk/1.webp … 10.webp` (Ordner `volk` anlegen)

Beispiel (von diesem Repo aus, Hub-Repo liegt daneben):
```
mkdir -p ../Leif-Game-Hub/public/screens/shots/volk
cp hub-eintrag/volk-icon.webp hub-eintrag/volk-wallpaper.webp ../Leif-Game-Hub/public/screens/
cp hub-eintrag/shots/*.webp ../Leif-Game-Hub/public/screens/shots/volk/
```

## 3. Eintrag in `public/games.json`
Den Inhalt von `games-eintrag.json` als neues Objekt in die Spiele-Liste von `public/games.json` einfügen (an die Stelle, an der Alpha-Spiele stehen, sonst ans Ende der Liste; Komma vor dem neuen Objekt nicht vergessen). Wenn die Zahl der Screenshots anders ist, die Liste `screenshots` anpassen.

## 4. Committen und pushen
```
git add public/screens public/games.json
git commit -m "Großes Update: Volk (Alpha) im Hub"
git push
```

## Hinweise
- Volk läuft eigenständig unter https://volk.leifps.workers.dev und im Hub-Rahmen (iframe). `lgh-vorlade.js` ist ganz vorn im `<head>` eingebaut (Lautstärke des Hubs und Speicherrettung im iframe), ohne Spielstand-Menü, weil Volk ein Cloud-Spiel ist.
- Der Trailer liegt (falls vorhanden) unter `hub-eintrag/trailer.mp4`.
