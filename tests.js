/* Prüfungen des Rechenkerns. Aufruf: node tests.js
   Testfall 1 rechnet das Excel-Blatt „Heizlast“ (TGA_Kita_Wesel_Berechnung_1.xlsx) nach.
   Die Eingangswerte stehen NUR hier im Test (aus Blatt „Eingaben“), nicht in der App. */
'use strict';
const C = require('./src/calc.js');
let n = 0, f = 0;
function pruefe(name, ist, soll, tolRel) {
  const gut = tolRel !== undefined ? Math.abs(ist - soll) <= Math.abs(soll) * tolRel : ist === soll;
  if (gut) { n++; return; }
  f++; console.log(`✗ ${name}\n    ist: ${ist}\n   soll: ${soll}`);
}
const nw = (wert, quelle = 'Excel-Mappe Kita Wesel, Blatt Eingaben (ungeprüft)') => ({ wert, quelle, geprueft: true });

// ── Testprojekt „Kita EG (eine Zone)“ ──────────────────────────────────────
function testprojekt() {
  const P = C.leeresProjekt();
  const st = P.normwerte.standorte[0]; st.name = 'Wesel'; st.te = nw('-8,5'); st.tme = nw('10,5');
  const ra = P.normwerte.raumarten[0]; ra.name = 'Kita Zonenmittel'; ra.tint = nw('20');
  P.normwerte.fg1 = nw('1,45'); P.normwerte.Gw = nw('1'); P.normwerte.rhocp = nw('0,34');
  P.normwerte.e[0].klasse = 'Excel A10'; P.normwerte.e[0].w = nw('0,02');
  P.normwerte.eps[0].klasse = 'Excel A10'; P.normwerte.eps[0].w = nw('1');
  P.projekt.standortId = st.id; P.projekt.phiWE = '16'; P.optionen.verfahren = 'excel';
  const bt = (name, U) => { const b = { id: C.neueId('bt'), name, art: name, U, dUWB: '0,05', quelle: 'Excel Eingaben', herkunft: 'manuell' }; P.bauteile.push(b); return b.id; };
  const aw = bt('Außenwand', '0,2'), fe = bt('Fenster', '0,9'), bp = bt('Bodenplatte', '0,25'), iw = bt('Wand zur Gastro', '0,2');
  const r = C.leererRaum();
  Object.assign(r, { nr: '1', name: 'Kita EG (eine Zone)', geschoss: 'EG', raumartId: ra.id, amodus: 'LB', L: '38,475', B: '19,875', hi: '3,6' });
  const fl = (bauteilId, Ab, Az, an, thetaX = '') => Object.assign(C.leereFlaeche(), { bauteilId, Ab, Az, an, thetaX });
  r.flaechen = [fl(aw, '387,3', '116,19', 'aussen'), fl(fe, '116,19', '0', 'aussen'), fl(bp, '764,690625', '0', 'erdreich'), fl(iw, '79,5', '0', 'beheizt', '20')];
  Object.assign(r.lueftung, { Vsu: '3708', suModus: 'eta', eta: '0,75', n50: '1', eId: P.normwerte.e[0].id, epsId: P.normwerte.eps[0].id });
  P.raeume.push(r);
  return P;
}

