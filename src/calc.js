/* Heizlast-App – Rechenkern (raumweise Norm-Heizlast).
   Enthält KEINE Zahlenwerte für Normgrößen. Alle Werte kommen aus Nutzereingaben,
   aus der Wärmeschutz-App (Bauteil-U) oder aus den vom Nutzer befüllten Normwert-Tabellen.
   Formeln sind hier fest hinterlegt und werden in der App angezeigt (formeln()). */
'use strict';

// ── Quellen ───────────────────────────────────────────────────────────────
const QUELLE_LAASCH = 'Laasch, T.; Laasch, E.: Haustechnik – Grundlagen, Planung, Ausführung. 13. Aufl., Springer Vieweg, Wiesbaden 2013, ISBN 978-3-8348-1260-5, Kap. 8.3 „Heizlast“, S. 535–560';
const QUELLE_EXCEL = 'TGA_Kita_Wesel_Berechnung_1.xlsx, Blatt „Heizlast“ und „Folienwerte“ (F2_Rechenweg)';
const QUELLE_WBS = 'wbs-WärmebedarfService (www.heizlast.de): Heizlastberechnung nach DIN/TS 12831-1:2020-04, „EFH Musterbeispiel wbs“, Würzburg, 01.09.2021 (wbs_HEIZLAST_MUSTERBEISPIEL.pdf), Formblätter G 1, G 2, Z 2 und R 1–R 13';

