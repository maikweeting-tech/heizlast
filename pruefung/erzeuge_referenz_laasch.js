/* Erzeugt das Prüfprojekt „Küche“ aus Laasch, Haustechnik, 13. Aufl. 2013, S. 554/558 (Formblatt G 1 und R 8).
   Aufruf: node pruefung/erzeuge_referenz_laasch.js  → pruefung/referenz_laasch_kueche.json */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../src/calc.js');
const q = 'Laasch, Haustechnik, 13. Aufl. 2013, S. 554/558 (Beispiel Reihenhaus Stuttgart)';
const nw = (wert, quelle = q) => ({ wert, quelle, geprueft: true });
const P = C.leeresProjekt();
P.optionen.verfahren = 'din2003';
Object.assign(P.projekt, { projekt: 'Prüfrechnung Laasch S. 558', bauvorhaben: 'Einfamilien-Reihenhaus Stuttgart (Buchbeispiel)', datum: '2026-11-18', position: 'R 8',
  beschreibung: 'Nachrechnung des Formblatts R 8 „03 Küche“ aus Laasch, Haustechnik, S. 558, mit dem Verfahren DIN EN 12831:2003. Eingaben aus Formblatt G 1 (S. 554) und R 8.' });
const st = P.normwerte.standorte[0]; st.name = 'Stuttgart'; st.te = nw('-12'); st.tme = nw('11');
const ra = P.normwerte.raumarten[0]; ra.name = 'Küche'; ra.tint = nw('20'); ra.nmin = nw('1,0');
P.normwerte.rhocp = nw('0,34', 'Laasch S. 556');
P.normwerte.e[0].klasse = 'moderate Abschirmung'; P.normwerte.e[0].w = nw('0,03');
P.normwerte.eps[0].klasse = 'Höhe 0–10 m'; P.normwerte.eps[0].w = nw('1,0');
P.projekt.standortId = st.id;
const bt = (name, art, U, dU) => { const b = { id: C.neueId('bt'), name, art, U, dUWB: dU, quelle: q, dUWBQuelle: '', herkunft: 'manuell' }; P.bauteile.push(b); return b.id; };
const af = bt('AF Außenfenster', 'Fenster', '1,40', '0,05'), aw = bt('AW Außenwand', 'Außenwand', '0,34', '0,05'),
  it = bt('IT Innentür', 'Innentür', '2,00', '0'), iw = bt('IW Innenwand', 'Innenwand', '1,88', '0'), fb = bt('FB Fußboden', 'Decke', '0,66', '0');
const r = C.leererRaum();
Object.assign(r, { nr: '03', name: 'Küche', geschoss: 'EG', raumartId: ra.id, amodus: 'LB', L: '2,51', B: '4,26', hi: '2,56', rhModus: 'fRH', fRH: '9,3', fRHQuelle: q });
const fl = (bauteilId, ausrichtung, Ab, Az, an, thetaX = '') => Object.assign(C.leereFlaeche(), { bauteilId, ausrichtung, Ab, Az, an, thetaX });
r.flaechen = [fl(af, 'NW', '1,7', '0', 'aussen'), fl(aw, 'NW', '7,3', '1,7', 'aussen'), fl(it, '', '1,8', '0', 'beheizt', '15'),
  fl(iw, '', '11,7', '1,8', 'beheizt', '15'), fl(fb, 'horizontal', '10,7', '0', 'beheizt', '10')];
Object.assign(r.lueftung, { Vsu: '0', Vex: '0', n50: '1,0', eId: P.normwerte.e[0].id, epsId: P.normwerte.eps[0].id });
P.raeume.push(r);
P.entwurf = C.leererRaum(); P.entwurfVon = '';
fs.writeFileSync(path.join(__dirname, 'referenz_laasch_kueche.json'), JSON.stringify(P));
const R = C.rechneRaum(r, P);
console.log('vollständig', R.vollstaendig, 'Φ_T', R.phiT.toFixed(1), 'Φ_V', R.phiV.toFixed(1), 'Φ_RH', R.phiRH.toFixed(1), 'Φ_HL', R.phiHL.toFixed(1));