const P = testprojekt();
const R = C.rechneRaum(P.raeume[0], P);
pruefe('Testfall vollständig', R.vollstaendig, true);
if (!R.vollstaendig) console.log(R.fehlt);
// Sollwerte aus dem Excel-Blatt „Heizlast“ (berechnete Zellwerte)
pruefe('A_G = 764,69 m² (D7)', R.w.A, 764.6906250000001, 1e-12);
pruefe('V_i = 2752,89 m³ (D12)', R.w.V, 2752.8862500000005, 1e-12);
pruefe('Δθ = 28,5 K (D13)', R.w.dth, 28.5, 1e-12);
pruefe('Φ_T,AW = 1931,66 W (D26)', R.zeilen[0].phi, 1931.65875, 1e-9);
pruefe('Φ_T,W = 3145,84 W (D27)', R.zeilen[1].phi, 3145.8442500000006, 1e-9);
pruefe('f_g = 0,4833 (D17)', R.zeilen[2].f, 0.4833333333333333, 1e-12);
pruefe('Φ_T,G = 3160,08 W (D28)', R.zeilen[2].phi, 3160.0840078125, 1e-9);
pruefe('Φ_T,adj = 0 W (D24)', R.zeilen[3].phi, 0);
pruefe('Φ_T = 8237,59 W (D29)', R.phiT, 8237.587007812499, 1e-9);
pruefe('V̇_inf = 110,12 m³/h (D34)', R.w.Vinf, 110.11545000000002, 1e-9);
pruefe('Φ_V,mech = 8982,63 W (D37)', R.PhiVsu, 8982.63, 1e-9);
pruefe('Φ_V,inf = 1067,02 W (D38)', R.PhiVinf, 1067.0187105000002, 1e-9);
pruefe('Φ_V = 10049,65 W (D39)', R.phiV, 10049.6487105, 1e-9);
pruefe('Φ_HL = 18 287 W (D42), Toleranz 0,1 %', R.phiHL, 18287.2357183125, 0.001);
pruefe('Φ_HL exakt wie Excel', R.phiHL, 18287.2357183125, 1e-12);
pruefe('φ = 23,91 W/m² (D43)', R.phiSpez, 23.914554619147445, 1e-9);
const G = C.rechneGebaeude(P);
pruefe('η = 1,143 (D46)', G.nachweis.eta, 1.1429522323945311, 1e-9);
pruefe('Nachweis nicht erfüllt (D47 „nein“)', G.nachweis.erfuellt, false);

// ── Testfall 2: unvollständig ──────────────────────────────────────────────
const P2 = testprojekt();
const r2 = P2.raeume[0];
r2.hi = ''; r2.flaechen[0].Az = ''; r2.lueftung.eta = '';
P2.normwerte.fg1.geprueft = false; P2.normwerte.rhocp.quelle = '';
const R2 = C.rechneRaum(r2, P2);
pruefe('unvollständig erkannt', R2.vollstaendig, false);
pruefe('kein Ergebnis Φ_HL', Number.isNaN(R2.phiHL), true);
const txt = R2.fehlt.map(x => x.text);
const erwartet = ['lichte Höhe h_i: Eingabe fehlt', 'Fläche 1: Abzug Öffnungen (0 eintragen, wenn keine): Eingabe fehlt',
  'f_g1: nicht als „geprüft“ markiert', 'ρ·c_p: Quelle fehlt', 'Rückwärmzahl η_WRG: Eingabe fehlt'];
pruefe('Fehlliste genau 5 Einträge', txt.length, 5);
erwartet.forEach(e => pruefe('Fehlliste enthält: ' + e, txt.includes(e), true));
pruefe('Gebäude ohne Ergebnis', C.rechneGebaeude(P2).summe, null);
// leeres Projekt: nichts vorbelegt
const L = C.leeresProjekt();
const werte = JSON.stringify(L.normwerte).match(/"wert":"[^"]*"/g);
pruefe('Normwert-Tabellen leer', werte.every(w => w === '"wert":""'), true);
pruefe('keine Zahl im Projektkopf', ['phiWE', 'standortId', 'datum', 'position'].every(k => L.projekt[k] === ''), true);
const Rl = C.rechneRaum(C.leererRaum(), L);
pruefe('leerer Raum: kein Ergebnis', Rl.vollstaendig, false);

