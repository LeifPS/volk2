// Wirtschaft: Felderträge, Stadterträge, Reichsraten, Integration über die Zeit, Wachstum, Grenzen, Unterhalt, Lager.
import { karte } from '../karte.js';
import { umkreis, abstand, nachbarn } from '../hex.js';
import { GELAENDE } from '../daten/gelaende.js';
import { ROHSTOFFE, LAGERGUETER, LAGER_NAMEN } from '../daten/rohstoffe.js';
import { GEB, WUNDER_NACH_ID, FORSCHUNG, ROHSTOFF, VERBESSERUNG, STADTSTAATEN } from '../daten/index.js';
import {
  STD, MIN, ERTRAG_FAKTOR as F, GOLD_FAKTOR, WISSEN_JE_EINWOHNER, NAHRUNG_PRO_EINWOHNER, BAUSTOFFE, STRATEGISCH, LAGER_BASIS_BAU, LAGER_BASIS_STRATEGISCH,
  STADT_RADIUS_ARBEIT, STADT_RADIUS_GRENZE_MAX, wachstumsBedarf, grenzKosten, zufriedenheitsFaktor, stadtUnzufriedenheit,
  freieEinheiten, freierGebaeudeUnterhalt, forschungsTempo, anfangsTempo, kiBoni, FORSCHUNGSABKOMMEN, HANDEL, STADTSTAAT,
} from '../regeln.js';
import { SpielFehler, pruefe } from './spiel.js';

const BONUS_SCHLUESSEL = ['wissenschaft_prozent', 'gold_prozent', 'produktion_prozent', 'kultur_prozent', 'nahrung_prozent', 'zufriedenheit',
  'tempo_land', 'tempo_see', 'heilung_prozent', 'stadt_staerke', 'stadt_hp', 'lager', 'unterhalt_rabatt', 'sicht', 'handel_gold_prozent',
  'grenzwachstum_prozent', 'bauzeit_prozent', 'arbeiter_tempo', 'erfahrung_prozent', 'bauplaetze', 'handelsrouten'];

