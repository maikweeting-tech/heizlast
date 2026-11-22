/* Prüfprojekt „EFH Musterbeispiel wbs“ (DIN/TS 12831-1:2020-04), Würzburg, 01.09.2021.
   Quelle: wbs_HEIZLAST_MUSTERBEISPIEL.pdf, Formblätter G 1, G 2, Z 2, R 1–R 13.
   Aufruf: node pruefung/wbs_musterbeispiel.js  → pruefung/referenz_wbs_efh.json
   Sollwerte (Formblatt G 2 / Z 2): Σ Φ_T,stand 5 229 W, Φ_T,e 4 979 W, Σ Φ_V,env/min 1 097 W,
   Φ_V,su 114 W, Φ_V,tr 54 W, Σ Φ_HL Räume 6 495 W, Norm-Gebäudeheizlast 5 696 W. */
'use strict';
const C = require('../src/calc.js');

const Q = 'wbs-Musterbeispiel DIN/TS 12831-1, Würzburg 2021';
const nw = (wert, quelle) => ({ wert, quelle: quelle || Q + ', Formblatt G 1', geprueft: true });
const SOLL = { phiTstand: 5229, phiTe: 4979, PhiVenv: 1097, PhiVsu: 114, PhiVtr: 54, phiHLraeume: 6495, phiHLgeb: 5696,
  raeume: { 'E-1': 1150, 'E-2': 919, 'E-3': 355, 'E-4': 89, 'E-5': 125, 'E-6': 291, '1-1': 625, '1-2': 660, '1-3': 374, '1-4': 598, '1-5': 480, '1-6': 727, '1-7': 102 } };

// Bauteil-Kürzel → [Name, Art, U, ΔU_WB] (Formblätter R, Spalten 12/13)
const BT = { AW: ['AW Außenwand', 'Außenwand', '0,18', '0,05'], AF: ['AF Außenfenster', 'Fenster', '0,95', '0,05'], AT: ['AT Außentür', 'Außentür', '1,50', '0,05'],
  DA: ['DA Dach', 'Dach', '0,20', '0,05'], FBg: ['FB Bodenplatte', 'Bodenplatte', '0,30', '0,05'], FBe: ['FB Boden gegen außen', 'Decke', '0,30', '0,05'],
  FBb: ['FB Geschossdecke', 'Decke', '0,56', '0'], IW: ['IW Innenwand', 'Innenwand', '1,77', '0'], IT: ['IT Innentür', 'Innentür', '2,00', '0'] };

