/* Heizlast-App – Oberfläche. Rechenkern: calc.js. Keine Vorbelegungen (außer Bearbeiter laut Vorgabe). */
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SPEICHER = 'fh21.heizlast.v1';
const BAUTEILARTEN = ['Außenwand', 'Fenster', 'Außentür', 'Dach', 'Oberste Geschossdecke', 'Decke', 'Bodenplatte', 'Kellerdecke', 'Innenwand', 'Innentür', 'Sonstiges'];
const AUSRICHTUNG = ['', 'N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW', 'horizontal'];
let S, tab = 'projekt', G = null, RE = null;
const offen = new Set();

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('zeigen');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('zeigen'), 3500);
}
// Formelzeichen mit Index: "θ_int" → θ<sub>int</sub> (nach esc anwenden)
const idx = h => String(h).replace(/([A-Za-zΦθφηρεΔ̇])_([A-Za-z0-9äöüÖÄÜ]+(?:,[A-Za-z0-9]+)?)/g, '$1<sub>$2</sub>');
const datumDE = iso => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('.') : (iso || ''));
const W = (x, d = 0) => fmt(x, d);

// ── Zustand ───────────────────────────────────────────────────────────────
function laden() {
  try { const z = JSON.parse(localStorage.getItem(SPEICHER) || 'null'); if (z && z.format === 'fh21.heizlast') return ergaenze(z); } catch (e) { /* leer */ }
  return ergaenze(leeresProjekt());
}
function ergaenze(z) {
  const L = leeresProjekt();
  z.projekt = Object.assign(L.projekt, z.projekt || {});
  z.optionen = Object.assign(L.optionen, z.optionen || {});
  z.optionen.infiltration = 'excel';
  z.normwerte = Object.assign(L.normwerte, z.normwerte || {});
  z.bauteile = z.bauteile || []; z.raeume = z.raeume || [];
  if (!z.entwurf) { z.entwurf = leererRaum(); z.entwurfVon = ''; }
  return z;
}
let _sp;
function speichern() { clearTimeout(_sp); _sp = setTimeout(() => { try { localStorage.setItem(SPEICHER, JSON.stringify(S)); } catch (e) { toast('Speichern im Browser nicht möglich – bitte JSON exportieren.'); } }, 200); }

// Pfad: "normwerte.standorte.#id.te.wert"
function ziel(pfad) {
  const t = pfad.split('.'); let o = S;
  for (let i = 0; i < t.length - 1; i++) { o = t[i][0] === '#' ? o.find(x => x.id === t[i].slice(1)) : o[t[i]]; if (!o) return [null, null]; }
  return [o, t[t.length - 1]];
}
const setze = (p, v) => { const [o, k] = ziel(p); if (o) o[k] = v; };
const hole = p => { const [o, k] = ziel(p); return o ? o[k] : ''; };

// ── Bausteine ─────────────────────────────────────────────────────────────
const inp = (b, pf, cls = 'z', extra = '') => `<input type="text" ${cls === 'z' ? 'inputmode="decimal" ' : ''}class="${cls}" data-b="${b}"${pf ? ` data-pf="${pf}"` : ''} value="${esc(hole(b))}" ${extra}>`;
const feld = (label, b, pf, einh = '', cls = '', extra = '') =>
  `<label class="feld">${label}${einh ? ` <span class="einh">in ${einh}</span>` : ''}<input type="text"${cls === 'z' ? ' inputmode="decimal"' : ''} data-b="${b}"${pf ? ` data-pf="${pf}"` : ''} value="${esc(hole(b))}" ${extra}></label>`;
const haken = (b, pf) => `<label class="haken"${pf ? ` data-pf="${pf}"` : ''}><input type="checkbox" data-b="${b}" ${hole(b) ? 'checked' : ''}> geprüft</label>`;
function sel(b, pf, opts, rerender = true, cls = '') {
  const v = hole(b);
  return `<select data-b="${b}"${pf ? ` data-pf="${pf}"` : ''}${rerender ? ' data-r="1"' : ''} class="${cls}">${opts.map(([val, txt]) => `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(txt)}</option>`).join('')}</select>`;
}
function nwStatus(n) {
  if (!n || !ok(num(n.wert))) return ['no', 'Wert fehlt'];
  if (!String(n.quelle || '').trim()) return ['no', 'Quelle fehlt'];
  if (!n.geprueft) return ['pr', 'prüfen'];
  return ['ok', '✓ geprüft'];
}
const badge = n => { const [c, t] = nwStatus(n); return `<span class="status ${c}">${t}</span>`; };
const nwText = (n, d, einh) => (n && ok(num(n.wert)) ? `${W(num(n.wert), d)} ${einh}` : '–');
function nwZeile(titel, sym, einh, b, pf, extraZelle = '') {
  return `<tr>${extraZelle}<td>${titel}</td><td>${sym}</td><td>${inp(b + '.wert', pf + '.wert')}</td><td>${einh}</td>
    <td>${inp(b + '.quelle', pf + '.quelle', 'q', 'placeholder="Norm, Tabelle, Seite"')}</td><td>${haken(b + '.geprueft', pf + '.geprueft')}</td>
    <td data-o="nws:${b}">${badge(hole(b))}</td></tr>`;
}

// ── Tabs ──────────────────────────────────────────────────────────────────
function zeigeTab(t) {
  tab = t;
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  document.querySelectorAll('main > section').forEach(s => { s.hidden = s.id !== 'tab-' + t; });
  render();
  window.scrollTo(0, 0);
}
function render() {
  G = rechneGebaeude(S); RE = rechneRaum(S.entwurf, S);
  const f = { projekt: rProjekt, bauteile: rBauteile, normwerte: rNormwerte, raum: rRaum, tabelle: rTabelle, vorzeige: rVorzeige }[tab];
  $('tab-' + tab).innerHTML = f();
  $('z-bauteile').textContent = S.bauteile.length; $('z-raeume').textContent = S.raeume.length;
  markiere();
  if (tab === 'vorzeige') druckstil();
}

// ── 1 Projekt ─────────────────────────────────────────────────────────────
function rProjekt() {
  const st = S.normwerte.standorte.find(s => s.id === S.projekt.standortId);
  const opts = [['', '— Standort wählen —']].concat(S.normwerte.standorte.map(s => [s.id, s.name || '(Standort ohne Namen)']));
  const var1 = (k) => {
    const v = VARIANTEN[k];
    return `<div class="karte"><h3>${v.titel}</h3>
      <div class="radio" style="flex-direction:column;gap:4px">
        <label><input type="radio" name="opt-${k}" data-b="optionen.${k}" data-r="1" value="excel" ${S.optionen[k] === 'excel' ? 'checked' : ''}> <span>${idx(esc(v.excel))}</span></label>
        <label${k === 'infiltration' ? ' style="opacity:.6"' : ''}><input type="radio" name="opt-${k}" data-b="optionen.${k}" data-r="1" value="norm" ${S.optionen[k] === 'norm' ? 'checked' : ''} ${k === 'infiltration' ? 'disabled' : ''}> <span>${idx(esc(v.norm))}</span></label>
      </div><p class="hinweis klein">${idx(esc(v.hinweis))}</p></div>`;
  };
  return `
  <div class="karte"><h2>Titelblock</h2>
    <div class="reihe drei">${feld('Projekt', 'projekt.projekt', '', '', 't')}${feld('Bauvorhaben', 'projekt.bauvorhaben', '', '', 't')}${feld('Bearbeiter', 'projekt.bearbeiter', '', '', 't')}</div>
    <div class="reihe drei"><label class="feld">Datum<input type="date" data-b="projekt.datum" value="${esc(S.projekt.datum)}"></label>${feld('Positionsnummer', 'projekt.position', '', '', 't', 'placeholder="z. B. 1"')}<div></div></div>
    <label class="feld">Kurzbeschreibung <span class="einh">(erscheint auf der Vorzeigeseite)</span><textarea data-b="projekt.beschreibung">${esc(S.projekt.beschreibung)}</textarea></label>
  </div>
  <div class="karte"><h2>Standort</h2>
    <label class="feld">Standort aus der Normwert-Tabelle ${sel('projekt.standortId', 'projekt.standortId', opts)}</label>
    ${st ? `<div class="tabwrap"><table class="tab"><tr><th>Größe</th><th class="zahl">Wert</th><th>Quelle</th><th>Status</th></tr>
      <tr><td>Norm-Außentemperatur θ<sub>e</sub></td><td class="zahl">${nwText(st.te, 1, '°C')}</td><td>${esc(st.te.quelle)}</td><td>${badge(st.te)}</td></tr>
      <tr><td>Jahresmittel der Außentemperatur θ<sub>m,e</sub></td><td class="zahl">${nwText(st.tme, 1, '°C')}</td><td>${esc(st.tme.quelle)}</td><td>${badge(st.tme)}</td></tr></table></div>`
      : '<p class="hinweis">Standorte legst du im Tab „3 Normwerte“ an.</p>'}
  </div>
  <div class="karte"><h2>Wärmeerzeuger (für den Nachweis)</h2>
    <div class="reihe">${feld('Leistung des Wärmeerzeugers Φ<sub>WE</sub>', 'projekt.phiWE', 'projekt.phiWE', 'kW', 'z')}<div><span class="hinweis klein">Nachweis</span><span class="ausgabe" data-o="nachweis">${nachweisText()}</span></div></div>
  </div>
  <h2 style="margin:18px 0 8px">Rechenansatz: Abweichungen Excel-Blatt ↔ Norm</h2>
  <p class="hinweis">Wo das Excel-Blatt „Heizlast“ von DIN EN 12831-1 abweicht, wählst du hier die Variante. Der Testfall (18,29 kW) gilt für den Excel-Ansatz.</p>
  ${var1('infiltration')}${var1('erdreich')}${var1('vmin')}
  <div class="karte"><h2>Regelwerk und Ausgabestand</h2>
    <div class="tabwrap"><table class="tab"><tr><th>Norm</th><th>Status</th><th>Prüfung (online)</th></tr>
    ${NORMSTAND.map(n => `<tr><td><b>${esc(n.norm)}</b></td><td><span class="status ${n.status === 'geprueft' ? 'ok' : 'pr'}">${n.status === 'geprueft' ? '✓ geprüft' : 'prüfen'}</span></td><td class="klein">${esc(n.text)}</td></tr>`).join('')}
    </table></div>
  </div>
  <div class="karte"><h2>Hinterlegte Formeln</h2>
    <div class="formel">${FORMELN.map(f => esc(f.f) + '   [' + esc(f.e) + ']').join('\n')}</div>
    <details class="auf" style="margin-top:10px"><summary>Einheitenkontrolle je Rechenschritt</summary>
      <div class="tabwrap"><table class="tab"><tr><th>Rechenschritt</th><th>Einheiten</th><th>Ergebnis</th><th></th></tr>
      ${einheitenPruefung().map(s => `<tr><td>${esc(s.schritt)}</td><td class="mono klein">${esc(s.mal.join(' · '))}${s.durch ? ' / ' + esc(s.durch.join(' · ')) : ''}</td><td>${esc(s.soll)}</td><td><span class="status ${s.ok ? 'ok' : 'no'}">${s.ok ? '✓' : '✗'}</span></td></tr>`).join('')}
      </table></div><p class="hinweis klein">ρ·c<sub>p</sub> in Wh/(m³·K) mal V̇ in m³/h mal Δθ in K ergibt W.</p>
    </details>
  </div>
  <div class="karte"><h2>Daten</h2>
    <div class="knoepfe">
      <button class="btn btn-klein" data-a="json-export">Projekt als JSON speichern</button>
      <button class="btn btn-klein" data-a="json-import">JSON laden (Projekt oder Bauteile)</button>
      <button class="btn btn-klein" data-a="xlsx">Raumtabelle als .xlsx</button>
      <button class="btn btn-klein" data-a="neu">Neues leeres Projekt</button>
    </div>
    <p class="hinweis klein" style="margin-top:8px">Alle Eingaben werden automatisch im Browser gespeichert (localStorage). Zum Sichern oder Weitergeben das Projekt als JSON speichern.</p>
  </div>`;
}
function nachweisText() {
  if (!G.summe) return 'Σ Φ_HL fehlt (Räume unvollständig oder keine Räume)';
  if (!G.nachweis) return 'Φ_WE fehlt';
  const n = G.nachweis;
  return `η = ${W(n.Ed / 1000, 2)} / ${W(n.Rd / 1000, 2)} = ${W(n.eta, 3)} ${n.erfuellt ? '≤' : '>'} 1,0 → ${n.erfuellt ? 'erfüllt' : 'NICHT erfüllt'}`;
}

