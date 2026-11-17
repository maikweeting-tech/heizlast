/* Erzeugt die xlsx-Datei mit dem Exportcode der App (ohne Browser). Aufruf: node pruefung/xlsx_test.js <projekt.json> <ziel.xlsx> */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console, document: { addEventListener() {} }, window: {}, localStorage: { getItem: () => null, setItem() {} } };
vm.createContext(ctx);
for (const f of ['vendor/xlsx.mini.min.js', 'src/calc.js', 'src/app.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const [, , pj, ziel] = process.argv;
vm.runInContext(`S = ergaenze(${fs.readFileSync(pj, 'utf8')}); G = rechneGebaeude(S); RE = rechneRaum(S.entwurf, S);
  XLSX.writeFile = (wb) => { globalThis.__buf = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }); }; exportXlsx();`, ctx);
fs.writeFileSync(ziel, Buffer.from(ctx.__buf, 'base64'));
console.log('geschrieben:', ziel);
