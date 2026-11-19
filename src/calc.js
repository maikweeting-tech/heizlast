/* Heizlast-App – Rechenkern (raumweise Norm-Heizlast).
   Enthält KEINE Zahlenwerte für Normgrößen. Alle Werte kommen aus Nutzereingaben,
   aus der Wärmeschutz-App (Bauteil-U) oder aus den vom Nutzer befüllten Normwert-Tabellen.
   Formeln sind hier fest hinterlegt und werden in der App angezeigt (formeln()). */
'use strict';

// ── Quellen ───────────────────────────────────────────────────────────────
const QUELLE_LAASCH = 'Laasch, T.; Laasch, E.: Haustechnik – Grundlagen, Planung, Ausführung. 13. Aufl., Springer Vieweg, Wiesbaden 2013, ISBN 978-3-8348-1260-5, Kap. 8.3 „Heizlast“, S. 535–560';
const QUELLE_EXCEL = 'TGA_Kita_Wesel_Berechnung_1.xlsx, Blatt „Heizlast“ und „Folienwerte“ (F2_Rechenweg)';

// ── Normstand (online geprüft am 19.11.2026) ─────────────────────────────
const NORMSTAND = [
  { norm: 'DIN EN 12831-1:2017-09', status: 'geprueft',
    text: 'DIN Media (19.11.2026): Norm [AKTUELL], ersetzt DIN EN 12831:2003-08; kein Nachfolgedokument genannt. Gilt in Deutschland zusammen mit DIN/TS 12831-1. Ihr allgemeines Lüftungsverfahren ist in dieser App NICHT abgebildet.' },
  { norm: 'DIN/TS 12831-1:2020-04', status: 'geprueft',
    text: 'DIN Media (19.11.2026): Ausgabe 2020-04, Vornorm, ersetzt DIN EN 12831 Beiblatt 1:2008-07 (mit Berichtigung 1:2010-11), Beiblatt 2:2012-05 und Beiblatt 3:2016-12; kein Nachfolgedokument genannt.' },
  { norm: 'DIN EN 12831-1:2025-06 – Entwurf', status: 'entwurf',
    text: 'DIN Media (19.11.2026): Norm-Entwurf (prEN 12831-1:2025), erschienen 23.05.2025, noch nicht gültig. Änderungen gegenüber 2017-09 und DIN/TS 12831-1:2020-04: Gleichung (23) korrigiert, Tabelle 33 aktualisiert, redaktionell überarbeitet. Gl. (23) gehört zum allgemeinen Lüftungsverfahren, das hier nicht abgebildet ist.' },
  { norm: 'DIN EN 12831:2003-08 mit Beiblatt 1', status: 'ersetzt',
    text: 'Rechenweg dieser App (Verfahren „DIN EN 12831:2003“), belegt durch ' + QUELLE_LAASCH + '. Diese Ausgabe ist durch DIN EN 12831-1:2017 und DIN/TS 12831-1:2020 ersetzt.' }
];

// ── Rechenverfahren (eines muss im Tab Projekt gewählt werden) ────────────
const VERFAHREN = {
  din2003: {
    titel: 'DIN EN 12831:2003 mit Beiblatt 1 (nach Laasch, Haustechnik)',
    kurz: 'DIN EN 12831:2003',
    text: 'Transmission: außen und unbeheizt mit U_c = U + ΔU_WB, beheizter Nachbarraum mit U (ohne ΔU_WB), Erdreich mit U_equiv (Laasch S. 555). Lüftung: V̇_therm = max(V̇_inf + V̇_su · f_V,su + V̇_mech,inf ; V̇_min) mit V̇_mech,inf = V̇_ex − V̇_su (S. 556–559). Aufheizzuschlag Φ_RH = A_R · f_RH (S. 559).',
    quelle: QUELLE_LAASCH
  },
  excel: {
    titel: 'Excel-Blatt „Heizlast“ (Testfall Kita Wesel)',
    kurz: 'Excel-Ansatz',
    text: 'Wie das Excel-Blatt: Transmission überall mit U_c = U + ΔU_WB, auch gegen Erdreich und beheizte Nachbarräume; Lüftung Φ_V = ρ·c_p · [V̇_inf · Δθ + V̇_su · (θ_int − θ_su)] ohne Mindestluftwechsel und ohne Abluftüberschuss. Abweichungen von DIN EN 12831:2003 siehe Laasch S. 555–559.',
    quelle: QUELLE_EXCEL
  }
};
const HINWEIS_2017 = 'DIN EN 12831-1:2017 rechnet die Lüftung zonenweise über q_env,50, Volumenstromfaktor (Tab. B.8) und Orientierungsfaktor (B.2.14), Gl. (18)–(31). Dieses allgemeine Verfahren ist nicht hinterlegt, weil der Normtext nicht vorlag. Für Gebäude mit Lüftungsanlage und WRG verlangt die aktuelle Norm dieses Verfahren.';