// ── Testfall 3: Übernahme aus der Wärmeschutz-App ──────────────────────────
const ws = { format: 'fh21.bauteile', version: 1, bauteile: [{ id: 'ws-1', name: 'AW 1 – KS + WDVS', art: 'Außenwand', U: 0.226, quelle: 'Wärmeschutz-App, Bauteil „AW 1 – KS + WDVS“' }] };
const liste = C.leseBauteilDatei(ws);
const b = C.bauteilAusWaermeschutz(liste[0]);
pruefe('Import: Name', b.name, 'AW 1 – KS + WDVS');
pruefe('Import: U mit Dezimalkomma', b.U, '0,226');
pruefe('Import: Herkunft', b.herkunft, 'waermeschutz');
pruefe('Import: Quelle nennt Bauteil', b.quelle.includes('AW 1'), true);
pruefe('Import: ΔU_WB bleibt leer', b.dUWB, '');
const b2 = C.bauteilAusWaermeschutz({ name: 'DA', U: 0.2, ungeprueft: ['Zellulose'] });
pruefe('Import: ungeprüfte Schichten übernommen', b2.ungeprueft.join() + '|' + b2.schichtenGeprueft, 'Zellulose|false');
const P9 = testprojekt(); const bt9 = Object.assign(P9.bauteile[0], { herkunft: 'waermeschutz', ungeprueft: ['Zellulose'], schichtenGeprueft: false });
pruefe('ungeprüfte Schichten → Raum unvollständig', C.rechneRaum(P9.raeume[0], P9).fehlt.some(x => x.pfad === `bt.${bt9.id}.schichtenGeprueft`), true);
bt9.schichtenGeprueft = true;
pruefe('Schichtwerte abgehakt → Raum vollständig', C.rechneRaum(P9.raeume[0], P9).vollstaendig, true);
const b3 = C.bauteilAusWaermeschutz({ name: 'BP', U: 0.211, RT: 4.744, dU: 0, schichten: [{ name: 'Stahlbeton', d: 30, lambda: 2.3, R: 0.13, quelle: 'DIN 4108-4' }, { name: 'XPS', d: 16, lambda: 0.036, R: 4.444, quelle: '' }] });
pruefe('Import: Schichtaufbau übernommen', b3.schichten.map(s => `${s.name}/${s.d}/${s.lambda}/${s.R}`).join('|') + '|' + b3.RT, 'Stahlbeton/30/2.3/0.13|XPS/16/0.036/4.444|4.744');
pruefe('Import: ohne Schichten leere Liste', b2.schichten.length, 0);
const b4 = C.bauteilAusWaermeschutz({ name: 'AW', U: 0.2, zustand: { f: { raum: 'normal', 'bef-aktiv': false, 'theta-i': 20 }, s: [['baustoff', '', 'KS', 17.5, '0,99', 'DIN 4108-4', 5]] } });
pruefe('Import: Wärmeschutz-Eingaben zum Bearbeiten gespeichert', JSON.stringify(b4.wsZustand), '{"f":{"raum":"normal","bef-aktiv":false,"theta-i":"20"},"s":[["baustoff","","KS","17.5","0,99","DIN 4108-4","5"]]}');
pruefe('Import: ohne Eingaben kein Bearbeiten', b2.wsZustand, null);
const b5 = C.bauteilAusWaermeschutz({ name: 'AW', U: 0.2, nachweis: { min: { rmin: 1.2, Rvorh: 4.6, ok: true, zeile: '1', din: '2013-02' },
  glaser: { tauwasser: true, mc: 0.12, mev: 0.5, mcGrenze: 1, ok: true }, schimmel: { thetaSi: 19.2, thetaMin: 12.6, ok: true }, boese: '<x>' } });
pruefe('Import: Nachweise übernommen', [b5.nachweis.min.Rvorh, b5.nachweis.min.ok, b5.nachweis.glaser.mc, b5.nachweis.schimmel.thetaSi, b5.nachweis.gmodg].join('|'), '4.6|true|0.12|19.2|');
pruefe('Import: ohne Nachweise null', b2.nachweis, null);
pruefe('Import: ungültiges Bauteil abgelehnt', C.bauteilAusWaermeschutz({ name: 'x' }), null);