// ── 2 Bauteile ────────────────────────────────────────────────────────────
function rBauteile() {
  const zeilen = S.bauteile.map(b => {
    const ws = b.herkunft === 'waermeschutz';
    const arten = BAUTEILARTEN.includes(b.art) || !b.art ? BAUTEILARTEN : [b.art].concat(BAUTEILARTEN);
    const pb = `bauteile.#${b.id}`, pf = `bt.${b.id}`;
    return `<tr>
      <td>${inp(pb + '.name', '', 'n')}</td>
      <td>${sel(pb + '.art', '', [['', '—']].concat(arten.map(a => [a, a])), false)}</td>
      <td>${ws ? `<input type="text" class="z" value="${esc(b.U)}" readonly title="aus Wärmeschutz-App">` : inp(pb + '.U', pf + '.U')}</td>
      <td>${inp(pb + '.dUWB', pf + '.dUWB')}</td>
      <td class="zahl" data-o="uc:${b.id}">${ucText(b)}</td>
      <td>${ws ? `<span class="klein">${esc(b.quelle)}</span>` : inp(pb + '.quelle', pf + '.quelle', 'q', 'placeholder="Quelle des U-Werts"')}</td>
      <td>${inp(pb + '.dUWBQuelle', '', 'q', 'placeholder="Quelle ΔU_WB (optional)"')}</td>
      <td>${ws ? '<span class="status ok">Wärmeschutz-App</span>' : '<span class="status pr">manuell</span>'}</td>
      <td class="no-print"><button class="btn-icon" data-a="bt-weg" data-id="${b.id}" title="Bauteil löschen">×</button></td></tr>`;
  }).join('');
  return `<div class="karte"><h2>Bauteilkatalog</h2>
    <p class="hinweis">U-Werte kommen aus der Wärmeschutz-App (Name als Quelle) oder werden von Hand mit Quelle eingetragen. ΔU<sub>WB</sub> ist immer eine Eingabe; U<sub>c</sub> = U + ΔU<sub>WB</sub> rechnet die App.</p>
    <div class="knoepfe" style="margin-bottom:12px">
      <button class="btn btn-klein btn-primaer" data-a="ws-import">Aus Wärmeschutz-App übernehmen</button>
      <button class="btn btn-klein" data-a="json-import">JSON-Datei importieren</button>
      <button class="btn btn-klein" data-a="bt-neu">+ Bauteil manuell</button>
    </div>
    ${S.bauteile.length ? `<div class="tabwrap"><table class="tab"><tr><th>Name</th><th>Bauteilart</th><th class="zahl">U<br>W/(m²·K)</th><th class="zahl">ΔU<sub>WB</sub><br>W/(m²·K)</th><th class="zahl">U<sub>c</sub><br>W/(m²·K)</th><th>Quelle U</th><th>Quelle ΔU<sub>WB</sub></th><th>Herkunft</th><th></th></tr>${zeilen}</table></div>`
      : '<p class="hinweis">Noch keine Bauteile.</p>'}
  </div>`;
}
function ucText(b) { const u = num(b.U) + num(b.dUWB); return ok(u) ? W(u, 3) : '<span class="status no">fehlt</span>'; }

// ── 3 Normwerte ───────────────────────────────────────────────────────────
function rNormwerte() {
  const N = S.normwerte;
  const kopf = (extra = '') => `<tr>${extra}<th>Größe</th><th>Zeichen</th><th>Wert</th><th>Einheit</th><th>Quelle (Norm, Tabelle, Seite)</th><th>geprüft</th><th>Status</th></tr>`;
  const weg = (art, id) => `<button class="btn-icon no-print" data-a="nw-weg" data-art="${art}" data-id="${id}" title="Zeile löschen">×</button>`;
  const st = N.standorte.map(s => {
    const b = `normwerte.standorte.#${s.id}`, pf = `nw.st.${s.id}`;
    return `<tr class="gruppe"><td colspan="8"><div style="display:flex;gap:8px;align-items:center">Standort ${inp(b + '.name', '', 'n', 'placeholder="Ort / PLZ"')}${weg('standorte', s.id)}</div></td></tr>
      ${nwZeile('Norm-Außentemperatur', 'θ<sub>e</sub>', '°C', b + '.te', pf + '.te', '<td></td>')}
      ${nwZeile('Jahresmittel der Außentemperatur', 'θ<sub>m,e</sub>', '°C', b + '.tme', pf + '.tme', '<td></td>')}`;
  }).join('');
  const ra = N.raumarten.map(r => {
    const b = `normwerte.raumarten.#${r.id}`, pf = `nw.ra.${r.id}`;
    return `<tr class="gruppe"><td colspan="8"><div style="display:flex;gap:8px;align-items:center">Raumart ${inp(b + '.name', '', 'n', 'placeholder="z. B. Gruppenraum"')}${weg('raumarten', r.id)}</div></td></tr>
      ${nwZeile('Norm-Innentemperatur', 'θ<sub>int</sub>', '°C', b + '.tint', pf + '.tint', '<td></td>')}
      ${nwZeile('Mindestluftwechsel (nur Variante Norm)', 'n<sub>min</sub>', '1/h', b + '.nmin', pf + '.nmin', '<td></td>')}`;
  }).join('');
  const liste = (art, sym, titel, pfk) => N[art].map(x => {
    const b = `normwerte.${art}.#${x.id}`;
    return nwZeile(`${titel} ${inp(b + '.klasse', '', 'n', 'placeholder="Klasse / Bedingung"')}`, sym, '–', b + '.w', `nw.${pfk}.${x.id}.w`, `<td>${weg(art, x.id)}</td>`);
  }).join('');
  return `<div class="karte"><h2>Normwert-Tabellen</h2>
    <p class="hinweis">Die App enthält keine Normwerte. Trage jeden Wert selbst aus der Norm ein, mit Quelle (Norm, Tabelle, Seite), und setze den Haken „geprüft“. Nur geprüfte Werte gehen in die Rechnung ein.</p></div>
  <div class="karte"><h3>Standort: θ<sub>e</sub> und θ<sub>m,e</sub></h3><div class="tabwrap"><table class="tab">${kopf('<th></th>')}${st}</table></div>
    <button class="btn btn-klein" style="margin-top:8px" data-a="nw-neu" data-art="standorte">+ Standort</button></div>
  <div class="karte"><h3>Raumarten: θ<sub>int</sub> und Mindestluftwechsel</h3><div class="tabwrap"><table class="tab">${kopf('<th></th>')}${ra}</table></div>
    <button class="btn btn-klein" style="margin-top:8px" data-a="nw-neu" data-art="raumarten">+ Raumart</button></div>
  <div class="karte"><h3>Erdreich und Luft</h3><div class="tabwrap"><table class="tab">${kopf()}
    ${nwZeile('Korrekturfaktor jährliche Temperaturschwankung', 'f<sub>g1</sub>', '–', 'normwerte.fg1', 'nw.fg1')}
    ${nwZeile('Korrekturfaktor Grundwasser', 'G<sub>w</sub>', '–', 'normwerte.Gw', 'nw.Gw')}
    ${nwZeile('Wärmekapazität der Luft', 'ρ·c<sub>p</sub>', 'Wh/(m³·K)', 'normwerte.rhocp', 'nw.rhocp')}</table></div></div>
  <div class="karte"><h3>Abschirmungskoeffizient e</h3><div class="tabwrap"><table class="tab">${kopf('<th></th>')}${liste('e', 'e', 'e', 'e')}</table></div>
    <button class="btn btn-klein" style="margin-top:8px" data-a="nw-neu" data-art="e">+ Zeile e</button></div>
  <div class="karte"><h3>Höhenkorrekturfaktor ε</h3><div class="tabwrap"><table class="tab">${kopf('<th></th>')}${liste('eps', 'ε', 'ε', 'eps')}</table></div>
    <button class="btn btn-klein" style="margin-top:8px" data-a="nw-neu" data-art="eps">+ Zeile ε</button></div>`;
}

