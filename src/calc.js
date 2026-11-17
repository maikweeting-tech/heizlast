/* Heizlast-App – Rechenkern (raumweise Norm-Heizlast).
   Enthält KEINE Zahlenwerte für Normgrößen. Alle Werte kommen aus Nutzereingaben,
   aus der Wärmeschutz-App (Bauteil-U) oder aus den vom Nutzer befüllten Normwert-Tabellen.
   Formeln sind hier fest hinterlegt und werden in der App angezeigt (FORMELN). */
'use strict';

// ── Normstand (online geprüft am 17.11.2026) ─────────────────────────────
const NORMSTAND = [
  { norm: 'DIN EN 12831-1:2017-09', status: 'pruefen',
    text: 'Basisnorm. DIN Media: Produktseite am 17.11.2026 nicht erreichbar (404), Status dort nicht bestätigt. Laut Oschatz (ITG Dresden, 2020) zusammen mit DIN/TS 12831-1 die geltende Regel der Technik; ersetzt DIN EN 12831:2003-08.' },
  { norm: 'DIN/TS 12831-1:2020-04', status: 'geprueft',
    text: 'DIN Media (17.11.2026): Ausgabe 2020-04, Vornorm, ersetzt DIN EN 12831 Beiblatt 1 bis 3; kein Nachfolgedokument genannt.' }
];

// ── Formeln (Anzeige) ─────────────────────────────────────────────────────
const FORMELN = [
  { id: 'dth',  f: 'Δθ = θ_int − θ_e', e: 'K' },
  { id: 'Uc',   f: 'U_c = U + ΔU_WB', e: 'W/(m²·K)' },
  { id: 'An',   f: 'A_k = A_brutto − A_Öffnungen', e: 'm²' },
  { id: 'PhiT', f: 'Φ_T,k = A_k · U_c,k · f_k · Δθ', e: 'W' },
  { id: 'fa',   f: 'außen: f = 1', e: '–' },
  { id: 'fg',   f: 'Erdreich: f = f_g1 · f_g2 · G_w  mit  f_g2 = (θ_int − θ_m,e) / (θ_int − θ_e)', e: '–' },
  { id: 'fu',   f: 'unbeheizt: f = b_u = (θ_int − θ_u) / (θ_int − θ_e)', e: '–' },
  { id: 'fj',   f: 'beheizter Nachbarraum: f = (θ_int − θ_j) / (θ_int − θ_e)  (Φ < 0 = Gewinn)', e: '–' },
  { id: 'A',    f: 'A = L · B  bzw.  A = Σ (± L_i · B_i) aus Teilflächen', e: 'm²' },
  { id: 'Vi',   f: 'V_i = A · h_i', e: 'm³' },
  { id: 'Vinf', f: 'V̇_inf = 2 · V_i · n_50 · e · ε', e: 'm³/h' },
  { id: 'tsu',  f: 'θ_su = θ_e + η_WRG · (θ_int − θ_e)', e: '°C' },
  { id: 'PhiV', f: 'Φ_V = ρ·c_p · [V̇_inf · Δθ + V̇_su · (θ_int − θ_su)]', e: 'W' },
  { id: 'HL',   f: 'Φ_HL = Σ Φ_T,k + Φ_V + Φ_RH', e: 'W' },
  { id: 'phi',  f: 'φ = Φ_HL / A', e: 'W/m²' },
  { id: 'geb',  f: 'Φ_HL,Geb = Σ Φ_HL (ohne Abminderungen)', e: 'W' },
  { id: 'eta',  f: 'η = Σ Φ_HL / Φ_WE ≤ 1,0', e: '–' }
];

// Abweichungen Excel-Ansatz ↔ DIN EN 12831-1:2017 (zur Wahl gestellt)
const VARIANTEN = {
  erdreich: {
    titel: 'Erdreich',
    excel: 'Excel-Ansatz: U_c = U + ΔU_WB des Bauteils (Blatt „Heizlast“, Zeile 23).',
    norm: 'DIN EN 12831-1: äquivalenter U-Wert U_equiv (abhängig von B′ und z), ohne ΔU_WB; Eingabe je Fläche mit Quelle.',
    hinweis: 'Formelstruktur f_g1 · f_g2 · A · U_equiv · G_w nicht gegen den Normtext geprüft (Normtext nicht frei zugänglich) – prüfen.'
  },
  vmin: {
    titel: 'Mindestluftvolumenstrom',
    excel: 'Excel-Ansatz: keine Prüfung des Mindestluftwechsels.',
    norm: 'DIN EN 12831-1:2017 Gl. (17): Außenluft = max(V̇_inf ; V̇_min − V̇_su) mit V̇_min = n_min · V_i.',
    hinweis: 'Symbole von Gl. (17) online geprüft (q_v,env, q_v,min, q_v,techn, q_v,su, θ_su); der Formeltext liegt nur als Bild vor – prüfen.'
  },
  infiltration: {
    titel: 'Infiltration',
    excel: 'Excel-Ansatz: V̇_inf = 2 · V_i · n_50 · e · ε (Struktur aus DIN EN 12831:2003).',
    norm: 'DIN EN 12831-1:2017 rechnet zonenweise über q_env,50, Volumenstromfaktor (Tab. B.8) und Orientierungsfaktor (B.2.14), Gl. (18)–(31). In dieser App nicht hinterlegt, weil der Formeltext online nicht prüfbar war.',
    hinweis: 'Nur der Excel-Ansatz ist wählbar.'
  }
};

