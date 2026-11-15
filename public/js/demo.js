// Demo-Modus (?demo=1): läuft ganz ohne Server. Die echte Engine läuft im Browser mit einem fortgeschrittenen Beispielzustand.
// Für Screenshots und den Trailer. Parameter: zeitalter=0..6 (Stand der Demo), ansicht=karte|baum|stadt|kampf|diplomatie|rangliste
import { Spiel, leererZustand } from '../shared/engine/spiel.js';
import { setzeUhr } from '../shared/uhr.js';
import { Z, setzeVersatz } from './kern/zustand.js';
import * as netz from './kern/netz.js';
import { FORSCHUNGEN, EINHEITEN, GEBAEUDE, EINHEIT } from '../shared/daten/index.js';
import { umkreis, abstand, nachbarn } from '../shared/hex.js';
import { karte, startWert } from '../shared/karte.js';
import { GELAENDE } from '../shared/daten/gelaende.js';

const STD = 3600000;

export function baueDemo(zeitalter = 3, start = Date.now()) {
  let t = start - 20 * 24 * STD;
  setzeUhr(() => t);
  const s = new Spiel(leererZustand(t));
  s.weltInitialisieren();
  const v = s.neuesSpielerVolk('demo', 'Die Bergleute', '#1010f0');
  v.schutz_bis = 0; v.tutorial = { schritt: 99, fertig: true };
  // Forschung bis zum gewünschten Zeitalter
  for (const f of FORSCHUNGEN) if (f.zeitalter < zeitalter || (f.zeitalter === zeitalter && f.spalte % 3 === 0)) v.forschung.erforscht[f.id] = 1;
  for (const f of FORSCHUNGEN) if (v.forschung.erforscht[f.id]) for (const p of f.voraussetzungen) v.forschung.erforscht[p] = 1;
  s.zeitalterPruefen(v);
  v.zeitalter = zeitalter;
  // Hauptstadt und weitere Städte
  const siedler = s.einheitenVon(v.id).find((e) => e.typ === 'siedler');
  const haupt = s.stadtGruenden(v.id, siedler.feld, 'Erzhausen');
  s.einheitEntfernen(siedler.id);
  const namen = ['Silberau', 'Kupferberg', 'Weidenhof', 'Seeburg', 'Felsenau'];
  const plaetze = [];
  for (const i of umkreis(haupt.feld, 9)) { if (abstand(i, haupt.feld) < 5) continue; if (!s.stadtGruendenHindernis(v.id, i) && startWert(i) > 0 && plaetze.every((p) => abstand(p, i) >= 5)) plaetze.push(i); if (plaetze.length >= namen.length) break; }
  const staedte = [haupt, ...plaetze.map((p, k) => s.stadtGruenden(v.id, p, namen[k]))];
  for (const st of staedte) {
    st.bev = st === haupt ? 14 : 6 + (st.id % 5);
    for (let k = 0; k < 6 + st.bev; k++) s.grenzwachstum(st.id);
    let n = 0;
    for (const g of GEBAEUDE) { if (n > 12) break; if (!s.bauHindernis(st, 'gebaeude', g.id)) { if (g.ersetzt) delete st.gebaeude[g.ersetzt]; st.gebaeude[g.id] = 1; n++; } }
    s.autoBewirtschaften(st);
    // Verbesserungen auf bewirtschafteten Feldern
    for (const i of st.arbeit) for (const vb of ['farm', 'mine', 'holzfaellerlager', 'plantage', 'weide', 'jagdlager', 'fischerboote', 'steinbruch', 'handelsposten']) { if (!s.verbesserungHindernis(v, i, vb, null)) { s.verbesserungSetzen(i, vb); break; } }
    st.hp = s.stadtMaxHp(st);
  }
  // Straßen zwischen den Städten
  for (let k = 1; k < staedte.length; k++) { const w = s.landWeg(staedte[0].feld, staedte[k].feld, v.id) || []; for (const i of w) if (s.besitzer(i) === v.id || s.besitzer(i) == null) s.setzeFeld(i, { w: zeitalter >= 4 ? 'eisenbahn' : zeitalter >= 1 ? 'strasse' : 'pfad' }); }
  // Einheiten passend zum Zeitalter
  const passend = (klasse) => EINHEITEN.filter((d) => d.klasse === klasse && d.zeitalter <= zeitalter).sort((a, b) => b.zeitalter - a.zeitalter)[0];
  for (const kl of ['nahkampf', 'fernkampf', 'reiter', 'belagerung', 'nahkampf', 'spaeher', 'zivil']) {
    const d = passend(kl); if (!d) continue;
    const st = staedte[Math.floor(Math.random() * staedte.length)];
    s.einheitErzeugen(v.id, d.id, st.feld);
  }
  const see = passend('see_fern') || passend('see_nah');
  const kueste = staedte.find((st) => s.istKuestenstadt(st));
  if (see && kueste) s.einheitErzeugen(v.id, see.id, kueste.feld);
  // Ein Späher unterwegs und ein Arbeiter bei der Arbeit
  for (const e of s.einheitenVon(v.id)) {
    const d = EINHEIT[e.typ];
    if (d.klasse === 'spaeher') { s.erkunde(v.id, e.feld, 14); }
    if (d.faehigkeiten?.includes('arbeiten')) e.modus = 'auto_arbeit';
  }
  for (const st of staedte) s.erkunde(v.id, st.feld, 10);
  // Bauaufträge
  for (const st of staedte) { const g = GEBAEUDE.find((x) => !s.bauHindernis(st, 'gebaeude', x.id)); if (g) { st.schlange.push({ art: 'gebaeude', id: g.id }); v.gold += 5000; v.lager.holz = 400; v.lager.stein = 400; s.bauSchlangeWeiter(st.id); } }
  // Forschung aktiv
  const naechste = FORSCHUNGEN.find((f) => s.forschungMoeglich(v, f.id));
  if (naechste) { s.forschungWechseln(v, naechste.id); v.forschung.fortschritt = 0.42; }
  v.gold = 1840;
  // Kontakte zu allen
  for (const o of s.alleVoelker()) if (o.id !== v.id && o.art !== 'barbar' && o.art !== 'tiere') { v.bekannt[o.id] = t; (o.bekannt ||= {})[v.id] = t; }
  // 20 Tage Welt laufen lassen, damit KI und Barbaren leben
  for (let h = 0; h < 20 * 24; h += 6) { t += 6 * STD; s.verarbeite(t); }
  v.gold = 1840;
  if (!v.forschung.aktiv) { const n2 = FORSCHUNGEN.find((f) => s.forschungMoeglich(v, f.id)); if (n2) { s.forschungWechseln(v, n2.id); v.forschung.fortschritt = 0.42; } }
  t = start;
  s.verarbeite(t);
  return { s, v, uhr: (x) => { t = x; } };
}