// ── Sonderfälle ────────────────────────────────────────────────────────────
const P3 = testprojekt(); P3.raeume[0].flaechen[3].thetaX = '24';
const R3 = C.rechneRaum(P3.raeume[0], P3);
pruefe('wärmerer Nachbarraum → Φ negativ', R3.zeilen[3].phi < 0 && R3.zeilen[3].gewinn, true);
pruefe('Φ_j = 79,5·0,25·(20−24) = −79,5 W', R3.zeilen[3].phi, -79.5, 1e-12);
const P5 = testprojekt(); P5.raeume[0].lueftung.suModus = 'theta'; P5.raeume[0].lueftung.thetaSu = '12,875';
pruefe('θ_su direkt = θ_e + 0,75·28,5 → gleiches Φ_HL', C.rechneRaum(P5.raeume[0], P5).phiHL, R.phiHL, 1e-12);
const P6 = testprojekt(); P6.raeume[0].phiRH = '1000';
pruefe('Φ_RH (ältere Projekte: direkt eingetragen) wird addiert', C.rechneRaum(P6.raeume[0], P6).phiHL, R.phiHL + 1000, 1e-12);
P6.raeume[0].rhModus = 'fRH'; P6.raeume[0].fRH = '10'; P6.raeume[0].fRHQuelle = 'Test';
pruefe('Φ_RH = A_R · f_RH = 764,69 · 10', C.rechneRaum(P6.raeume[0], P6).phiRH, 7646.90625, 1e-12);
const P0 = testprojekt(); P0.optionen.verfahren = '';
pruefe('ohne gewähltes Verfahren kein Ergebnis', C.rechneRaum(P0.raeume[0], P0).fehlt.some(x => x.pfad === 'projekt.verfahren'), true);

// ── Verfahren DIN EN 12831:2003 (Laasch, Haustechnik, S. 555–559) am Kita-Raum ──
const P7 = testprojekt(); P7.optionen.verfahren = 'din2003';
const R7a = C.rechneRaum(P7.raeume[0], P7);
const fehltText = R7a.fehlt.map(x => x.text).join(' | ');
pruefe('DIN 2003 verlangt U_equiv für Erdreich', fehltText.includes('U_equiv'), true);
pruefe('DIN 2003 verlangt V̇_ex', fehltText.includes('V̇_ex'), true);
pruefe('DIN 2003 verlangt n_min der Raumart', fehltText.includes('n_min'), true);
// Ergänzung nur für den Formeltest (keine Normwerte): U_equiv 0,2, V̇_ex = V̇_su, n_min 0,3
Object.assign(P7.raeume[0].flaechen[2], { Uequiv: '0,2', UequivQuelle: 'Test' });
P7.raeume[0].lueftung.Vex = '3708';
P7.normwerte.raumarten[0].nmin = nw('0,3');
const R7 = C.rechneRaum(P7.raeume[0], P7);
pruefe('DIN 2003 vollständig', R7.vollstaendig, true);
pruefe('DIN 2003 Erdreich: 764,69 · 0,2 · 0,4833 · 28,5', R7.zeilen[2].phi, 764.690625 * 0.2 * 1.45 * (9.5 / 28.5) * 28.5, 1e-12);
pruefe('DIN 2003 beheizt: U ohne ΔU_WB (θ_j = θ_int → 0 W)', R7.zeilen[3].ukName + '|' + R7.zeilen[3].phi, 'U|0');
pruefe('DIN 2003 V̇_therm = V̇_inf + V̇_su·f_V,su (V̇_min kleiner)', R7.w.Vtherm, R.w.Vinf + 3708 * 0.25, 1e-12);
pruefe('DIN 2003 Φ_V = ρc_p · V̇_therm · Δθ = Excel-Φ_V bei ausgeglichener Anlage', R7.phiV, R.phiV, 1e-12);
P7.raeume[0].lueftung.Vex = '4000';
pruefe('DIN 2003 Abluftüberschuss V̇_ex − V̇_su = 292 m³/h', C.rechneRaum(P7.raeume[0], P7).w.Vmech, 292, 1e-12);
P7.raeume[0].lueftung.Vex = '3000';
pruefe('DIN 2003 Zuluftüberschuss → V̇_mech,inf = 0', C.rechneRaum(P7.raeume[0], P7).w.Vmech, 0);
P7.raeume[0].lueftung.Vex = '3708'; P7.normwerte.raumarten[0].nmin = nw('2');
const R7m = C.rechneRaum(P7.raeume[0], P7);
pruefe('DIN 2003 Mindestluftwechsel maßgebend: V̇_therm = 2 · V_i', R7m.w.Vtherm + '|' + R7m.w.minMassgebend, (2 * R.w.V) + '|true');