export const wirtschaft = {
  /** Reichsweite Boni eines Volkes aus Forschung, Wundern, Stadtstaaten und Abkommen. */
  boni(v) {
    const b = Object.fromEntries(BONUS_SCHLUESSEL.map((k) => [k, 0]));
    for (const [id, n] of Object.entries(v.forschung.erforscht)) {
      const f = FORSCHUNG[id]; if (!f) continue;
      for (const fs of f.freischaltet) if (fs.art === 'bonus' && fs.id in b) b[fs.id] += (fs.wert || 0) * (f.wiederholbar ? n : 1);
    }
    for (const [wid, w] of Object.entries(this.z.wunder)) {
      if (w.volk !== v.id || !w.fertig) continue;
      const d = WUNDER_NACH_ID[wid]; if (!d || !d.reich) continue;
      for (const [k, x] of Object.entries(d.reich)) if (k in b) b[k] += x;
    }
    // Stadtstaaten: Freunde und Verbündete
    for (const ss of this.alleVoelker()) {
      if (ss.art !== 'stadtstaat') continue;
      const e = ss.einfluss?.[v.id] || 0;
      const def = STADTSTAATEN.find((x) => x.id === ss.vorlage); if (!def) continue;
      if (e >= STADTSTAAT.freund) for (const [k, x] of Object.entries(def.bonus || {})) if (k in b) b[k] += x;
      if (ss.verbuendet === v.id) for (const [k, x] of Object.entries(def.buendnis_bonus || {})) if (k in b) b[k] += x;
    }
    // Jahreszeit
    const jz = this.z.global.jahreszeit || 0;
    if (jz === 1) b.nahrung_prozent += 5; else if (jz === 3) b.nahrung_prozent -= 5; else if (jz === 2) b.gold_prozent += 5;
    return b;
  },

  /** Luxusgüter, auf die das Volk Zugriff hat (Set von Rohstoff-IDs) und die Anzahl Exemplare je Luxus. */
  luxusBestand(v) {
    const anzahl = {};
    for (const s of this.staedteVon(v.id)) for (const i of s.gebiet || []) {
      const r = this.erschlossenerRohstoff(i, v);
      if (r && r.art === 'luxus') anzahl[r.id] = (anzahl[r.id] || 0) + 1;
    }
    for (const l of v.luxus_handel || []) if (l.bis > this.t) anzahl[l.id] = (anzahl[l.id] || 0) + 1;
    for (const l of v.luxus_abgabe || []) if (l.bis > this.t && anzahl[l.id]) anzahl[l.id]--;
    return anzahl;
  },

  /** Kann das Volk diesen Rohstoff sehen (strategische erst mit Forschung)? */
  siehtRohstoff(v, r) { return !r.sichtbar_durch || !!v.forschung.erforscht[r.sichtbar_durch]; },

  /** Rohstoff auf Feld i, falls sichtbar und mit passender Verbesserung erschlossen (und nicht geplündert). */
  erschlossenerRohstoff(i, v) {
    const rn = karte().rohstoff[i]; if (!rn) return null;
    const r = ROHSTOFFE[rn - 1];
    if (!this.siehtRohstoff(v, r)) return null;
    const f = this.z.felder[i]; if (!f || !f.v) return null;
    if (f.pl && f.pl > this.t) return null;
    const vb = VERBESSERUNG[f.v];
    return vb && (vb.kette === r.verbesserung || r.verbesserung_alt?.includes(vb.kette)) ? r : null;
  },

  /** Ertrag eines Feldes für ein Volk (Grundwerte pro Stunde, vor Faktor). */
  feldErtrag(i, v, mitMaterial = true) {
    const k = karte();
    const g = GELAENDE[k.gelaende[i]];
    const e = { n: g.ertrag.n, p: g.ertrag.p, g: g.ertrag.g, w: g.wissen || 0, k: g.kultur || 0, material: {} };
    const f = this.z.felder[i];
    if (f && f.fo && f.fo > this.t) return { n: 0, p: 0, g: 0, w: 0, k: 0, material: {} };
    if (k.fluss[i] && !g.wasser) e.g += 1;
    if (mitMaterial && g.material) for (const [m, x] of Object.entries(g.material)) e.material[m] = (e.material[m] || 0) + x;
    const geplündert = f && f.pl && f.pl > this.t;
    if (f && f.v && !geplündert) {
      const vb = VERBESSERUNG[f.v];
      if (vb) {
        for (const x of ['n', 'p', 'g', 'w', 'k']) e[x] += vb.ertrag?.[x] || 0;
        if (mitMaterial && vb.material) for (const [m, x] of Object.entries(vb.material)) e.material[m] = (e.material[m] || 0) + x;
      }
    }
    if (f && f.w) { const w = VERBESSERUNG[f.w]; if (w) for (const x of ['n', 'p', 'g', 'w', 'k']) e[x] += w.ertrag?.[x] || 0; }
    const r = v ? this.erschlossenerRohstoff(i, v) : null;
    if (r) for (const x of ['n', 'p', 'g', 'w', 'k']) e[x] += r.ertrag?.[x] || 0;
    // Naturereignisse
    for (const ev of this.z.global.ereignisse || []) {
      if (!ev.aktiv || !ev.felder || !ev.betroffen?.includes(v?.id)) continue;
      this._evSets ||= new Map();
      let fs = this._evSets.get(ev.id);
      if (!fs) { fs = new Set(ev.felder); this._evSets.set(ev.id, fs); }
      if (fs.has(i)) e.n = Math.max(0, e.n + (ev.nahrung || 0));
    }
    return e;
  },

  /** Ertragsraten pro Stunde (gecacht) für ein Volk. */
  raten(vid) {
    const c = this._raten[vid];
    if (c) return c;
    const r = this.berechneRaten(vid);
    this._raten[vid] = r;
    return r;
  },

  berechneRaten(vid) {
    const v = this.z.voelker[vid];
    const staedte = this.staedteVon(vid);
    const b = this.boni(v);
    const lux = this.luxusBestand(v);
    const luxAnzahl = Object.keys(lux).length;
    const erg = { gold: 0, einnahmen: 0, wissenschaft: 0, kultur: 0, material: {}, kapazitaet: {}, staedte: {}, unterhalt: { einheiten: 0, gebaeude: 0 }, handel: 0, luxus: lux, boni: b, aufschluesselung: [] };
    for (const s of staedte) {
      const sr = this.stadtRaten(s, v, b, luxAnzahl, staedte.length);
      erg.staedte[s.id] = sr;
      erg.einnahmen += sr.g; erg.wissenschaft += sr.w; erg.kultur += sr.k;
      for (const [m, x] of Object.entries(sr.material)) erg.material[m] = (erg.material[m] || 0) + x;
      erg.unterhalt.gebaeude += sr.gebaeudeUnterhalt;
    }
    // Lieferungen aus erschlossenen Rohstoffen im Gebiet (Material, strategisch)
    for (const s of staedte) for (const i of s.gebiet || []) {
      const r = this.erschlossenerRohstoff(i, v);
      if (!r || !r.liefert) continue;
      const vb = VERBESSERUNG[this.z.felder[i].v];
      const lf = vb?.lieferfaktor || 1;
      for (const [m, x] of Object.entries(r.liefert)) erg.material[m] = (erg.material[m] || 0) + x * lf * (BAUSTOFFE.includes(m) ? F : 1);
    }
    // Handelsrouten
    for (const e of this.alleEinheiten()) {
      if (!e.route || !e.route.aktiv) continue;
      const von = this.z.staedte[e.route.von], nach = this.z.staedte[e.route.nach];
      if (!von || !nach) continue;
      const wert = this.routenWert(e.route);
      if (e.volk === vid) erg.handel += wert * (1 + b.handel_gold_prozent / 100);
      else if (nach.volk === vid && nach.volk !== e.volk) erg.handel += wert * HANDEL.zielAnteil;
    }
    // Tribute (Gold pro Stunde)
    for (const tr of this.z.global.tribute || []) {
      if (tr.bis <= this.t) continue;
      if (tr.an === vid) erg.handel += tr.gold;
      if (tr.von === vid) erg.handel -= tr.gold;
    }
    // Einheiten-Unterhalt mit großzügigem Freikontingent (die teuersten sind frei)
    const kosten = this.einheitenVon(vid).map((e) => this.einheitDaten(e)?.unterhalt || 0).filter((x) => x > 0).sort((a, c) => c - a);
    const frei = freieEinheiten(staedte.length);
    erg.unterhalt.einheiten = kosten.slice(frei).reduce((a, x) => a + x, 0);
    const rabatt = Math.min(75, Math.max(0, b.unterhalt_rabatt)) / 100;
    erg.unterhalt.einheiten *= 1 - rabatt; erg.unterhalt.gebaeude *= 1 - rabatt;
    erg.einnahmen += erg.handel;
    if (v.art === 'ki') erg.einnahmen *= 1 + kiBoni(v.ki?.stufe).gold / 100;
    erg.gold = erg.einnahmen - erg.unterhalt.einheiten - erg.unterhalt.gebaeude;
    if (v.abkommen_bis && v.abkommen_bis > this.t) erg.wissenschaft += FORSCHUNGSABKOMMEN.bonus;
    erg.wissenschaft *= 1; // Wissenschaftsprozente sind schon in den Städten enthalten
    // Lagerkapazität
    for (const gut of LAGERGUETER) {
      const basis = BAUSTOFFE.includes(gut) ? LAGER_BASIS_BAU : LAGER_BASIS_STRATEGISCH;
      let extra = 0;
      for (const s of staedte) for (const gid of Object.keys(s.gebaeude || {})) extra += GEB[gid]?.wirkung?.lager || 0;
      extra += b.lager;
      erg.kapazitaet[gut] = Math.round(basis + extra * (BAUSTOFFE.includes(gut) ? 10 : 1));
    }
    return erg;
  },

  /** Raten einer einzelnen Stadt. */
  stadtRaten(s, v, b, luxAnzahl, anzahlStaedte) {
    const zerstoert = s.zerstoert_bis && s.zerstoert_bis > this.t;
    const r = { n: 0, p: 0, g: 0, w: 0, k: 0, material: {}, verbrauch: 0, ueberschuss: 0, zufriedenheit: 0, gebaeudeUnterhalt: 0, felder: [] };
    // Stadtzentrum
    const zentrum = this.feldErtrag(s.feld, v, false);
    zentrum.n = Math.max(zentrum.n, 2) + 1; zentrum.p = Math.max(zentrum.p, 1) + 1; zentrum.g = Math.max(zentrum.g, 1) + 1;
    zentrum.material = { holz: 2, stein: 1 };
    const felder = [zentrum];
    for (const i of s.arbeit || []) felder.push(this.feldErtrag(i, v, true));
    for (const fe of felder) {
      r.n += fe.n; r.p += fe.p; r.g += fe.g; r.w += fe.w; r.k += fe.k;
      for (const [m, x] of Object.entries(fe.material)) r.material[m] = (r.material[m] || 0) + x;
    }
    // Einwohner: Grundwissen und -kultur
    r.w += s.bev * WISSEN_JE_EINWOHNER; r.k += 1;
    const pz = { n: b.nahrung_prozent, p: b.produktion_prozent, g: b.gold_prozent, w: b.wissenschaft_prozent, k: b.kultur_prozent };
    let zuf = 3 + luxAnzahl + b.zufriedenheit - stadtUnzufriedenheit(s.bev, anzahlStaedte);
    for (const gid of Object.keys(s.gebaeude || {})) {
      const d = GEB[gid]; if (!d) continue;
      const wk = d.wirkung || {};
      r.n += wk.nahrung || 0; r.p += wk.produktion || 0; r.g += wk.gold || 0; r.w += wk.wissenschaft || 0; r.k += wk.kultur || 0;
      zuf += wk.zufriedenheit || 0;
      pz.n += wk.nahrung_prozent || 0; pz.p += wk.produktion_prozent || 0; pz.g += wk.gold_prozent || 0; pz.w += wk.wissenschaft_prozent || 0; pz.k += wk.kultur_prozent || 0;
      if (wk.pro_einwohner) { r.w += (wk.pro_einwohner.w || 0) * s.bev; r.g += (wk.pro_einwohner.g || 0) * s.bev; r.k += (wk.pro_einwohner.k || 0) * s.bev; r.p += (wk.pro_einwohner.p || 0) * s.bev; }
      if (wk.material) for (const [m, x] of Object.entries(wk.material)) r.material[m] = (r.material[m] || 0) + x;
      r.gebaeudeUnterhalt += d.unterhalt || 0;
    }
    for (const [wid, w] of Object.entries(this.z.wunder)) {
      if (w.stadt !== s.id || !w.fertig) continue;
      const wk = WUNDER_NACH_ID[wid]?.wirkung || {};
      r.n += wk.nahrung || 0; r.p += wk.produktion || 0; r.g += wk.gold || 0; r.w += wk.wissenschaft || 0; r.k += wk.kultur || 0; zuf += wk.zufriedenheit || 0;
    }
    r.gebaeudeUnterhalt = Math.max(0, r.gebaeudeUnterhalt - freierGebaeudeUnterhalt(s.bev));
    r.zufriedenheit = Math.round(zuf);
    const zf = zufriedenheitsFaktor(r.zufriedenheit);
    const m = (x, p) => x * (1 + p / 100);
    r.n = m(r.n, pz.n) * F;
    r.p = m(r.p, pz.p) * zf;
    r.g = m(r.g, pz.g) * zf * GOLD_FAKTOR;
    r.w = m(r.w, pz.w) * zf;
    r.k = m(r.k, pz.k) * zf * F;
    for (const x of Object.keys(r.material)) r.material[x] *= F;
    r.verbrauch = s.bev * NAHRUNG_PRO_EINWOHNER * F;
    r.ueberschuss = r.n - r.verbrauch;
    if (r.ueberschuss > 0 && r.zufriedenheit < 0) r.ueberschuss *= 0.5;
    if (zerstoert) { r.p = 0; r.g = 0; r.w = 0; r.k = 0; r.material = {}; r.ueberschuss = Math.min(r.ueberschuss, 0); }
    // Kultur fürs Grenzwachstum (mit Bonus)
    r.grenzKultur = r.k * (1 + (b.grenzwachstum_prozent + this.gebaeudeSumme(s, 'grenzwachstum_prozent')) / 100);
    for (const x of ['n', 'p', 'g', 'w', 'k', 'verbrauch', 'ueberschuss', 'grenzKultur']) r[x] = Math.round(r[x] * 100) / 100;
    return r;
  },

  gebaeudeSumme(s, schluessel) {
    let x = 0;
    for (const gid of Object.keys(s.gebaeude || {})) x += GEB[gid]?.wirkung?.[schluessel] || 0;
    for (const [wid, w] of Object.entries(this.z.wunder)) if (w.stadt === s.id && w.fertig) x += WUNDER_NACH_ID[wid]?.wirkung?.[schluessel] || 0;
    return x;
  },

  /** Muss VOR jeder Änderung aufgerufen werden, die Erträge eines Volkes beeinflusst: rechnet bis jetzt ab und verwirft den Cache. */
  aendern(vid) {
    if (vid == null || !this.z.voelker[vid]) return;
    this.abrechnen(vid);
    delete this._raten[vid];
    this.markiere('v' + vid);
  },
  /** Alle Völker abrechnen und Caches verwerfen (z. B. bei Jahreszeitwechsel). */
  allesAendern() { for (const v of this.alleVoelker()) this.aendern(v.id); },

  /** Integriert Gold, Lager, Forschung, Nahrung und Kultur vom letzten Stand bis zur aktuellen Zeit. */
  abrechnen(vid) {
    const v = this.z.voelker[vid];
    if (!v) return;
    const dt = this.t - (v.stand_um ?? this.t);
    if (dt <= 0) { v.stand_um = this.t; return; }
    const r = this.raten(vid);
    const h = dt / STD;
    // Gold friert bei 0 ein
    v.gold = Math.max(0, (v.gold || 0) + r.gold * h);
    v.kultur_gesamt = (v.kultur_gesamt || 0) + r.kultur * h;
    v.lager = v.lager || {};
    for (const gut of LAGERGUETER) {
      const zu = r.material[gut] || 0;
      if (!zu) continue;
      const cap = r.kapazitaet[gut];
      const alt = v.lager[gut] || 0;
      v.lager[gut] = alt >= cap ? alt : Math.min(cap, alt + zu * h);
    }
    // Forschung
    const fo = v.forschung;
    if (fo.aktiv) {
      const d = this.forschungsDauerMs(v, fo.aktiv, r.wissenschaft);
      fo.fortschritt = Math.min(1, (fo.fortschritt || 0) + dt / d);
    }
    // Städte
    for (const s of this.staedteVon(vid)) {
      const sr = r.staedte[s.id]; if (!sr) continue;
      s.nahrung = Math.max(0, (s.nahrung || 0) + sr.ueberschuss * h);
      s.kultur = (s.kultur || 0) + sr.grenzKultur * h;
      this.markiere('s' + s.id);
    }
    v.stand_um = this.t;
    this.markiere('v' + vid);
  },

  forschungsDauerMs(v, id, wissenschaft) {
    const f = FORSCHUNG[id];
    let dauer = f.dauer;
    if (f.wiederholbar) dauer *= 1 + 0.15 * (v.forschung.erforscht[id] || 0);
    const kiFaktor = v.art === 'ki' ? 100 / Math.max(10, 100 + kiBoni(v.ki?.stufe).forschung) : 1;
    return dauer * 1000 * kiFaktor / anfangsTempo(f.zeitalter || 0) / forschungsTempo(wissenschaft);
  },

  // ---------- Wachstum ----------
  wachstumsZeit(s) {
    const v = this.z.voelker[s.volk]; if (!v) return null;
    const r = this.raten(s.volk).staedte[s.id]; if (!r) return null;
    const stand = v.stand_um ?? this.t;
    if (r.ueberschuss > 0) {
      const fehlt = wachstumsBedarf(s.bev) - (s.nahrung || 0);
      return Math.ceil(stand + Math.max(0, fehlt) / r.ueberschuss * STD);
    }
    if (r.ueberschuss < 0 && s.bev > 1) return Math.ceil(stand + Math.max(0, s.nahrung || 0) / -r.ueberschuss * STD);
    return null;
  },

  wachstum(sid) {
    const s = this.z.staedte[sid]; if (!s) return;
    this.aendern(s.volk);
    const bedarf = wachstumsBedarf(s.bev);
    const r = this.raten(s.volk).staedte[sid];
    if (r.ueberschuss > 0 && (s.nahrung || 0) >= bedarf - 0.01) {
      const behalt = Math.min(60, this.gebaeudeSumme(s, 'wachstum_behalt')) / 100;
      s.nahrung = bedarf * behalt;
      s.bev++;
      this.meldung(s.volk, `${s.name} ist auf ${s.bev} Einwohner gewachsen.`, { art: 'stadt', feld: s.feld });
    } else if (r.ueberschuss < 0 && s.bev > 1 && (s.nahrung || 0) <= 0.01) {
      s.bev--;
      s.nahrung = wachstumsBedarf(s.bev) * 0.5;
      this.meldung(s.volk, `In ${s.name} hungern die Menschen: Die Stadt ist auf ${s.bev} Einwohner geschrumpft.`, { art: 'warnung', feld: s.feld, wichtig: true });
    } else {
      s.nahrung = Math.min(s.nahrung || 0, bedarf);
      delete this._raten[s.volk];
      return;
    }
    this.handelspartnerAendern(s.id);
    if (!s.manuell) this.autoBewirtschaften(s); else this.manuellPruefen(s);
    this.markiere('s' + sid);
    delete this._raten[s.volk];
  },

  // ---------- Grenzen ----------
  grenzZeit(s) {
    const v = this.z.voelker[s.volk]; if (!v) return null;
    if (s.grenze_voll) return null;
    const r = this.raten(s.volk).staedte[s.id]; if (!r || r.grenzKultur <= 0) return null;
    const fehlt = grenzKosten(s.grenz_k || 0) - (s.kultur || 0);
    return Math.ceil((v.stand_um ?? this.t) + Math.max(0, fehlt) / r.grenzKultur * STD);
  },

  grenzwachstum(sid) {
    const s = this.z.staedte[sid]; if (!s) return;
    this.aendern(s.volk);
    const kosten = grenzKosten(s.grenz_k || 0);
    if ((s.kultur || 0) < kosten - 0.01) { delete this._raten[s.volk]; return; }
    const f = this.bestesGrenzfeld(s);
    if (f < 0) { s.grenze_voll = true; this.markiere('s' + sid); return; }
    s.kultur = Math.max(0, (s.kultur || 0) - kosten);
    s.grenz_k = (s.grenz_k || 0) + 1;
    this.feldUebernehmen(s, f);
    this.meldung(s.volk, `Die Grenzen von ${s.name} sind gewachsen.`, { art: 'stadt', feld: f });
    if (!s.manuell) this.autoBewirtschaften(s);
    delete this._raten[s.volk];
  },

  /** Nächstes Feld für die Grenzerweiterung (wie in Civ: das wertvollste angrenzende freie Feld). */
  bestesGrenzfeld(s) {
    const k = karte();
    const eigen = new Set(s.gebiet);
    let best = -1, bestW = -Infinity;
    const v = this.z.voelker[s.volk];
    for (const i of s.gebiet) for (const n of nachbarn(i)) {
      if (eigen.has(n) || this.z.felder[n]?.s) continue;
      const d = abstand(s.feld, n);
      if (d > STADT_RADIUS_GRENZE_MAX) continue;
      const e = this.feldErtrag(n, v, false);
      const rn = k.rohstoff[n];
      let w = e.n * 3 + e.p * 2 + e.g * 2 + e.w * 2 + e.k + (rn && this.siehtRohstoff(v, ROHSTOFFE[rn - 1]) ? 6 : 0) - d * 2.5;
      if (GELAENDE[k.gelaende[n]].tief) w -= 4;
      w += (n % 7) * 0.001; // deterministischer Gleichstandsbrecher
      if (w > bestW) { bestW = w; best = n; }
    }
    return best;
  },

  feldUebernehmen(s, i) {
    const alt = this.z.felder[i]?.s;
    if (alt && alt !== s.id) {
      const as = this.z.staedte[alt];
      if (as) { as.gebiet = as.gebiet.filter((x) => x !== i); as.arbeit = (as.arbeit || []).filter((x) => x !== i); this.markiere('s' + alt); }
    }
    this.setzeFeld(i, { s: s.id });
    if (!s.gebiet.includes(i)) s.gebiet.push(i);
    s.grenze_voll = false;
    this.markiere('s' + s.id);
    this.erkunde(s.volk, i, 1);
  },

  // ---------- Bewirtschaftung ----------
  feldWert(i, v, s) {
    const e = this.feldErtrag(i, v, true);
    const mat = Object.values(e.material).reduce((a, x) => a + x, 0);
    const hunger = s && this.raten(s.volk).staedte[s.id]?.ueberschuss < 6 ? 1.5 : 1;
    return e.n * 3 * hunger + e.p * 2 + e.g * 1.6 + e.w * 2 + e.k * 1.2 + mat * 0.8;
  },

  autoBewirtschaften(s) {
    const v = this.z.voelker[s.volk];
    const kandidaten = (s.gebiet || []).filter((i) => i !== s.feld && abstand(s.feld, i) <= STADT_RADIUS_ARBEIT && !this.feindBesetzt(i, s.volk));
    kandidaten.sort((a, b) => this.feldWert(b, v, null) - this.feldWert(a, v, null) || a - b);
    s.arbeit = kandidaten.slice(0, s.bev);
    s.manuell = false;
    this.markiere('s' + s.id);
  },

  manuellPruefen(s) {
    const g = new Set(s.gebiet);
    s.arbeit = (s.arbeit || []).filter((i) => g.has(i) && i !== s.feld).slice(0, s.bev);
    // freie Einwohner automatisch einsetzen
    if (s.arbeit.length < s.bev) {
      const v = this.z.voelker[s.volk];
      const frei = s.gebiet.filter((i) => i !== s.feld && !s.arbeit.includes(i) && abstand(s.feld, i) <= STADT_RADIUS_ARBEIT && !this.feindBesetzt(i, s.volk));
      frei.sort((a, b) => this.feldWert(b, v, null) - this.feldWert(a, v, null) || a - b);
      s.arbeit.push(...frei.slice(0, s.bev - s.arbeit.length));
    }
  },

  feindBesetzt(i, vid) {
    return this.einheitenAuf(i).some((e) => e.volk !== vid && this.imKrieg(e.volk, vid));
  },

  befehl_feld_bewirtschaften(v, b) {
    const s = this.z.staedte[b.stadt];
    pruefe(s && s.volk === v.id, 'Das ist nicht deine Stadt.');
    const i = b.feld | 0;
    pruefe(s.gebiet.includes(i) && i !== s.feld, 'Dieses Feld gehört nicht zu dieser Stadt.');
    pruefe(abstand(s.feld, i) <= STADT_RADIUS_ARBEIT, `Einwohner können nur Felder im Umkreis von ${STADT_RADIUS_ARBEIT} bewirtschaften.`);
    this.aendern(v.id);
    s.manuell = true;
    s.arbeit = s.arbeit || [];
    if (b.an) {
      if (!s.arbeit.includes(i)) {
        if (s.arbeit.length >= s.bev) s.arbeit.shift();
        s.arbeit.push(i);
      }
    } else s.arbeit = s.arbeit.filter((x) => x !== i);
    this.markiere('s' + s.id);
  },

  befehl_auto_bewirtschaften(v, b) {
    const s = this.z.staedte[b.stadt];
    pruefe(s && s.volk === v.id, 'Das ist nicht deine Stadt.');
    this.aendern(v.id);
    this.autoBewirtschaften(s);
  },

  // ---------- Bezahlen ----------
  /** Prüft, ob das Volk die Kosten bezahlen kann. Liefert { ok, fehlt: {gut: menge} }. */
  kannBezahlen(v, kosten) {
    const fehlt = {};
    for (const [gut, x] of Object.entries(kosten || {})) {
      if (gut === 'zeit' || !x) continue;
      const hat = gut === 'gold' ? v.gold : (v.lager?.[gut] || 0);
      if (hat + 1e-6 < x) fehlt[gut] = Math.ceil(x - hat);
    }
    return { ok: Object.keys(fehlt).length === 0, fehlt };
  },

  fehltText(kosten, fehlt) {
    const teile = Object.entries(fehlt).map(([gut, n]) => `${Math.ceil(kosten[gut])} ${LAGER_NAMEN[gut] || gut} (dir fehlen ${n})`);
    return 'Du brauchst ' + teile.join(', ') + '.';
  },

  bezahle(v, kosten) {
    this.aendern(v.id);
    const k = this.kannBezahlen(v, kosten);
    if (!k.ok) throw new SpielFehler(this.fehltText(kosten, k.fehlt));
    const bezahlt = {};
    for (const [gut, x] of Object.entries(kosten || {})) {
      if (gut === 'zeit' || !x) continue;
      if (gut === 'gold') v.gold -= x; else v.lager[gut] -= x;
      bezahlt[gut] = x;
    }
    this.markiere('v' + v.id);
    return bezahlt;
  },

  erstatte(v, bezahlt, anteil) {
    if (!v || !bezahlt) return;
    this.aendern(v.id);
    for (const [gut, x] of Object.entries(bezahlt)) {
      const y = Math.floor(x * anteil);
      if (gut === 'gold') v.gold += y; else v.lager[gut] = (v.lager[gut] || 0) + y;
    }
    this.markiere('v' + v.id);
  },

  /** Zeitpunkt, an dem das Volk die Kosten bei den aktuellen Raten bezahlen kann (oder null, wenn nie). */
  materialZeit(v, kosten) {
    const r = this.raten(v.id);
    let t = this.t;
    for (const [gut, x] of Object.entries(kosten || {})) {
      if (gut === 'zeit' || !x) continue;
      const hat = gut === 'gold' ? v.gold : (v.lager?.[gut] || 0);
      if (hat >= x) continue;
      const rate = gut === 'gold' ? r.gold : (r.material[gut] || 0);
      if (rate <= 0) return null;
      if (gut !== 'gold' && r.kapazitaet[gut] < x) return null;
      t = Math.max(t, (v.stand_um ?? this.t) + (x - hat) / rate * STD);
    }
    return Math.max(Math.ceil(t) + 1000, this.t + 60 * 1000);
  },

  // ---------- Goldmangel ----------
  goldNullZeit(v) {
    if (v.art !== 'spieler') return null;
    const r = this.raten(v.id);
    if (r.gold >= 0 || v.gold <= 0 || v.mangel_seit) return null;
    return Math.ceil((v.stand_um ?? this.t) + v.gold / -r.gold * STD);
  },

  goldNull(vid) {
    const v = this.z.voelker[vid];
    this.aendern(vid);
    v.gold = 0;
    v.mangel_seit = this.t;
    v.mangel_stufe = 0;
    v.mangel_um = this.t + 2 * STD;
    this.meldung(vid, 'Deine Schatzkammer ist leer! Dein Unterhalt ist höher als deine Einnahmen. Baue Märkte, richte Handelsrouten ein oder löse Einheiten auf. In 2 Stunden werden deine schwächsten Einheiten geschwächt (nur solange du online bist).', { art: 'warnung', wichtig: true });
    this.markiere('v' + vid);
  },

  /** Folgen des Goldmangels: nur wenn der Spieler online ist oder nach langer Gnadenfrist; offline wird nie etwas aufgelöst. */
  mangelSchritt(vid) {
    const v = this.z.voelker[vid];
    this.aendern(vid);
    const r = this.raten(vid);
    if (v.gold > 1 || r.gold >= 0) { v.mangel_seit = null; v.mangel_um = null; v.mangel_stufe = 0; for (const e of this.einheitenVon(vid)) if (e.unterversorgt) { e.unterversorgt = false; this.markiere('e' + e.id); } this.meldung(vid, 'Deine Finanzen sind wieder in Ordnung.'); return; }
    const online = this.istOnline(vid);
    if (!online) { v.mangel_um = this.t + 30 * MIN; this.markiere('v' + vid); return; }
    v.mangel_stufe = (v.mangel_stufe || 0) + 1;
    const mil = this.einheitenVon(vid).filter((e) => { const d = this.einheitDaten(e); return d && !['zivil', 'spaeher', 'haendler', 'see_zivil'].includes(d.klasse); });
    mil.sort((a, b) => (this.einheitDaten(a).staerke - this.einheitDaten(b).staerke) || a.id - b.id);
    if (v.mangel_stufe <= 2) {
      const ziel = mil.find((e) => !e.unterversorgt);
      if (ziel) { ziel.unterversorgt = true; this.markiere('e' + ziel.id); this.meldung(vid, `Geldmangel: ${this.einheitDaten(ziel).name} ist unterversorgt (schwächer, heilt nicht).`, { art: 'warnung', feld: ziel.feld, wichtig: true }); }
      v.mangel_um = this.t + STD;
    } else {
      const ziel = mil[0];
      if (ziel) { this.meldung(vid, `Geldmangel: ${this.einheitDaten(ziel).name} wurde aufgelöst, weil kein Sold mehr gezahlt werden konnte.`, { art: 'warnung', feld: ziel.feld, wichtig: true }); this.einheitEntfernen(ziel.id); }
      v.mangel_um = this.t + 2 * STD;
    }
    this.markiere('v' + vid);
  },

  /** Kurzbeschreibung des Einkommens (für die eine klare Zeile in der Oberfläche). */
  einkommensZeile(vid) {
    const r = this.raten(vid);
    return { netto: r.gold, einnahmen: r.einnahmen, unterhalt: r.unterhalt.einheiten + r.unterhalt.gebaeude, einheiten: r.unterhalt.einheiten, gebaeude: r.unterhalt.gebaeude, handel: r.handel };
  },

  /** Volk-Raten neu berechnen, wenn sich eine Stadt mit Handelsrouten ändert (Routenwert hängt von den Einwohnern ab). */
  handelspartnerAendern(sid) {
    for (const e of this.alleEinheiten()) if (e.route && e.route.aktiv && (e.route.von === sid || e.route.nach === sid)) {
      this.aendern(e.volk);
      const z = this.z.staedte[e.route.nach]; if (z && z.volk !== e.volk) this.aendern(z.volk);
    }
  },

  /** Plant einen Zeitpunkt, an dem sich Erträge eines Volkes von selbst ändern (Plünderung, Fallout, Zerstörung, Luxus, Tribut). */
  ablaufPlanen(vid, t) {
    if (vid == null || !t || t <= this.t) return;
    const g = this.z.global;
    (g.ablaeufe ||= []).push({ volk: vid, t });
    this.markiere('g');
  },
  ablaufFaellig() {
    const g = this.z.global;
    const jetzt = (g.ablaeufe || []).filter((a) => a.t <= this.t);
    g.ablaeufe = (g.ablaeufe || []).filter((a) => a.t > this.t);
    for (const a of jetzt) if (this.z.voelker[a.volk]) { this.aendern(a.volk); delete this._raten[a.volk]; }
    this.markiere('g');
  },

  routenWert(route) {
    const von = this.z.staedte[route.von], nach = this.z.staedte[route.nach];
    if (!von || !nach) return 0;
    const d = abstand(von.feld, nach.feld);
    let w = HANDEL.grundGold + d * HANDEL.jeFeld + (von.bev + nach.bev) * 0.3;
    if (von.volk !== nach.volk) w *= HANDEL.fremdBonus;
    return Math.round(w * GOLD_FAKTOR * 10) / 10;
  },

  /** Bevölkerungsumkreis für neue Städte (Startgebiet Radius 1). */
  startGebiet(feld) { return umkreis(feld, 1); },
};
