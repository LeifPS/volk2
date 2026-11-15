// Eingabe: Maus (Linksklick wählen, Rechtsklick Befehl, Ziehen, Mausrad), Touch (Tippen, Ziehen, Zwei-Finger-Zoom,
// langes Drücken = Befehl) und Tastatur (Leertaste nächste Aktion, Esc, F-Tasten).
import { Z, einheitenAuf, stadtAuf, aktuellesFeld } from './kern/zustand.js';
import { aktivitaet } from './kern/netz.js';
import { feldBeiSchirm, objektBei, verschieben, zoomen, zoomAuf, kamera, overlay, neuZeichnen } from './karte/render.js';
import { waehle, befehlAufFeld, zielGewaehlt, naechsteAktion, meldungsListe } from './ui/hud.js';
import * as F from './ui/fenster.js';
import { fensterOffen, oberstesFenster, versteckeTip } from './ui/basis.js';
import { ton, tonStarten } from './audio.js';

const LANG = 480;
export function init(cv) {
  const zeiger = new Map();
  let start = null, gezogen = false, pinch = null, langTimer = null, langAusgeloest = false;
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => {
    tonStarten(); aktivitaet(); versteckeTip();
    cv.setPointerCapture(e.pointerId);
    zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (zeiger.size === 2) {
      clearTimeout(langTimer);
      const [a, b] = [...zeiger.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: kamera.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      return;
    }
    start = { x: e.clientX, y: e.clientY, knopf: e.button, typ: e.pointerType, t: performance.now() };
    gezogen = false; langAusgeloest = false;
    if (e.pointerType !== 'mouse') {
      langTimer = setTimeout(() => { if (!gezogen && zeiger.size === 1) { langAusgeloest = true; navigator.vibrate?.(20); rechts(start.x, start.y); } }, LANG);
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && !zeiger.size) { const f = feldBeiSchirm(e.clientX, e.clientY); if (f !== overlay.hover) { overlay.hover = f; neuZeichnen(); } return; }
    const alt = zeiger.get(e.pointerId); if (!alt) return;
    zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && zeiger.size === 2) {
      const [a, b] = [...zeiger.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAuf(Math.max(0.5, Math.min(4, pinch.zoom * d / pinch.d)), mx, my);
      verschieben(mx - pinch.mx, my - pinch.my); pinch.mx = mx; pinch.my = my;
      return;
    }
    if (!start) return;
    if (!gezogen && Math.hypot(e.clientX - start.x, e.clientY - start.y) > (e.pointerType === 'mouse' ? 5 : 10)) { gezogen = true; clearTimeout(langTimer); }
    if (gezogen) verschieben(e.clientX - alt.x, e.clientY - alt.y);
  });
  const ende = (e) => {
    zeiger.delete(e.pointerId);
    clearTimeout(langTimer);
    if (zeiger.size < 2) pinch = null;
    if (!start || zeiger.size) { if (!zeiger.size) start = null; return; }
    const s = start; start = null;
    if (gezogen || langAusgeloest || e.type === 'pointercancel') return;
    if (s.knopf === 2) rechts(e.clientX, e.clientY);
    else if (s.knopf === 0) links(e.clientX, e.clientY);
  };
  cv.addEventListener('pointerup', ende);
  cv.addEventListener('pointercancel', ende);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoomen(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY); }, { passive: false });
  cv.addEventListener('dblclick', (e) => { const f = feldBeiSchirm(e.clientX, e.clientY); const s = stadtAuf(f); if (s && s.volk === Z.volk) F.stadt(s.id); });

  addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    aktivitaet();
    if (e.key === 'Escape') {
      if (Z.zielmodus) { Z.zielmodus = null; overlay.reichweite = null; neuZeichnen(); return; }
      if (fensterOffen()) { const f = oberstesFenster(); if (!f.o.modal) f.schliessen(); return; }
      waehle(null); return;
    }
    if (fensterOffen()) return;
    const k = e.key;
    if (k === ' ') { e.preventDefault(); naechsteAktion(); }
    else if (k === 'F1') { e.preventDefault(); F.forschung(); }
    else if (k === 'F2') { e.preventDefault(); F.reich(); }
    else if (k === 'F3') { e.preventDefault(); F.diplomatie(); }
    else if (k === 'F4') { e.preventDefault(); F.rangliste(); }
    else if (k === 'F5') { e.preventDefault(); F.lexikon(); }
    else if (k === 'h' || k === 'H') F.hilfe();
    else if (k === 'n' || k === 'N') meldungsListe();
    else if (k === '+' || k === '=') zoomen(1);
    else if (k === '-') zoomen(-1);
    else if (k === 'ArrowLeft' || k === 'a') verschieben(120, 0);
    else if (k === 'ArrowRight' || k === 'd') verschieben(-120, 0);
    else if (k === 'ArrowUp' || k === 'w') verschieben(0, 120);
    else if (k === 'ArrowDown' || k === 's') verschieben(0, -120);
  });
}

async function links(x, y) {
  const feld = feldBeiSchirm(x, y);
  if (feld < 0) return;
  if (Z.zielmodus) { await zielGewaehlt(feld); return; }
  ton('klick');
  // Einheiten über ihrem Feld anklickbar
  const obj = objektBei(x, y);
  const hier = einheitenAuf(obj ? obj.feld : feld);
  const st = stadtAuf(feld);
  const eigene = hier.filter((e) => e.volk === Z.volk);
  const a = Z.auswahl;
  if (eigene.length) {
    // mehrere eigene Einheiten auf einem Feld: durchschalten, danach die Stadt
    const ids = eigene.map((e) => e.id);
    if (a?.art === 'einheit' && ids.includes(a.id)) {
      const n = ids.indexOf(a.id) + 1;
      if (n < ids.length) return waehle({ art: 'einheit', id: ids[n] });
      if (st && st.feld === aktuellesFeld(eigene[0])) return waehle({ art: 'stadt', id: st.id });
    }
    return waehle({ art: 'einheit', id: ids[0] });
  }
  if (st) return waehle({ art: 'stadt', id: st.id });
  if (hier.length) return waehle({ art: 'einheit', id: hier[0].id });
  waehle({ art: 'feld', id: feld });
  F.tutorialEreignis('feld_angeklickt');
}

async function rechts(x, y) {
  const feld = feldBeiSchirm(x, y);
  if (feld < 0) return;
  if (Z.zielmodus) { await zielGewaehlt(feld); return; }
  await befehlAufFeld(feld);
}
