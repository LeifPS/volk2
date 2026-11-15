#!/usr/bin/env node
// Admin-Werkzeug für Leif. Funktioniert nur, wenn im Worker das Secret ADMIN_TOKEN gesetzt ist:
//   npx wrangler secret put ADMIN_TOKEN        (mindestens 16 Zeichen, gut aufheben)
// Aufrufe:
//   ADMIN_TOKEN=... node tools/admin.mjs statistik
//   ADMIN_TOKEN=... node tools/admin.mjs passwort <benutzername> <neues-passwort>
//   ADMIN_TOKEN=... node tools/admin.mjs sperren <benutzername>
//   ADMIN_TOKEN=... node tools/admin.mjs entsperren <benutzername>
//   ADMIN_TOKEN=... node tools/admin.mjs loeschen <benutzername>      (löscht Konto und Volk)
// Andere Adresse (z. B. lokal): VOLK_URL=http://localhost:8787
const url = process.env.VOLK_URL || 'https://volk.leifps.workers.dev';
const token = process.env.ADMIN_TOKEN;
const [befehl, name, wert] = process.argv.slice(2);
if (!token) { console.error('Bitte ADMIN_TOKEN setzen (siehe Kopf dieser Datei).'); process.exit(1); }
const pfade = { statistik: 'statistik', passwort: 'passwort', sperren: 'sperren', entsperren: 'sperren', loeschen: 'loeschen' };
if (!pfade[befehl]) { console.error('Befehle: statistik | passwort <name> <pw> | sperren <name> | entsperren <name> | loeschen <name>'); process.exit(1); }
const daten = { name, passwort: wert, gesperrt: befehl !== 'entsperren' };
const r = await fetch(`${url}/api/admin/${pfade[befehl]}`, { method: befehl === 'statistik' ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: befehl === 'statistik' ? undefined : JSON.stringify(daten) });
const j = await r.json().catch(() => ({ ok: false, fehler: 'Keine gültige Antwort (Status ' + r.status + ')' }));
if (befehl === 'statistik' && j.ok) {
  console.log(`Konten: ${j.konten.length}`);
  console.table(j.konten);
  console.table(j.voelker.filter((v) => v.art === 'spieler' || v.art === 'ki'));
  if (j.fehler.length) { console.log('Letzte Engine-Fehler:'); for (const f of j.fehler) console.log(new Date(f.t).toISOString(), f.text); }
} else console.log(j.ok ? 'Erledigt.' : 'Fehler: ' + j.fehler);
