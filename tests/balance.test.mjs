import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('Balance-Simulation: ganzer Baum in 2-4 Wochen, Zeitalter nahe der Zielwerte, Unterhalt beherrschbar', { timeout: 180000 }, () => {
  const out = execFileSync(process.execPath, ['tools/balance-sim.mjs', '34', '--still'], { encoding: 'utf8', maxBuffer: 1e7 });
  const b = JSON.parse(out.trim().split('\n').pop());
  assert.equal(b.engineFehler, 0);
  assert.ok(b.ganzerBaumNachTagen >= 14 && b.ganzerBaumNachTagen <= 30, 'ganzer Baum nach ' + b.ganzerBaumNachTagen + ' Tagen');
  for (const e of b.ergebnisse) {
    if (e.dauer_tage == null) continue;
    assert.ok(e.dauer_tage >= e.ziel * 0.5 && e.dauer_tage <= e.ziel * 1.6, `${e.zeitalter}: ${e.dauer_tage} Tage (Ziel ${e.ziel})`);
  }
  // Der Übergang wird später zäher: Moderne und Atomzeit dauern länger als Antike und Klassik
  const d = Object.fromEntries(b.ergebnisse.map((e) => [e.zeitalter, e.dauer_tage]));
  assert.ok(d.Moderne > d.Klassik && d.Atomzeit > d.Antike);
  assert.ok(b.maxUnterhaltAnteil < 0.5, 'Unterhalt frisst ' + b.maxUnterhaltAnteil);
  for (const k of b.ki) assert.ok(k.zeitalter <= 5 && k.staedte <= 6, 'KI zu stark: ' + JSON.stringify(k));
});