const ANGRENZUNG = { aussen: 'außen', erdreich: 'Erdreich', unbeheizt: 'unbeheizt', beheizt: 'beheizter Nachbarraum' };

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
  { schritt: 'f_g2, b_u, f_j = Δθ / Δθ', mal: ['K'], durch: ['K'], soll: '–' },
  { schritt: 'f_g = f_g1 · f_g2 · G_w', mal: ['–', '–', '–'], soll: '–' },
  { schritt: 'Φ_T,k = A_k · U_c · f · Δθ', mal: ['m²', 'W/(m²·K)', '–', 'K'], soll: 'W' },
  { schritt: 'A = Σ (± L_i · B_i)', mal: ['m', 'm'], soll: 'm²' },
  { schritt: 'V_i = A · h_i', mal: ['m²', 'm'], soll: 'm³' },
  { schritt: 'V̇_inf = 2 · V_i · n_50 · e · ε', mal: ['m³', '1/h', '–', '–'], soll: 'm³/h' },
  { schritt: 'V̇_min = n_min · V_i', mal: ['1/h', 'm³'], soll: 'm³/h' },
  { schritt: 'θ_su = θ_e + η_WRG · (θ_int − θ_e)', mal: ['–', 'K'], soll: 'K' },
  { schritt: 'Φ_V = ρ·c_p · V̇ · Δθ', mal: ['Wh/(m³·K)', 'm³/h', 'K'], soll: 'W' },
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
    format: 'fh21.heizlast', version: 1,
    projekt: { projekt: '', bauvorhaben: '', bearbeiter: 'Maik Weeting, Klasse FH 21', datum: '', position: '', beschreibung: '', standortId: '', phiWE: '' },
    optionen: { erdreich: 'excel', vmin: 'excel', infiltration: 'excel' },
    normwerte: {
      standorte: [{ id: neueId('st'), name: '', te: leerNW(), tme: leerNW() }],
      raumarten: [{ id: neueId('ra'), name: '', tint: leerNW(), nmin: leerNW() }],
      fg1: leerNW(), Gw: leerNW(), rhocp: leerNW(),
      e: [{ id: neueId('e'), klasse: '', w: leerNW() }],
      eps: [{ id: neueId('ep'), klasse: '', w: leerNW() }]
    },
    bauteile: [],
    raeume: [],
    vorzeigeRaum: ''
  };
}
function leererRaum() {
  return {
    id: neueId('r'), nr: '', name: '', geschoss: '', raumartId: '', amodus: 'LB', L: '', B: '', A: '', teilflaechen: [], hi: '',
    flaechen: [],
    lueftung: { Vsu: '', suModus: 'eta', thetaSu: '', eta: '', Vex: '', n50: '', eId: '', epsId: '' },
    phiRH: ''
  };
}
function leereTeilflaeche() { return { id: neueId('tf'), bez: '', L: '', B: '', minus: false }; }
function leereFlaeche() {
  return { id: neueId('f'), bauteilId: '', ausrichtung: '', Ab: '', Az: '', an: '', thetaX: '', Uequiv: '', UequivQuelle: '' };
}

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
  const rn = `Raum ${nameOd(raum.nr, '?')}`;
  p.bed(nameOd(raum.nr, ''), 'raum.nr', 'Nr. fehlt');
  p.bed(nameOd(raum.name, ''), 'raum.name', 'Raumname fehlt');

  // Standort
  const st = NWt.standorte.find(s => s.id === P.projekt.standortId);
  p.bed(st, 'projekt.standortId', 'Standort im Tab „Projekt“ wählen');
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
  p.bed(raum.flaechen.length > 0, 'raum.flaechen', 'keine Hüllfläche eingetragen');
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
      if (P.optionen.erdreich === 'norm') {
        Uk = p.ein(fl.Uequiv, fp + '.Uequiv', `${nrT}: U_equiv (Variante Norm)`);
        p.bed(nameOd(fl.UequivQuelle, ''), fp + '.UequivQuelle', `${nrT}: Quelle U_equiv fehlt`);
        ukName = 'U_equiv';
      }
    } else if (fl.an === 'unbeheizt' || fl.an === 'beheizt') {
      const sym = fl.an === 'unbeheizt' ? 'θ_u' : 'θ_j';
      const tx = p.ein(fl.thetaX, fp + '.thetaX', `${nrT}: ${sym}`);
      f = (tint - tx) / dth;
      fText = fl.an === 'unbeheizt' ? 'b_u' : 'f_j';
      fWerte = `${fText} = (${fmtV(tint, 1)} − ${fmtV(tx, 1)}) / ${fmt(dth, 1)} = ${fmt(f, 3)}`;
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
  const Vex = num(lu.Vex);
  const n50 = p.ein(lu.n50, 'raum.lu.n50', 'n_50');
  const eRow = NWt.e.find(x => x.id === lu.eId);
  const epsRow = NWt.eps.find(x => x.id === lu.epsId);
  const eW = eRow ? p.nw(eRow.w, `nw.e.${eRow.id}.w`, `e („${nameOd(eRow.klasse, '?')}“)`) : (p.bed(false, 'raum.lu.eId', 'Abschirmungskoeffizient e wählen'), NaN);
  const epsW = epsRow ? p.nw(epsRow.w, `nw.eps.${epsRow.id}.w`, `ε („${nameOd(epsRow.klasse, '?')}“)`) : (p.bed(false, 'raum.lu.epsId', 'Höhenkorrekturfaktor ε wählen'), NaN);
  const Vinf = 2 * V * n50 * eW * epsW;
  let Vmin = NaN, nmin = NaN, Vaussen = Vinf, maxText = '';
  if (P.optionen.vmin === 'norm') {
    nmin = ra ? p.nw(ra.nmin, `nw.ra.${ra.id}.nmin`, `n_min (${ran})`) : NaN;
    Vmin = nmin * V;
    const rest = Vmin - (ok(Vsu) ? Vsu : 0);
    Vaussen = Math.max(Vinf, rest);
    maxText = `max(V̇_inf ; V̇_min − V̇_su) = max(${fmt(Vinf, 1)} ; ${fmt(Vmin, 1)} − ${fmt(Vsu, 0)}) = ${fmt(Vaussen, 1)} m³/h`;
  }
  const PhiVinf = rhocp * Vaussen * dth;
  const PhiVsu = ok(Vsu) && Vsu === 0 ? 0 : rhocp * Vsu * (tint - tsu);
  const fsu = ok(Vsu) && Vsu === 0 ? 0 : (tint - tsu) / dth;
  const phiV = PhiVinf + PhiVsu;

  // Aufheizzuschlag nur bei Eingabe
  let phiRH = 0;
  const rhLeer = raum.phiRH === undefined || String(raum.phiRH).trim() === '';
  if (!rhLeer) phiRH = p.ein(raum.phiRH, 'raum.phiRH', 'Φ_RH (Zahl eingeben oder leer lassen)');

  const phiHL = phiT + phiV + phiRH;
  const phiSpez = phiHL / A;
  const hinweise = [];
  if (ok(Vex) && ok(Vsu) && Vex > Vsu) hinweise.push(`V̇_ex = ${fmt(Vex, 0)} m³/h > V̇_su = ${fmt(Vsu, 0)} m³/h: Der Abluftüberschuss ist im gewählten Ansatz nicht berücksichtigt.`);
  if (raum.flaechen.some(f => f.an === 'erdreich') && P.optionen.erdreich === 'norm') hinweise.push(VARIANTEN.erdreich.hinweis);
  if (P.optionen.vmin === 'norm') hinweise.push(VARIANTEN.vmin.hinweis);
  zeilen.filter(z => z.gewinn).forEach(z => hinweise.push(`${z.label}: Φ = ${fmt(z.phi, 0)} W – Wärmegewinn vom wärmeren Nachbarraum.`));

  const fehlt = p.fehlt;
  const vollstaendig = fehlt.length === 0 && dOK;
  return {
    id: raum.id, vollstaendig, fehlt, hinweise,
    w: { A, L, B, teile, hi, V, te, tint, dth, tme, fg1, Gw, rhocp, Vsu, tsu, eta, fsu, Vex, n50, e: eW, eps: epsW, Vinf, Vmin, nmin, Vaussen, maxText, suModus: lu.suModus,
         raumart: ra ? ra.name : '', standort: st ? st.name : '', eKlasse: eRow ? eRow.klasse : '', epsKlasse: epsRow ? epsRow.klasse : '' },
    zeilen,
    phiT: vollstaendig ? phiT : NaN, PhiVinf: vollstaendig ? PhiVinf : NaN, PhiVsu: vollstaendig ? PhiVsu : NaN,
    phiV: vollstaendig ? phiV : NaN, phiRH: vollstaendig ? phiRH : NaN, rhGesetzt: !rhLeer,
    phiHL: vollstaendig ? phiHL : NaN, phiSpez: vollstaendig ? phiSpez : NaN
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
  NORMSTAND, FORMELN, VARIANTEN, ANGRENZUNG, num, fmt, fmtV, ok, einheitenPruefung, einheitProdukt, EINH,
  leeresProjekt, leererRaum, leereFlaeche, leereTeilflaeche, neueId, rechneRaum, rechneGebaeude, bauteilAusWaermeschutz, leseBauteilDatei, FH21_BAUTEILE_KEY
};
