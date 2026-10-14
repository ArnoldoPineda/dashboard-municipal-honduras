// postbuild: versiona el caché del service worker con el hash del asset-manifest y le pasa las entradas del build.
// Si un deploy cambia cualquier archivo con hash, cambia VERSION y el SW nuevo borra el caché anterior.
const fs = require('fs');
const crypto = require('crypto');

const manifiesto = fs.readFileSync('build/asset-manifest.json', 'utf8');
const version = crypto.createHash('sha256').update(manifiesto).digest('hex').slice(0, 12);
const entradas = JSON.parse(manifiesto).entrypoints.map((f) => `/${f}`);

const ruta = 'build/sw.js';
const sw = fs.readFileSync(ruta, 'utf8');
const nuevo = sw
  .replace("const VERSION = 'dev';", `const VERSION = '${version}';`)
  .replace('const ENTRADAS = [];', `const ENTRADAS = ${JSON.stringify(entradas)};`);
if (nuevo === sw || nuevo.includes("'dev'") || nuevo.includes('ENTRADAS = []')) throw new Error('version-sw: no se encontraron VERSION/ENTRADAS en build/sw.js');
fs.writeFileSync(ruta, nuevo);
console.log(`sw.js versión ${version} · ${entradas.length} entradas`);