// ── Formeln (Anzeige) ─────────────────────────────────────────────────────
const F_GEMEINSAM = [
  { f: 'Δθ = θ_int − θ_e', e: 'K' },
  { f: 'A = L · B  bzw.  A = Σ (± L_i · B_i) aus Teilflächen', e: 'm²' },
  { f: 'V_i = A · h_i', e: 'm³' },
  { f: 'U_c = U + ΔU_WB', e: 'W/(m²·K)' },
  { f: 'A_k = A_brutto − A_Öffnungen', e: 'm²' },
  { f: 'Φ_T,k = A_k · U_k · f_k · Δθ', e: 'W' },
  { f: 'außen: f = 1', e: '–' },
  { f: 'unbeheizt: f = b_u = (θ_int − θ_u) / (θ_int − θ_e)  oder b_u aus Tabelle', e: '–' },
  { f: 'beheizter Nachbarraum: f = f_ij = (θ_int − θ_j) / (θ_int − θ_e)  (Φ < 0 = Gewinn)', e: '–' },
  { f: 'Erdreich: f = f_g1 · f_g2 · G_w  mit  f_g2 = (θ_int − θ_m,e) / (θ_int − θ_e)', e: '–' },
  { f: 'V̇_inf = 2 · V_i · n_50 · e · ε', e: 'm³/h' },
  { f: 'θ_su = θ_e + η_WRG · (θ_int − θ_e)', e: '°C' }
];
const F_EXCEL = [
  { f: 'U_k = U_c für alle Flächen', e: 'W/(m²·K)' },
  { f: 'Φ_V = ρ·c_p · [V̇_inf · Δθ + V̇_su · (θ_int − θ_su)]', e: 'W' }
];
const F_2003 = [
  { f: 'U_k = U_c (außen, unbeheizt) · U (beheizt) · U_equiv (Erdreich)', e: 'W/(m²·K)' },
  { f: 'f_V,su = (θ_int − θ_su) / (θ_int − θ_e)', e: '–' },
  { f: 'V̇_mech,inf = V̇_ex − V̇_su  (nur Überschuss, sonst 0)', e: 'm³/h' },
  { f: 'V̇_min = n_min · V_i', e: 'm³/h' },
  { f: 'V̇_therm = max(V̇_inf + V̇_su · f_V,su + V̇_mech,inf ; V̇_min)', e: 'm³/h' },
  { f: 'Φ_V = ρ·c_p · V̇_therm · Δθ', e: 'W' }
];
const F_ENDE = [
  { f: 'Φ_RH = Φ_RH (Eingabe)  oder  Φ_RH = A_R · f_RH', e: 'W' },
  { f: 'Φ_HL = Σ Φ_T,k + Φ_V + Φ_RH', e: 'W' },
  { f: 'φ = Φ_HL / A', e: 'W/m²' },
  { f: 'Φ_HL,Geb = Σ Φ_HL (ohne Abminderungen)', e: 'W' },
  { f: 'η = Σ Φ_HL / Φ_WE ≤ 1,0', e: '–' }
];
function formeln(verfahren) { return F_GEMEINSAM.concat(verfahren === 'excel' ? F_EXCEL : verfahren === 'din2003' ? F_2003 : [], F_ENDE); }

const ANGRENZUNG = { aussen: 'außen', erdreich: 'Erdreich', unbeheizt: 'unbeheizt (θ_u bekannt)', unbeheiztBu: 'unbeheizt (b_u aus Tabelle)', beheizt: 'beheizter Nachbarraum' };

