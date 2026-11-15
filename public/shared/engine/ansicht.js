// Was ein Spieler sehen darf (Nebel des Krieges serverseitig), als kompakte Ansicht und als Delta zur letzten Ansicht.
import { abstand } from '../hex.js';
import { karte } from '../karte.js';
import { EINHEIT, GEB, GEBAEUDE, EINHEITEN, WUNDER, WUNDER_NACH_ID, FORSCHUNG, VERBESSERUNG, ROHSTOFFE, politikPlaetze, politikSchwelle } from '../daten/index.js';
import { gesamtWertung, wachstumsBedarf, grenzKosten, STD } from '../regeln.js';
import { pruefe } from './spiel.js';
import { bereichVon, istMilitaer } from './einheiten.js';

const rund = (x) => Math.round(x * 100) / 100;
export const ansicht = {
  /** Vollständige Ansicht für ein Volk. */
  ansichtFuer(vid) {
    const v = this.z.voelker[vid];
    const part = this.z.global.partie;
    if (part && (v.stand_um ?? this.t) < this.t) this.aendern(vid); // Stand auf die aktuelle Spielzeit bringen (Anzeige "pro Runde" ohne Hochrechnung)
    const r = this.raten(vid);
    const nebel = this.nebel(vid);
    const sicht = this.sichtbareFelder(vid);
    const erk = (i) => this.istErkundet(nebel, i);
    const a = { t: this.t, partie: this.partieAnsicht(), du: null, voelker: {}, diplomatie: {}, staedte: {}, einheiten: {}, felder: {}, lager: {}, wunder: {}, angebote: {}, welt: {} };
    a.du = {
      id: v.id, name: v.name, farbe: v.farbe, art: v.art, gold: rund(v.gold), lager: Object.fromEntries(Object.entries(v.lager || {}).map(([k, x]) => [k, rund(x)])), stand_um: v.stand_um,
      raten: { gold: rund(r.gold), einnahmen: rund(r.einnahmen), unterhaltEinheiten: rund(r.unterhalt.einheiten), unterhaltGebaeude: rund(r.unterhalt.gebaeude), handel: rund(r.handel), wissenschaft: rund(r.wissenschaft), kultur: rund(r.kultur), material: r.material, kapazitaet: r.kapazitaet, luxus: r.luxus, boni: r.boni },
      forschung: { aktiv: v.forschung.aktiv, fortschritt: v.forschung.fortschritt, fertig_um: this.forschungsZeit(v), schlange: v.forschung.schlange, erforscht: v.forschung.erforscht, teil: v.forschung.teil || {}, dauer_ms: v.forschung.aktiv ? Math.round(this.forschungsDauerMs(v, v.forschung.aktiv, r.wissenschaft)) : null },
      zeitalter: v.zeitalter || 0, schutz_bis: v.schutz_bis, gegruendet: v.gegruendet, tutorial: v.tutorial, einstellungen: v.einstellungen || {},
      meldungen: (v.meldungen || []).slice(-80), gelesen_bis: v.gelesen_bis || 0, mangel_seit: v.mangel_seit || null, abkommen_bis: v.abkommen_bis || null,
      routen: this.aktiveRouten(vid).length, routenKapazitaet: this.routenKapazitaet(v), startfeld: v.startfeld, zuletzt_gesehen: v.zuletzt_gesehen_vorher || null,
      politiken: v.politiken || [], politik_plaetze: politikPlaetze(v.kultur_gesamt || 0, (v.politiken || []).length), politik_schwelle: politikSchwelle((v.politiken || []).length + 1), kultur_gesamt: Math.round(v.kultur_gesamt || 0),
      luxus_handel: v.luxus_handel || [], luxus_abgabe: v.luxus_abgabe || [], schonfrist_bis: v.schonfrist_bis || 0,
    };
    for (const o of this.alleVoelker()) {
      a.voelker[o.id] = { id: o.id, name: o.name, farbe: o.farbe, art: o.art, zeitalter: o.zeitalter || 0, bekannt: !!(v.bekannt?.[o.id]) || o.id === vid, online: this.istOnline(o.id), angreifbar: this.angreifbar(o.id), schutz_bis: o.schutz_bis || 0 };
      if (o.art === 'stadtstaat') { a.voelker[o.id].einfluss = rund(o.einfluss?.[vid] || 0); a.voelker[o.id].verbuendet = o.verbuendet || null; a.voelker[o.id].vorlage = o.vorlage; }
      if (o.art === 'ki') { a.voelker[o.id].persoenlichkeit = o.ki?.persoenlichkeit; a.voelker[o.id].herrscher = o.ki?.herrscher; a.voelker[o.id].stimmung = Math.round(-(o.ki?.groll?.[vid] || 0) + (o.ki?.freundschaft?.[vid] || 0)); }
      if (o.id !== vid && o.art !== 'barbar' && o.art !== 'tiere') {
        const d = this.z.diplomatie[this.diploSchluessel(vid, o.id)] || {};
        a.diplomatie[o.id] = { krieg: !!d.krieg, seit: d.seit || null, letzter_kampf: d.letzter_kampf || null, offene_grenzen: !!d.offene_grenzen, buendnis: !!d.buendnis };
      }
    }
    // Städte
    for (const s of this.alleStaedte()) {
      if (s.volk === vid) a.staedte[s.id] = this.stadtAnsicht(s, r);
      else if (erk(s.feld)) {
        const sichtbar = sicht.has(s.feld);
        a.staedte[s.id] = { id: s.id, volk: s.volk, name: s.name, feld: s.feld, bev: s.bev, hauptstadt: !!s.hauptstadt, mauer: this.mauerStufe(s), zeitalter: this.z.voelker[s.volk]?.zeitalter || 0, hp: sichtbar ? Math.round(this.stadtHp(s)) : null, maxhp: this.stadtMaxHp(s), zerstoert_bis: s.zerstoert_bis || 0, staerke: sichtbar ? this.stadtStaerke(s).wert : null, bau_wunder: (s.bau || []).filter((b) => b.art === 'wunder' && !b.geheim).map((b) => b.id) };
      }
    }
    // Einheiten
    for (const e of this.alleEinheiten()) {
      if (e.volk === vid) a.einheiten[e.id] = this.einheitAnsicht(e, true);
      else if (!e.in && sicht.has(e.feld)) {
        const d = EINHEIT[e.typ];
        if (d?.faehigkeiten?.includes('tarnung') && !this.alleEinheiten().some((x) => x.volk === vid && abstand(x.feld, e.feld) <= 1)) continue;
        a.einheiten[e.id] = this.einheitAnsicht(e, false, sicht);
      }
    }
    // Felder (Änderungen) nur, wo erkundet
    for (const [i, f] of Object.entries(this.z.felder)) {
      if (!erk(+i)) continue;
      const x = {};
      if (f.s) x.s = f.s;
      if (f.v) x.v = f.v;
      if (f.w) x.w = f.w;
      if (f.br) x.br = 1;
      if (f.pl > this.t) x.pl = f.pl;
      if (f.fo > this.t) x.fo = f.fo;
      a.felder[i] = x;
    }
    for (const l of Object.values(this.z.lager)) if (erk(l.feld)) a.lager[l.id] = { id: l.id, feld: l.feld, typ: l.typ };
    for (const [wid, w] of Object.entries(this.z.wunder)) a.wunder[wid] = { volk: w.volk, stadt: w.stadt, fertig: !!w.fertig, t: w.t };
    a.welt.im_bau = [];
    for (const s of this.alleStaedte()) for (const b of s.bau || []) if (b.art === 'wunder' && (!b.geheim || s.volk === vid)) a.welt.im_bau.push({ wunder: b.id, volk: s.volk, fertig_um: s.volk === vid ? b.fertig_um : null });
    for (const an of Object.values(this.z.angebote)) if (an.von === vid || an.an === vid || an.parteien?.includes(vid)) a.angebote[an.id] = an;
    a.welt.jahreszeit = this.z.global.jahreszeit || 0;
    a.welt.jahreszeit_um = this.z.global.jahreszeit_um || null;
    a.welt.ereignisse = (this.z.global.ereignisse || []).filter((ev) => erk(ev.mitte)).map((ev) => ({ id: ev.id, typ: ev.typ, mitte: ev.mitte, start: ev.start, ende: ev.ende, aktiv: ev.aktiv }));
    a.welt.tribute = (this.z.global.tribute || []).filter((t) => t.von === vid || t.an === vid);
    a.welt.karte = karte().hash;
    return a;
  },

  mauerStufe(s) {
    const ids = ['stadtmauer_holz', 'stadtmauer_stein', 'festungsmauer', 'betonbunker'];
    for (let i = ids.length - 1; i >= 0; i--) if (s.gebaeude[ids[i]]) return i + 1;
    return 0;
  },

  stadtAnsicht(s, r) {
    const sr = r.staedte[s.id] || {};
    return {
      id: s.id, volk: s.volk, name: s.name, feld: s.feld, eigen: true, bev: s.bev, nahrung: rund(s.nahrung || 0), kultur: rund(s.kultur || 0), bedarf: wachstumsBedarf(s.bev), grenzkosten: grenzKosten(s.grenz_k || 0),
      gebaeude: Object.keys(s.gebaeude), bau: s.bau, schlange: s.schlange, arbeit: s.arbeit, manuell: !!s.manuell, gebiet: s.gebiet, hauptstadt: !!s.hauptstadt,
      hp: Math.round(this.stadtHp(s)), maxhp: this.stadtMaxHp(s), staerke: this.stadtStaerke(s).wert, reichweite: this.stadtReichweite(s), abkling_bis: s.abkling_bis || 0, zerstoert_bis: s.zerstoert_bis || 0,
      raten: { n: sr.n, p: sr.p, g: sr.g, w: sr.w, k: sr.k, material: sr.material, verbrauch: sr.verbrauch, ueberschuss: sr.ueberschuss, zufriedenheit: sr.zufriedenheit, grenzKultur: sr.grenzKultur, unterhalt: sr.gebaeudeUnterhalt },
      wachstum_um: this.wachstumsZeit(s), grenze_um: this.grenzZeit(s), warte_um: s.warte_um || null, bauplaetze: this.bauplaetze(s), mauer: this.mauerStufe(s), zeitalter: this.z.voelker[s.volk]?.zeitalter || 0,
      kueste: this.istKuestenstadt(s),
    };
  },

  einheitAnsicht(e, eigen, sicht) {
    const x = { id: e.id, volk: e.volk, typ: e.typ, feld: e.feld, hp: rund(e.hp), hp_um: e.hp_um, heilrate: eigen ? this.heilrate(e) : 0, modus: e.modus };
    if (e.tier) x.tier = e.tier;
    if (e.pfad?.length) x.pfad = eigen ? e.pfad : e.pfad.filter((p) => sicht.has(p.f)).slice(0, 4);
    if (e.befoerderungen?.length) x.bef = e.befoerderungen;
    if (e.in) x.in = e.in;
    if (eigen) {
      if (this.z.global.partie) { x.mp = Math.round((e.mp || 0) * 100) / 100; x.mpMax = Math.round(this.mpMax(e) * 100) / 100; }
      x.ep = e.ep || 0; x.abkling_bis = e.abkling_bis || 0; x.arbeit = e.arbeit || null; x.route = e.route || null; x.angriff = e.angriff ?? null;
      x.unterversorgt = !!e.unterversorgt; x.einsatz = e.einsatz || null; x.befoerderbar = this.befoerderungMoeglich(e); x.sicht = this.sichtweite(e);
      if (EINHEIT[e.typ]?.upgrade) x.aufruesten = this.aufruestenKosten(e);
    }
    return x;
  },

  /** Unterschied zweier Ansichten (nur geänderte Einträge). null = keine Änderung. */
  ansichtDelta(alt, neu) {
    const d = {};
    let leer = true;
    for (const k of ['voelker', 'diplomatie', 'staedte', 'einheiten', 'felder', 'lager', 'wunder', 'angebote']) {
      const A = alt[k] || {}, N = neu[k] || {};
      const set = {}, del = [];
      for (const [id, x] of Object.entries(N)) if (!(id in A) || JSON.stringify(A[id]) !== JSON.stringify(x)) set[id] = x;
      for (const id of Object.keys(A)) if (!(id in N)) del.push(id);
      if (Object.keys(set).length || del.length) { d[k] = { set, del }; leer = false; }
    }
    for (const k of ['du', 'welt', 'partie']) if (JSON.stringify(alt[k]) !== JSON.stringify(neu[k])) { d[k] = neu[k]; leer = false; }
    if (leer) return null;
    d.t = neu.t;
    return d;
  },

  /** Rangliste: nur Spieler-Völker; KI und Stadtstaaten getrennt. */
  rangliste() {
    const zeile = (v) => {
      const st = this.staedteVon(v.id);
      const k = {
        gold: Math.round(v.gold || 0), militaer: this.militaerStaerke(v.id), staedte: st.length,
        bevoelkerung: st.reduce((a, s) => a + s.bev, 0), forschungen: this.forschungsAnzahl(v),
        gebiet: st.reduce((a, s) => a + (s.gebiet?.length || 0), 0), kultur: Math.round(v.kultur_gesamt || 0) + Math.round(this.raten(v.id).kultur * 24),
        wunder: Object.values(this.z.wunder).filter((w) => w.volk === v.id && w.fertig).length,
      };
      return { id: v.id, name: v.name, farbe: v.farbe, art: v.art, zeitalter: v.zeitalter || 0, online: this.istOnline(v.id), ...k, gesamt: gesamtWertung(k) };
    };
    return {
      spieler: this.alleVoelker().filter((v) => v.art === 'spieler').map(zeile),
      ki: this.alleVoelker().filter((v) => v.art === 'ki' || v.art === 'stadtstaat').map(zeile),
    };
  },

  /** Lesende Anfragen (ändern nichts): Bauliste, Kampfvorschau, Wegvorschau, Rangliste. */
  frage(vid, q) {
    const v = this.z.voelker[vid];
    pruefe(v && q && typeof q.art === 'string', 'Ungültige Anfrage.');
    if (q.art === 'rangliste') return this.rangliste();
    if (q.art === 'bauliste') {
      const s = this.z.staedte[q.stadt];
      pruefe(s && s.volk === vid, 'Das ist nicht deine Stadt.');
      const l = [];
      const add = (art, d) => {
        const grund = this.bauHindernis(s, art, d.id);
        if (grund && grund.startsWith('Dafür fehlt die Forschung') && !q.alle) return;
        if (grund && (grund.includes('steht hier schon') || grund.includes('bessere Stufe'))) return;
        const kosten = this.bauKosten(s, art, d.id);
        const k = this.kannBezahlen(v, kosten);
        l.push({ art, id: d.id, grund, kosten, fehlt: k.ok ? null : k.fehlt, dauer: this.bauDauerMs(s, art, d.id) });
      };
      for (const d of GEBAEUDE) if (d.id !== 'palast') add('gebaeude', d);
      for (const d of EINHEITEN) add('einheit', d);
      for (const d of WUNDER) add('wunder', d);
      return { stadt: s.id, liste: l };
    }
    if (q.art === 'kampfvorschau') {
      const e = this.z.einheiten[q.einheit];
      pruefe(e && e.volk === vid, 'Das ist nicht deine Einheit.');
      pruefe(this.sichtbareFelder(vid).has(q.ziel | 0), 'Das Ziel ist nicht sichtbar.');
      return this.kampfVorschau(e, q.ziel | 0);
    }
    if (q.art === 'weg') {
      const e = this.z.einheiten[q.einheit];
      pruefe(e && e.volk === vid, 'Das ist nicht deine Einheit.');
      const pfad = this.planeWeg(e, q.ziel | 0, { nachbar: !!q.nachbar, sicht: this.sichtbareFelder(vid) });
      return { pfad: pfad ? pfad.map((p) => p.f) : null, ankunft: pfad && pfad.length ? pfad[pfad.length - 1].t : null };
    }
    if (q.art === 'verbesserungen') {
      const e = this.z.einheiten[q.einheit];
      pruefe(e && e.volk === vid, 'Das ist nicht deine Einheit.');
      const l = [];
      for (const vb of Object.values(VERBESSERUNG)) {
        const grund = this.verbesserungHindernis(v, e.feld, vb.id, e);
        if (grund && (grund.startsWith('Nicht auf') || grund.startsWith('Das geht nur') || grund.startsWith('Dafür braucht das Feld') || grund.startsWith('Nur Arbeiter') || grund.startsWith('Wasser-Verbesserungen') || grund.includes('schon') || grund.startsWith('Dafür fehlt'))) continue;
        l.push({ id: vb.id, grund, dauer: this.verbesserungDauer(v, vb.id) });
      }
      return { liste: l };
    }
    if (q.art === 'stadtplatz') {
      const f = q.feld | 0;
      pruefe(this.istErkundet(this.nebel(vid), f), 'Dieses Feld ist noch unerforscht.');
      const g = this.stadtGruendenHindernis(vid, f);
      return { grund: g && /^Zu nah an /.test(g) && !this.alleStaedte().some((s) => this.istErkundet(this.nebel(vid), s.feld) && g.includes(s.name)) ? 'Zu nah an einer anderen Stadt.' : g };
    }
    pruefe(false, 'Unbekannte Anfrage.');
  },
};