export async function starteDemo(params) {
  Z.demo = true;
  const zeitalter = Math.max(0, Math.min(6, +(params.get('zeitalter') ?? 3)));
  const { s, v } = baueDemo(zeitalter);
  setzeUhr(() => Date.now());
  setzeVersatz(0);
  Z.volk = v.id; Z.konto = 'demo';
  let letzte = null;
  const sendeAnsicht = (voll) => {
    s.verarbeite(Date.now());
    const a = s.ansichtFuer(v.id);
    if (voll || !letzte) netz.empfangen({ t: 'voll', ansicht: a, nebel: s.nebelText(v.id) });
    else { const d = s.ansichtDelta(letzte, a); const erk = (s._neuErkundet || {})[v.id] || []; s._neuErkundet = {}; const k = s.ausgehend; s.ausgehend = []; if (d || erk.length || k.length) netz.empfangen({ t: 'delta', d, erkundet: erk, kaempfe: k }); }
    letzte = a;
  };
  netz.lokalVerbinden({
    nachricht(text) {
      const m = JSON.parse(text);
      let antwort = null;
      if (m.t === 'befehl') antwort = s.befehl(v.id, m.b);
      else if (m.t === 'frage') { try { antwort = { ok: true, daten: s.frage(v.id, m.q) }; } catch (e) { antwort = { ok: false, fehler: e.message }; } }
      else if (m.t === 'uhr') antwort = { zeit: Date.now() };
      else if (m.t === 'voll') { sendeAnsicht(true); return; }
      setTimeout(() => { netz.empfangen({ t: m.t === 'uhr' ? 'uhr' : 'antwort', id: m.id, ...antwort }); sendeAnsicht(false); }, 0);
    },
  });
  sendeAnsicht(true);
  setInterval(() => sendeAnsicht(false), 2000);
  window.__demo = { spiel: s, volk: v };
  const { spielAufbauen } = await import('./main.js');
  spielAufbauen(false);
}
