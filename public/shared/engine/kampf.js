// Kampf: nur auf Befehl, sofort berechnet (Civ-Formel), mit Modifikatoren, Städten, Eroberung, Luft, Atom, Plündern.
import { karte } from '../karte.js';
import { abstand, nachbarn, umkreis } from '../hex.js';
import { GELAENDE } from '../daten/gelaende.js';
import { EINHEIT, BEFOERDERUNG, VERBESSERUNG, GEB, FREIGESCHALTET_DURCH } from '../daten/index.js';
import { KAMPF, schaden, erwarteterSchaden, verwundungsMalus, stadtGrundStaerke, STADT_GRUND_HP, HEILUNG, EP, STD, MIN, epFuerBefoerderung } from '../regeln.js';
import { pruefe, SpielFehler } from './spiel.js';
import { bereichVon, schichtVon, istMilitaer } from './einheiten.js';

const FERN_KLASSEN = new Set(['fernkampf', 'belagerung', 'see_fern', 'flak', 'bomber', 'jaeger', 'rakete']);
const EROBERER = new Set(['nahkampf', 'reiter', 'see_nah']);

export const kampf = {
  istFernkaempfer(d) { return (d.fern || 0) > 0 && (d.reichweite || 0) > 0; },
  reichweite(e) {
    const d = EINHEIT[e.typ];
    let r = d.reichweite || 0;
    for (const b of e.befoerderungen || []) r += BEFOERDERUNG[b]?.wirkung?.reichweite || 0;
    return r;
  },

  // ---------- Stadt-Werte ----------
  stadtMaxHp(s) {
    let hp = STADT_GRUND_HP + this.gebaeudeSumme(s, 'stadt_hp');
    const v = this.z.voelker[s.volk];
    if (v && v.art !== 'barbar') hp += this.raten(s.volk).boni.stadt_hp || 0;
    if (v && v.art === 'stadtstaat') hp += 200;
    return hp;
  },
  stadtHp(s) {
    const max = this.stadtMaxHp(s);
    const hp = s.hp ?? max;
    if (s.angriff_um && this.t - s.angriff_um < 30 * MIN) return Math.min(max, hp);
    const ab = Math.max(s.hp_um ?? this.t, (s.angriff_um || 0) + 30 * MIN);
    return Math.min(max, hp + HEILUNG.stadtRegeneration * max / 300 * Math.max(0, this.t - ab) / STD);
  },
  stadtHpAbrechnen(s) { s.hp = Math.round(this.stadtHp(s) * 10) / 10; s.hp_um = this.t; this.markiere('s' + s.id); },
  garnison(s) { return this.einheitenAuf(s.feld).find((u) => u.volk === s.volk && istMilitaer(EINHEIT[u.typ]) && bereichVon(EINHEIT[u.typ]) === 'land'); },
  stadtStaerke(s) {
    const v = this.z.voelker[s.volk];
    const liste = [];
    const basis = stadtGrundStaerke(v?.zeitalter || 0, s.bev);
    liste.push({ text: 'Stadt (Zeitalter und Größe)', wert: basis });
    const mauer = this.gebaeudeSumme(s, 'verteidigung');
    if (mauer) liste.push({ text: 'Mauern und Verteidigungsbauten', wert: mauer });
    const g = this.garnison(s);
    if (g) liste.push({ text: 'Garnison: ' + EINHEIT[g.typ].name, wert: Math.round(EINHEIT[g.typ].staerke / 4) });
    const b = v && v.art !== 'barbar' ? this.raten(s.volk).boni.stadt_staerke || 0 : 0;
    if (b) liste.push({ text: 'Forschung und Wunder', wert: b });
    if (v && v.art === 'stadtstaat') liste.push({ text: 'Stadtstaat', wert: 6 });
    if (GELAENDE[karte().gelaende[s.feld]].id === 'huegel') liste.push({ text: 'Stadt auf einem Hügel', wert: 3 });
    return { wert: liste.reduce((a, x) => a + x.wert, 0), liste };
  },
  stadtReichweite(s) { return KAMPF.stadtReichweite + this.gebaeudeSumme(s, 'stadt_reichweite'); },

  // ---------- Erlaubnis ----------
  /** Grund, warum Volk a Volk b gerade nicht angreifen darf (oder null). */
  kampfHindernis(a, b) {
    if (a === b) return 'Du kannst dich nicht selbst angreifen.';
    const va = this.z.voelker[a], vb = this.z.voelker[b];
    if (!va || !vb) return 'Unbekanntes Ziel.';
    if (vb.art === 'tiere') return null;
    if (va.art === 'tiere' || va.art === 'barbar') {
      if (vb.art === 'spieler') {
        // Barbaren ignorieren den Neulingsschutz; Raubtiere respektieren ihn
        if (va.art === 'tiere' && vb.schutz_bis > this.t) return 'Neulingsschutz.';
        if (!this.istOnline(b)) return 'Spieler ist offline.';
      }
      return null;
    }
    if (vb.art === 'barbar') return null;
    if (va.art === 'spieler' && va.schutz_bis > this.t) return 'Während deines Neulingsschutzes (24 Stunden) kannst du nicht angreifen. Erkläre einen Krieg, um ihn vorzeitig zu beenden.';
    if (vb.art === 'spieler' && vb.schutz_bis > this.t) return `${vb.name} steht noch unter Neulingsschutz.`;
    if (!this.imKrieg(a, b)) return `Du bist nicht im Krieg mit ${vb.name}.`;
    if (va.art === 'spieler' && !this.angreifbar(a)) return 'Waffenruhe: Du warst zu lange offline.';
    if (vb.art === 'spieler' && !this.angreifbar(b)) return `${vb.name} ist offline: Es herrscht Waffenruhe, bis ${vb.name} wieder online ist (danach 10 Minuten Schonfrist).`;
    return null;
  },

  // ---------- Stärke und Modifikatoren ----------
  /** Kampfstärke einer Einheit mit allen Modifikatoren. rolle: 'angriff' | 'verteidigung'; art: 'nah' | 'fern' | 'luft'. */
  einheitStaerke(e, rolle, art, gegner, feld = e.feld) {
    const d = EINHEIT[e.typ];
    const liste = [];
    const basis = art === 'fern' && rolle === 'angriff' ? d.fern : art === 'luft' && rolle === 'angriff' ? (d.fern || d.staerke) : d.staerke;
    liste.push({ text: (art === 'fern' && rolle === 'angriff' ? 'Fernkampfstärke ' : 'Kampfstärke ') + d.name, wert: basis });
    const hp = this.aktuelleHp(e);
    const vm = verwundungsMalus(hp);
    if (vm) liste.push({ text: `Verwundet (${Math.round(hp)} LP)`, wert: vm });
    const k = karte();
    const g = GELAENDE[k.gelaende[feld]];
    if (rolle === 'verteidigung' && bereichVon(d) === 'land' && !g.wasser) {
      if (g.verteidigung) liste.push({ text: 'Gelände: ' + g.name, wert: g.verteidigung });
      const f = this.z.felder[feld];
      if (f && f.v && VERBESSERUNG[f.v]?.verteidigung && !(f.pl > this.t)) liste.push({ text: VERBESSERUNG[f.v].name, wert: VERBESSERUNG[f.v].verteidigung });
      if (e.modus === 'befestigt' && this.t - (e.modus_seit || 0) >= 10 * MIN) liste.push({ text: 'Befestigt', wert: KAMPF.befestigt });
    }
    if (rolle === 'verteidigung' && bereichVon(d) === 'land' && g.wasser) liste.push({ text: 'Eingeschifft (wehrlos auf dem Wasser)', wert: -Math.round(d.staerke * 0.4) });
    if (rolle === 'angriff' && art === 'nah' && k.fluss[e.feld] && !(this.z.felder[e.feld]?.br)) liste.push({ text: 'Angriff aus einem Flussfeld', wert: -KAMPF.flussMalus });
    if (this.besitzer(feld) === e.volk) liste.push({ text: 'Eigener Boden', wert: KAMPF.eigenerBoden });
    if (e.unterversorgt) liste.push({ text: 'Unterversorgt (Goldmangel)', wert: -KAMPF.unterversorgt });
    // Beförderungen
    for (const bid of e.befoerderungen || []) {
      const w = BEFOERDERUNG[bid]?.wirkung; if (!w) continue;
      let x = (w.staerke || 0) + (art === 'fern' && rolle === 'angriff' ? (w.fern || 0) : 0);
      if (rolle === 'angriff') x += w.angriff || 0; else x += w.verteidigung || 0;
      if (w.gelaende && w.gelaende[g.id]) x += w.gelaende[g.id];
      if (w.gegen && gegner) for (const [kl, wert] of Object.entries(w.gegen)) if (this.passtGegen(kl, gegner)) x += wert;
      if (x) liste.push({ text: 'Beförderung: ' + BEFOERDERUNG[bid].name, wert: x });
    }
    // Klassenvorteile
    for (const bo of d.boni || []) if (gegner && this.passtGegen(bo.gegen, gegner)) liste.push({ text: `Bonus gegen ${this.gegenText(bo.gegen)}`, wert: bo.wert });
    return { wert: Math.max(1, liste.reduce((a, x) => a + x.wert, 0)), liste };
  },

  /** Passt ein Bonus-Schlüssel ("reiter", "stadt", "luft", ...) auf den Gegner? gegner = {einheit} | {stadt} */
  passtGegen(schluessel, gegner) {
    if (gegner.stadt) return schluessel === 'stadt';
    const d = EINHEIT[gegner.einheit.typ];
    if (!d) return false;
    if (schluessel === d.klasse) return true;
    if (schluessel === 'luft') return bereichVon(d) === 'luft';
    if (schluessel === 'see') return bereichVon(d) === 'see';
    if (schluessel === 'land') return bereichVon(d) === 'land';
    if (schluessel === 'fahrzeug') return ['reiter', 'belagerung'].includes(d.klasse) && d.zeitalter >= 5;
    return false;
  },
  gegenText(k) { return { reiter: 'Reiter', stadt: 'Städte', luft: 'Flugzeuge', see: 'Schiffe', nahkampf: 'Nahkämpfer', fernkampf: 'Fernkämpfer', belagerung: 'Belagerung', land: 'Landeinheiten', u_boot: 'U-Boote', fahrzeug: 'Fahrzeuge' }[k] || k; },

  flankenBonus(angreifer, zielFeld, zielVolk) {
    let n = 0, u = 0;
    for (const nb of nachbarn(zielFeld)) for (const x of this.einheitenAuf(nb)) {
      if (!istMilitaer(EINHEIT[x.typ])) continue;
      if (x.volk === angreifer.volk && x.id !== angreifer.id) n++;
      if (x.volk === zielVolk) u++;
    }
    return { flanke: n * KAMPF.flanke, unterstuetzung: u * KAMPF.unterstuetzung };
  },

  /** Was liegt auf einem Zielfeld? */
  zielAuf(feld, angreiferVolk) {
    const s = this.stadtAuf(feld);
    if (s && s.volk !== angreiferVolk) return { stadt: s, volk: s.volk };
    const fremd = this.einheitenAuf(feld).filter((u) => u.volk !== angreiferVolk);
    const mil = fremd.find((u) => istMilitaer(EINHEIT[u.typ]) && bereichVon(EINHEIT[u.typ]) !== 'luft') || fremd.find((u) => istMilitaer(EINHEIT[u.typ]));
    if (mil) return { einheit: mil, volk: mil.volk };
    if (fremd.length) return { zivil: fremd, volk: fremd[0].volk };
    const lager = Object.values(this.z.lager).find((l) => l.feld === feld);
    if (lager) return { lager, volk: this.barbarenVolk()?.id };
    return null;
  },

  /** Kampfvorschau: erwartete Schäden beider Seiten und alle Modifikatoren. Wird auch vom Client genutzt. */
  kampfVorschau(e, feld) {
    const d = EINHEIT[e.typ];
    const ziel = this.zielAuf(feld, e.volk);
    if (!ziel) return { ok: false, grund: 'Dort ist kein Ziel.' };
    const hind = ziel.volk != null ? this.kampfHindernis(e.volk, ziel.volk) : null;
    const dist = abstand(e.feld, feld);
    const fern = this.istFernkaempfer(d) && dist <= this.reichweite(e) && dist >= 1;
    const art = bereichVon(d) === 'luft' ? 'luft' : fern ? 'fern' : 'nah';
    if (ziel.zivil) return { ok: !hind, grund: hind, zivil: true, text: 'Zivile Einheiten werden kampflos gefangen genommen.' };
    if (ziel.lager) return { ok: true, lager: true, text: 'Das Barbarenlager wird zerstört, wenn eine Militäreinheit es betritt.' };
    const gegner = ziel.stadt ? { stadt: ziel.stadt } : { einheit: ziel.einheit };
    const A = this.einheitStaerke(e, 'angriff', art, gegner);
    let D;
    if (ziel.stadt) D = this.stadtStaerke(ziel.stadt);
    else D = this.einheitStaerke(ziel.einheit, 'verteidigung', art, { einheit: e });
    if (art === 'nah' && !ziel.stadt) {
      const fl = this.flankenBonus(e, feld, ziel.volk);
      if (fl.flanke) A.liste.push({ text: 'Flankenangriff', wert: fl.flanke });
      if (fl.unterstuetzung) D.liste.push({ text: 'Unterstützung durch Nachbarn', wert: fl.unterstuetzung });
      A.wert += fl.flanke; D.wert += fl.unterstuetzung;
    }
    let anVert = erwarteterSchaden(A.wert, D.wert);
    let anAngr = art === 'nah' ? erwarteterSchaden(D.wert, A.wert) : 0;
    if (ziel.stadt) {
      if (art === 'fern' || art === 'luft') anVert = Math.round(anVert * (d.faehigkeiten?.includes('belagerung') ? KAMPF.belagerungGegenStadtFaktor : KAMPF.fernGegenStadtFaktor));
      else if (d.faehigkeiten?.includes('belagerung')) anVert = Math.round(anVert * KAMPF.belagerungGegenStadtFaktor);
    } else if (art !== 'nah') {
      // Gegenschaden nur, wenn beide Reichweite haben
      const zd = EINHEIT[ziel.einheit.typ];
      if (this.istFernkaempfer(zd) && this.reichweite(ziel.einheit) >= dist && art === 'fern') anAngr = erwarteterSchaden(zd.fern, A.wert) >> 1;
      if (art === 'luft' && (zd.klasse === 'flak' || zd.boni?.some((b) => b.gegen === 'luft'))) anAngr = erwarteterSchaden(D.wert, A.wert);
    }
    const zielHp = ziel.stadt ? this.stadtHp(ziel.stadt) : this.aktuelleHp(ziel.einheit);
    const eigenHp = this.aktuelleHp(e);
    return {
      ok: !hind, grund: hind, art, fern: art !== 'nah', stadt: !!ziel.stadt,
      angreifer: A, verteidiger: D, schadenAnVerteidiger: anVert, schadenAnAngreifer: anAngr,
      zielHp, eigenHp, sieg: anVert >= zielHp, tod: anAngr >= eigenHp,
      zielName: ziel.stadt ? ziel.stadt.name : EINHEIT[ziel.einheit.typ].name, zielVolk: ziel.volk,
    };
  },

  // ---------- Befehle ----------
  befehl_angreifen(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    const d = EINHEIT[e.typ];
    const feld = b.ziel | 0;
    pruefe(istMilitaer(d), 'Diese Einheit kann nicht kämpfen.');
    pruefe(bereichVon(d) !== 'luft', 'Flugzeuge greifen mit "Luftangriff" an.');
    pruefe(!e.in, 'Die Einheit muss zuerst ausgeladen werden.');
    const ziel = this.zielAuf(feld, e.volk);
    pruefe(ziel, 'Dort gibt es nichts anzugreifen.');
    const h = ziel.volk != null ? this.kampfHindernis(v.id, ziel.volk) : null;
    pruefe(!h, h);
    pruefe(!(e.abkling_bis > this.t), `Die Einheit muss sich noch erholen (bereit in ${Math.ceil((e.abkling_bis - this.t) / MIN)} min).`);
    const dist = abstand(e.feld, feld);
    const fern = this.istFernkaempfer(d) && !ziel.zivil && !ziel.lager;
    if ((fern && dist <= this.reichweite(e)) || (!fern && dist === 1)) {
      e.pfad = []; e.angriff = null;
      return this.angriffAusfuehren(e, feld);
    }
    // erst hinlaufen
    const ok = this.bewegeNach(e, feld, { nachbar: true, still: true });
    pruefe(ok, 'Es gibt keinen Weg zum Ziel.');
    if (fern) {
      // so weit laufen, bis das Ziel in Reichweite ist
      const r = this.reichweite(e);
      const idx = e.pfad.findIndex((p) => abstand(p.f, feld) <= r);
      if (idx >= 0) e.pfad = e.pfad.slice(0, idx + 1);
    }
    e.angriff = feld;
    this.markiere('e' + e.id);
    return { marsch: true, ankunft: e.pfad[e.pfad.length - 1]?.t };
  },

  angriffNachMarsch(e, feld) {
    const d = EINHEIT[e.typ];
    const ziel = this.zielAuf(feld, e.volk);
    if (!ziel) { this.meldung(e.volk, `${d.name}: Das Angriffsziel ist nicht mehr da.`, { feld: e.feld }); return; }
    const h = ziel.volk != null ? this.kampfHindernis(e.volk, ziel.volk) : null;
    if (h) { this.meldung(e.volk, `${d.name}: Angriff nicht möglich: ${h}`, { feld: e.feld }); return; }
    const dist = abstand(e.feld, feld);
    const fern = this.istFernkaempfer(d) && !ziel.zivil && !ziel.lager;
    if ((fern && dist <= this.reichweite(e)) || (!fern && dist === 1)) {
      if (e.abkling_bis > this.t) { this.meldung(e.volk, `${d.name}: Am Ziel angekommen, aber noch nicht wieder kampfbereit.`, { feld: e.feld }); return; }
      try { this.angriffAusfuehren(e, feld); } catch (err) { if (err instanceof SpielFehler) this.meldung(e.volk, `${d.name}: ${err.message}`, { feld: e.feld }); else throw err; }
    } else this.meldung(e.volk, `${d.name}: Das Ziel hat sich bewegt.`, { feld: e.feld });
  },

  /** Führt den Angriff sofort aus (Prüfungen müssen vorher erfolgt sein). */
  angriffAusfuehren(e, feld) {
    const d = EINHEIT[e.typ];
    const ziel = this.zielAuf(feld, e.volk);
    pruefe(ziel, 'Dort gibt es nichts anzugreifen.');
    this.hpAbrechnen(e);
    // Zivilisten fangen
    if (ziel.zivil) {
      pruefe(abstand(e.feld, feld) === 1 && bereichVon(d) !== 'luft', 'Zum Gefangennehmen muss die Einheit direkt daneben stehen.');
      for (const z of ziel.zivil) this.zivilFangen(z, e.volk);
      this.einheitZiehen(e, feld);
      return { gefangen: ziel.zivil.length };
    }
    if (ziel.lager) {
      pruefe(abstand(e.feld, feld) === 1 && !this.istFernkaempfer(d), 'Lager werden durch Betreten mit einer Nahkampfeinheit zerstört.');
      this.einheitZiehen(e, feld);
      this.lagerZerstoert(ziel.lager, e);
      return { lager: true };
    }
    const vs = this.kampfVorschau(e, feld);
    pruefe(vs.ok, vs.grund || 'Angriff nicht möglich.');
    const z1 = this.zufall(), z2 = this.zufall();
    let anVert = schaden(vs.angreifer.wert, vs.verteidiger.wert, z1);
    let anAngr = vs.schadenAnAngreifer > 0 ? Math.round(schaden(vs.verteidiger.wert, vs.angreifer.wert, z2) * (vs.art === 'nah' ? 1 : 0.5)) : 0;
    if (vs.stadt) {
      if (vs.art !== 'nah') anVert = Math.round(anVert * (d.faehigkeiten?.includes('belagerung') ? KAMPF.belagerungGegenStadtFaktor : KAMPF.fernGegenStadtFaktor));
      else if (d.faehigkeiten?.includes('belagerung')) anVert = Math.round(anVert * KAMPF.belagerungGegenStadtFaktor);
    }
    const zielVolk = ziel.volk;
    this.kampfVermerken(e.volk, zielVolk);
    e.abkling_bis = this.t + this.abklingzeit(e) * 1000;
    if (e.modus === 'befestigt' || e.modus === 'schlafen') e.modus = 'wach';
    const vonFeld = e.feld;
    this.ausgehend.push({ art: 'kampf', von: vonFeld, nach: feld, fern: vs.art !== 'nah', schadenA: anAngr, schadenV: anVert, t: this.t });
    // Angreifer nimmt Schaden
    e.hp = Math.max(0, e.hp - anAngr);
    e.ep = (e.ep || 0) + (vs.art === 'nah' ? EP.angriff : EP.fern);
    this.markiere('e' + e.id);
    let ergebnis = { schadenAnVerteidiger: anVert, schadenAnAngreifer: anAngr };
    if (ziel.stadt) {
      const s = ziel.stadt;
      this.stadtHpAbrechnen(s);
      const minHp = this.darfErobern(e.volk, s) ? 0 : 1;
      s.hp = Math.max(minHp, s.hp - anVert);
      s.angriff_um = this.t;
      this.meldung(s.volk, `${s.name} wird angegriffen! (${Math.round(s.hp)} LP übrig)`, { art: 'kampf', feld: s.feld, wichtig: true });
      if (s.hp <= 0 && EROBERER.has(d.klasse) && e.hp > 0 && abstand(vonFeld, s.feld) === 1) {
        this.stadtErobern(s, e);
        ergebnis.erobert = true;
      } else if (e.hp > 0) this.stadtVergeltung(s, e);
    } else {
      const z = ziel.einheit;
      this.hpAbrechnen(z);
      z.hp = Math.max(0, z.hp - anVert);
      z.ep = Math.min((z.ep || 0) + EP.verteidigung, this.z.voelker[e.volk]?.art === 'barbar' ? EP.max_barbar : 9999);
      if (this.z.voelker[zielVolk]?.art === 'tiere' && z.hp > 0) { /* Tiere fliehen nie */ }
      this.markiere('e' + z.id);
      if (z.hp <= 0) {
        ergebnis.besiegt = true;
        e.ep += EP.sieg;
        const zn = EINHEIT[z.typ].name;
        this.meldung(zielVolk, `Deine Einheit ${zn} wurde besiegt.`, { art: 'kampf', feld, wichtig: true });
        this.meldung(e.volk, `Sieg! ${zn} wurde besiegt.`, { art: 'kampf', feld });
        this.einheitBesiegt(z, e);
        if (vs.art === 'nah' && e.hp > 0 && bereichVon(d) === 'land' && !this.stadtAuf(feld) && this.platzFrei(e.volk, d, feld, e.id) && this.bewegungsKostenRoh(e.volk, d, feld, feld, true) < Infinity) this.einheitZiehen(e, feld);
      } else {
        this.meldung(zielVolk, `Deine Einheit ${EINHEIT[z.typ].name} wurde angegriffen (${Math.round(z.hp)} LP übrig).`, { art: 'kampf', feld, wichtig: true });
      }
    }
    if (e.hp <= 0) {
      ergebnis.verloren = true;
      this.meldung(e.volk, `Deine Einheit ${d.name} ist im Kampf gefallen.`, { art: 'kampf', feld: vonFeld, wichtig: true });
      this.einheitEntfernen(e.id);
    }
    if (this.z.voelker[e.volk]?.art === 'spieler' && e.hp > 0 && this.befoerderungMoeglich(e)) this.meldung(e.volk, `${d.name} kann befördert werden!`, { art: 'einheit', feld: e.feld });
    return ergebnis;
  },

  abklingzeit(e) {
    const d = EINHEIT[e.typ];
    let s = d.abklingzeit || 600;
    let p = 0;
    for (const b of e.befoerderungen || []) p += BEFOERDERUNG[b]?.wirkung?.abklingzeit_prozent || 0;
    return Math.max(60, Math.round(s * (1 + p / 100)));
  },

  einheitZiehen(e, feld) {
    e.feld = feld; e.pfad = [];
    this.positionenNeu();
    this.erkunde(e.volk, feld, this.sichtweite(e));
    this.markiere('e' + e.id);
  },

  zivilFangen(z, neuesVolk) {
    const alt = z.volk;
    const d = EINHEIT[z.typ];
    this.aendern(alt);
    if (z.route) this.routeBeenden(z);
    const nv = this.z.voelker[neuesVolk];
    if (!nv || nv.art === 'barbar' || nv.art === 'tiere' || d.klasse === 'haendler' || d.klasse === 'see_zivil' && d.faehigkeiten?.includes('handel')) {
      this.meldung(alt, `${d.name} wurde überfallen und ist verloren.`, { art: 'kampf', feld: z.feld, wichtig: true });
      if (nv && nv.art !== 'tiere') { this.aendern(neuesVolk); nv.gold = (nv.gold || 0) + 40; }
      this.einheitEntfernen(z.id);
      return;
    }
    this.aendern(neuesVolk);
    z.volk = neuesVolk; z.pfad = []; z.arbeit = null; z.modus = 'wach';
    this.markiere('e' + z.id);
    this.meldung(alt, `${d.name} wurde gefangen genommen!`, { art: 'kampf', feld: z.feld, wichtig: true });
    this.meldung(neuesVolk, `Du hast ${d.name} gefangen genommen.`, { art: 'kampf', feld: z.feld });
    delete this._raten[alt]; delete this._raten[neuesVolk];
  },

  einheitBesiegt(z, sieger) {
    const zv = this.z.voelker[z.volk];
    if (zv?.art === 'tiere') {
      const sv = this.z.voelker[sieger.volk];
      if (sv && sv.art === 'spieler') { this.aendern(sv.id); sv.gold += 15; this.meldung(sv.id, 'Das Raubtier ist erlegt: +15 Gold.', { feld: z.feld }); }
    }
    if (zv?.art === 'barbar') {
      const sv = this.z.voelker[sieger.volk];
      if (sv && sv.art === 'spieler') { this.aendern(sv.id); sv.gold += 10; }
    }
    this.einheitEntfernen(z.id);
  },

  kampfVermerken(a, b) {
    if (b == null) return;
    const d = this.diplo(a, b);
    d.letzter_kampf = this.t;
    this.markiere('d' + this.diploSchluessel(a, b));
    const vb = this.z.voelker[b];
    if (vb && (vb.art === 'ki' || vb.art === 'stadtstaat')) this.kiKraenkung?.(b, a, 1);
  },

  /** Automatischer Gegenschlag einer Stadt (wenn der Besitzer online ist bzw. KI/Stadtstaat). */
  stadtVergeltung(s, angreifer) {
    if (s.abkling_bis > this.t) return;
    const v = this.z.voelker[s.volk];
    if (v.art === 'spieler' && !this.istOnline(v.id)) return;
    if (abstand(s.feld, angreifer.feld) > this.stadtReichweite(s)) return;
    if (this.kampfHindernis(s.volk, angreifer.volk)) return;
    this.stadtSchiesst(s, angreifer, true);
  },

  stadtSchiesst(s, e, automatisch) {
    const st = this.stadtStaerke(s);
    const D = this.einheitStaerke(e, 'verteidigung', 'fern', { stadt: s });
    const dmg = schaden(st.wert, D.wert, this.zufall());
    this.hpAbrechnen(e);
    e.hp = Math.max(0, e.hp - dmg);
    s.abkling_bis = this.t + KAMPF.stadtAbklingzeit;
    this.markiere('s' + s.id); this.markiere('e' + e.id);
    this.ausgehend.push({ art: 'kampf', von: s.feld, nach: e.feld, fern: true, schadenA: 0, schadenV: dmg, t: this.t });
    this.kampfVermerken(s.volk, e.volk);
    const n = EINHEIT[e.typ].name;
    this.meldung(s.volk, `${s.name} ${automatisch ? 'verteidigt sich und trifft' : 'beschießt'} ${n} (${dmg} Schaden).`, { art: 'kampf', feld: e.feld });
    if (e.hp <= 0) { this.meldung(e.volk, `Deine Einheit ${n} wurde von ${s.name} vernichtet.`, { art: 'kampf', feld: e.feld, wichtig: true }); this.einheitEntfernen(e.id); }
    else this.meldung(e.volk, `${s.name} hat ${n} beschossen (${dmg} Schaden).`, { art: 'kampf', feld: e.feld });
    return dmg;
  },

  befehl_stadt_angriff(v, b) {
    const s = this.z.staedte[b.stadt];
    pruefe(s && s.volk === v.id, 'Das ist nicht deine Stadt.');
    pruefe(!(s.abkling_bis > this.t), `Die Stadt kann erst in ${Math.ceil((s.abkling_bis - this.t) / MIN)} min wieder schießen.`);
    const ziel = this.zielAuf(b.ziel | 0, v.id);
    pruefe(ziel && ziel.einheit, 'Dort steht keine feindliche Einheit.');
    pruefe(abstand(s.feld, ziel.einheit.feld) <= this.stadtReichweite(s), 'Das Ziel ist außer Reichweite der Stadt.');
    const h = this.kampfHindernis(v.id, ziel.volk);
    pruefe(!h, h);
    return { schaden: this.stadtSchiesst(s, ziel.einheit, false) };
  },

  /** Darf das angreifende Volk diese Stadt erobern? (KI nie gegen Spieler, Barbaren und Tiere nie.) */
  darfErobern(angreiferVolk, s) {
    const a = this.z.voelker[angreiferVolk], o = this.z.voelker[s.volk];
    if (!a || a.art === 'barbar' || a.art === 'tiere') return false;
    if (a.art === 'ki' && o.art === 'spieler') return false;
    return true;
  },

  /** Eroberung: Die Stadt gehört dann dem Eroberer, ist aber zerstört. */
  stadtErobern(s, e) {
    const alt = s.volk, neu = e.volk;
    const va = this.z.voelker[alt], vn = this.z.voelker[neu];
    this.aendern(alt); this.aendern(neu);
    const g = this.garnison(s);
    if (g) this.einheitEntfernen(g.id);
    // Zivilisten in der Stadt werden gefangen
    for (const z of this.einheitenAuf(s.feld)) if (z.volk === alt) { if (istMilitaer(EINHEIT[z.typ]) || bereichVon(EINHEIT[z.typ]) === 'luft') this.einheitEntfernen(z.id); else this.zivilFangen(z, neu); }
    for (const z of this.alleEinheiten()) if (z.in && !this.z.einheiten[z.in]) this.einheitEntfernen(z.id);
    for (const x of this.alleEinheiten()) if (x.route && (x.route.von === s.id || x.route.nach === s.id)) this.routeBeenden(x, 'Die Handelsroute endet, weil eine der Städte erobert wurde.');
    s.volk = neu;
    s.bev = Math.max(1, Math.round(s.bev * 0.4));
    const war = s.hauptstadt;
    s.hauptstadt = false;
    delete s.gebaeude.palast;
    const ids = Object.keys(s.gebaeude).sort();
    for (const gid of ids) if (this.zufall() < 0.5) delete s.gebaeude[gid];
    s.bau = []; s.schlange = []; s.nahrung = 0; s.kultur = 0; s.manuell = false;
    s.zerstoert_bis = this.t + KAMPF.zerstoertDauer;
    this.ablaufPlanen(neu, s.zerstoert_bis);
    s.hp = Math.round(this.stadtMaxHp(s) * 0.25); s.hp_um = this.t; s.angriff_um = this.t;
    for (const [wid, w] of Object.entries(this.z.wunder)) if (w.stadt === s.id) { w.volk = neu; this.markiere('w' + wid); }
    // fremde Einheiten im Gebiet nach Hause schicken
    const gebiet = new Set(s.gebiet);
    for (const x of this.alleEinheiten()) if (x.volk === alt && gebiet.has(x.feld) && !x.in) this.einheitHeimschicken(x);
    this.einheitZiehen(e, s.feld);
    this.positionenNeu();
    this.autoBewirtschaften(s);
    this.markiere('s' + s.id);
    if (war) {
      const ersatz = this.staedteVon(alt).sort((a, b) => b.bev - a.bev)[0];
      if (ersatz) { ersatz.gebaeude.palast = 1; ersatz.hauptstadt = true; this.markiere('s' + ersatz.id); this.meldung(alt, `Deine Hauptstadt ist gefallen. ${ersatz.name} ist jetzt die neue Hauptstadt.`, { art: 'kampf', feld: ersatz.feld, wichtig: true }); }
    }
    this.meldung(alt, `${s.name} wurde von ${vn.name} erobert!`, { art: 'kampf', feld: s.feld, wichtig: true });
    this.meldung(neu, `Du hast ${s.name} erobert! Die Stadt ist zerstört und braucht einige Stunden, um wieder etwas zu leisten.`, { art: 'kampf', feld: s.feld, wichtig: true });
    for (const v of this.alleVoelker()) if (v.id !== alt && v.id !== neu) this.meldung(v.id, `${vn.name} hat ${s.name} von ${va.name} erobert.`, { art: 'kampf' });
    if (va.art === 'spieler' && !this.staedteVon(alt).length && !this.einheitenVon(alt).some((x) => EINHEIT[x.typ]?.faehigkeiten?.includes('gruenden'))) {
      this.meldung(alt, 'Du hast keine Stadt mehr. Über "Neuanfang" bekommst du einen neuen Siedler an einem sicheren Ort.', { art: 'warnung', wichtig: true });
    }
    if (va.art === 'ki' || va.art === 'stadtstaat') this.kiKraenkung?.(alt, neu, 10);
    delete this._raten[alt]; delete this._raten[neu];
  },

  /** Schickt eine Einheit auf das nächste eigene oder neutrale Feld. */
  einheitHeimschicken(x) {
    const d = EINHEIT[x.typ];
    for (let r = 1; r <= 12; r++) {
      for (const i of umkreis(x.feld, r)) {
        if (abstand(i, x.feld) !== r) continue;
        const bes = this.besitzer(i);
        if (bes != null && bes !== x.volk) continue;
        if (!this.platzFrei(x.volk, d, i, x.id) || this.bewegungsKostenRoh(x.volk, d, i, i, true) === Infinity) continue;
        x.feld = i; x.pfad = []; x.angriff = null; this.markiere('e' + x.id); this.positionenNeu(); return;
      }
    }
    this.einheitEntfernen(x.id);
  },

  // ---------- Plündern ----------
  befehl_pluendern(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    pruefe(this.hatOption(v, 'pluendern'), `Plündern erfordert die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['option:pluendern'])}".`);
    pruefe(istMilitaer(EINHEIT[e.typ]), 'Nur Militäreinheiten können plündern.');
    const f = this.z.felder[e.feld];
    pruefe(f && f.v && !(f.pl > this.t), 'Hier gibt es nichts zu plündern.');
    const bes = this.besitzer(e.feld);
    pruefe(bes != null && bes !== v.id, 'Das eigene Land plündert man nicht.');
    const h = this.kampfHindernis(v.id, bes);
    pruefe(!h, h);
    this.aendern(bes); this.aendern(v.id);
    this.setzeFeld(e.feld, { pl: this.t + 12 * STD });
    this.ablaufPlanen(bes, this.t + 12 * STD);
    v.gold += 30;
    e.ep = (e.ep || 0) + 2;
    this.kampfVermerken(v.id, bes);
    this.meldung(bes, `${v.name} hat ${VERBESSERUNG[f.v].name} geplündert.`, { art: 'kampf', feld: e.feld, wichtig: true });
    delete this._raten[bes]; delete this._raten[v.id];
    return { gold: 30 };
  },

  // ---------- Luft ----------
  befehl_luftangriff(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    const d = EINHEIT[e.typ];
    pruefe(bereichVon(d) === 'luft' && d.klasse !== 'atom', 'Das ist keine Lufteinheit.');
    pruefe(!e.einsatz, 'Das Flugzeug ist noch im Einsatz.');
    pruefe(!(e.abkling_bis > this.t), `Das Flugzeug muss erst gewartet werden (bereit in ${Math.ceil((e.abkling_bis - this.t) / MIN)} min).`);
    const feld = b.ziel | 0;
    const start = this.einheitOrt(e);
    pruefe(abstand(start, feld) <= this.reichweite(e), `Das Ziel ist außerhalb des Einsatzradius (${this.reichweite(e)} Felder).`);
    const ziel = this.zielAuf(feld, v.id);
    pruefe(ziel && (ziel.einheit || ziel.stadt), 'Dort gibt es kein Ziel.');
    const h = this.kampfHindernis(v.id, ziel.volk);
    pruefe(!h, h);
    // Abfangen durch feindliche Jäger
    for (const j of this.alleEinheiten()) {
      if (j.volk !== ziel.volk || !EINHEIT[j.typ]?.faehigkeiten?.includes('abfangen') || j.einsatz) continue;
      if (abstand(j.feld, feld) > this.reichweite(j)) continue;
      const A = this.einheitStaerke(j, 'angriff', 'luft', { einheit: e });
      const D = this.einheitStaerke(e, 'verteidigung', 'luft', { einheit: j });
      const dmg = schaden(A.wert, D.wert, this.zufall());
      this.hpAbrechnen(e);
      e.hp = Math.max(0, e.hp - dmg);
      this.meldung(v.id, `${d.name} wurde von ${EINHEIT[j.typ].name} abgefangen (${dmg} Schaden).`, { art: 'kampf', feld });
      this.meldung(j.volk, `${EINHEIT[j.typ].name} hat einen Angreifer abgefangen.`, { art: 'kampf', feld });
      if (e.hp <= 0) { this.einheitEntfernen(e.id); return { abgefangen: true }; }
      break;
    }
    const erg = this.angriffAusfuehren(e, feld);
    const x = this.z.einheiten[e.id];
    if (x) { x.einsatz = { ziel: feld, zurueck_um: this.t + 5 * MIN }; this.markiere('e' + x.id); }
    return erg;
  },
  einsatzZurueck(eid) { const e = this.z.einheiten[eid]; if (e) { e.einsatz = null; this.markiere('e' + eid); } },

  befehl_verlegen(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    const d = EINHEIT[e.typ];
    pruefe(bereichVon(d) === 'luft', 'Nur Flugzeuge und Raketen werden verlegt.');
    const s = this.z.staedte[b.stadt];
    const traeger = this.z.einheiten[b.traeger];
    if (traeger) {
      pruefe(traeger.volk === v.id && EINHEIT[traeger.typ]?.faehigkeiten?.includes('traeger'), 'Das ist kein eigener Flugzeugträger.');
      pruefe(this.alleEinheiten().filter((x) => x.in === traeger.id).length < 3, 'Der Träger ist voll (3 Flugzeuge).');
      pruefe(abstand(this.einheitOrt(e), traeger.feld) <= this.reichweite(e) * 2, 'Der Träger ist zu weit weg.');
      e.in = traeger.id; e.feld = traeger.feld;
    } else {
      pruefe(s && s.volk === v.id, 'Flugzeuge können nur in eigene Städte oder auf Träger verlegt werden.');
      pruefe(abstand(this.einheitOrt(e), s.feld) <= this.reichweite(e) * 2, `Zu weit: höchstens ${this.reichweite(e) * 2} Felder.`);
      pruefe(this.luftPlatzFrei(s), 'In dieser Stadt ist kein Platz (Flughafen bauen).');
      e.in = null; e.feld = s.feld;
    }
    e.abkling_bis = this.t + 15 * MIN;
    this.positionenNeu();
    this.markiere('e' + e.id);
  },

  // ---------- Atom ----------
  befehl_atomschlag(v, b) {
    const e = this.eigeneEinheit(v, b.einheit);
    const d = EINHEIT[e.typ];
    pruefe(d.faehigkeiten?.includes('flaechenschaden'), 'Das ist keine Atomwaffe.');
    pruefe(this.hatOption(v, 'atomschlag'), `Dafür fehlt die Forschung "${this.forschungsName(FREIGESCHALTET_DURCH['option:atomschlag'])}".`);
    const feld = b.ziel | 0;
    pruefe(abstand(this.einheitOrt(e), feld) <= this.reichweite(e), `Das Ziel ist außer Reichweite (${this.reichweite(e)} Felder).`);
    const felder = umkreis(feld, 2);
    const betroffen = new Set();
    for (const i of felder) {
      const s = this.stadtAuf(i); if (s) betroffen.add(s.volk);
      for (const u of this.einheitenAuf(i)) betroffen.add(u.volk);
      const bes = this.besitzer(i); if (bes != null) betroffen.add(bes);
    }
    betroffen.delete(v.id);
    pruefe(betroffen.size > 0, 'Dort gibt es kein feindliches Ziel.');
    for (const x of betroffen) { const h = this.kampfHindernis(v.id, x); pruefe(!h, 'Atomschlag nicht erlaubt: ' + h + ' (Im Umkreis von 2 Feldern dürfen nur Ziele liegen, die du gerade angreifen darfst.)'); }
    pruefe(!this.einheitenAuf(feld).some((u) => u.volk === v.id) && felder.every((i) => this.besitzer(i) !== v.id && !this.einheitenAuf(i).some((u) => u.volk === v.id)), 'Im Umkreis stehen eigene Einheiten oder eigenes Land.');
    for (const x of betroffen) this.aendern(x);
    for (const i of felder) {
      for (const u of this.einheitenAuf(i)) { this.hpAbrechnen(u); u.hp -= 80; if (u.hp <= 0) this.einheitEntfernen(u.id); else this.markiere('e' + u.id); }
      const s = this.stadtAuf(i);
      if (s) { this.stadtHpAbrechnen(s); s.hp = Math.max(1, s.hp * 0.4); s.bev = Math.max(1, Math.round(s.bev * 0.5)); s.angriff_um = this.t; this.markiere('s' + s.id); }
      this.setzeFeld(i, { fo: this.t + 24 * STD, pl: this.z.felder[i]?.v ? this.t + 24 * STD : null });
      this.ablaufPlanen(this.besitzer(i), this.t + 24 * STD);
    }
    for (const x of betroffen) { this.kampfVermerken(v.id, x); this.meldung(x, `${v.name} hat eine Atomwaffe eingesetzt! Der Fallout vergeht nach 24 Stunden.`, { art: 'kampf', feld, wichtig: true }); delete this._raten[x]; }
    for (const a of this.alleVoelker()) if (!betroffen.has(a.id) && a.id !== v.id) this.meldung(a.id, `${v.name} hat eine Atomwaffe eingesetzt.`, { art: 'kampf' });
    this.ausgehend.push({ art: 'atom', nach: feld, t: this.t });
    this.einheitEntfernen(e.id);
    return { atom: true };
  },
};