// Räume: [Nr, Name, Geschoss, θ_int, A_NGF, h_R, V̇_su, V̇_ex, V̇_tr, θ_tr, n_min, Flächen]
// Fläche: [Kürzel, Ausrichtung, Breite·Höhe oder Fläche, an, Zusatz]  – Wände: Abzug = Öffnungen gleicher Ausrichtung
const R = [
  ['E-1', 'Wohnen', 'EG', 20, 34.92, 2.72, 40, 0, 40, 20, 0, [['FBg', 'horizontal', 41.5, 'erdreich', '0,25'], ['AW', 'N', [8.98, 3.12]], ['AF', 'N', [2.51, 2.57]], ['AF', 'N', [2.51, 2.57]], ['AW', 'O', [4.68, 3.12]], ['AW', 'W', [4.68, 3.12]], ['AF', 'W', [1.51, 1.31]]]],
  ['E-2', 'Küche & Esszimmer', 'EG', 20, 33.08, 2.72, 0, 40, 40, 20, 0, [['FBg', 'horizontal', 38.2, 'erdreich', '0,24'], ['AW', 'O', [4.43, 3.12]], ['AF', 'O', [2.76, 0.80]], ['AF', 'O', [2.51, 1.95]], ['AW', 'S', [8.70, 3.12]], ['AF', 'S', [2.01, 2.57]], ['AW', 'W', [1.20, 3.12]]]],
  ['E-3', 'Flur', 'EG', 20, 11.88, 2.72, 0, 0, 0, 0, 0, [['FBg', 'horizontal', 12.7, 'erdreich', '0,19'], ['AW', 'S', [2.37, 3.12]], ['AT', 'S', [2.13, 2.57]]]],
  ['E-4', 'WC', 'EG', 20, 2.28, 2.72, 0, 25, 25, 20, 0, [['FBg', 'horizontal', 3.0, 'erdreich', '0,27'], ['AW', 'S', [1.93, 3.12]], ['AF', 'S', [0.50, 1.30]]]],
  ['E-5', 'Abstellraum', 'EG', 20, 4.17, 2.72, 0, 25, 25, 20, 0, [['FBg', 'horizontal', 5.3, 'erdreich', '0,27'], ['AW', 'W', [3.24, 3.12]]]],
  ['E-6', 'Garderobe', 'EG', 20, 7.81, 2.72, 0, 0, 0, 0, 0.5, [['FBg', 'horizontal', 8.6, 'erdreich', '0,21'], ['AW', 'W', [2.12, 3.12]], ['AT', 'W', [1.13, 2.28]]]],
  ['1-1', 'Kind 1', '1.OG', 20, 15.58, 2.50, 25, 0, 25, 20, 0, [['FBb', 'horizontal', 18.7, 'beheizt', '20'], ['AW', 'N', [4.30, 2.70]], ['AF', 'N', [2.51, 2.35]], ['AW', 'W', [4.43, 2.70]], ['AF', 'W', [1.51, 1.45]], ['DA', 'horizontal', 19.9]]],
  ['1-2', 'Kind 2', '1.OG', 20, 16.58, 2.50, 25, 0, 25, 20, 0, [['FBb', 'horizontal', 19.8, 'beheizt', '20'], ['AW', 'N', [4.55, 2.70]], ['AF', 'N', [2.51, 2.35]], ['AW', 'O', [4.43, 2.70]], ['AF', 'O', [2.01, 1.45]], ['DA', 'horizontal', 21.1]]],
  ['1-3', 'Gästezimmer', '1.OG', 20, 13.01, 2.50, 25, 0, 25, 20, 0, [['FBb', 'horizontal', 14.7, 'beheizt', '20'], ['AW', 'O', [4.62, 2.70]], ['AF', 'O', [2.51, 1.45]], ['DA', 'horizontal', 15.6]]],
  ['1-4', 'Schlafzimmer', '1.OG', 20, 15.22, 2.50, 40, 0, 40, 20, 0, [['FBb', 'horizontal', 18.3, 'beheizt', '20'], ['AW', 'O', [3.93, 2.70]], ['AF', 'O', [2.01, 1.10]], ['AW', 'S', [4.55, 2.70]], ['AF', 'S', [2.01, 2.35]], ['DA', 'horizontal', 19.4]]],
  ['1-5', 'Ankleide', '1.OG', 20, 9.75, 2.50, 0, 25, 25, 20, 0, [['FBb', 'horizontal', 6.8, 'beheizt', '20'], ['FBe', 'horizontal', 5.5], ['AW', 'S', [4.30, 2.70]], ['AF', 'S', [0.88, 2.35]], ['AW', 'W', [2.93, 2.70]], ['AF', 'W', [0.88, 2.35]], ['DA', 'horizontal', 13.1]]],
  ['1-6', 'BAD Sauna', '1.OG', 24, 12.52, 2.50, 0, 40, 40, 20, 0, [['FBb', 'horizontal', 14.4, 'beheizt', '20'], ['IW', 'N', [3.05, 2.70], 'beheizt', '20'], ['IW', 'O', [5.24, 2.70], 'beheizt', '20'], ['IT', 'O', [0.88, 2.28], 'beheizt', '20'], ['IW', 'S', [3.05, 2.70], 'beheizt', '20'], ['AW', 'W', [5.24, 2.70]], ['AF', 'W', [1.63, 2.35]], ['DA', 'horizontal', 15.3]]],
  ['1-7', 'Flur', '1.OG', 20, 6.57, 2.50, 0, 0, 0, 0, 0, [['FBb', 'horizontal', 6.6, 'beheizt', '20'], ['DA', 'horizontal', 10.4]]]
];

