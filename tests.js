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
  P.projekt.standortId = st.id; P.projekt.phiWE = '16';
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
pruefe('Import: ungültiges Bauteil abgelehnt', C.bauteilAusWaermeschutz({ name: 'x' }), null);

// ── Sonderfälle ────────────────────────────────────────────────────────────
const P3 = testprojekt(); P3.raeume[0].flaechen[3].thetaX = '24';
const R3 = C.rechneRaum(P3.raeume[0], P3);
pruefe('wärmerer Nachbarraum → Φ negativ', R3.zeilen[3].phi < 0 && R3.zeilen[3].gewinn, true);
pruefe('Φ_j = 79,5·0,25·(20−24) = −79,5 W', R3.zeilen[3].phi, -79.5, 1e-12);
const P4 = testprojekt(); P4.optionen.vmin = 'norm'; P4.normwerte.raumarten[0].nmin = nw('0,5');
const R4 = C.rechneRaum(P4.raeume[0], P4);
pruefe('Variante V̇_min: max(110,1 ; 1376,4 − 3708) = V̇_inf', R4.w.Vaussen, R.w.Vinf, 1e-12);
P4.raeume[0].lueftung.Vsu = '0';
const R4b = C.rechneRaum(P4.raeume[0], P4);
pruefe('Variante V̇_min ohne Zuluft: V̇ = 0,5 · V_i', R4b.w.Vaussen, 0.5 * R.w.V, 1e-12);
const P5 = testprojekt(); P5.raeume[0].lueftung.suModus = 'theta'; P5.raeume[0].lueftung.thetaSu = '12,875';
pruefe('θ_su direkt = θ_e + 0,75·28,5 → gleiches Φ_HL', C.rechneRaum(P5.raeume[0], P5).phiHL, R.phiHL, 1e-12);
const P6 = testprojekt(); P6.raeume[0].phiRH = '1000';
pruefe('Φ_RH wird addiert', C.rechneRaum(P6.raeume[0], P6).phiHL, R.phiHL + 1000, 1e-12);
const P7 = testprojekt(); P7.optionen.erdreich = 'norm';
const R7 = C.rechneRaum(P7.raeume[0], P7);
pruefe('Variante Erdreich Norm verlangt U_equiv', R7.fehlt.some(x => x.text.includes('U_equiv')), true);
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

// ── Testfall 4: Einheitenkontrolle ─────────────────────────────────────────
C.einheitenPruefung().forEach(s => pruefe('Einheit: ' + s.schritt + ' → ' + s.soll, s.ok, true));

console.log(`\n${n} bestanden, ${f} fehlgeschlagen`);
console.log(`Soll Φ_HL = 18 287,24 W (Excel D42) · Ist = ${R.phiHL.toFixed(2)} W · Abweichung ${((R.phiHL / 18287.2357183125 - 1) * 100).toFixed(6)} %`);
process.exitCode = f ? 1 : 0;
