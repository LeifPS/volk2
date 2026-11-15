// Diplomatie, Online-/Offline-Schutz, Angebote (Frieden, Grenzen, Bündnis, Abkommen, Tausch, Tribut), Handelsrouten, Stadtstaaten.
import { abstand, umkreis } from '../hex.js';
import { EINHEIT, FREIGESCHALTET_DURCH } from '../daten/index.js';
import { SCHUTZ, STD, MIN, FORSCHUNGSABKOMMEN, STADTSTAAT, TAG } from '../regeln.js';
import { LAGERGUETER, LAGER_NAMEN, ROHSTOFF_NACH_ID } from '../daten/rohstoffe.js';
import { pruefe } from './spiel.js';
import { istMilitaer } from './einheiten.js';

const IMMER_ONLINE = new Set(['ki', 'stadtstaat', 'barbar', 'tiere']);

export const diplomatie = {
  diploSchluessel(a, b) { return a < b ? a + '|' + b : b + '|' + a; },
  diplo(a, b) {
    const k = this.diploSchluessel(a, b);
    let d = this.z.diplomatie[k];
    if (!d) { d = { krieg: false }; this.z.diplomatie[k] = d; }
    return d;
  },
  imKrieg(a, b) {
    if (a === b) return false;
    const va = this.z.voelker[a], vb = this.z.voelker[b];
    if (!va || !vb) return false;
    if (va.art === 'barbar' || vb.art === 'barbar' || va.art === 'tiere' || vb.art === 'tiere') return true;
    const d = this.z.diplomatie[this.diploSchluessel(a, b)];
    return !!(d && d.krieg);
  },
  verbuendet(a, b) {
    if (a === b) return true;
    const d = this.z.diplomatie[this.diploSchluessel(a, b)];
    return !!(d && d.buendnis);
  },

  // ---------- Online-Status ----------
  /** Online = aktive Verbindung oder Aktivität in den letzten 10 Minuten. KI, Stadtstaaten, Barbaren gelten immer als online. */
  istOnline(vid) {
    const v = this.z.voelker[vid];
    if (!v) return false;
    if (IMMER_ONLINE.has(v.art) || this.z.global.partie) return true;
    return (v.verbunden || 0) > 0 || this.t - (v.letzte_aktivitaet || 0) <= SCHUTZ.onlineFenster;
  },
  /** Darf man diesem (kriegführenden) Spieler gerade schaden? Waffenruhe nach 30 min offline, 10 min Schonfrist nach Rückkehr. */
  angreifbar(vid) {
    const v = this.z.voelker[vid];
    if (!v) return false;
    if (IMMER_ONLINE.has(v.art) || this.z.global.partie) return true;
    if ((v.verbunden || 0) > 0) return this.t >= (v.schonfrist_bis || 0);
    const weg = Math.max(v.getrennt_seit || 0, v.letzte_aktivitaet || 0);
    return this.t - weg < SCHUTZ.waffenruheNach;
  },
  /** Wird vom Server beim Verbinden/Trennen eines Spielers aufgerufen. */
  verbindung(vid, an) {
    const v = this.z.voelker[vid];
    if (!v) return;
    if (an) {
      if (!(v.verbunden > 0)) {
        const weg = Math.max(v.getrennt_seit || 0, v.letzte_aktivitaet || 0);
        if (weg && this.t - weg >= SCHUTZ.waffenruheNach && this.hatKrieg(vid)) {
          v.schonfrist_bis = this.t + SCHUTZ.schonfrist;
          for (const g of this.kriegsgegner(vid)) this.meldung(g, `${v.name} ist wieder online. Nach 10 Minuten Schonfrist gilt der Krieg wieder.`, { art: 'diplomatie' });
        }
        v.online_seit = this.t;
        v.zuletzt_gesehen_vorher = v.zuletzt_gesehen || null;
      }
      v.verbunden = (v.verbunden || 0) + 1;
      v.letzte_aktivitaet = this.t;
    } else {
      v.verbunden = Math.max(0, (v.verbunden || 0) - 1);
      if (!v.verbunden) {
        v.getrennt_seit = this.t; v.zuletzt_gesehen = this.t;
        // Offline schützt: laufende Naturereignisse wirken nicht mehr auf dieses Volk
        for (const ev of this.z.global.ereignisse || []) if (ev.aktiv && ev.betroffen?.includes(vid)) { this.aendern(vid); ev.betroffen = ev.betroffen.filter((x) => x !== vid); delete this._raten[vid]; this.markiere('g'); }
      }
    }
    this.markiere('v' + vid);
  },
  hatKrieg(vid) { return this.kriegsgegner(vid).length > 0; },
  kriegsgegner(vid) {
    const l = [];
    for (const [k, d] of Object.entries(this.z.diplomatie)) {
      if (!d.krieg) continue;
      const [a, b] = k.split('|').map(Number);
      if (a === vid) l.push(b); else if (b === vid) l.push(a);
    }
    return l;
  },

  /** Kontakte: Wer etwas von einem anderen Volk sieht, kennt es. */
  kontaktePruefen(vid, mitte, radius) {
    const v = this.z.voelker[vid];
    if (!v || v.art !== 'spieler' && v.art !== 'ki') return;
    v.bekannt = v.bekannt || {};
    for (const i of umkreis(mitte, radius)) {
      let w = this.besitzer(i);
      if (w == null) { const e = this.einheitenAuf(i).find((x) => x.volk !== vid); if (e) w = e.volk; }
      if (w == null || w === vid || v.bekannt[w]) continue;
      const o = this.z.voelker[w];
      if (!o || o.art === 'tiere' || o.art === 'barbar') continue;
      v.bekannt[w] = this.t;
      o.bekannt = o.bekannt || {}; if (!o.bekannt[vid]) o.bekannt[vid] = this.t;
      this.markiere('v' + w);
      this.meldung(vid, `Erstkontakt: Du hast ${o.name} getroffen${o.art === 'stadtstaat' ? ' (Stadtstaat)' : o.art === 'ki' ? '' : ' (Spieler)'}.`, { art: 'diplomatie', feld: i });
      this.meldung(w, `Erstkontakt: ${v.name} hat dich entdeckt.`, { art: 'diplomatie' });
    }
  },
  kennt(a, b) { const v = this.z.voelker[a]; return !!(v && v.bekannt && v.bekannt[b]); },

  // ---------- Krieg ----------
  befehl_krieg_erklaeren(v, b) {
    const o = this.z.voelker[b.volk];
    pruefe(o && o.id !== v.id, 'Unbekanntes Volk.');
    pruefe(o.art !== 'barbar' && o.art !== 'tiere', 'Mit Barbaren ist man ohnehin im Krieg.');
    pruefe(this.kennt(v.id, o.id), 'Du kennst dieses Volk noch nicht.');
    pruefe(this.hatOption(v, 'krieg'), `Kriegserklärungen erfordern die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['option:krieg'])}".`);
    pruefe(!this.imKrieg(v.id, o.id), 'Ihr seid schon im Krieg.');
    pruefe(!(o.schutz_bis > this.t), `${o.name} steht noch unter Neulingsschutz (24 Stunden nach der Gründung).`);
    if (o.art === 'spieler') pruefe(this.istOnline(o.id), `${o.name} ist gerade offline. Krieg darf man nur Spielern erklären, die online sind.`);
    if (v.schutz_bis > this.t) pruefe(b.bestaetigt, 'Mit einer Kriegserklärung endet dein eigener Neulingsschutz sofort. Bitte bestätigen.');
    const d = this.diplo(v.id, o.id);
    if (d.buendnis) this.meldung(o.id, `${v.name} hat das Bündnis gebrochen.`, { art: 'diplomatie', wichtig: true });
    this.aendern(v.id); this.aendern(o.id);
    if (v.schutz_bis > this.t) { v.schutz_bis = this.t; this.meldung(v.id, 'Dein Neulingsschutz ist beendet.', { art: 'diplomatie' }); }
    Object.assign(d, { krieg: true, seit: this.t, letzter_kampf: this.t, offene_grenzen: false, buendnis: false, auto_vorschlag: null });
    this.markiere('d' + this.diploSchluessel(v.id, o.id));
    for (const [id, a] of Object.entries(this.z.angebote)) if ((a.von === v.id && a.an === o.id) || (a.von === o.id && a.an === v.id)) { delete this.z.angebote[id]; this.markiere('a' + id); }
    // Einheiten im Gebiet des anderen bleiben, wo sie sind; Handelsrouten zwischen beiden enden
    for (const e of this.alleEinheiten()) if (e.route) { const n = this.z.staedte[e.route.nach], h = this.z.staedte[e.route.von]; if (n && h && ((n.volk === o.id && e.volk === v.id) || (n.volk === v.id && e.volk === o.id))) this.routeBeenden(e, 'Die Handelsroute endet wegen des Krieges.'); }
    this.meldung(o.id, `${v.name} hat dir den Krieg erklärt!`, { art: 'krieg', wichtig: true });
    this.meldung(v.id, `Du hast ${o.name} den Krieg erklärt.`, { art: 'krieg' });
    for (const x of this.alleVoelker()) if (x.id !== v.id && x.id !== o.id && x.art === 'spieler' && this.kennt(x.id, v.id)) this.meldung(x.id, `${v.name} hat ${o.name} den Krieg erklärt.`, { art: 'krieg' });
    if (o.art === 'ki' || o.art === 'stadtstaat') this.kiKraenkung?.(o.id, v.id, 20);
    this.diploTimer();
    delete this._raten[v.id]; delete this._raten[o.id];
  },

  diploTimer() { if (!this.z.global.diplo_um || this.z.global.diplo_um > this.t + STD) { this.z.global.diplo_um = this.t + STD; this.markiere('g'); } },

  /** Stündliche Prüfung: Friedensvorschläge nach 12 h ohne Kampf, Einfluss-Verfall, abgelaufene Angebote. */
  diplomatiePruefung() {
    const g = this.z.global;
    g.diplo_um = this.t + STD;
    this.markiere('g');
    for (const [k, d] of Object.entries(this.z.diplomatie)) {
      if (!d.krieg) continue;
      const [a, b] = k.split('|').map(Number);
      if (this.t - (d.letzter_kampf || d.seit || 0) >= SCHUTZ.friedensvorschlagNach && !d.auto_vorschlag) {
        const id = this.neueId();
        this.z.angebote[id] = { id, von: null, an: null, parteien: [a, b], zustimmung: {}, art: 'frieden', t: this.t, auto: true };
        d.auto_vorschlag = id;
        this.markiere('a' + id); this.markiere('d' + k);
        for (const x of [a, b]) this.meldung(x, `Seit 12 Stunden gab es keine Kämpfe zwischen ${this.z.voelker[a]?.name} und ${this.z.voelker[b]?.name}. Das Spiel schlägt Frieden vor: Beide müssen zustimmen.`, { art: 'diplomatie', wichtig: true });
        for (const x of [a, b]) if (this.z.voelker[x]?.art !== 'spieler') this.kiAngebotPruefen?.(this.z.angebote[id], x);
      }
    }
    // Stadtstaaten-Einfluss verfällt langsam
    for (const ss of this.alleVoelker()) {
      if (ss.art !== 'stadtstaat' || !ss.einfluss) continue;
      let ae = false;
      for (const [vid, e] of Object.entries(ss.einfluss)) {
        if (e <= 0) continue;
        const neu = Math.max(0, e - STADTSTAAT.verfallProStunde);
        if ((e >= STADTSTAAT.freund) !== (neu >= STADTSTAAT.freund)) { this.aendern(+vid); this.meldung(+vid, `Die Freundschaft mit ${ss.name} ist abgekühlt. Ein Geschenk würde helfen.`, { art: 'diplomatie' }); }
        ss.einfluss[vid] = neu; ae = true;
      }
      if (ss.verbuendet && (ss.einfluss[ss.verbuendet] || 0) < STADTSTAAT.verbuendet) { this.aendern(ss.verbuendet); this.meldung(ss.verbuendet, `${ss.name} ist nicht mehr mit dir verbündet.`, { art: 'diplomatie' }); ss.verbuendet = null; }
      if (ae) this.markiere('v' + ss.id);
    }
    // abgelaufene Angebote (7 Tage) und Handelsgüter
    for (const [id, a] of Object.entries(this.z.angebote)) if (this.t - a.t > 7 * TAG) {
      if (a.auto && a.parteien) { const d = this.z.diplomatie[this.diploSchluessel(a.parteien[0], a.parteien[1])]; if (d) { d.auto_vorschlag = null; d.letzter_kampf = this.t; this.markiere('d' + this.diploSchluessel(a.parteien[0], a.parteien[1])); } }
      delete this.z.angebote[id]; this.markiere('a' + id);
    }
    for (const v of this.alleVoelker()) {
      const vor = (v.luxus_handel || []).length + (v.luxus_abgabe || []).length;
      if (!vor) continue;
      const lh = (v.luxus_handel || []).filter((l) => l.bis > this.t), la = (v.luxus_abgabe || []).filter((l) => l.bis > this.t);
      if (lh.length + la.length !== vor) { this.aendern(v.id); v.luxus_handel = lh; v.luxus_abgabe = la; delete this._raten[v.id]; }
    }
    if (g.tribute) { const n = g.tribute.filter((t) => t.bis > this.t); if (n.length !== g.tribute.length) { for (const t of g.tribute) if (t.bis <= this.t) { this.aendern(t.von); this.aendern(t.an); delete this._raten[t.von]; delete this._raten[t.an]; } g.tribute = n; } }
  },

  // ---------- Angebote ----------
  befehl_diplomatie_angebot(v, b) {
    const o = this.z.voelker[b.an];
    pruefe(o && o.id !== v.id && o.art !== 'barbar' && o.art !== 'tiere', 'Unbekanntes Volk.');
    pruefe(this.kennt(v.id, o.id), 'Du kennst dieses Volk noch nicht.');
    const d = this.diplo(v.id, o.id);
    const art = b.typ;
    const optionen = { frieden: 'frieden', offene_grenzen: 'offene_grenzen', buendnis: 'buendnis', forschungsabkommen: 'forschungsabkommen' };
    pruefe(optionen[art], 'Unbekanntes Angebot.');
    pruefe(this.hatOption(v, optionen[art]), `Dafür fehlt die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['option:' + optionen[art]])}".`);
    if (art === 'frieden') pruefe(d.krieg, 'Ihr seid nicht im Krieg.');
    else pruefe(!d.krieg, 'Im Krieg geht das nicht. Schließt zuerst Frieden.');
    if (art === 'offene_grenzen') pruefe(!d.offene_grenzen, 'Die Grenzen sind schon offen.');
    if (art === 'buendnis') pruefe(!d.buendnis, 'Ihr seid schon verbündet.');
    if (art === 'forschungsabkommen') {
      pruefe(!(v.abkommen_bis > this.t), 'Du hast schon ein laufendes Forschungsabkommen.');
      pruefe(o.art !== 'stadtstaat', 'Mit Stadtstaaten gibt es keine Forschungsabkommen.');
    }
    if (o.art === 'stadtstaat') pruefe(art === 'frieden', 'Stadtstaaten gewinnt man mit Geschenken (Einfluss), nicht mit Verträgen.');
    for (const a of Object.values(this.z.angebote)) pruefe(!(a.von === v.id && a.an === o.id && a.art === art), 'Dieses Angebot liegt schon vor.');
    const id = this.neueId();
    const kosten = art === 'forschungsabkommen' ? this.abkommenKosten(v, o) : 0;
    if (kosten) pruefe(v.gold >= kosten, `Ein Forschungsabkommen kostet beide Seiten je ${kosten} Gold.`);
    this.z.angebote[id] = { id, von: v.id, an: o.id, art, t: this.t, kosten };
    this.markiere('a' + id);
    this.meldung(o.id, `${v.name} bietet dir an: ${this.angebotName(art)}.`, { art: 'diplomatie', wichtig: true });
    if (o.art !== 'spieler') this.kiAngebotPruefen?.(this.z.angebote[id], o.id);
    return { angebot: id };
  },

  abkommenKosten(a, b) { return FORSCHUNGSABKOMMEN.kostenJeZeitalter * (1 + Math.max(a.zeitalter || 0, b.zeitalter || 0)); },
  angebotName(art) { return { frieden: 'Frieden', offene_grenzen: 'Offene Grenzen', buendnis: 'Bündnis (geteilte Sicht)', forschungsabkommen: 'Forschungsabkommen', tausch: 'Tauschhandel', tribut: 'Tribut' }[art] || art; },

  befehl_angebot_antwort(v, b) {
    const a = this.z.angebote[b.id];
    pruefe(a, 'Dieses Angebot gibt es nicht mehr.');
    if (a.auto) {
      pruefe(a.parteien.includes(v.id), 'Dieses Angebot ist nicht für dich.');
      if (!b.annehmen) { this.angebotEntfernen(a); for (const x of a.parteien) this.meldung(x, `${v.name} hat den Friedensvorschlag abgelehnt. Der Krieg geht weiter.`, { art: 'diplomatie' }); const d = this.diplo(a.parteien[0], a.parteien[1]); d.auto_vorschlag = null; d.letzter_kampf = this.t; return; }
      a.zustimmung[v.id] = true;
      this.markiere('a' + a.id);
      if (a.parteien.every((x) => a.zustimmung[x])) { this.friedenSchliessen(a.parteien[0], a.parteien[1]); this.angebotEntfernen(a); }
      else { const anderer = a.parteien.find((x) => x !== v.id); this.meldung(anderer, `${v.name} hat dem Friedensvorschlag zugestimmt. Jetzt fehlt nur noch deine Zustimmung.`, { art: 'diplomatie', wichtig: true }); }
      return;
    }
    pruefe(a.an === v.id, 'Dieses Angebot ist nicht für dich.');
    if (!b.annehmen) { this.angebotEntfernen(a); this.meldung(a.von, `${v.name} hat dein Angebot (${this.angebotName(a.art)}) abgelehnt.`, { art: 'diplomatie' }); return; }
    this.angebotAusfuehren(a);
  },

  angebotAusfuehren(a) {
    const von = this.z.voelker[a.von], an = this.z.voelker[a.an];
    const d = this.diplo(a.von, a.an);
    const k = this.diploSchluessel(a.von, a.an);
    if (a.art === 'frieden') { pruefe(d.krieg, 'Ihr seid nicht mehr im Krieg.'); this.friedenSchliessen(a.von, a.an); }
    else if (a.art === 'offene_grenzen') { pruefe(!d.krieg, 'Ihr seid im Krieg.'); d.offene_grenzen = true; }
    else if (a.art === 'buendnis') { pruefe(!d.krieg, 'Ihr seid im Krieg.'); d.buendnis = true; d.offene_grenzen = true; }
    else if (a.art === 'forschungsabkommen') {
      pruefe(von.gold >= a.kosten && an.gold >= a.kosten, `Beide brauchen je ${a.kosten} Gold.`);
      pruefe(!(von.abkommen_bis > this.t) && !(an.abkommen_bis > this.t), 'Eine Seite hat schon ein laufendes Abkommen.');
      this.aendern(von.id); this.aendern(an.id);
      von.gold -= a.kosten; an.gold -= a.kosten;
      von.abkommen_bis = an.abkommen_bis = this.t + FORSCHUNGSABKOMMEN.dauer;
      delete this._raten[von.id]; delete this._raten[an.id];
    } else if (a.art === 'tausch') this.tauschAusfuehren(a);
    this.markiere('d' + k);
    this.angebotEntfernen(a);
    this.meldung(a.von, `${an.name} hat dein Angebot angenommen: ${this.angebotName(a.art)}.`, { art: 'diplomatie', wichtig: true });
    this.meldung(a.an, `Vereinbart mit ${von.name}: ${this.angebotName(a.art)}.`, { art: 'diplomatie' });
  },

  friedenSchliessen(a, b) {
    this.aendern(a); this.aendern(b);
    const d = this.diplo(a, b);
    Object.assign(d, { krieg: false, frieden_seit: this.t, auto_vorschlag: null });
    this.markiere('d' + this.diploSchluessel(a, b));
    for (const x of [a, b]) this.meldung(x, `Frieden zwischen ${this.z.voelker[a].name} und ${this.z.voelker[b].name}!`, { art: 'frieden', wichtig: true });
    // Einheiten verlassen fremdes Gebiet
    for (const e of this.alleEinheiten()) {
      const bes = this.besitzer(e.feld);
      if ((e.volk === a && bes === b) || (e.volk === b && bes === a)) if (!this.darfBetreten(e.volk, bes)) this.einheitHeimschicken(e);
    }
    delete this._raten[a]; delete this._raten[b];
  },

  angebotEntfernen(a) { delete this.z.angebote[a.id]; this.markiere('a' + a.id); },

  befehl_angebot_zurueckziehen(v, b) {
    const a = this.z.angebote[b.id];
    pruefe(a && a.von === v.id, 'Das ist nicht dein Angebot.');
    this.angebotEntfernen(a);
  },

  // ---------- Tausch ----------
  tauschPruefen(geber, teil, gegen) {
    const t = teil || {};
    if (t.gold) { pruefe(Number.isFinite(t.gold) && t.gold > 0 && t.gold <= 1e7, 'Ungültige Goldmenge.'); pruefe(geber.gold >= t.gold, `${geber.name} hat nicht genug Gold.`); }
    for (const [gut, n] of Object.entries(t.lager || {})) {
      pruefe(LAGERGUETER.includes(gut) && Number.isFinite(n) && n > 0 && n <= 1e6, 'Ungültige Ware.');
      pruefe((geber.lager?.[gut] || 0) >= n, `${geber.name} hat nicht genug ${LAGER_NAMEN[gut]}.`);
    }
    for (const l of t.luxus || []) {
      pruefe(ROHSTOFF_NACH_ID[l]?.art === 'luxus', 'Ungültiges Luxusgut.');
      pruefe((this.luxusBestand(geber)[l] || 0) >= 1, `${geber.name} besitzt ${ROHSTOFF_NACH_ID[l].name} nicht.`);
    }
    if (t.karte) pruefe(this.hatOption(geber, 'karten_tausch'), `Kartentausch erfordert die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['option:karten_tausch'])}".`);
  },

  befehl_tausch_angebot(v, b) {
    const o = this.z.voelker[b.an];
    pruefe(o && o.id !== v.id && o.art !== 'barbar' && o.art !== 'tiere', 'Unbekanntes Volk.');
    pruefe(this.kennt(v.id, o.id), 'Du kennst dieses Volk noch nicht.');
    pruefe(this.hatOption(v, 'tausch'), `Tauschangebote erfordern die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['option:tausch'])}".`);
    pruefe(!this.imKrieg(v.id, o.id), 'Im Krieg wird nicht gehandelt.');
    const gibt = this.tauschSaeubern(b.gibt), will = this.tauschSaeubern(b.will);
    pruefe(this.tauschLeer(gibt) === false || this.tauschLeer(will) === false, 'Das Angebot ist leer.');
    this.tauschPruefen(v, gibt);
    const id = this.neueId();
    this.z.angebote[id] = { id, von: v.id, an: o.id, art: 'tausch', gibt, will, t: this.t };
    this.markiere('a' + id);
    this.meldung(o.id, `${v.name} schlägt einen Tausch vor.`, { art: 'handel', wichtig: true });
    if (o.art !== 'spieler') this.kiAngebotPruefen?.(this.z.angebote[id], o.id);
    return { angebot: id };
  },
  tauschSaeubern(t) {
    t = t && typeof t === 'object' ? t : {};
    const r = {};
    if (t.gold) r.gold = Math.floor(+t.gold);
    if (t.lager && typeof t.lager === 'object') { r.lager = {}; for (const [k, n] of Object.entries(t.lager)) if (+n > 0) r.lager[k] = Math.floor(+n); }
    if (Array.isArray(t.luxus)) r.luxus = [...new Set(t.luxus.filter((x) => typeof x === 'string'))].slice(0, 10);
    if (t.karte) r.karte = true;
    return r;
  },
  tauschLeer(t) { return !t.gold && !Object.keys(t.lager || {}).length && !(t.luxus || []).length && !t.karte; },

  tauschAusfuehren(a) {
    const von = this.z.voelker[a.von], an = this.z.voelker[a.an];
    pruefe(!this.imKrieg(von.id, an.id), 'Im Krieg wird nicht gehandelt.');
    this.tauschPruefen(von, a.gibt); this.tauschPruefen(an, a.will);
    this.aendern(von.id); this.aendern(an.id);
    const uebertrage = (g, n, t) => {
      if (t.gold) { g.gold -= t.gold; n.gold += t.gold; }
      for (const [gut, x] of Object.entries(t.lager || {})) { g.lager[gut] -= x; n.lager[gut] = (n.lager[gut] || 0) + x; }
      for (const l of t.luxus || []) { (g.luxus_abgabe ||= []).push({ id: l, bis: this.t + 2 * TAG }); (n.luxus_handel ||= []).push({ id: l, bis: this.t + 2 * TAG, von: g.id }); this.ablaufPlanen(g.id, this.t + 2 * TAG); this.ablaufPlanen(n.id, this.t + 2 * TAG); }
      if (t.karte) { const ng = this.nebel(g.id), nn = this.nebel(n.id); for (let i = 0; i < ng.length; i++) nn[i] |= ng[i]; this.z.nebel[n.id] = null; this.markiere('n' + n.id); (this._volleKarte ||= new Set()).add(n.id); }
    };
    uebertrage(von, an, a.gibt || {});
    uebertrage(an, von, a.will || {});
    delete this._raten[von.id]; delete this._raten[an.id];
  },

  /** Tribut fordern (nur von KI und Stadtstaaten): Sie zahlen, wenn du militärisch deutlich stärker bist. */
  befehl_tribut_fordern(v, b) {
    const o = this.z.voelker[b.an];
    pruefe(o && (o.art === 'ki' || o.art === 'stadtstaat'), 'Tribut kann man nur von KI-Völkern und Stadtstaaten fordern.');
    pruefe(this.kennt(v.id, o.id), 'Du kennst dieses Volk noch nicht.');
    pruefe(this.hatOption(v, 'tribut'), `Dafür fehlt die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['option:tribut'])}".`);
    pruefe(!this.imKrieg(v.id, o.id), 'Im Krieg geht das nicht.');
    const g = this.z.global;
    pruefe(!(g.tribute || []).some((t) => t.von === o.id && t.an === v.id && t.bis > this.t), 'Sie zahlen dir schon Tribut.');
    const ich = this.militaerStaerke(v.id), sie = this.militaerStaerke(o.id);
    this.kiKraenkung?.(o.id, v.id, 5);
    if (ich < sie * 1.5 + 30) { this.meldung(v.id, `${o.name} lehnt ab: "Eure Armee beeindruckt uns nicht."`, { art: 'diplomatie' }); return { angenommen: false }; }
    const gold = Math.max(3, Math.round(this.raten(o.id).einnahmen * 0.2));
    this.aendern(v.id); this.aendern(o.id);
    (g.tribute ||= []).push({ von: o.id, an: v.id, gold, bis: this.t + TAG });
    this.ablaufPlanen(o.id, this.t + TAG); this.ablaufPlanen(v.id, this.t + TAG);
    this.markiere('g');
    delete this._raten[v.id]; delete this._raten[o.id];
    this.meldung(v.id, `${o.name} zahlt dir 24 Stunden lang ${gold} Gold pro Stunde Tribut. Beliebt macht dich das nicht.`, { art: 'diplomatie' });
    return { angenommen: true, gold };
  },

  militaerStaerke(vid) {
    let s = 0;
    for (const e of this.einheitenVon(vid)) { const d = EINHEIT[e.typ]; if (d && istMilitaer(d)) s += Math.max(d.staerke, d.fern || 0); }
    return s;
  },

  // ---------- Stadtstaaten ----------
  befehl_stadtstaat_geschenk(v, b) {
    const ss = this.z.voelker[b.stadtstaat];
    pruefe(ss && ss.art === 'stadtstaat', 'Das ist kein Stadtstaat.');
    pruefe(this.kennt(v.id, ss.id), 'Du kennst diesen Stadtstaat noch nicht.');
    pruefe(!this.imKrieg(v.id, ss.id), 'Im Krieg nimmt der Stadtstaat keine Geschenke an.');
    const gold = Math.floor(+b.gold);
    pruefe(gold >= 25 && gold <= 100000, 'Ein Geschenk muss mindestens 25 Gold sein.');
    pruefe(v.gold >= gold, 'Du hast nicht genug Gold.');
    this.aendern(v.id);
    v.gold -= gold;
    ss.einfluss = ss.einfluss || {};
    const vorher = ss.einfluss[v.id] || 0;
    const neu = Math.min(150, vorher + gold / STADTSTAAT.goldJeEinfluss);
    ss.einfluss[v.id] = neu;
    if (vorher < STADTSTAAT.freund && neu >= STADTSTAAT.freund) this.meldung(v.id, `${ss.name} ist jetzt mit dir befreundet und gewährt dir seinen Bonus.`, { art: 'diplomatie', wichtig: true });
    if (neu >= STADTSTAAT.verbuendet && this.hatOption(v, 'stadtstaat_buendnis')) {
      const best = Object.entries(ss.einfluss).sort((x, y) => y[1] - x[1])[0];
      if (+best[0] === v.id && ss.verbuendet !== v.id) {
        if (ss.verbuendet) { this.aendern(ss.verbuendet); this.meldung(ss.verbuendet, `${ss.name} hat sich ${v.name} angeschlossen.`, { art: 'diplomatie' }); delete this._raten[ss.verbuendet]; }
        ss.verbuendet = v.id;
        this.meldung(v.id, `${ss.name} ist jetzt dein Verbündeter: zusätzlicher Bonus und geteilte Sicht.`, { art: 'diplomatie', wichtig: true });
      }
    } else if (neu >= STADTSTAAT.verbuendet && !this.hatOption(v, 'stadtstaat_buendnis')) {
      this.meldung(v.id, `Für ein Bündnis mit ${ss.name} fehlt dir noch die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['option:stadtstaat_buendnis'])}".`, { art: 'diplomatie' });
    }
    this.markiere('v' + ss.id);
    delete this._raten[v.id];
    this.diploTimer();
    return { einfluss: neu };
  },

  // ---------- Handelsrouten ----------
  routenKapazitaet(v) {
    let n = 1 + (this.raten(v.id).boni.handelsrouten || 0);
    for (const s of this.staedteVon(v.id)) n += this.gebaeudeSumme(s, 'handelsrouten');
    return n;
  },
  aktiveRouten(vid) { return this.alleEinheiten().filter((e) => e.volk === vid && e.route); },

  befehl_handelsroute(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    const d = EINHEIT[e.typ];
    pruefe(d.faehigkeiten?.includes('handel'), 'Nur Karawanen und Handelsschiffe können Handelsrouten einrichten.');
    const ziel = this.z.staedte[b.stadt];
    pruefe(ziel, 'Unbekannte Stadt.');
    pruefe(this.aktiveRouten(v.id).filter((x) => x.id !== e.id).length < this.routenKapazitaet(v), `Du kannst höchstens ${this.routenKapazitaet(v)} Handelsrouten gleichzeitig betreiben (Märkte, Häfen und Forschung erhöhen das).`);
    pruefe(ziel.volk === v.id || !this.imKrieg(v.id, ziel.volk), 'Mit Kriegsgegnern wird nicht gehandelt.');
    const heim = this.staedteVon(v.id).filter((s) => s.id !== ziel.id).sort((a, c) => abstand(a.feld, e.feld) - abstand(c.feld, e.feld))[0];
    pruefe(heim, 'Du brauchst eine eigene Heimatstadt (eine andere als das Ziel).');
    pruefe(abstand(heim.feld, ziel.feld) <= 30, 'Das Ziel ist zu weit weg (höchstens 30 Felder).');
    const vor = e.route;
    e.route = { von: heim.id, nach: ziel.id, aktiv: false, richtung: 'hin' };
    if (!this.routeNeuPlanen(e, true)) { e.route = vor; pruefe(false, 'Es gibt keinen Weg zur Zielstadt (fremdes Gebiet braucht offene Grenzen; bei Stadtstaaten Freundschaft).'); }
    this.markiere('e' + e.id);
    return { ankunft: e.pfad[e.pfad.length - 1]?.t };
  },

  routeNeuPlanen(e, still = false) {
    const r = e.route; if (!r) return false;
    const ziel = this.z.staedte[r.richtung === 'hin' ? r.nach : r.von];
    if (!ziel) { this.routeBeenden(e, 'Die Handelsroute endet, weil die Stadt nicht mehr existiert.'); return false; }
    const d = EINHEIT[e.typ];
    const nachbar = this.stadtAuf(ziel.feld) && ziel.volk !== e.volk;
    const pfad = this.planeWeg(e, ziel.feld, { nachbar });
    if (!pfad || (!pfad.length && e.feld !== ziel.feld && abstand(e.feld, ziel.feld) > 1)) {
      if (!still) this.routeBeenden(e, `${d.name}: Der Weg der Handelsroute ist blockiert, die Route endet.`);
      return false;
    }
    e.pfad = pfad;
    if (!pfad.length) this.routeAnkunft(e);
    this.markiere('e' + e.id);
    return true;
  },

  routeAnkunft(e) {
    const r = e.route;
    if (!r.aktiv && r.richtung === 'hin') {
      const v = this.z.voelker[e.volk];
      this.aendern(e.volk);
      const ziel = this.z.staedte[r.nach];
      if (ziel && ziel.volk !== e.volk) this.aendern(ziel.volk);
      r.aktiv = true;
      this.meldung(e.volk, `Handelsroute nach ${ziel?.name} eingerichtet: +${this.routenWert(r)} Gold pro Stunde.`, { art: 'handel', feld: e.feld, wichtig: true });
      if (ziel && ziel.volk !== e.volk) this.meldung(ziel.volk, `${v.name} hat eine Handelsroute zu ${ziel.name} eingerichtet. Du verdienst mit.`, { art: 'handel' });
      if (ziel) { delete this._raten[ziel.volk]; }
      delete this._raten[e.volk];
    }
    r.richtung = r.richtung === 'hin' ? 'zurueck' : 'hin';
    this.routeNeuPlanen(e);
  },

  routeBeenden(e, text) {
    if (!e.route) return;
    const r = e.route;
    if (r.aktiv) { this.aendern(e.volk); const z = this.z.staedte[r.nach]; if (z) { this.aendern(z.volk); delete this._raten[z.volk]; } delete this._raten[e.volk]; }
    e.route = null; e.pfad = [];
    this.markiere('e' + e.id);
    if (text) this.meldung(e.volk, text, { art: 'handel', feld: e.feld });
  },
};
