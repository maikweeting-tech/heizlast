/* Heizlast-App – Gebäudeschnitt (Skizze, ohne Maßstab).
   Zeigt die Geschosse (von oben nach unten) und an jeder Stelle die Bauteile aus dem Katalog,
   die dort liegen. Stellen ohne Bauteil werden rot als „nicht benannt“ markiert. */
'use strict';
// num/ok aus calc.js (im Browser im selben Skript, in Node per require)
const SN = (typeof module !== 'undefined' && typeof num === 'undefined') ? require('./calc.js') : { num, ok };

// Lage eines Bauteils im Schnitt
const LAGEN = {
  dach: 'Dach / oberste Decke',
  aussenwand: 'Außenwand',
  fenster: 'Fenster / Außentür',
  geschossdecke: 'Geschossdecke',
  kellerdecke: 'Kellerdecke',
  kelleraussenwand: 'Kelleraußenwand (Erdreich)',
  bodenplatte: 'Bodenplatte (Erdreich)',
  bodenplatte_ok: 'Bodenplatte ohne Keller (Teil des untersten Geschosses auf Erdreich)',
  keine: 'nicht im Schnitt (z. B. Innenwand)'
};

// Vorschlag aus Name und Bauteilart, wenn keine Lage gewählt ist
function lageVorschlag(b) {
  const n = String(b.name || '').toLowerCase(), a = String(b.art || '').toLowerCase(), t = n + ' ' + a;
  if (/innenwand|innentür|innentuer/.test(t)) return 'keine';
  if (/fenster|außentür|aussentür|aussentuer|haustür/.test(t)) return 'fenster';
  if (/dach|oberste geschossdecke|nicht ausg/.test(t)) return 'dach';
  if (/bodenplatte/.test(n)) return 'bodenplatte';
  if (/keller/.test(n) && /wand/.test(n)) return 'kelleraussenwand';
  if (/kellerdecke/.test(n)) return 'kellerdecke';
  if (a === 'bodenplatte') return 'bodenplatte';
  if (a === 'kellerdecke') return 'kellerdecke';
  if (/erdreich/.test(a) && !/decke/.test(n)) return 'bodenplatte';
  if (/decke/.test(t)) return 'geschossdecke';
  if (/wand/.test(t)) return 'aussenwand';
  return 'keine';
}
const lageVon = b => (b.lage && LAGEN[b.lage] ? b.lage : lageVorschlag(b));

function schnittEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// Bauteile je Lage: [{ name, uc }]
function bauteileNachLage(bauteile) {
  const m = {};
  Object.keys(LAGEN).forEach(k => { m[k] = []; });
  (bauteile || []).forEach(b => {
    const u = SN.num(b.U) + SN.num(b.dUWB);
    m[lageVon(b)].push({ name: b.name || '(ohne Namen)', uc: SN.ok(u) ? u : null });
  });
  return m;
}