// ── Referenzfall Laasch, Haustechnik, 13. Aufl., S. 558: Raum 03 Küche (Stuttgart) ──
// Eingaben aus Formblatt R 8 / G 1 (S. 554, 558). Werte nur hier im Test.
function laaschKueche() {
  const P = C.leeresProjekt(); P.optionen.verfahren = 'din2003';
  const q = 'Laasch, Haustechnik, S. 554/558';
  const st = P.normwerte.standorte[0]; st.name = 'Stuttgart'; st.te = nw('-12', q); st.tme = nw('11', q);
  const ra = P.normwerte.raumarten[0]; ra.name = 'Küche'; ra.tint = nw('20', q); ra.nmin = nw('1,0', q);
  P.normwerte.rhocp = nw('0,34', 'Laasch S. 556');
  P.normwerte.e[0].klasse = 'moderat'; P.normwerte.e[0].w = nw('0,03', q);
  P.normwerte.eps[0].klasse = '0–10 m'; P.normwerte.eps[0].w = nw('1,0', q);
  P.projekt.standortId = st.id;
  const bt = (name, U, dU) => { const b = { id: C.neueId('bt'), name, art: name, U, dUWB: dU, quelle: q, herkunft: 'manuell' }; P.bauteile.push(b); return b.id; };
  const af = bt('AF', '1,40', '0,05'), aw = bt('AW', '0,34', '0,05'), it = bt('IT', '2,00', '0'), iw = bt('IW', '1,88', '0'), fb = bt('FB', '0,66', '0');
  const r = C.leererRaum();
  Object.assign(r, { nr: '03', name: 'Küche', raumartId: ra.id, amodus: 'LB', L: '2,51', B: '4,26', hi: '2,56', rhModus: 'fRH', fRH: '9,3', fRHQuelle: q });
  const fl = (bauteilId, Ab, Az, an, thetaX = '') => Object.assign(C.leereFlaeche(), { bauteilId, Ab, Az, an, thetaX });
  r.flaechen = [fl(af, '1,7', '0', 'aussen'), fl(aw, '7,3', '1,7', 'aussen'), fl(it, '1,8', '0', 'beheizt', '15'), fl(iw, '11,7', '1,8', 'beheizt', '15'), fl(fb, '10,7', '0', 'beheizt', '10')];
  Object.assign(r.lueftung, { Vsu: '0', Vex: '0', n50: '1,0', eId: P.normwerte.e[0].id, epsId: P.normwerte.eps[0].id });
  P.raeume.push(r);
  return P;
}
const PL = laaschKueche(), RL = C.rechneRaum(PL.raeume[0], PL);
pruefe('Laasch Küche vollständig', RL.vollstaendig, true);
if (!RL.vollstaendig) console.log(RL.fehlt);
pruefe('Laasch A_R = 10,69 m²', RL.w.A, 10.69, 0.001);
pruefe('Laasch V_R = 27,37 m³', RL.w.V, 27.37, 0.001);
pruefe('Laasch Φ_T AF = 79 W', RL.zeilen[0].phi, 79, 0.01);
pruefe('Laasch Φ_T AW = 70 W', RL.zeilen[1].phi, 70, 0.01);
pruefe('Laasch Φ_T IT = 17 W (Buch mit f = 0,15 gerundet; exakt 5/32)', RL.zeilen[2].phi, 17, 0.06);
pruefe('Laasch Φ_T FB = 70 W', RL.zeilen[4].phi, 70, 0.01);
pruefe('Laasch V̇_inf = 1,64 m³/h', RL.w.Vinf, 1.64, 0.002);
pruefe('Laasch V̇_min = V̇_therm = 27,37 m³/h', RL.w.Vtherm, 27.37, 0.001);
pruefe('Laasch Φ_V = 298 W', RL.phiV, 298, 0.002);
pruefe('Laasch Φ_RH = A_R · f_RH = 99 W', RL.phiRH, 99, 0.005);
// Buch, Zeile IW: H_T = 0,28 W/K und Φ = 9 W passen nicht zu A = 9,9 m², f = 0,15, U = 1,88 (ergibt 2,79 W/K bzw. 89 W).
// Die App rechnet die Zeile nach Formel; daher weicht Σ Φ_T (Buch 245 W) ab:
pruefe('Laasch IW nach Formel: 9,9 · 1,88 · (20 − 15) = 93,06 W', RL.zeilen[3].phi, 9.9 * 1.88 * 5, 1e-9);
pruefe('Laasch Σ Φ_T = Buch 245 W − 9 W + 93,06 W (Abweichung nur aus Zeile IW und Rundung f)', RL.phiT, 245 - 9 + 93.06, 0.01);
// Grundfläche aus Teilflächen
const P8 = testprojekt(), r8 = P8.raeume[0];
const tf = (L, B, minus = false) => Object.assign(C.leereTeilflaeche(), { L, B, minus });
r8.amodus = 'TF'; r8.teilflaechen = [tf('20', '19,875'), tf('18,475', '19,875')];
const R8 = C.rechneRaum(r8, P8);
pruefe('Teilflächen 20·19,875 + 18,475·19,875 = A_G', R8.w.A, 764.6906250000001, 1e-12);
pruefe('Teilflächen: gleiches Φ_HL wie L · B', R8.phiHL, R.phiHL, 1e-12);
r8.teilflaechen = [tf('5,2', '4,1'), tf('2', '1,5'), tf('1', '0,5', true)];
pruefe('L-Raum mit Aussparung: 5,2·4,1 + 2·1,5 − 1·0,5 = 23,82 m²', C.rechneRaum(r8, P8).w.A, 23.82, 1e-12);
r8.teilflaechen = [tf('5,2', '')];
pruefe('Teilfläche ohne Breite → Fehlliste', C.rechneRaum(r8, P8).fehlt.some(x => x.text === 'Teilfläche 1: Breite: Eingabe fehlt'), true);
r8.teilflaechen = [];
pruefe('keine Teilfläche → Fehlliste', C.rechneRaum(r8, P8).fehlt.some(x => x.text === 'keine Teilfläche eingetragen'), true);
// innenliegender Raum
const P9i = testprojekt(), ri = P9i.raeume[0];
ri.innenliegend = true;
pruefe('innenliegend mit Flächen → Fehlliste', C.rechneRaum(ri, P9i).fehlt.some(x => x.text.includes('innenliegend')), true);
ri.flaechen = [];
const Ri = C.rechneRaum(ri, P9i);
pruefe('innenliegend ohne Flächen → vollständig, Φ_T = 0', Ri.vollstaendig + '|' + Ri.phiT, 'true|0');
pruefe('innenliegend: Lüftung bleibt', Ri.phiV, R.phiV, 1e-12);
ri.innenliegend = false;
pruefe('ohne Haken und ohne Flächen → Fehlliste', C.rechneRaum(ri, P9i).fehlt.some(x => x.text.startsWith('keine Hüllfläche')), true);
pruefe('Zahl mit Komma', C.num('1,45'), 1.45);
pruefe('keine Zahl', Number.isNaN(C.num('1,4x')), true);

