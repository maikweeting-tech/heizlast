/* Baut die eine offline lauffähige Datei index.html aus src/ und vendor/. Aufruf: node build.js */
'use strict';
const fs = require('fs'), path = require('path');
const lies = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const js = s => s.replace(/<\/script/gi, '<\/script');
let html = lies('src/index.html');
// komplette Wärmeschutz-App aus dem Nachbarordner als eine Seite (für den Tab „Wärmeschutz“)
const WS = path.join(__dirname, '..', 'waermeschutz');
const ws = f => fs.readFileSync(path.join(WS, f), 'utf8');
let wsHtml = ws('index.html')
  .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*/g, '')
  .replace('<link rel="stylesheet" href="app.css">', () => `<style>\n${ws('app.css')}\n` +
    // Farben an die Heizlast-App angleichen (nur hell)
    `@media not all and (prefers-color-scheme: dark) { :root { --rost: #C0392B; --rost-hell: #f9e3e0; --akzent: #C0392B; --bg: #eef0f2; } }\n</style>`)
  .replace('<script src="data.js"></script>', () => `<script>\n${ws('data.js')}\n</script>`)
  .replace('<script src="calc.js"></script>', () => `<script>\n${ws('calc.js')}\n</script>`)
  .replace('<script src="begriffe.js"></script>', () => `<script>\n${ws('begriffe.js')}\n</script>`)
  .replace('<script src="app.js"></script>', () => `<script>\n${ws('app.js')}\n</script>`);
if (/<script src=|<link rel="stylesheet" href=/.test(wsHtml)) throw new Error('Wärmeschutz-App: Datei nicht eingebettet');
const wsJs = 'const WS_HTML = ' + JSON.stringify(wsHtml).replace(/<\/script/gi, '<\\/script') + ';';
const teile = {
  '/*CSS*/': lies('src/app.css'),
  '/*VENDOR*/': js(lies('vendor/xlsx.mini.min.js')) + '\n' + js(lies('vendor/html2canvas.min.js')),
  '/*WS*/': wsJs,
  '/*CALC*/': js(lies('src/calc.js')) + '\n' + js(lies('src/begriffe.js')),
  '/*APP*/': js(lies('src/app.js'))
};
for (const [k, v] of Object.entries(teile)) { if (!html.includes(k)) throw new Error('Marke fehlt: ' + k); html = html.replace(k, () => v); }
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('index.html gebaut:', (Buffer.byteLength(html) / 1024).toFixed(0), 'KB');