// SVG des Schnitts. G = { geschosse: [{ name, beheizt, keller }] von oben nach unten, dach: '' | 'flach' | 'steil' }
function schnittSvg(G, bauteile, opt = {}) {
  const gs = (G && G.geschosse) || [];
  if (!gs.length) return '';
  const steil = G.dach === 'steil';
  const bl = bauteileNachLage(bauteile);
  const W = 760, xL = 275, xR = 465, h = 62, wand = 7;
  const yTop = steil ? 78 : 34;
  const n = gs.length;
  const nOben = gs.filter(g => !g.keller).length;
  const yG = yTop + nOben * h;                       // Geländeoberkante
  const yBot = yTop + n * h;
  const H = yBot + 46;
  const y = i => yTop + i * h;
  const fmtU = u => (u == null ? '' : ' (U_c ' + u.toFixed(2).replace('.', ',') + ')');
  let s = `<svg class="schnitt" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gebäudeschnitt">
  <defs><pattern id="erde" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#a08060" stroke-width="1.4"/></pattern></defs>
  <style>.sn-t{font:11px Arial,sans-serif;fill:#1f2933}.sn-b{font:bold 11px Arial,sans-serif;fill:#1f2933}.sn-g{font:bold 13px Arial,sans-serif;fill:#1f2933}.sn-k{font:10px Arial,sans-serif;fill:#5b6470}.sn-no{font:italic 11px Arial,sans-serif;fill:#C0392B}</style>`;
  // Erdreich
  s += `<rect x="${xL - 95}" y="${yG}" width="${xR - xL + 190}" height="${H - yG - 6}" fill="url(#erde)" opacity=".55"/><line x1="${xL - 120}" y1="${yG}" x2="${xR + 120}" y2="${yG}" stroke="#6b5440" stroke-width="2"/>`;
  // Geschosse
  gs.forEach((g, i) => {
    const fill = g.keller ? (g.beheizt ? '#f6dcc8' : '#e3e6ea') : (g.beheizt ? '#fde7d6' : '#eceff2');
    s += `<rect x="${xL}" y="${y(i)}" width="${xR - xL}" height="${h}" fill="${fill}"/>`;
    s += `<text x="${(xL + xR) / 2}" y="${y(i) + h / 2 - 2}" text-anchor="middle" class="sn-g">${schnittEsc(g.name || '?')}</text>`;
    s += `<text x="${(xL + xR) / 2}" y="${y(i) + h / 2 + 14}" text-anchor="middle" class="sn-k">${g.beheizt ? 'beheizt' : 'unbeheizt'}${g.keller ? ', unter Gelände' : ''}</text>`;
    // Wände
    const wf = g.keller ? '#7a6a5a' : '#8a5a44';
    s += `<rect x="${xL - wand}" y="${y(i)}" width="${wand}" height="${h}" fill="${wf}"/><rect x="${xR}" y="${y(i)}" width="${wand}" height="${h}" fill="${wf}"/>`;
    // Fenster in Geschossen über Gelände
    if (!g.keller) [xL - wand, xR].forEach(x => { s += `<rect x="${x}" y="${y(i) + 18}" width="${wand}" height="24" fill="#9fd3f0" stroke="#4a8fb8" stroke-width="1"/>`; });
  });
  // Decken (Platten)
  const platte = (yy, farbe) => `<rect x="${xL - wand}" y="${yy - 4}" width="${xR - xL + 2 * wand}" height="8" fill="${farbe}"/>`;
  for (let i = 0; i <= n; i++) s += platte(y(i), i === 0 ? '#5a6470' : i === n ? '#5a5048' : '#7d8790');
  if (steil) s += `<polygon points="${xL - wand - 14},${yTop - 3} ${(xL + xR) / 2},${yTop - 64} ${xR + wand + 14},${yTop - 3}" fill="none" stroke="#5a6470" stroke-width="7" stroke-linejoin="round"/>`;

  // Beschriftungen: links und rechts, Überlappung vermeiden
  const marken = { L: [], R: [] };
  // leer: Text, wenn kein Bauteil benannt ist ('' = rot „nicht benannt“)
  const marke = (seite, lage, ax, ay, titel, leer) => {
    const liste = bl[lage] || [];
    marken[seite].push({ ax, ay, y: ay, titel: titel || LAGEN[lage], zeilen: liste.length ? liste.slice(0, 3).map(b => b.name + fmtU(b.uc)) : null, mehr: Math.max(0, liste.length - 3), leer });
  };
  const ersterOben = gs.findIndex(g => !g.keller);
  const ersterKeller = gs.findIndex(g => g.keller);
  marke('R', 'dach', xR + wand, steil ? yTop - 30 : yTop, G.dach === 'flach' ? 'Flachdach' : steil ? 'Steildach' : 'Dach / oberste Decke');
  if (ersterOben >= 0) {
    marke('L', 'aussenwand', xL - wand, y(ersterOben) + h / 2 + 12);
    marke('R', 'fenster', xR + wand, y(ersterOben) + 30);
  }
  // Geschossdecke: erste Decke zwischen zwei Geschossen über Gelände (oder zwischen zwei Kellern)
  const gd = gs.findIndex((g, i) => i > 0 && !!g.keller === !!gs[i - 1].keller);
  if (gd > 0) marke('R', 'geschossdecke', xR + wand, y(gd));
  if (ersterKeller > 0) marke('R', 'kellerdecke', xR + wand, y(ersterKeller));
  // Unbeheizter Keller: Wand und Sohle gehen nicht in die Heizlast ein – fehlende Bauteile nicht rot
  const kellerKalt = ersterKeller >= 0 && gs.slice(ersterKeller).every(g => g.keller && !g.beheizt);
  const kaltTxt = kellerKalt ? 'nicht nötig (Keller unbeheizt)' : '';
  if (ersterKeller >= 0) marke('L', 'kelleraussenwand', xL - wand, y(ersterKeller) + h / 2, null, kaltTxt);
  marke('L', 'bodenplatte', xL, yBot, ersterKeller >= 0 ? 'Bodenplatte Keller (Erdreich)' : 'Bodenplatte (Erdreich)', ersterKeller >= 0 ? kaltTxt : '');
  // Teilunterkellerung: Bodenplatte des untersten Geschosses über Gelände, wo kein Keller ist
  if (ersterKeller >= 0 && (bl.bodenplatte_ok || []).length) {
    s += `<rect x="${xL - wand - 24}" y="${y(ersterKeller) - 4}" width="24" height="8" fill="#5a5048"/>`;
    marke('L', 'bodenplatte_ok', xL - wand - 12, y(ersterKeller), 'Bodenplatte ohne Keller (Erdreich)');
  }

  const zeileH = 13;
  ['L', 'R'].forEach(seite => {
    const m = marken[seite].sort((a, b) => a.ay - b.ay);
    let frei = 12;
    m.forEach(k => {
      const hoehe = (1 + (k.zeilen ? k.zeilen.length + (k.mehr ? 1 : 0) : 1)) * zeileH;
      k.y = Math.max(k.ay - hoehe / 2 + 4, frei);
      frei = k.y + hoehe + 6;
    });
    m.forEach(k => {
      const tx = seite === 'L' ? xL - wand - 30 : xR + wand + 30, anker = seite === 'L' ? 'end' : 'start';
      const ly = k.y + 4;
      s += `<polyline points="${k.ax},${k.ay} ${seite === 'L' ? tx + 6 : tx - 6},${ly}" fill="none" stroke="#5b6470" stroke-width="1"/><circle cx="${k.ax}" cy="${k.ay}" r="2.5" fill="#5b6470"/>`;
      s += `<text x="${seite === 'L' ? tx : tx}" y="${ly}" text-anchor="${anker}" class="sn-b">${schnittEsc(k.titel)}</text>`;
      if (k.zeilen) k.zeilen.forEach((z, j) => { s += `<text x="${tx}" y="${ly + (j + 1) * zeileH}" text-anchor="${anker}" class="sn-t">${schnittEsc(z)}</text>`; });
      else s += `<text x="${tx}" y="${ly + zeileH}" text-anchor="${anker}" class="${k.leer ? 'sn-k' : 'sn-no'}">${k.leer ? schnittEsc(k.leer) : 'nicht benannt'}</text>`;
      if (k.mehr) s += `<text x="${tx}" y="${ly + (k.zeilen.length + 1) * zeileH}" text-anchor="${anker}" class="sn-k">+ ${k.mehr} weitere</text>`;
    });
  });
  s += '</svg>';
  return s;
}

if (typeof module !== 'undefined') module.exports = { LAGEN, lageVorschlag, lageVon, bauteileNachLage, schnittSvg };