// ── 4 Raum eingeben ───────────────────────────────────────────────────────
function rRaum() {
  const r = S.entwurf, N = S.normwerte, e = 'entwurf';
  const raOpts = [['', '— Raumart wählen —']].concat(N.raumarten.map(x => [x.id, `${x.name || '(ohne Namen)'} – θ_int ${nwText(x.tint, 1, '°C')}`]));
  const btOpts = [['', '— Bauteil —']].concat(S.bauteile.map(b => [b.id, `${b.name || '(ohne Namen)'} (U_c ${ok(num(b.U) + num(b.dUWB)) ? W(num(b.U) + num(b.dUWB), 3) : '?'})`]));
  const anOpts = [['', '—']].concat(Object.entries(ANGRENZUNG));
  const eOpts = [['', '— wählen —']].concat(N.e.map(x => [x.id, `${x.klasse || '(ohne Klasse)'}: ${nwText(x.w, 3, '')}`]));
  const epsOpts = [['', '— wählen —']].concat(N.eps.map(x => [x.id, `${x.klasse || '(ohne Klasse)'}: ${nwText(x.w, 2, '')}`]));
  const norm = S.optionen.erdreich === 'norm';
  const fl = r.flaechen.map((f, i) => {
    const b = `${e}.flaechen.#${f.id}`, pf = `raum.fl.${f.id}`;
    const tx = f.an === 'unbeheizt' || f.an === 'beheizt';
    return `<tr><td>${i + 1}</td>
      <td>${sel(b + '.bauteilId', pf + '.bauteilId', btOpts, false)}</td>
      <td>${sel(b + '.ausrichtung', '', AUSRICHTUNG.map(a => [a, a || '–']), false)}</td>
      <td>${inp(b + '.Ab', pf + '.Ab')}</td><td>${inp(b + '.Az', pf + '.Az')}</td>
      <td class="zahl" data-o="an:${f.id}">–</td>
      <td>${sel(b + '.an', pf + '.an', anOpts)}</td>
      <td>${tx ? inp(b + '.thetaX', pf + '.thetaX', 'z', `placeholder="${f.an === 'unbeheizt' ? 'θ_u' : 'θ_j'}"`) : ''}${f.an === 'erdreich' && norm ? `${inp(b + '.Uequiv', pf + '.Uequiv', 'z', 'placeholder="U_equiv"')} ${inp(b + '.UequivQuelle', pf + '.UequivQuelle', 'q', 'placeholder="Quelle U_equiv"')}` : ''}</td>
      <td class="zahl" data-o="phi:${f.id}">–</td>
      <td><button class="btn-icon" data-a="fl-weg" data-id="${f.id}" title="Fläche entfernen">×</button></td></tr>`;
  }).join('');
  const lu = `${e}.lueftung`;
  return `<div class="karte"><h2>${S.entwurfVon ? 'Raum bearbeiten' : 'Neuen Raum eingeben'}</h2>
    <div class="reihe vier">${feld('Nr.', e + '.nr', 'raum.nr', '', 't')}${feld('Raumname', e + '.name', 'raum.name', '', 't')}${feld('Geschoss', e + '.geschoss', '', '', 't')}
      <label class="feld">Raumart → θ<sub>int</sub>${sel(e + '.raumartId', 'raum.raumartId', raOpts)}</label></div>
    <div class="radio"><label><input type="radio" name="amodus" data-b="${e}.amodus" data-r="1" value="LB" ${r.amodus !== 'A' ? 'checked' : ''}> Fläche aus Länge × Breite</label>
      <label><input type="radio" name="amodus" data-b="${e}.amodus" data-r="1" value="A" ${r.amodus === 'A' ? 'checked' : ''}> Fläche A direkt</label></div>
    <div class="reihe vier">
      ${r.amodus === 'A' ? feld('Fläche A', e + '.A', 'raum.A', 'm²', 'z') : feld('Länge L', e + '.L', 'raum.L', 'm', 'z') + feld('Breite B', e + '.B', 'raum.B', 'm', 'z')}
      ${feld('lichte Höhe h<sub>i</sub>', e + '.hi', 'raum.hi', 'm', 'z')}
      <div><span class="hinweis klein">A in m² · V<sub>i</sub> = A · h<sub>i</sub> in m³</span><span class="ausgabe" data-o="AV">–</span></div>
    </div>
  </div>
  <div class="karte"><h2>Hüllflächen</h2>
    <div class="tabwrap"><table class="tab"><tr><th>#</th><th>Bauteil</th><th>Ausrichtung</th><th class="zahl">A brutto<br>m²</th><th class="zahl">Abzug Öffn.<br>m²</th><th class="zahl">A netto<br>m²</th><th>angrenzend an</th><th>θ<sub>u</sub> / θ<sub>j</sub> in °C${norm ? ' · U<sub>equiv</sub>' : ''}</th><th class="zahl">Φ<sub>T</sub><br>W</th><th></th></tr>
    ${fl || '<tr><td colspan="10" class="hinweis" data-pf="raum.flaechen">Noch keine Fläche.</td></tr>'}</table></div>
    <button class="btn btn-klein" style="margin-top:8px" data-a="fl-neu">+ Hüllfläche</button>
    ${S.bauteile.length ? '' : '<p class="hinweis klein">Zuerst Bauteile im Tab „2 Bauteile“ anlegen.</p>'}
  </div>
  <div class="karte"><h2>Lüftung</h2>
    <div class="reihe drei">${feld('Zuluftvolumenstrom V̇<sub>su</sub>', lu + '.Vsu', 'raum.lu.Vsu', 'm³/h', 'z')}
      <div><span class="hinweis klein">Zulufttemperatur über</span><div class="radio">
        <label><input type="radio" name="sumodus" data-b="${lu}.suModus" data-r="1" value="eta" ${r.lueftung.suModus !== 'theta' ? 'checked' : ''}> η<sub>WRG</sub></label>
        <label><input type="radio" name="sumodus" data-b="${lu}.suModus" data-r="1" value="theta" ${r.lueftung.suModus === 'theta' ? 'checked' : ''}> θ<sub>su</sub> direkt</label></div></div>
      ${r.lueftung.suModus === 'theta' ? feld('Zulufttemperatur θ<sub>su</sub>', lu + '.thetaSu', 'raum.lu.thetaSu', '°C', 'z') : feld('Rückwärmzahl η<sub>WRG</sub>', lu + '.eta', 'raum.lu.eta', '–', 'z')}
    </div>
    <div class="reihe drei">${feld('Abluftvolumenstrom V̇<sub>ex</sub> (Info)', lu + '.Vex', '', 'm³/h', 'z')}${feld('Luftwechsel bei 50 Pa n<sub>50</sub>', lu + '.n50', 'raum.lu.n50', '1/h', 'z')}
      <div><span class="hinweis klein">θ<sub>su</sub> in °C · V̇<sub>inf</sub> in m³/h</span><span class="ausgabe" data-o="lu">–</span></div></div>
    <div class="reihe"><label class="feld">Abschirmungskoeffizient e ${sel(lu + '.eId', 'raum.lu.eId', eOpts)}</label><label class="feld">Höhenkorrekturfaktor ε ${sel(lu + '.epsId', 'raum.lu.epsId', epsOpts)}</label></div>
  </div>
  <div class="karte"><h2>Aufheizzuschlag</h2>
    <div class="reihe">${feld('Φ<sub>RH</sub> (nur wenn gewünscht, sonst leer)', e + '.phiRH', 'raum.phiRH', 'W', 'z')}<p class="hinweis klein">Ohne Eingabe wird kein Aufheizzuschlag angesetzt.</p></div>
  </div>
  <div class="karte"><h2>Ergebnis des Raums</h2><div data-o="raumerg"></div>
    <div class="knoepfe" style="margin-top:10px"><button class="btn btn-primaer" data-a="raum-ok">Raum übernehmen</button>
    <button class="btn" data-a="raum-leeren">${S.entwurfVon ? 'Bearbeitung abbrechen' : 'Formular leeren'}</button></div>
  </div>`;
}
function raumErgebnisHtml(R) {
  const hw = R.hinweise.map(h => `<div class="hinweisbox">${idx(esc(h))}</div>`).join('');
  if (!R.vollstaendig) return fehlHtml(R) + hw;
  return `<div class="ergebnis"><div>Φ<sub>T</sub><b>${W(R.phiT)} W</b></div><div>Φ<sub>V</sub><b>${W(R.phiV)} W</b></div><div>Φ<sub>RH</sub><b>${R.rhGesetzt ? W(R.phiRH) + ' W' : '–'}</b></div>
    <div class="haupt">Φ<sub>HL</sub><b>${W(R.phiHL)} W</b></div><div>φ<b>${W(R.phiSpez, 1)} W/m²</b></div></div>${hw}`;
}
function fehlHtml(R) {
  return `<div class="fehlliste"><h3>Raum unvollständig – kein Ergebnis</h3><ul>${R.fehlt.map(x => `<li>${idx(esc(x.text))}</li>`).join('')}</ul></div>`;
}

