/* Baut die eine offline lauffähige Datei index.html aus src/ und vendor/. Aufruf: node build.js */
'use strict';
const fs = require('fs'), path = require('path');
const lies = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const js = s => s.replace(/<\/script/gi, '<\/script');
let html = lies('src/index.html');
const teile = {
  '/*CSS*/': lies('src/app.css'),
  '/*VENDOR*/': js(lies('vendor/xlsx.mini.min.js')) + '\n' + js(lies('vendor/html2canvas.min.js')),
  '/*CALC*/': js(lies('src/calc.js')) + '\n' + js(lies('src/begriffe.js')),
  '/*APP*/': js(lies('src/app.js'))
};
for (const [k, v] of Object.entries(teile)) { if (!html.includes(k)) throw new Error('Marke fehlt: ' + k); html = html.replace(k, () => v); }
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('index.html gebaut:', (Buffer.byteLength(html) / 1024).toFixed(0), 'KB');