// ── Normstand (online geprüft am 19.11.2026) ─────────────────────────────
const NORMSTAND = [
  { norm: 'DIN EN 12831-1:2017-09', status: 'geprueft',
    text: 'DIN Media (19.11.2026): Norm [AKTUELL], ersetzt DIN EN 12831:2003-08; kein Nachfolgedokument genannt. Gilt in Deutschland zusammen mit DIN/TS 12831-1. Ihr Lüftungsverfahren ist nur über den Rechenweg des wbs-Musterbeispiels nachgebildet (Verfahren „DIN/TS 12831-1:2020“), nicht gegen den Normtext geprüft.' },
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
  },
  dints2020: {
    titel: 'DIN/TS 12831-1:2020 – Lüftung über die Hüllfläche (Rechenweg nach wbs-Musterbeispiel)',
    kurz: 'DIN/TS 12831-1:2020',
    text: 'Transmission wie DIN EN 12831:2003 (U_c außen/unbeheizt, U zu beheizten Räumen, U_equiv Erdreich). Lüftung je Raum: Leckage q_V,env = f_env · q_env,50 · A_env (A_env = Flächen gegen außen und Erdreich), Mindestluft q_V,env/min = max(q_V,env ; n_min · V_i − q_V,techn) mit q_V,techn = max(V̇_su ; V̇_ex), Zuluft mit θ_su nach WRG, Überströmluft mit θ_tr des Nachbarraums. Gebäude: Σ Φ_T nach außen + f_Geb · Σ Φ_V,env/min + Σ Φ_V,su + Σ Φ_V,tr + Σ Φ_RH. Rechenweg aus dem Musterbeispiel rückgerechnet; f_env und f_Geb sind ohne Normtext (Tab. B.8, B.2.14) nicht belegt.',
    quelle: QUELLE_WBS
  }
};
const HINWEIS_2017 = 'DIN EN 12831-1:2017 rechnet die Lüftung über q_env,50, Volumenstromfaktor (Tab. B.8) und Orientierungsfaktor (B.2.14), Gl. (18)–(31). Der Normtext lag nicht vor. Das Verfahren „DIN/TS 12831-1:2020“ bildet den Rechenweg des wbs-Musterbeispiels nach; dort stecken beide Faktoren zusammen in f_env (rückgerechnet, nicht normgeprüft).';

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
const F_TS = [
  { f: 'U_k = U_c (außen, unbeheizt) · U (beheizt) · U_equiv (Erdreich)', e: 'W/(m²·K)' },
  { f: 'A_env,i = Σ A_k (außen, Erdreich)', e: 'm²' },
  { f: 'q_V,env,i = f_env · q_env,50 · A_env,i', e: 'm³/h' },
  { f: 'q_V,min,i = n_min · V_i', e: 'm³/h' },
  { f: 'q_V,techn,i = max(V̇_su ; V̇_ex)', e: 'm³/h' },
  { f: 'q_V,env/min,i = max(q_V,env,i ; q_V,min,i − q_V,techn,i)', e: 'm³/h' },
  { f: 'Φ_V = ρ·c_p · [q_V,env/min,i · (θ_int − θ_e) + V̇_su · (θ_int − θ_su) + V̇_tr · (θ_int − θ_tr)]', e: 'W' }
];
const F_ENDE_TS = [
  { f: 'Φ_RH = Φ_RH (Eingabe)  oder  Φ_RH = A_R · f_RH', e: 'W' },
  { f: 'Φ_HL,i = Σ Φ_T,k + Φ_V + Φ_RH', e: 'W' },
  { f: 'φ = Φ_HL,i / A', e: 'W/m²' },
  { f: 'Φ_HL,Geb = Σ Φ_T,e + f_Geb · Σ Φ_V,env/min + Σ Φ_V,su + Σ Φ_V,tr + Σ Φ_RH  (Φ_T,e: ohne Flächen zu beheizten Räumen)', e: 'W' },
  { f: 'η = Φ_HL,Geb / Φ_WE ≤ 1,0', e: '–' }
];
function formeln(verfahren) {
  if (verfahren === 'dints2020') return F_GEMEINSAM.filter(f => !/V̇_inf/.test(f.f)).concat(F_TS, F_ENDE_TS);
  return F_GEMEINSAM.concat(verfahren === 'excel' ? F_EXCEL : verfahren === 'din2003' ? F_2003 : [], F_ENDE);
}

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
  'Wh/(m³·K)': { W: 1, h: 1, m: -3, K: -1 }, 'W/m²': { W: 1, m: -2 }, 'kW': { W: 1 }, 'm³/(h·m²)': { m: 1, h: -1 }
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
  { schritt: 'A_brutto = L · H', mal: ['m', 'm'], soll: 'm²' },
  { schritt: 'f_g2, b_u, f_ij, f_V,su = Δθ / Δθ', mal: ['K'], durch: ['K'], soll: '–' },
  { schritt: 'f_g = f_g1 · f_g2 · G_w', mal: ['–', '–', '–'], soll: '–' },
  { schritt: 'Φ_T,k = A_k · U_k · f · Δθ', mal: ['m²', 'W/(m²·K)', '–', 'K'], soll: 'W' },
  { schritt: 'A = Σ (± L_i · B_i)', mal: ['m', 'm'], soll: 'm²' },
  { schritt: 'V_i = A · h_i', mal: ['m²', 'm'], soll: 'm³' },
  { schritt: 'V̇_inf = 2 · V_i · n_50 · e · ε', mal: ['m³', '1/h', '–', '–'], soll: 'm³/h' },
  { schritt: 'V̇_min = n_min · V_i', mal: ['1/h', 'm³'], soll: 'm³/h' },
  { schritt: 'q_V,env = f_env · q_env,50 · A_env', mal: ['–', 'm³/(h·m²)', 'm²'], soll: 'm³/h' },
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
      qenv50: leerNW(), fenv: leerNW(), fGeb: leerNW(),   // nur Verfahren DIN/TS 12831-1:2020
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
    lueftung: { Vsu: '', suModus: 'eta', thetaSu: '', eta: '', Vex: '', n50: '', eId: '', epsId: '', Vtr: '', thetaTr: '', nminRaum: '', nminQuelle: '' },
    rhModus: '', phiRH: '', fRH: '', fRHQuelle: ''
  };
}
function leereTeilflaeche() { return { id: neueId('tf'), bez: '', L: '', B: '', minus: false }; }
function leereFlaeche() {
  return { id: neueId('f'), bauteilId: '', ausrichtung: '', fL: '', fH: '', Ab: '', Az: '', an: '', thetaX: '', Uequiv: '', UequivQuelle: '', buQuelle: '' };
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
  const ts = vf === 'dints2020';
  const din = vf === 'din2003' || ts;   // Transmissionsregeln (U, U_equiv) gleich
  const din03 = vf === 'din2003';       // Lüftung nach Laasch
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
    // Bruttofläche direkt oder aus Länge × Höhe (sobald eines der beiden Maße eingetragen ist)
    const masz = String(fl.fL == null ? '' : fl.fL).trim() !== '' || String(fl.fH == null ? '' : fl.fH).trim() !== '';
    let fL = NaN, fH = NaN, Ab;
    if (masz) {
      fL = p.ein(fl.fL, fp + '.fL', `${nrT}: Länge`);
      fH = p.ein(fl.fH, fp + '.fH', `${nrT}: Höhe`);
      Ab = fL * fH;
    } else Ab = p.ein(fl.Ab, fp + '.Ab', `${nrT}: Fläche brutto (oder Länge × Höhe)`);
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
      an: fl.an, bezug: An, einheit: 'm²', Ab, Az, masz, fL, fH, U, dU, Uk, ukName, f, fText, fWerte, dth, phi, gewinn: ok(phi) && phi < 0
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
  // Infiltration über n_50, e, ε (nicht im Verfahren DIN/TS: dort Leckage über die Hüllfläche)
  let n50 = NaN, eW = NaN, epsW = NaN, eRow = null, epsRow = null;
  if (!ts) {
    n50 = p.ein(lu.n50, 'raum.lu.n50', 'n_50');
    eRow = NWt.e.find(x => x.id === lu.eId);
    epsRow = NWt.eps.find(x => x.id === lu.epsId);
    eW = eRow ? p.nw(eRow.w, `nw.e.${eRow.id}.w`, `e („${nameOd(eRow.klasse, '?')}“)`) : (p.bed(false, 'raum.lu.eId', 'Abschirmungskoeffizient e wählen'), NaN);
    epsW = epsRow ? p.nw(epsRow.w, `nw.eps.${epsRow.id}.w`, `ε („${nameOd(epsRow.klasse, '?')}“)`) : (p.bed(false, 'raum.lu.epsId', 'Höhenkorrekturfaktor ε wählen'), NaN);
  }
  const Vinf = 2 * V * n50 * eW * epsW;
  const keineZuluft = ok(Vsu) && Vsu === 0;
  const fsu = keineZuluft ? 0 : (tint - tsu) / dth;
  let PhiVinf, PhiVsu, phiV, Vmin = NaN, nmin = NaN, Vmech = NaN, Vroh = NaN, Vtherm = NaN, minMassgebend = false;
  // nur DIN/TS
  let qenv50 = NaN, fenv = NaN, fGeb = NaN, Aenv = NaN, qenv = NaN, qtechn = NaN, qenvmin = NaN, Vtr = NaN, ttr = NaN, PhiVenv = NaN, PhiVtr = NaN, nminEigen = false;
  if (ts) {
    // n_min: raumweise festgelegt (mit Quelle) oder aus der Raumart
    nminEigen = String(lu.nminRaum == null ? '' : lu.nminRaum).trim() !== '';
    if (nminEigen) {
      nmin = p.ein(lu.nminRaum, 'raum.lu.nminRaum', 'n_min für diesen Raum');
      p.bed(nameOd(lu.nminQuelle, ''), 'raum.lu.nminQuelle', 'Quelle bzw. Begründung für n_min dieses Raums fehlt');
    } else nmin = ra ? p.nw(ra.nmin, `nw.ra.${ra.id}.nmin`, `n_min (${ran})`) : NaN;
    qenv50 = p.nw(NWt.qenv50, 'nw.qenv50', 'q_env,50');
    fenv = p.nw(NWt.fenv, 'nw.fenv', 'f_env');
    fGeb = p.nw(NWt.fGeb, 'nw.fGeb', 'f_Geb (Gebäude-Anteil der Leckage)');
    Vtr = p.ein(lu.Vtr, 'raum.lu.Vtr', 'Überströmluft V̇_tr (0 eintragen, wenn keine)');
    if (ok(Vtr)) p.bed(Vtr >= 0, 'raum.lu.Vtr', 'V̇_tr darf nicht negativ sein');
    if (ok(Vtr) && Vtr > 0) ttr = p.ein(lu.thetaTr, 'raum.lu.thetaTr', 'Temperatur der Überströmluft θ_tr');
    // A_env: Flächen gegen außen und Erdreich (netto je Zeile = Wände ohne Öffnungen + Öffnungen)
    Aenv = zeilen.filter(z => z.an === 'aussen' || z.an === 'erdreich').reduce((a, z) => a + z.bezug, 0);
    qenv = fenv * qenv50 * Aenv;
    Vmin = nmin * V;
    qtechn = Math.max(ok(Vsu) ? Vsu : 0, ok(Vex) ? Vex : 0);
    qenvmin = Math.max(qenv, Vmin - qtechn);
    minMassgebend = ok(Vmin) && Vmin - qtechn > qenv;
    PhiVenv = rhocp * qenvmin * dth;
    PhiVsu = keineZuluft ? 0 : rhocp * Vsu * (tint - tsu);
    PhiVtr = ok(Vtr) && Vtr === 0 ? 0 : rhocp * Vtr * (tint - ttr);
    phiV = PhiVenv + PhiVsu + PhiVtr;
  } else if (din) {
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
  if (din03 && minMassgebend) hinweise.push(`Mindestluftwechsel maßgebend: V̇_min = ${fmt(Vmin, 1)} m³/h > ${fmt(Vroh, 1)} m³/h (Laasch S. 559).`);
  if (din03 && ok(Vsu) && Vsu > 0) hinweise.push(HINWEIS_2017);
  if (ts && minMassgebend) hinweise.push(`Mindestluftwechsel maßgebend: q_V,min − q_V,techn = ${fmt(Vmin, 1)} − ${fmt(qtechn, 1)} = ${fmt(Vmin - qtechn, 1)} m³/h > Leckage ${fmt(qenv, 1)} m³/h. Wird die Mindestluft von der Lüftungsanlage geliefert, n_min für diesen Raum festlegen (z. B. 0) und begründen.`);
  if (ts && raum.flaechen.some(f => f.an === 'unbeheizt' || f.an === 'unbeheiztBu')) hinweise.push('Flächen gegen Unbeheiztes zählen hier nicht zu A_env (im wbs-Musterbeispiel kommt der Fall nicht vor). Prüfen, ob sie zur luftdichten Hülle gehören.');
  if (ts && ok(PhiVtr) && PhiVtr < 0) hinweise.push(`Überströmluft wärmer als der Raum: Φ_V,tr = ${fmt(PhiVtr, 0)} W (Gewinn).`);
  zeilen.filter(z => z.gewinn).forEach(z => hinweise.push(`${z.label}: Φ = ${fmt(z.phi, 0)} W – Wärmegewinn vom wärmeren Nachbarraum.`));

  const fehlt = p.fehlt;
  const vollstaendig = fehlt.length === 0 && dOK;
  const nurVoll = x => (vollstaendig ? x : NaN);
  return {
    id: raum.id, vollstaendig, fehlt, hinweise, verfahren: vf, innenliegend: !!raum.innenliegend,
    w: { A, L, B, teile, hi, V, te, tint, dth, tme, fg1, Gw, rhocp, Vsu, tsu, eta, fsu, Vex, n50, e: eW, eps: epsW, Vinf, Vmin, nmin, Vmech, Vroh, Vtherm, minMassgebend,
         qenv50, fenv, fGeb, Aenv, qenv, qtechn, qenvmin, Vtr, ttr, nminEigen, nminQuelle: lu.nminQuelle || '',
         suModus: lu.suModus, rhModus, fRH, fRHQuelle: raum.fRHQuelle || '',
         raumart: ra ? ra.name : '', standort: st ? st.name : '', eKlasse: eRow ? eRow.klasse : '', epsKlasse: epsRow ? epsRow.klasse : '' },
    zeilen,
    phiT: nurVoll(phiT), PhiVinf: nurVoll(PhiVinf), PhiVsu: nurVoll(PhiVsu),
    // Transmission ohne Flächen zu beheizten Nachbarräumen (Gebäudeheizlast DIN/TS)
    phiTe: nurVoll(zeilen.filter(z => z.an !== 'beheizt').reduce((a, z) => a + z.phi, 0)),
    PhiVenv: nurVoll(PhiVenv), PhiVtr: nurVoll(PhiVtr),
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
  // Gebäudeheizlast: Summe der Räume – beim Verfahren DIN/TS nach wbs-Musterbeispiel (Formblatt G 2)
  let geb = null;
  if (summe) {
    if ((P.optionen || {}).verfahren === 'dints2020') {
      const fGeb = num(P.normwerte.fGeb.wert);
      geb = { ts: true, phiTe: s('phiTe'), phiTb: summe.phiT - s('phiTe'), PhiVenv: s('PhiVenv'), PhiVsu: s('PhiVsu'), PhiVtr: s('PhiVtr'), fGeb };
      geb.phiV = fGeb * geb.PhiVenv + geb.PhiVsu + geb.PhiVtr;
      geb.phiHL = geb.phiTe + geb.phiV + summe.phiRH;
    } else geb = { ts: false, phiHL: summe.phiHL };
    geb.phiSpez = geb.phiHL / summe.A;
  }
  const phiWEkW = num(P.projekt.phiWE);
  const fehltWE = !ok(phiWEkW) || phiWEkW <= 0;
  const nachweis = geb && !fehltWE ? { Ed: geb.phiHL, Rd: phiWEkW * 1000, eta: geb.phiHL / (phiWEkW * 1000) } : null;
  if (nachweis) nachweis.erfuellt = nachweis.eta <= 1.0;
  return { raeume, alle, summe, geb, nachweis, fehltWE };
}

// ── Import Wärmeschutz-App ────────────────────────────────────────────────
const FH21_BAUTEILE_KEY = 'fh21.bauteile';
function bauteilAusWaermeschutz(b) {
  if (!b || typeof b !== 'object' || !b.name || !ok(num(b.U))) return null;
  return { id: neueId('bt'), name: String(b.name), art: String(b.art || ''), U: String(b.U).replace('.', ','), dUWB: '',
           quelle: String(b.quelle || `Wärmeschutz-App, Bauteil „${b.name}“`), herkunft: 'waermeschutz', wsId: b.id || '', dUWBQuelle: '',
           // Schichten ohne belegte Quelle (λ „ungeprüft“, eigene Eingabe, Luftschicht-Tabelle) → Haken nötig
           ungeprueft: Array.isArray(b.ungeprueft) ? b.ungeprueft.map(String) : [], schichtenGeprueft: false,
           // Schichtaufbau innen → außen (d in cm), nur zur Anzeige
           schichten: schichtenAus(b.schichten), RT: ok(num(b.RT)) ? num(b.RT) : null, dU: ok(num(b.dU)) ? num(b.dU) : null,
           // vollständige Eingaben der Wärmeschutz-App (Randbedingungen + Schichten) zum späteren Bearbeiten
           wsZustand: wsZustandAus(b.zustand),
           // Ergebnisse Mindestwärmeschutz, GModG, Schimmel, Glaser (für die Vorzeigeseite)
           nachweis: nachweisAus(b.nachweis) };
}
function nachweisAus(n) {
  if (!n || typeof n !== 'object') return null;
  const z = v => (typeof v === 'number' && isFinite(v) ? v : null), t = v => String(v == null ? '' : v), j = v => !!v;
  const o = (x, f) => (x && typeof x === 'object' ? f(x) : null);
  return {
    rb: o(n.rb, x => ({ ti: z(x.ti), te: z(x.te), raum: t(x.raum), richtung: t(x.richtung) })),
    min: o(n.min, x => ({ rmin: z(x.rmin), Rvorh: z(x.Rvorh), eta: z(x.eta), ok: j(x.ok), zeile: t(x.zeile), text: t(x.text), din: t(x.din) })),
    gmodg: o(n.gmodg, x => ({ fall: t(x.fall), Ur: z(x.Ur), umax: z(x.umax), ok: j(x.ok), keine: j(x.keine), nr: t(x.nr), text: t(x.text), zone: t(x.zone) })),
    schimmel: o(n.schimmel, x => ({ thetaSi: z(x.thetaSi), thetaMin: z(x.thetaMin), fRsi: z(x.fRsi), ok: j(x.ok) })),
    glaser: o(n.glaser, x => (Array.isArray(x.muFehlt) ? { muFehlt: x.muFehlt.map(t) }
      : { tauwasser: j(x.tauwasser), mc: z(x.mc), mev: z(x.mev), mcGrenze: z(x.mcGrenze), okMc: j(x.okMc), okEv: j(x.okEv), ok: j(x.ok), ebenen: z(x.ebenen) }))
  };
}
function wsZustandAus(z) {
  if (!z || typeof z !== 'object' || !z.f || typeof z.f !== 'object' || !Array.isArray(z.s)) return null;
  const f = {};
  Object.keys(z.f).forEach(k => { const v = z.f[k]; f[k] = typeof v === 'boolean' ? v : String(v == null ? '' : v); });
  return { f, s: z.s.filter(Array.isArray).map(r => r.map(v => String(v == null ? '' : v))) };
}
function schichtenAus(l) {
  if (!Array.isArray(l)) return [];
  return l.filter(s => s && typeof s === 'object').map(s => ({
    name: String(s.name || ''), d: ok(num(s.d)) ? num(s.d) : null, lambda: ok(num(s.lambda)) ? num(s.lambda) : null,
    R: ok(num(s.R)) ? num(s.R) : null, quelle: String(s.quelle || '') }));
}
function leseBauteilDatei(obj) {
  if (obj && obj.format === 'fh21.bauteile' && Array.isArray(obj.bauteile)) return obj.bauteile;
  if (Array.isArray(obj)) return obj;
  return null;
}

if (typeof module !== 'undefined') module.exports = {
  NORMSTAND, VERFAHREN, HINWEIS_2017, QUELLE_LAASCH, QUELLE_WBS, formeln, ANGRENZUNG, num, fmt, fmtV, ok, einheitenPruefung, einheitProdukt, EINH,
  leeresProjekt, leererRaum, leereFlaeche, leereTeilflaeche, neueId, rechneRaum, rechneGebaeude, bauteilAusWaermeschutz, leseBauteilDatei, FH21_BAUTEILE_KEY, rhModusVon
};