// ── 5 Raumtabelle ─────────────────────────────────────────────────────────
function rTabelle() {
  if (!S.raeume.length) return '<div class="karte"><h2>Raumtabelle</h2><p class="hinweis">Noch keine Räume. Im Tab „4 Raum eingeben“ einen Raum anlegen und „Raum übernehmen“ drücken.</p></div>';
  const z = G.raeume.map((R, i) => {
    const r = S.raeume[i], o = offen.has(r.id), v = R.vollstaendig;
    return `<tr class="${v ? '' : 'unvoll'}"><td><button class="btn-icon" style="color:var(--text)" data-a="auf" data-id="${r.id}" aria-expanded="${o}" title="Rechenweg">${o ? '▾' : '▸'}</button></td>
      <td>${esc(r.nr)}</td><td>${esc(r.name)}</td><td class="zahl">${W(R.w.A, 2)}</td><td class="zahl">${W(R.w.V, 1)}</td><td class="zahl">${W(R.w.tint, 1)}</td>
      <td class="zahl">${W(R.phiT)}</td><td class="zahl">${W(R.phiV)}</td><td class="zahl">${v ? (R.rhGesetzt ? W(R.phiRH) : '–') : '–'}</td><td class="zahl"><b>${W(R.phiHL)}</b></td><td class="zahl">${W(R.phiSpez, 1)}</td>
      <td>${v ? '<span class="status ok">vollständig</span>' : '<span class="status no">unvollständig</span>'}</td>
      <td class="no-print" style="white-space:nowrap"><button class="btn btn-klein" data-a="raum-edit" data-id="${r.id}">Bearbeiten</button>
        <button class="btn btn-klein" data-a="raum-dup" data-id="${r.id}">Duplizieren</button><button class="btn-icon" data-a="raum-weg" data-id="${r.id}" title="Löschen">×</button></td></tr>
      ${o ? `<tr><td></td><td colspan="12">${v ? rwTabelle(R, false) : ''}${raumErgebnisHtml(R)}</td></tr>` : ''}`;
  }).join('');
  const s = G.summe;
  return `<div class="karte"><h2>Raumtabelle</h2><div class="tabwrap"><table class="tab">
    <tr><th></th><th>Nr.</th><th>Raum</th><th class="zahl">A<br>m²</th><th class="zahl">V<br>m³</th><th class="zahl">θ<sub>int</sub><br>°C</th><th class="zahl">Φ<sub>T</sub><br>W</th><th class="zahl">Φ<sub>V</sub><br>W</th><th class="zahl">Φ<sub>RH</sub><br>W</th><th class="zahl">Φ<sub>HL</sub><br>W</th><th class="zahl">φ<br>W/m²</th><th>Status</th><th></th></tr>
    ${z}
    <tr class="summe"><td></td><td></td><td>Summe</td><td class="zahl">${s ? W(s.A, 2) : '–'}</td><td class="zahl">${s ? W(s.V, 1) : '–'}</td><td></td><td class="zahl">${s ? W(s.phiT) : '–'}</td><td class="zahl">${s ? W(s.phiV) : '–'}</td><td class="zahl">${s ? W(s.phiRH) : '–'}</td><td class="zahl">${s ? W(s.phiHL) : '–'}</td><td class="zahl">${s ? W(s.phiSpez, 1) : '–'}</td><td colspan="2">${s ? '' : '<span class="status no">Räume unvollständig</span>'}</td></tr>
    </table></div>
    <div class="ergebnis"><div class="haupt">Gebäudeheizlast Σ Φ<sub>HL</sub><b>${s ? W(s.phiHL / 1000, 2) + ' kW' : '–'}</b></div><div>Nachweis Wärmeerzeuger<b style="font-size:.9rem">${esc(nachweisText())}</b></div></div>
    <p class="hinweis klein">Gebäudeheizlast als Summe der Raumheizlasten ohne Abminderungen.</p></div>`;
}
// Rechenweg-Tabelle wie Folienwerte F2_Rechenweg
function rwTabelle(R, papier) {
  const c = papier ? 'z' : 'zahl';
  const zr = (a, bz, ei, kw, fa, dt, phi, cls = '') => `<tr class="${cls}"><td>${a}</td><td class="${c}">${bz}</td><td>${ei}</td><td class="${c}">${kw}</td><td class="${c}">${fa}</td><td class="${c}">${dt}</td><td class="${c}">${phi}</td></tr>`;
  let h = '';
  R.zeilen.forEach(z => { h += zr(`${esc(z.label)} <small>(${esc(ANGRENZUNG[z.an])}${z.ukName === 'U_equiv' ? ', U_equiv' : ''})</small>`, W(z.bezug, 2), 'm²', W(z.Uk, 3), W(z.f, 3), W(z.dth, 1), `<span class="${z.gewinn ? 'gewinn' : ''}">${W(z.phi)}</span>`); });
  h += zr('<b>Σ Transmission Φ<sub>T</sub></b>', '', '', '', '', '', `<b>${W(R.phiT)}</b>`, papier ? 'zw' : 'summe');
  if (R.w.Vsu > 0) h += zr('Lüftung Zuluft' + (R.w.suModus === 'eta' ? ' mit WRG' : ''), W(R.w.Vsu, 0), 'm³/h', W(R.w.rhocp, 2), W(R.w.fsu, 3), W(R.w.dth, 1), W(R.PhiVsu));
  h += zr(S.optionen.vmin === 'norm' ? 'Außenluft max(V̇<sub>inf</sub>; V̇<sub>min</sub> − V̇<sub>su</sub>)' : 'Infiltration', W(R.w.Vaussen, 1), 'm³/h', W(R.w.rhocp, 2), '1', W(R.w.dth, 1), W(R.PhiVinf));
  h += zr('<b>Σ Lüftung Φ<sub>V</sub></b>', '', '', '', '', '', `<b>${W(R.phiV)}</b>`, papier ? 'zw' : 'summe');
  if (R.rhGesetzt) h += zr('Aufheizzuschlag Φ<sub>RH</sub>', '', '', '', '', '', W(R.phiRH));
  h += zr('<b>Norm-Heizlast Φ<sub>HL</sub></b>', '', '', '', '', '', `<b>${W(R.phiHL)}</b>`, papier ? 'ges' : 'summe');
  return `<div class="tabwrap"><table class="tab"><thead><tr><th>Anteil</th><th class="${c}">Bezugsgröße</th><th>Einheit</th><th class="${c}">Kennwert</th><th class="${c}">Faktor</th><th class="${c}">Δθ in K</th><th class="${c}">Φ in W</th></tr></thead><tbody>${h}</tbody></table></div>
    <p class="hinweis klein" style="margin:2px 0 6px">Kennwert: U<sub>c</sub> in W/(m²·K) bzw. ρ·c<sub>p</sub> in Wh/(m³·K). Φ = Bezugsgröße · Kennwert · Faktor · Δθ.</p>`;
}
// Formel → Werte → Ergebnis
function fwZeilen(R) {
  const w = R.w, Z = [];
  const z = (formel, werte, erg) => Z.push([formel, werte, erg]);
  const gr = t => Z.push([t]);
  gr('Grundwerte');
  z('Δθ = θ_int − θ_e', `= ${fmtV(w.tint, 1)} − ${fmtV(w.te, 1)}`, `= ${W(w.dth, 1)} K`);
  if (ok(w.L)) z('A = L · B', `= ${W(w.L, 3)} · ${W(w.B, 3)}`, `= ${W(w.A, 2)} m²`);
  z('V_i = A · h_i', `= ${W(w.A, 2)} · ${W(w.hi, 2)}`, `= ${W(w.V, 2)} m³`);
  gr('Transmission');
  R.zeilen.forEach((t, i) => {
    const k = i + 1;
    if (t.ukName === 'U_c') z(`U_c,${k} = U + ΔU_WB`, `= ${W(t.U, 3)} + ${W(t.dU, 3)}`, `= ${W(t.Uk, 3)} W/(m²·K)`);
    if (t.Az > 0) z(`A_${k} = A_brutto − A_Öffn.`, `= ${W(t.Ab, 2)} − ${W(t.Az, 2)}`, `= ${W(t.bezug, 2)} m²`);
    if (t.fWerte) z(`f_${k} (${ANGRENZUNG[t.an]}): ${t.fText}`, t.fWerte, `= ${W(t.f, 3)}`);
    z(`Φ_T,${k} = A · ${t.ukName} · f · Δθ  (${t.label})`, `= ${W(t.bezug, 2)} · ${W(t.Uk, 3)} · ${W(t.f, 3)} · ${W(t.dth, 1)}`, `= ${W(t.phi, 1)} W`);
  });
  z('Φ_T = Σ Φ_T,k', '= ' + R.zeilen.map(t => fmtV(t.phi, 1)).join(' + '), `= ${W(R.phiT, 1)} W`);
  gr('Lüftung');
  if (w.Vsu > 0 && w.suModus === 'eta') z('θ_su = θ_e + η_WRG · (θ_int − θ_e)', `= ${fmtV(w.te, 1)} + ${W(w.eta, 2)} · ${W(w.dth, 1)}`, `= ${W(w.tsu, 2)} °C`);
  z('V̇_inf = 2 · V_i · n_50 · e · ε', `= 2 · ${W(w.V, 2)} · ${W(w.n50, 2)} · ${W(w.e, 3)} · ${W(w.eps, 2)}`, `= ${W(w.Vinf, 2)} m³/h`);
  if (S.optionen.vmin === 'norm') { z('V̇_min = n_min · V_i', `= ${W(w.nmin, 2)} · ${W(w.V, 2)}`, `= ${W(w.Vmin, 2)} m³/h`); z('V̇_außen = max(V̇_inf ; V̇_min − V̇_su)', `= max(${W(w.Vinf, 2)} ; ${W(w.Vmin, 2)} − ${W(w.Vsu, 0)})`, `= ${W(w.Vaussen, 2)} m³/h`); }
  const vn = S.optionen.vmin === 'norm' ? 'V̇_außen' : 'V̇_inf';
  z(`Φ_V = ρ·c_p · [${vn} · Δθ + V̇_su · (θ_int − θ_su)]`, w.Vsu > 0 ? `= ${W(w.rhocp, 2)} · [${W(w.Vaussen, 2)} · ${W(w.dth, 1)} + ${W(w.Vsu, 0)} · (${fmtV(w.tint, 1)} − ${fmtV(w.tsu, 2)})]` : `= ${W(w.rhocp, 2)} · [${W(w.Vaussen, 2)} · ${W(w.dth, 1)} + 0]`, `= ${W(R.phiV, 1)} W`);
  gr('Ergebnis');
  z('Φ_HL = Σ Φ_T + Φ_V + Φ_RH', `= ${W(R.phiT, 1)} + ${W(R.phiV, 1)} + ${R.rhGesetzt ? W(R.phiRH, 1) : '0'}`, `= ${W(R.phiHL, 1)} W = ${W(R.phiHL / 1000, 2)} kW`);
  z('φ = Φ_HL / A', `= ${W(R.phiHL, 1)} / ${W(w.A, 2)}`, `= ${W(R.phiSpez, 1)} W/m²`);
  return Z;
}