// ── Gebaute Datei: Syntax aller Skripte, auch der eingebetteten Wärmeschutz-App ──
{
  const fs = require('fs'), vm = require('vm'), path = require('path');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const skripte = h => [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const syntax = (code, name) => { try { new vm.Script(code, { filename: name }); return ''; } catch (e) { return name + ': ' + e.message; } };
  const aussen = skripte(html);
  pruefe('index.html: 4 Skriptblöcke (Bibliotheken, Wärmeschutz, Rechenkern, Oberfläche)', aussen.length, 4);
  pruefe('index.html: Syntax aller Skripte', aussen.map((c, i) => syntax(c, 'Skript ' + (i + 1))).filter(Boolean).join(' | '), '');
  const ctx = {}; vm.createContext(ctx); vm.runInContext(aussen.find(c => c.includes('const WS_HTML')).replace('const WS_HTML', 'globalThis.WS_HTML'), ctx);
  const innen = skripte(ctx.WS_HTML);
  pruefe('Wärmeschutz eingebettet: 4 Skripte (data, calc, begriffe, app)', innen.length, 4);
  pruefe('Wärmeschutz eingebettet: Syntax', innen.map((c, i) => syntax(c, 'WS-Skript ' + (i + 1))).filter(Boolean).join(' | '), '');
  pruefe('Wärmeschutz eingebettet: keine externen Dateien', /<script src=|<link rel="stylesheet" href=/.test(ctx.WS_HTML), false);
}

// ── Referenzfall wbs-Musterbeispiel DIN/TS 12831-1:2020 (13 Räume, Soll 5 696 W) ──
{
  const W = require('./pruefung/wbs_musterbeispiel.js');
  const P = W.projekt(), G = C.rechneGebaeude(P);
  pruefe('wbs: alle 13 Räume vollständig', G.alle, true);
  G.raeume.forEach((x, i) => pruefe(`wbs: Φ_HL Raum ${P.raeume[i].nr} = ${W.SOLL.raeume[P.raeume[i].nr]} W (±2 W)`, Math.abs(x.phiHL - W.SOLL.raeume[P.raeume[i].nr]) <= 2, true));
  pruefe('wbs: E-1 Leckage q_V,env = 0,1 · 2 · A_env = 19,7 m³/h', Math.round(G.raeume[0].w.qenvmin * 10) / 10, 19.7);
  pruefe('wbs: E-6 Mindestluft maßgebend 0,5 · 21,24 m³ = 10,6 m³/h', Math.round(G.raeume[5].w.qenvmin * 10) / 10 + '|' + G.raeume[5].w.minMassgebend, '10.6|true');
  pruefe('wbs: E-1 Zuluft 40 · 0,34 · (20 − 17,8) = 29,9 W', Math.round(G.raeume[0].PhiVsu * 10) / 10, 29.9);
  pruefe('wbs: 1-6 Überströmung 40 · 0,34 · (24 − 20) = 54,4 W', Math.round(G.raeume[11].PhiVtr * 10) / 10, 54.4);
  pruefe('wbs: Σ Φ_T,stand ≈ 5 229 W', G.summe.phiT, W.SOLL.phiTstand, 0.002);
  pruefe('wbs: Φ_T,e (nach außen) ≈ 4 979 W', G.geb.phiTe, W.SOLL.phiTe, 0.002);
  pruefe('wbs: Σ Φ_V,env/min ≈ 1 097 W', G.geb.PhiVenv, W.SOLL.PhiVenv, 0.002);
  pruefe('wbs: Σ Φ_HL Räume ≈ 6 495 W', G.summe.phiHL, W.SOLL.phiHLraeume, 0.001);
  pruefe('wbs: Norm-Gebäudeheizlast ≈ 5 696 W', G.geb.phiHL, W.SOLL.phiHLgeb, 0.001);
  P.projekt.phiWE = '6';
  pruefe('wbs: Nachweis nutzt Gebäudeheizlast (5,695 / 6)', Math.round(C.rechneGebaeude(P).nachweis.eta * 1000) / 1000, 0.949);
  // n_min raumweise: ohne Quelle unvollständig
  const P2 = W.projekt(); P2.raeume[0].lueftung.nminRaum = '0';
  pruefe('wbs: n_min je Raum ohne Quelle → unvollständig', C.rechneRaum(P2.raeume[0], P2).fehlt.some(x => x.pfad === 'raum.lu.nminQuelle'), true);
  const P3 = W.projekt(); P3.normwerte.fenv.geprueft = false;
  pruefe('wbs: f_env nicht geprüft → unvollständig', C.rechneRaum(P3.raeume[0], P3).vollstaendig, false);
  pruefe('wbs: DIN/TS braucht kein n_50, e, ε', C.rechneRaum(P.raeume[0], P).fehlt.length, 0);
}

// ── Hüllfläche aus Länge × Höhe ────────────────────────────────────────────
{
  const P = testprojekt(), r = P.raeume[0], f = r.flaechen[0];
  const vorher = C.rechneRaum(r, P);
  const Ab = C.num(f.Ab);
  f.fL = '2'; f.fH = String(Ab / 2).replace('.', ','); f.Ab = '999';
  const R1 = C.rechneRaum(r, P);
  pruefe('L × H ersetzt A_brutto (Ergebnis gleich)', Math.abs(R1.phiHL - vorher.phiHL) < 1e-6, true);
  pruefe('L × H: Zeile kennt die Maße', R1.zeilen[0].masz + '|' + R1.zeilen[0].fL, 'true|2');
  f.fH = '';
  pruefe('L × H: fehlende Höhe → unvollständig', C.rechneRaum(r, P).fehlt.some(x => x.pfad.endsWith('.fH')), true);
}

// ── Gebäudeschnitt ─────────────────────────────────────────────────────────
{
  const SN = require('./src/schnitt.js');
  const bt = (name, art) => ({ name, art, U: '0,2', dUWB: '0,03' });
  pruefe('Schnitt: Lage-Vorschläge', [bt('Flachdach mit Begrünung', 'Außenwand'), bt('Außenwand 17,5 KS', 'Außenwand'), bt('Bodenplatte 30/12', 'Kellerdecke / gegen Erdreich'),
    bt('Kelleraußenwand', 'Außenwand'), bt('Betondecke mit Heizestrich', 'Decke gegen Außenluft (Wärmestrom ↓)'), bt('Fenster Kita', 'Fenster'), bt('IW', 'Innenwand')].map(SN.lageVorschlag).join(),
    'dach,aussenwand,bodenplatte,kelleraussenwand,geschossdecke,fenster,keine');
  pruefe('Schnitt: gewählte Lage gilt vor Vorschlag', SN.lageVon({ ...bt('Betondecke', 'Decke'), lage: 'kellerdecke' }), 'kellerdecke');
  const G = { dach: 'flach', geschosse: [{ name: '1.OG', beheizt: true }, { name: 'EG', beheizt: true }, { name: 'KG', beheizt: false, keller: true }] };
  const svg = SN.schnittSvg(G, [bt('Flachdach', 'Dach'), bt('AW', 'Außenwand')]);
  pruefe('Schnitt: Geschosse und Bauteile im SVG', ['1.OG', 'EG', 'KG', 'Flachdach', 'AW (U_c 0,23)', 'Kellerdecke', 'Bodenplatte Keller'].every(t => svg.includes(t)), true);
  // Fenster, Geschossdecke, Kellerdecke rot; Kellerwand/-sohle beim unbeheizten Keller nur grau
  pruefe('Schnitt: fehlende Bauteile rot markiert', (svg.match(/nicht benannt/g) || []).length, 3);
  pruefe('Schnitt: unbeheizter Keller – Wand/Sohle „nicht nötig“', (svg.match(/nicht nötig \(Keller unbeheizt\)/g) || []).length, 2);
  const svgW = SN.schnittSvg({ ...G, geschosse: G.geschosse.map(g => g.keller ? { ...g, beheizt: true } : g) }, [bt('Flachdach', 'Dach')]);
  pruefe('Schnitt: beheizter Keller – Wand/Sohle rot', (svgW.match(/nicht benannt/g) || []).length, 6);
  const svgT = SN.schnittSvg(G, [{ ...bt('Bodenplatte EG', 'Kellerdecke / gegen Erdreich'), lage: 'bodenplatte_ok' }]);
  pruefe('Schnitt: Bodenplatte ohne Keller (Teilunterkellerung)', svgT.includes('Bodenplatte ohne Keller (Erdreich)') && svgT.includes('Bodenplatte EG (U_c 0,23)'), true);
  pruefe('Schnitt: ohne Geschosse keine Skizze', SN.schnittSvg({ geschosse: [] }, []), '');
}

// ── Testfall 4: Einheitenkontrolle ─────────────────────────────────────────
C.einheitenPruefung().forEach(s => pruefe('Einheit: ' + s.schritt + ' → ' + s.soll, s.ok, true));

console.log(`\n${n} bestanden, ${f} fehlgeschlagen`);
console.log(`Soll Φ_HL = 18 287,24 W (Excel D42) · Ist = ${R.phiHL.toFixed(2)} W · Abweichung ${((R.phiHL / 18287.2357183125 - 1) * 100).toFixed(6)} %`);
process.exitCode = f ? 1 : 0;
