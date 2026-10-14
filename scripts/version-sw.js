// postbuild: versiona el caché del service worker con el hash de TODOS los archivos del build (salvo sw.js)
// y le pasa las entradas. Si un deploy cambia cualquier archivo (también /data, /icons o el manifest de public/),
// cambia VERSION y el SW nuevo borra el caché anterior.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const archivos = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? archivos(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const hash = crypto.createHash('sha256');
archivos('build').filter((f) => path.relative('build', f) !== 'sw.js').sort().forEach((f) => {
  hash.update(path.relative('build', f).split(path.sep).join('/'));
  hash.update(fs.readFileSync(f));
});
const version = hash.digest('hex').slice(0, 12);
const manifiesto = fs.readFileSync('build/asset-manifest.json', 'utf8');
const entradas = JSON.parse(manifiesto).entrypoints.map((f) => `/${f}`);

const ruta = 'build/sw.js';
// Cada placeholder debe estar exactamente una vez; si falta cualquiera, el build falla.
const reemplazar = (texto, viejo, nuevo) => {
  if (texto.split(viejo).length !== 2) throw new Error(`version-sw: no se encontró «${viejo}» en build/sw.js`);
  return texto.replace(viejo, nuevo);
};
let sw = fs.readFileSync(ruta, 'utf8');
sw = reemplazar(sw, "const VERSION = 'dev';", `const VERSION = '${version}';`);
sw = reemplazar(sw, 'const ENTRADAS = [];', `const ENTRADAS = ${JSON.stringify(entradas)};`);
fs.writeFileSync(ruta, sw);
console.log(`sw.js versión ${version} · ${entradas.length} entradas`);