// ── 6 Vorzeigeseite ───────────────────────────────────────────────────────
function rVorzeige() {
  const opts = [['', '— Raum für den Rechenweg —']].concat(S.raeume.map(r => [r.id, `${r.nr} ${r.name}`]));
  if (!S.vorzeigeRaum && S.raeume[0]) S.vorzeigeRaum = S.raeume[0].id;
  return `<div class="karte vorzeige-steuerung no-print"><div class="reihe">
      <label class="feld">Rechenweg zeigen für ${sel('vorzeigeRaum', '', opts)}</label>
      <div class="knoepfe" style="align-items:end;margin-bottom:12px"><button class="btn btn-primaer" data-a="drucken">Drucken / als PDF speichern</button><button class="btn" data-a="png">Als PNG speichern</button></div></div>
    <p class="hinweis klein">Druck: A4 hoch, Ränder „Standard“, Kopf- und Fußzeilen des Browsers ausschalten (Seitenzahlen setzt die Seite selbst).</p></div>
  <div class="blattwrap"><article class="blatt" id="blatt">${blattHtml()}</article></div>`;
}
function blattHtml() {
  const P = S.projekt, st = S.normwerte.standorte.find(s => s.id === P.standortId);
  const sum = G.summe, N = S.normwerte;
  const RV = G.raeume.find(r => r.id === S.vorzeigeRaum);
  const rv = S.raeume.find(r => r.id === S.vorzeigeRaum);
  const stTxt = n => { const [c, t] = nwStatus(n); return `<span class="${c}">${t}</span>`; };
  const v = (x, d) => (ok(x) ? W(x, d) : '–');
  // verwendete Normwerte
  const genutzt = { ra: new Set(), e: new Set(), eps: new Set() };
  S.raeume.forEach(r => { genutzt.ra.add(r.raumartId); genutzt.e.add(r.lueftung.eId); genutzt.eps.add(r.lueftung.epsId); });
  const erd = S.raeume.some(r => r.flaechen.some(f => f.an === 'erdreich'));
  const rb = [];
  if (st) { rb.push(['Norm-Außentemperatur θ_e', st.te, 1, '°C', st.name]); if (erd) rb.push(['Jahresmittel Außentemperatur θ_m,e', st.tme, 1, '°C', st.name]); }
  N.raumarten.filter(r => genutzt.ra.has(r.id)).forEach(r => { rb.push([`Norm-Innentemperatur θ_int (${r.name})`, r.tint, 1, '°C']); if (S.optionen.vmin === 'norm') rb.push([`Mindestluftwechsel n_min (${r.name})`, r.nmin, 2, '1/h']); });
  if (erd) { rb.push(['Korrekturfaktor f_g1', N.fg1, 2, '–']); rb.push(['Korrekturfaktor Grundwasser G_w', N.Gw, 2, '–']); }
  rb.push(['Wärmekapazität Luft ρ·c_p', N.rhocp, 2, 'Wh/(m³·K)']);
  N.e.filter(x => genutzt.e.has(x.id)).forEach(x => rb.push([`Abschirmungskoeffizient e (${x.klasse})`, x.w, 3, '–']));
  N.eps.filter(x => genutzt.eps.has(x.id)).forEach(x => rb.push([`Höhenkorrekturfaktor ε (${x.klasse})`, x.w, 2, '–']));
  const rbHtml = rb.map(([t, n, d, e]) => `<tr><td>${idx(esc(t))}</td><td class="z">${ok(num(n.wert)) ? W(num(n.wert), d) : '–'}</td><td>${e}</td><td>${esc(n.quelle) || '–'}</td><td>${stTxt(n)}</td></tr>`).join('');
  const varTxt = ['infiltration', 'erdreich', 'vmin'].map(k => `<li>${VARIANTEN[k].titel}: ${idx(esc(S.optionen[k] === 'norm' ? VARIANTEN[k].norm : VARIANTEN[k].excel))}</li>`).join('');
  const raeumeHtml = G.raeume.map((R, i) => { const r = S.raeume[i]; return `<tr><td>${esc(r.nr)}</td><td>${esc(r.name)}</td><td class="z">${v(R.w.A, 2)}</td><td class="z">${v(R.w.V, 1)}</td><td class="z">${v(R.w.tint, 1)}</td><td class="z">${v(R.phiT, 0)}</td><td class="z">${v(R.phiV, 0)}</td><td class="z">${R.vollstaendig && R.rhGesetzt ? v(R.phiRH, 0) : '–'}</td><td class="z"><b>${v(R.phiHL, 0)}</b></td><td class="z">${v(R.phiSpez, 1)}</td><td>${R.vollstaendig ? '<span class="ok">vollst.</span>' : '<span class="no">unvollst.</span>'}</td></tr>`; }).join('');
  const btHtml = S.bauteile.map(b => { const u = num(b.U), d = num(b.dUWB); return `<tr><td>${esc(b.name)}</td><td>${esc(b.art)}</td><td class="z">${v(u, 3)}</td><td class="z">${v(d, 3)}</td><td class="z"><b>${v(u + d, 3)}</b></td><td>${esc(b.quelle)}${b.dUWBQuelle ? '; ΔU_WB: ' + esc(b.dUWBQuelle) : ''}</td></tr>`; }).join('');
  let rw = '<p>Kein Raum gewählt.</p>';
  if (RV && rv) {
    rw = RV.vollstaendig
      ? `<div class="block"><h2><span class="nr">4</span>Rechenweg (Formel → Werte → Ergebnis)</h2><p><b>Raum ${esc(rv.nr)} – ${esc(rv.name)}</b>${rv.geschoss ? ', ' + esc(rv.geschoss) : ''}; Raumart ${esc(RV.w.raumart)}</p>
         ${rwTabelle(RV, true).replace(/class="tab"/, '')}</div>
         <table class="fw">${fwZeilen(RV).map(z => z.length === 1 ? `<tr class="gr"><td colspan="3">${esc(z[0])}</td></tr>` : `<tr><td>${idx(esc(z[0]))}</td><td>${idx(esc(z[1]))}</td><td class="erg">${idx(esc(z[2]))}</td></tr>`).join('')}</table>`
      : `<div class="warn"><b>Raum ${esc(rv.nr)} ist unvollständig – kein Rechenweg.</b><ul>${RV.fehlt.map(x => `<li>${idx(esc(x.text))}</li>`).join('')}</ul></div>`;
  }
  const nw = G.nachweis;
  const quellen = [];
  NORMSTAND.forEach(n => quellen.push(`<li>${esc(n.norm)} – <span class="${n.status === 'geprueft' ? 'ok' : 'pr'}">${n.status === 'geprueft' ? '✓ geprüft' : 'prüfen'}</span>: ${esc(n.text)}</li>`));
  const alleNW = [];
  N.standorte.forEach(s => { alleNW.push([`θ_e ${s.name}`, s.te, '°C']); alleNW.push([`θ_m,e ${s.name}`, s.tme, '°C']); });
  N.raumarten.forEach(r => { alleNW.push([`θ_int ${r.name}`, r.tint, '°C']); alleNW.push([`n_min ${r.name}`, r.nmin, '1/h']); });
  alleNW.push(['f_g1', N.fg1, '–'], ['G_w', N.Gw, '–'], ['ρ·c_p', N.rhocp, 'Wh/(m³·K)']);
  N.e.forEach(x => alleNW.push([`e ${x.klasse}`, x.w, '–'])); N.eps.forEach(x => alleNW.push([`ε ${x.klasse}`, x.w, '–']));
  const nwListe = alleNW.filter(([, n]) => ok(num(n.wert))).map(([t, n, e]) => `<tr><td>${idx(esc(t))}</td><td class="z">${esc(n.wert)}${e === '–' ? '' : ' ' + e}</td><td>${esc(n.quelle) || '–'}</td><td>${stTxt(n)}</td></tr>`).join('');
  const btQ = S.bauteile.map(b => `<li>${esc(b.name)}: ${esc(b.quelle) || '<span class="no">Quelle fehlt</span>'}</li>`).join('');
  const unvoll = G.raeume.filter(r => !r.vollstaendig).length;
  return `
  <div class="titelblock">
    <div class="kopf"><b>Norm-Heizlast – raumweise</b><span>nach DIN EN 12831-1:2017-09 mit DIN/TS 12831-1:2020-04</span></div>
    <div class="pos"><small>Position</small><b>${esc(P.position) || '–'}</b></div>
    <div class="felder">
      <div class="breit"><small>Projekt</small>${esc(P.projekt) || '–'}</div><div class="breit"><small>Bauvorhaben</small>${esc(P.bauvorhaben) || '–'}</div>
      <div class="breit"><small>Bearbeiter</small>${esc(P.bearbeiter) || '–'}</div><div><small>Datum</small>${esc(datumDE(P.datum)) || '–'}</div><div><small>Seite</small><span class="seitenzahl">siehe Kopfzeile</span></div>
    </div>
  </div>
  ${unvoll ? `<div class="warn">${unvoll} von ${G.raeume.length} Räumen unvollständig – ohne Ergebnis. Gebäudeheizlast und Nachweis entfallen, bis alle Angaben vorliegen.</div>` : ''}
  <h2><span class="nr">1</span>Kurzbeschreibung, Regelwerk, Randbedingungen</h2>
  <p>${idx(esc(P.beschreibung)) || '<i>Keine Kurzbeschreibung eingetragen.</i>'}</p>
  <p><b>Regelwerk:</b> DIN EN 12831-1:2017-09 (<span class="${NORMSTAND[0].status === 'geprueft' ? 'ok' : 'pr'}">${NORMSTAND[0].status === 'geprueft' ? '✓ geprüft' : 'prüfen'}</span>) mit DIN/TS 12831-1:2020-04 (<span class="${NORMSTAND[1].status === 'geprueft' ? 'ok' : 'pr'}">${NORMSTAND[1].status === 'geprueft' ? '✓ geprüft' : 'prüfen'}</span>), raumweises Verfahren. Standort: ${st ? esc(st.name) : '–'}.</p>
  <p><b>Rechenansatz:</b></p><ul>${varTxt}</ul>
  <div class="block"><table><thead><tr><th>Randbedingung</th><th class="z">Wert</th><th>Einheit</th><th>Quelle</th><th>Status</th></tr></thead><tbody>${rbHtml || '<tr><td colspan="5">–</td></tr>'}</tbody></table></div>
  <h2><span class="nr">2</span>Bauteilkatalog</h2>
  <table><thead><tr><th>Bauteil</th><th>Art</th><th class="z">U</th><th class="z">ΔU<sub>WB</sub></th><th class="z">U<sub>c</sub></th><th>Quelle</th></tr></thead><tbody>${btHtml || '<tr><td colspan="6">–</td></tr>'}</tbody></table>
  <p style="font-size:7.8pt;color:#5b6470">U, ΔU<sub>WB</sub>, U<sub>c</sub> in W/(m²·K); U<sub>c</sub> = U + ΔU<sub>WB</sub>.</p>
  <h2><span class="nr">3</span>Raumtabelle</h2>
  <table><thead><tr><th>Nr.</th><th>Raum</th><th class="z">A in m²</th><th class="z">V in m³</th><th class="z">θ<sub>int</sub> in °C</th><th class="z">Φ<sub>T</sub> in W</th><th class="z">Φ<sub>V</sub> in W</th><th class="z">Φ<sub>RH</sub> in W</th><th class="z">Φ<sub>HL</sub> in W</th><th class="z">φ in W/m²</th><th>Status</th></tr></thead>
  <tbody>${raeumeHtml || '<tr><td colspan="11">–</td></tr>'}
  <tr class="summe"><td></td><td>Summe</td><td class="z">${sum ? W(sum.A, 2) : '–'}</td><td class="z">${sum ? W(sum.V, 1) : '–'}</td><td></td><td class="z">${sum ? W(sum.phiT) : '–'}</td><td class="z">${sum ? W(sum.phiV) : '–'}</td><td class="z">${sum ? W(sum.phiRH) : '–'}</td><td class="z">${sum ? W(sum.phiHL) : '–'}</td><td class="z">${sum ? W(sum.phiSpez, 1) : '–'}</td><td></td></tr>
  <tr class="ges"><td></td><td colspan="7">Gebäudeheizlast Σ Φ<sub>HL</sub> (ohne Abminderungen)</td><td class="z" colspan="2">${sum ? W(sum.phiHL / 1000, 2) + ' kW' : '–'}</td><td></td></tr></tbody></table>
  ${RV && RV.vollstaendig ? '' : '<h2><span class="nr">4</span>Rechenweg (Formel → Werte → Ergebnis)</h2>'}
  ${rw}
  <h2><span class="nr">5</span>Nachweis</h2>
  <div class="block"><table><thead><tr><th>Nachweis</th><th class="z">E<sub>d</sub> in kW</th><th class="z">R<sub>d</sub> in kW</th><th class="z">η = E<sub>d</sub> / R<sub>d</sub></th><th>erfüllt (η ≤ 1,0)</th></tr></thead>
  <tbody><tr><td>Wärmeerzeuger bei θ<sub>e</sub>: Σ Φ<sub>HL</sub> ≤ Φ<sub>WE</sub></td><td class="z">${sum ? W(sum.phiHL / 1000, 2) : '–'}</td><td class="z">${ok(num(P.phiWE)) ? W(num(P.phiWE), 2) : '–'}</td><td class="z">${nw ? W(nw.eta, 3) : '–'}</td><td>${nw ? (nw.erfuellt ? '<span class="ok">ja</span>' : '<span class="no">nein</span>') : '–'}</td></tr></tbody></table></div>
  <h2><span class="nr">6</span>Quellen und geprüfte Normwerte</h2>
  <ul>${quellen.join('')}</ul>
  <div class="block"><table><thead><tr><th>Normwert</th><th class="z">Wert</th><th>Quelle</th><th>Status</th></tr></thead><tbody>${nwListe || '<tr><td colspan="4">Keine Normwerte eingetragen.</td></tr>'}</tbody></table></div>
  <p><b>Bauteile:</b></p><ul>${btQ || '<li>–</li>'}</ul>
  <p>Excel-Vorlage: TGA_Kita_Wesel_Berechnung, Blatt „Heizlast“ und „Folienwerte“ (F2_Rechenweg) – Rechenweg und Tabellenaufbau.</p>
  <div class="fuss"><span>Lern- und Vorplanungswerkzeug auf Technikerniveau – ersetzt keine TGA-Fachplanung. Nicht enthalten: Rohrnetz, Heizflächenauslegung, Kühllast.</span><span>${esc(P.bearbeiter)}</span></div>`;
}
function druckstil() {
  const P = S.projekt, q = s => String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
  const kopf = `${P.projekt || 'Norm-Heizlast'}${P.position ? ' · Pos. ' + P.position : ''}`;
  const font = 'font: 7.5pt Arial, sans-serif; color: #5b6470;';
  $('druckstil').textContent = `@page { size: A4 portrait; margin: 17mm 14mm 15mm 16mm;
    @top-left { content: "${q(kopf)}"; ${font} }
    @top-right { content: "Seite " counter(page) " von " counter(pages); ${font} }
    @bottom-left { content: "Heizlast nach DIN EN 12831-1 · ersetzt keine TGA-Fachplanung"; ${font} }
    @bottom-right { content: "${q(P.bearbeiter)}${P.datum ? ' · ' + q(datumDE(P.datum)) : ''}"; ${font} } }`;
}