function projekt() {
  const P = C.leeresProjekt();
  P.optionen.verfahren = 'dints2020';
  Object.assign(P.projekt, { projekt: 'Prüfrechnung wbs-Musterbeispiel', bauvorhaben: 'EFH Musterbeispiel wbs, Würzburg', datum: '2026-11-22', position: 'wbs',
    beschreibung: 'Nachrechnung des „EFH Musterbeispiel wbs“ (DIN/TS 12831-1:2020-04, wbs-WärmebedarfService, 01.09.2021) mit dem Verfahren DIN/TS 12831-1:2020. Sollwert Norm-Gebäudeheizlast 5 696 W (Formblatt G 2).' });
  const st = P.normwerte.standorte[0]; st.name = 'Würzburg (PLZ 97080)'; st.te = nw('-11'); st.tme = nw('10,1');
  P.projekt.standortId = st.id;
  const N = P.normwerte;
  N.fg1 = nw('1,45', Q + ', Formblatt G 1: f_θ,ann'); N.Gw = nw('1,00', Q + ', Formblatt G 1: f_GW');
  N.rhocp = nw('0,34', Q + ', rückgerechnet aus R 1: 40 m³/h · ρc_p · 2,2 K = 30 W');
  N.qenv50 = nw('2', Q + ', Formblatt G 1: q_env,50 (Kategorie A)');
  N.fenv = nw('0,1', Q + ', rückgerechnet aus R 1–R 13: q_V,env,i / (q_env,50 · A_env,i)');
  N.fGeb = nw('0,5', Q + ', rückgerechnet aus G 2: 548 W / 1 097 W');
  const ra = (name, t, n) => { const x = { id: C.neueId('ra'), name, tint: nw(t, Q + ', Formblatt V/Z 1'), nmin: nw(n, Q + ', Formblatt V/Z 1 (individuelle Festlegung)') }; N.raumarten.push(x); return x.id; };
  N.raumarten = [];
  const ra20 = ra('Wohnen 20 °C', '20', '0'), ra20g = ra('Garderobe 20 °C', '20', '0,5'), ra24 = ra('Bad 24 °C', '24', '0');
  const btId = {};
  Object.entries(BT).forEach(([k, [name, art, U, dU]]) => { const id = C.neueId('bt'); btId[k] = id; P.bauteile.push({ id, name, art, U, dUWB: dU, quelle: Q + ', Formblatt R', dUWBQuelle: Q + ', Formblatt G 1 (Kat. A)', herkunft: 'manuell' }); });
  const s = x => String(Math.round(x * 10000) / 10000).replace('.', ',');
  R.forEach(([nr, name, gs, t, A, h, su, ex, tr, ttr, nmin, fl]) => {
    const r = C.leererRaum();
    Object.assign(r, { nr, name, geschoss: gs, raumartId: t === 24 ? ra24 : nmin ? ra20g : ra20, amodus: 'A', A: s(A), hi: s(h) });
    const oeff = (aus) => fl.filter(f => (f[0] === 'AF' || f[0] === 'AT' || f[0] === 'IT') && f[1] === aus).reduce((a, f) => a + f[2][0] * f[2][1], 0);
    r.flaechen = fl.map(([k, aus, mass, an, zus]) => {
      const F = C.leereFlaeche();
      const wand = k === 'AW' || k === 'IW';
      Object.assign(F, { bauteilId: btId[k], ausrichtung: aus, Ab: s(Array.isArray(mass) ? mass[0] * mass[1] : mass), Az: s(wand ? oeff(aus) : 0), an: an || 'aussen' });
      if (an === 'erdreich') { F.Uequiv = zus; F.UequivQuelle = Q + ', Formblatt R, Spalte U_equiv'; }
      if (an === 'beheizt') F.thetaX = zus;
      return F;
    });
    Object.assign(r.lueftung, { Vsu: s(su), suModus: 'theta', thetaSu: '17,8', Vex: s(ex), Vtr: s(tr), thetaTr: tr ? s(ttr) : '' });
    P.raeume.push(r);
  });
  P.entwurf = C.leererRaum(); P.entwurfVon = '';
  return P;
}

module.exports = { projekt, SOLL };

if (require.main === module) {
  const fs = require('fs'), path = require('path');
  const P = projekt();
  fs.writeFileSync(path.join(__dirname, 'referenz_wbs_efh.json'), JSON.stringify(P));
  const G = C.rechneGebaeude(P);
  G.raeume.forEach((x, i) => console.log(P.raeume[i].nr.padEnd(4), x.vollstaendig ? '' : 'UNVOLLST ' + x.fehlt.map(f => f.text).join('; '),
    'Φ_T', x.phiT.toFixed(0), 'Φ_V', x.phiV.toFixed(0), 'Φ_HL', x.phiHL.toFixed(0), 'Soll', SOLL.raeume[P.raeume[i].nr], 'A_env', x.w.Aenv.toFixed(2), 'q_env/min', x.w.qenvmin.toFixed(1)));
  if (G.geb) console.log('Σ Φ_T', G.summe.phiT.toFixed(0), 'Φ_T,e', G.geb.phiTe.toFixed(0), 'Φ_V,env', G.geb.PhiVenv.toFixed(0), 'Φ_V,su', G.geb.PhiVsu.toFixed(0), 'Φ_V,tr', G.geb.PhiVtr.toFixed(0),
    'Σ Räume', G.summe.phiHL.toFixed(0), 'Gebäude', G.geb.phiHL.toFixed(0), '(Soll 5696)');
}