// ── Zahlen ────────────────────────────────────────────────────────────────
function num(v) {
  if (typeof v === 'number') return v;
  if (v === undefined || v === null) return NaN;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '' || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
  return parseFloat(s);
}
const ok = x => typeof x === 'number' && isFinite(x);
function fmt(x, d = 0) {
  if (!ok(x)) return '–';
  const r = Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x;
  return r.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
const fmtV = (x, d) => (ok(x) && x < 0 ? '(' + fmt(x, d) + ')' : fmt(x, d)); // negative Werte in Klammern für Formeln

// ── Einheitenkontrolle (Dimensionen als Exponenten) ───────────────────────
const EINH = {
  'm': { m: 1 }, 'm²': { m: 2 }, 'm³': { m: 3 }, 'K': { K: 1 }, '°C': { K: 1 }, '–': {}, '1/h': { h: -1 },
  'W': { W: 1 }, 'W/K': { W: 1, K: -1 }, 'W/(m²·K)': { W: 1, m: -2, K: -1 }, 'm³/h': { m: 3, h: -1 },
  'Wh/(m³·K)': { W: 1, h: 1, m: -3, K: -1 }, 'W/m²': { W: 1, m: -2 }, 'kW': { W: 1 }
};
function einheitProdukt(liste, teiler = []) {
  const r = {};
  const add = (u, s) => { const d = EINH[u]; if (!d) throw new Error('Einheit unbekannt: ' + u); for (const k in d) r[k] = (r[k] || 0) + s * d[k]; };
  liste.forEach(u => add(u, 1)); teiler.forEach(u => add(u, -1));
  for (const k in r) if (r[k] === 0) delete r[k];
  return r;
}
const gleicheDim = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
// Jeder Rechenschritt mit Eingangseinheiten → Ergebniseinheit
const EINHEITEN_SCHRITTE = [
  { schritt: 'Δθ = θ_int − θ_e', mal: ['K'], soll: 'K' },
  { schritt: 'U_c = U + ΔU_WB', mal: ['W/(m²·K)'], soll: 'W/(m²·K)' },
  { schritt: 'A_k = A_brutto − A_Öffnungen', mal: ['m²'], soll: 'm²' },
  { schritt: 'f_g2, b_u, f_ij, f_V,su = Δθ / Δθ', mal: ['K'], durch: ['K'], soll: '–' },
  { schritt: 'f_g = f_g1 · f_g2 · G_w', mal: ['–', '–', '–'], soll: '–' },
  { schritt: 'Φ_T,k = A_k · U_k · f · Δθ', mal: ['m²', 'W/(m²·K)', '–', 'K'], soll: 'W' },
  { schritt: 'A = Σ (± L_i · B_i)', mal: ['m', 'm'], soll: 'm²' },
  { schritt: 'V_i = A · h_i', mal: ['m²', 'm'], soll: 'm³' },
  { schritt: 'V̇_inf = 2 · V_i · n_50 · e · ε', mal: ['m³', '1/h', '–', '–'], soll: 'm³/h' },
  { schritt: 'V̇_min = n_min · V_i', mal: ['1/h', 'm³'], soll: 'm³/h' },
  { schritt: 'V̇_therm = V̇_inf + V̇_su · f_V,su + V̇_mech,inf', mal: ['m³/h', '–'], soll: 'm³/h' },
  { schritt: 'θ_su = θ_e + η_WRG · (θ_int − θ_e)', mal: ['–', 'K'], soll: 'K' },
  { schritt: 'Φ_V = ρ·c_p · V̇ · Δθ', mal: ['Wh/(m³·K)', 'm³/h', 'K'], soll: 'W' },
  { schritt: 'Φ_RH = A_R · f_RH', mal: ['m²', 'W/m²'], soll: 'W' },
  { schritt: 'Φ_HL = Σ Φ_T + Φ_V + Φ_RH', mal: ['W'], soll: 'W' },
  { schritt: 'φ = Φ_HL / A', mal: ['W'], durch: ['m²'], soll: 'W/m²' },
  { schritt: 'η = Σ Φ_HL / Φ_WE', mal: ['W'], durch: ['W'], soll: '–' }
];
function einheitenPruefung() {
  return EINHEITEN_SCHRITTE.map(s => ({ ...s, ok: gleicheDim(einheitProdukt(s.mal, s.durch || []), EINH[s.soll]) }));
}

// ── leeres Projekt (alle Felder leer) ─────────────────────────────────────
let _idz = 0;
function neueId(p) { _idz++; return (p || 'x') + Date.now().toString(36) + _idz.toString(36) + Math.floor(Math.random() * 1296).toString(36); }
const leerNW = () => ({ wert: '', quelle: '', geprueft: false });
function leeresProjekt() {
  return {
    format: 'fh21.heizlast', version: 2,
    projekt: { projekt: '', bauvorhaben: '', bearbeiter: 'Maik Weeting, Klasse FH 21', datum: '', position: '', beschreibung: '', standortId: '', phiWE: '' },
    optionen: { verfahren: '' },
    normwerte: {
      standorte: [{ id: neueId('st'), name: '', te: leerNW(), tme: leerNW() }],
      raumarten: [{ id: neueId('ra'), name: '', tint: leerNW(), nmin: leerNW() }],
      fg1: leerNW(), Gw: leerNW(), rhocp: leerNW(),
      e: [{ id: neueId('e'), klasse: '', w: leerNW() }],
      eps: [{ id: neueId('ep'), klasse: '', w: leerNW() }]
    },
    bauteile: [],
    raeume: []
    // vorzeigeRaeume: [Raum-IDs] wird beim ersten Öffnen der Vorzeigeseite gesetzt (Standard: erster Raum)
  };
}
function leererRaum() {
  return {
    id: neueId('r'), nr: '', name: '', geschoss: '', raumartId: '', amodus: 'LB', L: '', B: '', A: '', teilflaechen: [], hi: '',
    flaechen: [], innenliegend: false,
    lueftung: { Vsu: '', suModus: 'eta', thetaSu: '', eta: '', Vex: '', n50: '', eId: '', epsId: '' },
    rhModus: '', phiRH: '', fRH: '', fRHQuelle: ''
  };
}
function leereTeilflaeche() { return { id: neueId('tf'), bez: '', L: '', B: '', minus: false }; }
function leereFlaeche() {
  return { id: neueId('f'), bauteilId: '', ausrichtung: '', Ab: '', Az: '', an: '', thetaX: '', Uequiv: '', UequivQuelle: '', buQuelle: '' };
}
// Aufheizzuschlag-Modus (ältere Projekte: Φ_RH direkt eingetragen)
const rhModusVon = r => r.rhModus || (r.phiRH !== undefined && String(r.phiRH).trim() !== '' ? 'direkt' : '');

// ── Prüfhelfer ────────────────────────────────────────────────────────────
function pruefer() {
  const fehlt = [];
  return {
    fehlt,
    ein(v, pfad, text) { const x = num(v); if (!ok(x)) fehlt.push({ pfad, text: text + ': Eingabe fehlt' }); return x; },
    nw(n, pfad, text) {
      const x = n ? num(n.wert) : NaN;
      if (!n) { fehlt.push({ pfad, text: text + ': keine Zeile gewählt' }); return NaN; }
      if (!ok(x)) fehlt.push({ pfad: pfad + '.wert', text: text + ': Normwert fehlt' });
      if (!n.quelle || !String(n.quelle).trim()) fehlt.push({ pfad: pfad + '.quelle', text: text + ': Quelle fehlt' });
      if (!n.geprueft) fehlt.push({ pfad: pfad + '.geprueft', text: text + ': nicht als „geprüft“ markiert' });
      return x;
    },
    bed(c, pfad, text) { if (!c) fehlt.push({ pfad, text }); return !!c; }
  };
}
const nameOd = (s, ersatz) => (s && String(s).trim()) || ersatz;

// ── Raumrechnung ──────────────────────────────────────────────────────────
function rechneRaum(raum, P) {
  const p = pruefer();
  const NWt = P.normwerte;
  const vf = (P.optionen || {}).verfahren;
  const din = vf === 'din2003';
  p.bed(VERFAHREN[vf], 'projekt.verfahren', 'Rechenverfahren im Tab „1 Projekt“ wählen');
  p.bed(nameOd(raum.nr, ''), 'raum.nr', 'Nr. fehlt');
  p.bed(nameOd(raum.name, ''), 'raum.name', 'Raumname fehlt');

  // Standort
  const st = NWt.standorte.find(s => s.id === P.projekt.standortId);
  p.bed(st, 'projekt.standortId', 'Standort im Tab „1 Projekt“ wählen');
  const stn = st ? `Standort „${nameOd(st.name, '?')}“` : 'Standort';
  const te = st ? p.nw(st.te, `nw.st.${st.id}.te`, `θ_e (${stn})`) : NaN;

  // Raumart → θ_int
  const ra = NWt.raumarten.find(r => r.id === raum.raumartId);
  p.bed(ra, 'raum.raumartId', 'Raumart wählen');
  const ran = ra ? `Raumart „${nameOd(ra.name, '?')}“` : 'Raumart';
  const tint = ra ? p.nw(ra.tint, `nw.ra.${ra.id}.tint`, `θ_int (${ran})`) : NaN;

  // Geometrie
  let A, L = NaN, B = NaN, teile = null;
  if (raum.amodus === 'A') A = p.ein(raum.A, 'raum.A', 'Fläche A');
  else if (raum.amodus === 'TF') {
    // Grundfläche aus Teilflächen: A = Σ (± L_i · B_i)
    const tf = raum.teilflaechen || [];
    p.bed(tf.length > 0, 'raum.teilflaechen', 'keine Teilfläche eingetragen');
    teile = tf.map((t, i) => {
      const Li = p.ein(t.L, `raum.tf.${t.id}.L`, `Teilfläche ${i + 1}: Länge`);
      const Bi = p.ein(t.B, `raum.tf.${t.id}.B`, `Teilfläche ${i + 1}: Breite`);
      return { id: t.id, bez: t.bez || '', L: Li, B: Bi, minus: !!t.minus, A: Li * Bi };
    });
    A = teile.reduce((a, t) => a + (t.minus ? -t.A : t.A), 0);
  } else { L = p.ein(raum.L, 'raum.L', 'Länge L'); B = p.ein(raum.B, 'raum.B', 'Breite B'); A = L * B; }
  if (ok(A)) p.bed(A > 0, 'raum.A', 'Fläche A muss > 0 sein');
  const hi = p.ein(raum.hi, 'raum.hi', 'lichte Höhe h_i');
  const V = A * hi;

  const dth = tint - te;
  if (ok(dth)) p.bed(dth !== 0, 'raum.raumartId', 'Δθ = θ_int − θ_e = 0 K – Faktoren nicht definiert');
  const dOK = ok(dth) && dth !== 0;

  // Transmission
  const zeilen = [];
  let tme = NaN, fg1 = NaN, Gw = NaN, erdGeprueft = false;
  // innenliegender Raum, alle Nachbarräume gleiche Temperatur → keine Transmission
  if (raum.innenliegend) p.bed(raum.flaechen.length === 0, 'raum.flaechen', '„innenliegend, keine Transmission“ gewählt, aber Hüllflächen eingetragen – Haken entfernen oder Flächen löschen');
  else p.bed(raum.flaechen.length > 0, 'raum.flaechen', 'keine Hüllfläche eingetragen (bei innenliegendem Raum ohne Temperaturunterschied: Haken „innenliegend“)');
  raum.flaechen.forEach((fl, i) => {
    const fp = `raum.fl.${fl.id}`;
    const nrT = `Fläche ${i + 1}`;
    const bt = P.bauteile.find(b => b.id === fl.bauteilId);
    p.bed(bt, fp + '.bauteilId', `${nrT}: Bauteil wählen`);
    let U = NaN, dU = NaN;
    if (bt) {
      U = p.ein(bt.U, `bt.${bt.id}.U`, `Bauteil „${nameOd(bt.name, '?')}“: U`);
      dU = p.ein(bt.dUWB, `bt.${bt.id}.dUWB`, `Bauteil „${nameOd(bt.name, '?')}“: ΔU_WB`);
      p.bed(nameOd(bt.quelle, ''), `bt.${bt.id}.quelle`, `Bauteil „${nameOd(bt.name, '?')}“: Quelle des U-Werts fehlt`);
      if (Array.isArray(bt.ungeprueft) && bt.ungeprueft.length)
        p.bed(bt.schichtenGeprueft, `bt.${bt.id}.schichtenGeprueft`, `Bauteil „${nameOd(bt.name, '?')}“: Schichtwerte ohne Quelle (${bt.ungeprueft.join(', ')}) – prüfen und abhaken`);
    }
    const Uc = U + dU;
    const Ab = p.ein(fl.Ab, fp + '.Ab', `${nrT}: Fläche brutto`);
    const Az = p.ein(fl.Az, fp + '.Az', `${nrT}: Abzug Öffnungen (0 eintragen, wenn keine)`);
    const An = Ab - Az;
    if (ok(An)) p.bed(An >= 0, fp + '.Az', `${nrT}: Abzug größer als Bruttofläche`);
    p.bed(ANGRENZUNG[fl.an], fp + '.an', `${nrT}: „angrenzend an“ wählen`);
    let f = NaN, Uk = Uc, ukName = 'U_c', fText = '1', fWerte = '';
    if (fl.an === 'aussen') { f = 1; }
    else if (fl.an === 'erdreich') {
      if (!erdGeprueft) {
        erdGeprueft = true;
        tme = st ? p.nw(st.tme, `nw.st.${st.id}.tme`, `θ_m,e (${stn})`) : NaN;
        fg1 = p.nw(NWt.fg1, 'nw.fg1', 'f_g1');
        Gw = p.nw(NWt.Gw, 'nw.Gw', 'G_w');
      }
      const fg2 = (tint - tme) / dth;
      f = fg1 * fg2 * Gw;
      fText = 'f_g1 · f_g2 · G_w';
      fWerte = `f_g2 = (${fmtV(tint, 1)} − ${fmtV(tme, 1)}) / ${fmt(dth, 1)} = ${fmt(fg2, 3)};  f = ${fmt(fg1, 2)} · ${fmt(fg2, 3)} · ${fmt(Gw, 2)} = ${fmt(f, 3)}`;
      if (din) {
        // Laasch S. 555: H_T = A · f_g1 · f_g2 · G_W · U_equiv (U_equiv aus Tab. 8.53–8.60)
        Uk = p.ein(fl.Uequiv, fp + '.Uequiv', `${nrT}: U_equiv`);
        p.bed(nameOd(fl.UequivQuelle, ''), fp + '.UequivQuelle', `${nrT}: Quelle U_equiv fehlt (z. B. Laasch Tab. 8.54)`);
        ukName = 'U_equiv';
      }
    } else if (fl.an === 'unbeheizt' || fl.an === 'beheizt') {
      const sym = fl.an === 'unbeheizt' ? 'θ_u' : 'θ_j';
      const tx = p.ein(fl.thetaX, fp + '.thetaX', `${nrT}: ${sym}`);
      f = (tint - tx) / dth;
      fText = fl.an === 'unbeheizt' ? 'b_u' : 'f_ij';
      fWerte = `${fText} = (${fmtV(tint, 1)} − ${fmtV(tx, 1)}) / ${fmt(dth, 1)} = ${fmt(f, 3)}`;
      // Laasch S. 555: beheizter Nachbarraum H_T = A · f_ij · U (ohne ΔU_WB)
      if (din && fl.an === 'beheizt') { Uk = U; ukName = 'U'; }
    } else if (fl.an === 'unbeheiztBu') {
      f = p.ein(fl.thetaX, fp + '.thetaX', `${nrT}: b_u aus Tabelle`);
      p.bed(nameOd(fl.buQuelle, ''), fp + '.buQuelle', `${nrT}: Quelle b_u fehlt (z. B. Laasch Tab. 8.51)`);
      fText = 'b_u';
      fWerte = `b_u = ${fmt(f, 2)} (Tabelle: ${fl.buQuelle || '?'})`;
    }
    const phi = An * Uk * f * dth;
    zeilen.push({
      typ: 'T', flId: fl.id, label: `${bt ? nameOd(bt.name, 'Bauteil') : 'Bauteil ?'}${fl.ausrichtung ? ' (' + fl.ausrichtung + ')' : ''}`,
      an: fl.an, bezug: An, einheit: 'm²', Ab, Az, U, dU, Uk, ukName, f, fText, fWerte, dth, phi, gewinn: ok(phi) && phi < 0
    });
  });
  const phiT = zeilen.reduce((a, z) => a + z.phi, 0);

  // Lüftung
  const lu = raum.lueftung;
  const rhocp = p.nw(NWt.rhocp, 'nw.rhocp', 'ρ·c_p');
  const Vsu = p.ein(lu.Vsu, 'raum.lu.Vsu', 'V̇_su (0 eintragen, wenn keine Zuluft)');
  let tsu = NaN, eta = NaN;
  if (ok(Vsu) && Vsu > 0) {
    if (lu.suModus === 'theta') tsu = p.ein(lu.thetaSu, 'raum.lu.thetaSu', 'Zulufttemperatur θ_su');
    else {
      eta = p.ein(lu.eta, 'raum.lu.eta', 'Rückwärmzahl η_WRG');
      if (ok(eta)) p.bed(eta >= 0 && eta <= 1, 'raum.lu.eta', 'η_WRG muss zwischen 0 und 1 liegen');
      tsu = te + eta * (tint - te);
    }
  }
  p.bed(!(ok(Vsu) && Vsu < 0), 'raum.lu.Vsu', 'V̇_su darf nicht negativ sein');
  const Vex = din ? p.ein(lu.Vex, 'raum.lu.Vex', 'V̇_ex (0 eintragen, wenn keine Abluft)') : num(lu.Vex);
  if (din && ok(Vex)) p.bed(Vex >= 0, 'raum.lu.Vex', 'V̇_ex darf nicht negativ sein');
  const n50 = p.ein(lu.n50, 'raum.lu.n50', 'n_50');
  const eRow = NWt.e.find(x => x.id === lu.eId);
  const epsRow = NWt.eps.find(x => x.id === lu.epsId);
  const eW = eRow ? p.nw(eRow.w, `nw.e.${eRow.id}.w`, `e („${nameOd(eRow.klasse, '?')}“)`) : (p.bed(false, 'raum.lu.eId', 'Abschirmungskoeffizient e wählen'), NaN);
  const epsW = epsRow ? p.nw(epsRow.w, `nw.eps.${epsRow.id}.w`, `ε („${nameOd(epsRow.klasse, '?')}“)`) : (p.bed(false, 'raum.lu.epsId', 'Höhenkorrekturfaktor ε wählen'), NaN);
  const Vinf = 2 * V * n50 * eW * epsW;
  const keineZuluft = ok(Vsu) && Vsu === 0;
  const fsu = keineZuluft ? 0 : (tint - tsu) / dth;
  let PhiVinf, PhiVsu, phiV, Vmin = NaN, nmin = NaN, Vmech = NaN, Vroh = NaN, Vtherm = NaN, minMassgebend = false;
  if (din) {
    // Laasch S. 556–559
    nmin = ra ? p.nw(ra.nmin, `nw.ra.${ra.id}.nmin`, `n_min (${ran})`) : NaN;
    Vmin = nmin * V;
    Vmech = Math.max(Vex - (ok(Vsu) ? Vsu : 0), 0);
    Vroh = Vinf + (keineZuluft ? 0 : Vsu * fsu) + Vmech;
    Vtherm = Math.max(Vroh, Vmin);
    minMassgebend = ok(Vmin) && Vmin > Vroh;
    phiV = rhocp * Vtherm * dth;
    PhiVinf = NaN; PhiVsu = NaN;
  } else {
    PhiVinf = rhocp * Vinf * dth;
    PhiVsu = keineZuluft ? 0 : rhocp * Vsu * (tint - tsu);
    phiV = PhiVinf + PhiVsu;
  }

  // Aufheizzuschlag: keiner, direkt (W) oder A_R · f_RH (Laasch S. 559)
  const rhModus = rhModusVon(raum);
  let phiRH = 0, fRH = NaN;
  if (rhModus === 'direkt') phiRH = p.ein(raum.phiRH, 'raum.phiRH', 'Φ_RH');
  else if (rhModus === 'fRH') {
    fRH = p.ein(raum.fRH, 'raum.fRH', 'f_RH');
    p.bed(nameOd(raum.fRHQuelle, ''), 'raum.fRHQuelle', 'Quelle f_RH fehlt (z. B. Laasch Tab. 8.46/8.47)');
    phiRH = A * fRH;
  }

  const phiHL = phiT + phiV + phiRH;
  const phiSpez = phiHL / A;
  const hinweise = [];
  if (!din && ok(Vex) && ok(Vsu) && Vex > Vsu) hinweise.push(`V̇_ex = ${fmt(Vex, 0)} m³/h > V̇_su = ${fmt(Vsu, 0)} m³/h: Der Abluftüberschuss ist im Excel-Ansatz nicht berücksichtigt (im Verfahren DIN EN 12831:2003 schon).`);
  if (din && minMassgebend) hinweise.push(`Mindestluftwechsel maßgebend: V̇_min = ${fmt(Vmin, 1)} m³/h > ${fmt(Vroh, 1)} m³/h (Laasch S. 559).`);
  if (din && ok(Vsu) && Vsu > 0) hinweise.push(HINWEIS_2017);
  zeilen.filter(z => z.gewinn).forEach(z => hinweise.push(`${z.label}: Φ = ${fmt(z.phi, 0)} W – Wärmegewinn vom wärmeren Nachbarraum.`));

  const fehlt = p.fehlt;
  const vollstaendig = fehlt.length === 0 && dOK;
  const nurVoll = x => (vollstaendig ? x : NaN);
  return {
    id: raum.id, vollstaendig, fehlt, hinweise, verfahren: vf, innenliegend: !!raum.innenliegend,
    w: { A, L, B, teile, hi, V, te, tint, dth, tme, fg1, Gw, rhocp, Vsu, tsu, eta, fsu, Vex, n50, e: eW, eps: epsW, Vinf, Vmin, nmin, Vmech, Vroh, Vtherm, minMassgebend,
         suModus: lu.suModus, rhModus, fRH, fRHQuelle: raum.fRHQuelle || '',
         raumart: ra ? ra.name : '', standort: st ? st.name : '', eKlasse: eRow ? eRow.klasse : '', epsKlasse: epsRow ? epsRow.klasse : '' },
    zeilen,
    phiT: nurVoll(phiT), PhiVinf: nurVoll(PhiVinf), PhiVsu: nurVoll(PhiVsu),
    phiV: nurVoll(phiV), phiRH: nurVoll(phiRH), rhGesetzt: rhModus === 'direkt' || rhModus === 'fRH',
    phiHL: nurVoll(phiHL), phiSpez: nurVoll(phiSpez)
  };
}

// ── Gebäude und Nachweis ──────────────────────────────────────────────────
function rechneGebaeude(P) {
  const raeume = P.raeume.map(r => rechneRaum(r, P));
  const alle = raeume.length > 0 && raeume.every(r => r.vollstaendig);
  const s = k => raeume.reduce((a, r) => a + r[k], 0);
  const summe = alle ? { phiT: s('phiT'), phiV: s('phiV'), phiRH: s('phiRH'), phiHL: s('phiHL') } : null;
  if (summe) { summe.A = raeume.reduce((a, r) => a + r.w.A, 0); summe.V = raeume.reduce((a, r) => a + r.w.V, 0); summe.phiSpez = summe.phiHL / summe.A; }
  const phiWEkW = num(P.projekt.phiWE);
  const fehltWE = !ok(phiWEkW) || phiWEkW <= 0;
  const nachweis = summe && !fehltWE ? { Ed: summe.phiHL, Rd: phiWEkW * 1000, eta: summe.phiHL / (phiWEkW * 1000) } : null;
  if (nachweis) nachweis.erfuellt = nachweis.eta <= 1.0;
  return { raeume, alle, summe, nachweis, fehltWE };
}

// ── Import Wärmeschutz-App ────────────────────────────────────────────────
const FH21_BAUTEILE_KEY = 'fh21.bauteile';
function bauteilAusWaermeschutz(b) {
  if (!b || typeof b !== 'object' || !b.name || !ok(num(b.U))) return null;
  return { id: neueId('bt'), name: String(b.name), art: String(b.art || ''), U: String(b.U).replace('.', ','), dUWB: '',
           quelle: String(b.quelle || `Wärmeschutz-App, Bauteil „${b.name}“`), herkunft: 'waermeschutz', wsId: b.id || '', dUWBQuelle: '',
           // Schichten ohne belegte Quelle (λ „ungeprüft“, eigene Eingabe, Luftschicht-Tabelle) → Haken nötig
           ungeprueft: Array.isArray(b.ungeprueft) ? b.ungeprueft.map(String) : [], schichtenGeprueft: false };
}
function leseBauteilDatei(obj) {
  if (obj && obj.format === 'fh21.bauteile' && Array.isArray(obj.bauteile)) return obj.bauteile;
  if (Array.isArray(obj)) return obj;
  return null;
}

if (typeof module !== 'undefined') module.exports = {
  NORMSTAND, VERFAHREN, HINWEIS_2017, QUELLE_LAASCH, formeln, ANGRENZUNG, num, fmt, fmtV, ok, einheitenPruefung, einheitProdukt, EINH,
  leeresProjekt, leererRaum, leereFlaeche, leereTeilflaeche, neueId, rechneRaum, rechneGebaeude, bauteilAusWaermeschutz, leseBauteilDatei, FH21_BAUTEILE_KEY, rhModusVon
};