// ── Live-Aktualisierung ohne Neuaufbau ────────────────────────────────────
function markiere() {
  const glob = new Set(), raum = new Set();
  G.raeume.forEach(R => R.fehlt.forEach(x => { if (!x.pfad.startsWith('raum.')) glob.add(x.pfad); }));
  const benutzt = entwurfBenutzt();
  // leeres Formular nicht rot färben – erst ab der ersten Eingabe
  if (benutzt) RE.fehlt.forEach(x => (x.pfad.startsWith('raum.') ? raum : glob).add(x.pfad));
  if (G.fehltWE && S.raeume.length) glob.add('projekt.phiWE');
  document.querySelectorAll('[data-pf]').forEach(el => {
    const pf = el.dataset.pf;
    el.classList.toggle('fehlt', (pf.startsWith('raum.') ? raum : glob).has(pf));
  });
  if (tab === 'raum') aktualisiereRaum();
}
function aktualisiereRaum() {
  const R = RE, w = R.w, o = k => document.querySelector(`[data-o="${k}"]`);
  const set = (k, h) => { const el = o(k); if (el) el.innerHTML = h; };
  set('AV', `A = ${W(w.A, 2)} · V<sub>i</sub> = ${W(w.V, 2)}`);
  R.zeilen.forEach(z => { set('an:' + z.flId, W(z.bezug, 2)); set('phi:' + z.flId, `<span class="${z.gewinn ? 'gewinn' : ''}">${W(z.phi)}</span>`); });
  set('lu', `θ<sub>su</sub> = ${w.Vsu > 0 ? W(w.tsu, 2) : '–'} · V̇<sub>inf</sub> = ${W(w.Vinf, 2)}`);
  set('raumerg', raumErgebnisHtml(R));
}
function nachEingabe(el) {
  G = rechneGebaeude(S); RE = rechneRaum(S.entwurf, S);
  if (el && el.dataset.r) { render(); return; }
  markiere();
  if (tab === 'bauteile') S.bauteile.forEach(b => { const x = document.querySelector(`[data-o="uc:${b.id}"]`); if (x) x.innerHTML = ucText(b); });
  if (tab === 'normwerte' && el) { const b = el.dataset.b.replace(/\.(wert|quelle|geprueft)$/, ''); const x = document.querySelector(`[data-o="nws:${b}"]`); if (x) x.innerHTML = badge(hole(b)); }
  if (tab === 'projekt') { const x = document.querySelector('[data-o="nachweis"]'); if (x) x.textContent = nachweisText(); }
  $('z-bauteile').textContent = S.bauteile.length; $('z-raeume').textContent = S.raeume.length;
}

// ── Aktionen ──────────────────────────────────────────────────────────────
const tief = o => JSON.parse(JSON.stringify(o));
function entwurfBenutzt() {
  const r = S.entwurf, l = r.lueftung;
  return !!(r.nr || r.name || r.geschoss || r.raumartId || r.flaechen.length || r.hi || r.L || r.B || r.A || r.phiRH ||
    l.Vsu || l.thetaSu || l.eta || l.Vex || l.n50 || l.eId || l.epsId);
}
const AKTION = {
  'bt-neu'() { S.bauteile.push({ id: neueId('bt'), name: '', art: '', U: '', dUWB: '', quelle: '', dUWBQuelle: '', herkunft: 'manuell' }); },
  'bt-weg'(d) {
    const benutzt = S.raeume.concat([S.entwurf]).filter(r => r.flaechen.some(f => f.bauteilId === d.id));
    const b = S.bauteile.find(x => x.id === d.id);
    if (!confirm(`Bauteil „${b.name || '?'}“ löschen?${benutzt.length ? `\nEs wird in ${benutzt.length} Raum/Räumen verwendet – diese werden unvollständig.` : ''}`)) return false;
    S.bauteile = S.bauteile.filter(x => x.id !== d.id);
  },
  'nw-neu'(d) {
    const L = { standorte: () => ({ id: neueId('st'), name: '', te: leerNW2(), tme: leerNW2() }), raumarten: () => ({ id: neueId('ra'), name: '', tint: leerNW2(), nmin: leerNW2() }),
      e: () => ({ id: neueId('e'), klasse: '', w: leerNW2() }), eps: () => ({ id: neueId('ep'), klasse: '', w: leerNW2() }) };
    S.normwerte[d.art].push(L[d.art]());
  },
  'nw-weg'(d) { if (!confirm('Zeile löschen? Räume, die sie verwenden, werden unvollständig.')) return false; S.normwerte[d.art] = S.normwerte[d.art].filter(x => x.id !== d.id); },
  'fl-neu'() { S.entwurf.flaechen.push(leereFlaeche()); },
  'fl-weg'(d) { S.entwurf.flaechen = S.entwurf.flaechen.filter(f => f.id !== d.id); },
  'raum-ok'() {
    const r = tief(S.entwurf), i = S.raeume.findIndex(x => x.id === S.entwurfVon);
    if (i >= 0) S.raeume[i] = r; else { r.id = neueId('r'); S.raeume.push(r); }
    const R = rechneRaum(r, S);
    S.entwurf = leererRaum(); S.entwurfVon = '';
    toast(`Raum ${r.nr || ''} ${i >= 0 ? 'aktualisiert' : 'übernommen'}${R.vollstaendig ? '' : ' – unvollständig'}.`);
    speichern(); zeigeTab('tabelle'); return false;
  },
  'raum-leeren'() { if (entwurfBenutzt() && !confirm('Eingaben im Formular verwerfen?')) return false; S.entwurf = leererRaum(); S.entwurfVon = ''; },
  'raum-edit'(d) {
    if (entwurfBenutzt() && !confirm('Das Formular enthält Eingaben. Verwerfen und diesen Raum laden?')) return false;
    S.entwurf = tief(S.raeume.find(r => r.id === d.id)); S.entwurfVon = d.id; speichern(); zeigeTab('raum'); return false;
  },
  'raum-dup'(d) {
    const i = S.raeume.findIndex(r => r.id === d.id), r = tief(S.raeume[i]);
    r.id = neueId('r'); r.nr = (r.nr || '') + ' (Kopie)'; r.flaechen.forEach(f => { f.id = neueId('f'); });
    S.raeume.splice(i + 1, 0, r); toast('Raum dupliziert.');
  },
  'raum-weg'(d) { const r = S.raeume.find(x => x.id === d.id); if (!confirm(`Raum ${r.nr} „${r.name}“ löschen?`)) return false; S.raeume = S.raeume.filter(x => x.id !== d.id); if (S.entwurfVon === d.id) S.entwurfVon = ''; },
  'auf'(d) { offen.has(d.id) ? offen.delete(d.id) : offen.add(d.id); },
  'ws-import'() { wsDialog(); return false; },
  'json-import'() { $('datei').value = ''; $('datei').click(); return false; },
  'json-export'() { const n = (S.projekt.projekt || 'projekt').replace(/[^\wäöüÄÖÜß-]+/g, '_'); laden_(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }), `heizlast_${n}.json`); return false; },
  'xlsx'() { exportXlsx(); return false; },
  'neu'() { if (!confirm('Neues leeres Projekt anlegen? Das aktuelle Projekt wird im Browser überschrieben (vorher als JSON speichern).')) return false; S = ergaenze(leeresProjekt()); toast('Neues Projekt angelegt.'); },
  'drucken'() { druckstil(); window.print(); return false; },
  'png'() { png(); return false; }
};
const leerNW2 = () => ({ wert: '', quelle: '', geprueft: false });
function laden_(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

// Übernahme aus der Wärmeschutz-App
function uebernimmBauteile(liste) {
  let neu = 0, akt = 0;
  liste.forEach(x => {
    const b = bauteilAusWaermeschutz(x); if (!b) return;
    const alt = S.bauteile.find(y => y.herkunft === 'waermeschutz' && y.name === b.name);
    if (alt) { alt.U = b.U; alt.quelle = b.quelle; alt.art = b.art; alt.wsId = b.wsId; akt++; } else { S.bauteile.push(b); neu++; }
  });
  speichern(); render();
  toast(`${neu} Bauteil(e) übernommen${akt ? `, ${akt} aktualisiert` : ''}. ΔU_WB noch eintragen.`);
}
function wsDialog() {
  let liste = [];
  try { liste = JSON.parse(localStorage.getItem(FH21_BAUTEILE_KEY) || '[]'); } catch (e) { liste = []; }
  const d = $('dlg');
  d.innerHTML = `<h2>Aus Wärmeschutz-App übernehmen</h2>
    ${liste.length ? `<p class="hinweis">Gespeichert unter dem Schlüssel „${FH21_BAUTEILE_KEY}“:</p>
      <div style="max-height:50vh;overflow:auto">${liste.map((b, i) => `<label class="haken" style="display:flex"><input type="checkbox" value="${i}" checked> ${esc(b.name)} – U = ${esc(String(b.U).replace('.', ','))} W/(m²·K) <span class="hinweis klein">(${esc(b.art || '')})</span></label>`).join('')}</div>`
      : `<p>Keine Bauteile gefunden. Der gemeinsame Speicher funktioniert nur, wenn beide Apps unter derselben Adresse laufen (z. B. beide auf GitHub Pages).</p><p class="hinweis">Sonst in der Wärmeschutz-App „An Heizlast-App übergeben“ drücken und die heruntergeladene JSON-Datei hier importieren.</p>`}
    <div class="knoepfe" style="margin-top:12px">${liste.length ? '<button class="btn btn-primaer" id="dlg-ok">Übernehmen</button>' : ''}<button class="btn" id="dlg-datei">JSON-Datei wählen</button><button class="btn" id="dlg-zu">Schließen</button></div>`;
  d.showModal();
  $('dlg-zu').onclick = () => d.close();
  $('dlg-datei').onclick = () => { d.close(); AKTION['json-import'](); };
  if ($('dlg-ok')) $('dlg-ok').onclick = () => { const w = [...d.querySelectorAll('input:checked')].map(c => liste[+c.value]); d.close(); uebernimmBauteile(w); };
}
function dateiGelesen(text) {
  let o; try { o = JSON.parse(text); } catch (e) { toast('Datei ist kein gültiges JSON.'); return; }
  const bt = leseBauteilDatei(o);
  if (bt) { uebernimmBauteile(bt); return; }
  if (o && o.format === 'fh21.heizlast') {
    if (!confirm('Projekt laden? Das aktuelle Projekt wird ersetzt.')) return;
    S = ergaenze(o); speichern(); zeigeTab('projekt'); toast('Projekt geladen.'); return;
  }
  toast('Unbekanntes Format (erwartet: Heizlast-Projekt oder fh21.bauteile).');
}

// ── PNG ───────────────────────────────────────────────────────────────────
function png() {
  const b = $('blatt'); if (!b || typeof html2canvas !== 'function') { toast('PNG-Export nicht verfügbar.'); return; }
  b.classList.add('png-modus');
  html2canvas(b, { scale: 2, backgroundColor: '#ffffff', scrollX: -window.scrollX, scrollY: -window.scrollY }).then(c => {
    b.classList.remove('png-modus');
    c.toBlob(bl => laden_(bl, `heizlast_${(S.projekt.position || 'pos')}_${(S.projekt.projekt || 'projekt').replace(/[^\wäöüÄÖÜß-]+/g, '_')}.png`), 'image/png');
  }).catch(e => { b.classList.remove('png-modus'); toast('PNG-Export fehlgeschlagen: ' + e.message); });
}

// ── XLSX mit Formeln ──────────────────────────────────────────────────────
function exportXlsx() {
  if (typeof XLSX === 'undefined') { toast('xlsx-Export nicht verfügbar.'); return; }
  const wb = XLSX.utils.book_new();
  const N = S.normwerte, st = N.standorte.find(s => s.id === S.projekt.standortId);
  const zelle = (ws, ref, v) => {
    if (v === undefined || v === null || v === '') return;
    if (typeof v === 'object' && v.f) ws[ref] = { t: typeof v.v === 'string' ? 's' : 'n', f: v.f, v: ok(v.v) || typeof v.v === 'string' ? v.v : undefined };
    else if (typeof v === 'number') { if (ok(v)) ws[ref] = { t: 'n', v }; }
    else ws[ref] = { t: 's', v: String(v) };
  };
  const blatt = (rows, cols) => {
    const ws = {}; let maxC = 0;
    rows.forEach((r, i) => r.forEach((v, j) => { zelle(ws, XLSX.utils.encode_cell({ r: i, c: j }), v); maxC = Math.max(maxC, j); }));
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: maxC } });
    ws['!cols'] = cols.map(w => ({ wch: w }));
    return ws;
  };
  const n = v => { const x = num(v); return ok(x) ? x : ''; };
  const kopfz = ['Heizlast nach DIN EN 12831-1 / DIN/TS 12831-1 – ' + (S.projekt.projekt || ''), `Bearbeiter: ${S.projekt.bearbeiter} · Datum: ${datumDE(S.projekt.datum)} · Pos. ${S.projekt.position}`];
  // Normwerte
  const nr = [[kopfz[0]], [kopfz[1]], [], ['Größe', 'Zeichen', 'Wert', 'Einheit', 'Quelle', 'geprüft']];
  const NR = {};
  const nwz = (key, t, z, nwv, e) => { nr.push([t, z, n(nwv.wert), e, nwv.quelle, nwv.geprueft ? 'ja' : 'nein']); NR[key] = `Normwerte!$C$${nr.length}`; };
  if (st) { nwz('te', `Norm-Außentemperatur (${st.name})`, 'θ_e', st.te, '°C'); nwz('tme', `Jahresmittel Außentemperatur (${st.name})`, 'θ_m,e', st.tme, '°C'); }
  N.raumarten.forEach(r => { nwz('tint' + r.id, `Norm-Innentemperatur (${r.name})`, 'θ_int', r.tint, '°C'); nwz('nmin' + r.id, `Mindestluftwechsel (${r.name})`, 'n_min', r.nmin, '1/h'); });
  nwz('fg1', 'Korrekturfaktor jährl. Temperaturschwankung', 'f_g1', N.fg1, '–'); nwz('Gw', 'Korrekturfaktor Grundwasser', 'G_w', N.Gw, '–'); nwz('rhocp', 'Wärmekapazität Luft', 'ρ·c_p', N.rhocp, 'Wh/(m³·K)');
  N.e.forEach(x => nwz('e' + x.id, `Abschirmungskoeffizient (${x.klasse})`, 'e', x.w, '–')); N.eps.forEach(x => nwz('eps' + x.id, `Höhenkorrekturfaktor (${x.klasse})`, 'ε', x.w, '–'));
  // Bauteile
  const br = [[kopfz[0]], [kopfz[1]], [], ['Bauteil', 'Art', 'U in W/(m²·K)', 'ΔU_WB in W/(m²·K)', 'U_c in W/(m²·K)', 'Quelle']];
  const BR = {};
  S.bauteile.forEach(b => { const z = br.length + 1; br.push([b.name, b.art, n(b.U), n(b.dUWB), { f: `C${z}+D${z}`, v: num(b.U) + num(b.dUWB) }, b.quelle]); BR[b.id] = `Bauteile!$E$${z}`; });
  // Räume und Hüllflächen
  const hr = [[kopfz[0]], [kopfz[1]], [], ['Raum-Nr.', 'Bauteil', 'Ausrichtung', 'angrenzend an', 'A brutto in m²', 'Abzug in m²', 'A netto in m²', 'U_c / U_equiv in W/(m²·K)', 'θ_u / θ_j in °C', 'f in –', 'Δθ in K', 'Φ_T in W']];
  const rr = [[kopfz[0]], [kopfz[1]], [], ['Nr.', 'Raum', 'Geschoss', 'Raumart', 'L in m', 'B in m', 'A in m²', 'h_i in m', 'V in m³', 'θ_int in °C', 'Δθ in K', 'Φ_T in W', 'V̇_su in m³/h', 'η_WRG', 'θ_su in °C', 'n_50 in 1/h', 'e', 'ε', 'V̇_inf in m³/h', 'V̇_min in m³/h', 'V̇_außen in m³/h', 'Φ_V in W', 'Φ_RH in W', 'Φ_HL in W', 'φ in W/m²', 'Status']];
  const R0 = rr.length + 1;
  G.raeume.forEach((R, i) => {
    const r = S.raeume[i], z = R0 + i, v = R.vollstaendig, w = R.w;
    const h0 = hr.length + 1;
    r.flaechen.forEach((f, k) => {
      const h = hr.length + 1, zr = R.zeilen[k] || {};
      const fF = !v ? '' : f.an === 'aussen' ? 1 : f.an === 'erdreich' ? { f: `${NR.fg1}*((Räume!J${z}-${NR.tme})/(Räume!J${z}-${NR.te}))*${NR.Gw}`, v: zr.f } : { f: `(Räume!J${z}-I${h})/(Räume!J${z}-${NR.te})`, v: zr.f };
      const uk = !v ? '' : zr.ukName === 'U_equiv' ? n(f.Uequiv) : { f: BR[f.bauteilId].replace('Bauteile!', 'Bauteile!'), v: zr.Uk };
      hr.push([r.nr, (S.bauteile.find(b => b.id === f.bauteilId) || {}).name || '', f.ausrichtung, ANGRENZUNG[f.an] || '', n(f.Ab), n(f.Az), { f: `E${h}-F${h}`, v: zr.bezug }, uk,
        f.an === 'unbeheizt' || f.an === 'beheizt' ? n(f.thetaX) : '', fF, v ? { f: `Räume!K${z}`, v: w.dth } : '', v ? { f: `G${h}*H${h}*J${h}*K${h}`, v: zr.phi } : '']);
    });
    const h1 = hr.length;
    const eta = r.lueftung.suModus === 'eta';
    const ra = r.raumartId, vmin = S.optionen.vmin === 'norm';
    rr.push([r.nr, r.name, r.geschoss, w.raumart,
      r.amodus === 'A' ? '' : n(r.L), r.amodus === 'A' ? '' : n(r.B), r.amodus === 'A' ? n(r.A) : { f: `E${z}*F${z}`, v: w.A }, n(r.hi), { f: `G${z}*H${z}`, v: w.V },
      v ? { f: NR['tint' + ra], v: w.tint } : '', v ? { f: `J${z}-${NR.te}`, v: w.dth } : '',
      v ? { f: h1 >= h0 ? `SUM(Hüllflächen!L${h0}:L${h1})` : '0', v: R.phiT } : '',
      n(r.lueftung.Vsu), eta ? n(r.lueftung.eta) : '',
      v ? (w.Vsu > 0 ? (eta ? { f: `${NR.te}+N${z}*(J${z}-${NR.te})`, v: w.tsu } : n(r.lueftung.thetaSu)) : '') : '',
      n(r.lueftung.n50), v ? { f: NR['e' + r.lueftung.eId], v: w.e } : '', v ? { f: NR['eps' + r.lueftung.epsId], v: w.eps } : '',
      v ? { f: `2*I${z}*P${z}*Q${z}*R${z}`, v: w.Vinf } : '',
      v && vmin ? { f: `${NR['nmin' + ra]}*I${z}`, v: w.Vmin } : '',
      v ? (vmin ? { f: `MAX(S${z},T${z}-M${z})`, v: w.Vaussen } : { f: `S${z}`, v: w.Vaussen }) : '',
      v ? { f: w.Vsu > 0 ? `${NR.rhocp}*(U${z}*K${z}+M${z}*(J${z}-O${z}))` : `${NR.rhocp}*U${z}*K${z}`, v: R.phiV } : '',
      v ? (R.rhGesetzt ? n(r.phiRH) : 0) : '',
      v ? { f: `L${z}+V${z}+W${z}`, v: R.phiHL } : '', v ? { f: `X${z}/G${z}`, v: R.phiSpez } : '', v ? 'vollständig' : 'unvollständig']);
  });
  const zs = rr.length + 1, ze = zs - 1, s = G.summe;
  if (S.raeume.length) {
    rr.push(['', 'Summe', '', '', '', '', { f: `SUM(G${R0}:G${ze})`, v: s ? s.A : undefined }, '', { f: `SUM(I${R0}:I${ze})`, v: s ? s.V : undefined }, '', '',
      s ? { f: `SUM(L${R0}:L${ze})`, v: s.phiT } : '', '', '', '', '', '', '', '', '', '', s ? { f: `SUM(V${R0}:V${ze})`, v: s.phiV } : '', s ? { f: `SUM(W${R0}:W${ze})`, v: s.phiRH } : '',
      s ? { f: `SUM(X${R0}:X${ze})`, v: s.phiHL } : '', s ? { f: `X${zs}/G${zs}`, v: s.phiSpez } : '', s ? '' : 'Räume unvollständig – keine Summe']);
    rr.push([]);
    rr.push(['', 'Gebäudeheizlast Σ Φ_HL in kW', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', s ? { f: `X${zs}/1000`, v: s.phiHL / 1000 } : '']);
    const zw = rr.length + 1;
    rr.push(['', 'Leistung Wärmeerzeuger Φ_WE in kW', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', n(S.projekt.phiWE)]);
    rr.push(['', 'Nachweis η = Σ Φ_HL / Φ_WE ≤ 1,0', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', s && G.nachweis ? { f: `X${zw - 1}/X${zw}`, v: G.nachweis.eta } : '',
      s && G.nachweis ? { f: `IF(X${zw + 1}<=1,"ja","nein")`, v: G.nachweis.erfuellt ? 'ja' : 'nein' } : '']);
  }
  XLSX.utils.book_append_sheet(wb, blatt(rr, [8, 24, 9, 16, 8, 8, 9, 8, 9, 9, 8, 10, 10, 7, 9, 8, 7, 7, 10, 10, 10, 10, 9, 10, 9, 14]), 'Räume');
  XLSX.utils.book_append_sheet(wb, blatt(hr, [9, 24, 11, 16, 11, 10, 11, 14, 12, 9, 9, 11]), 'Hüllflächen');
  XLSX.utils.book_append_sheet(wb, blatt(br, [26, 16, 13, 15, 14, 50]), 'Bauteile');
  XLSX.utils.book_append_sheet(wb, blatt(nr, [44, 9, 10, 11, 50, 8]), 'Normwerte');
  wb.Workbook = { CalcPr: { fullCalcOnLoad: true } };
  XLSX.writeFile(wb, `heizlast_${(S.projekt.projekt || 'projekt').replace(/[^\wäöüÄÖÜß-]+/g, '_')}.xlsx`);
}

// ── Start ─────────────────────────────────────────────────────────────────
function start() {
  S = laden();
  $('tabs').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) zeigeTab(b.dataset.tab); });
  const main = document.querySelector('main');
  const eingabe = e => {
    const el = e.target; if (!el.dataset || !el.dataset.b) return;
    if (el.type === 'radio' && !el.checked) return;
    setze(el.dataset.b, el.type === 'checkbox' ? el.checked : el.value);
    speichern();
    if (e.type === 'input' && el.dataset.r) return; // Neuaufbau erst bei change
    nachEingabe(el);
  };
  main.addEventListener('input', eingabe);
  main.addEventListener('change', e => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox' || e.target.type === 'radio' || e.target.type === 'date') eingabe(e); });
  main.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const r = AKTION[b.dataset.a](b.dataset);
    if (r !== false) { speichern(); render(); }
  });
  $('datei').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => dateiGelesen(rd.result); rd.readAsText(f); });
  window.addEventListener('beforeprint', () => { if (tab !== 'vorzeige') zeigeTab('vorzeige'); druckstil(); });
  const h = location.hash.slice(1);
  zeigeTab(['projekt', 'bauteile', 'normwerte', 'raum', 'tabelle', 'vorzeige'].includes(h) ? h : 'projekt');
}
document.addEventListener('DOMContentLoaded', start);
