// Service worker de SIMHO: guarda en caché SOLO los archivos estáticos del build (mismo origen).
// Los datos (Supabase, otro origen) nunca pasan por aquí: van siempre a la red y no se guardan.
// VERSION y ENTRADAS los reemplaza scripts/version-sw.js después de `npm run build` (hash del asset-manifest):
// cada deploy con archivos distintos crea un caché nuevo y borra el anterior.
const VERSION = 'dev';
const ENTRADAS = [];

const CACHE = `simho-estaticos-${VERSION}`;
const ESTATICOS = ['/index.html', '/manifest.json', '/icons/simho-192.png', '/icons/simho-512.png', '/icons/simho-maskable-512.png', ...ENTRADAS];
const esEstatico = (url) => url.pathname.startsWith('/static/') || url.pathname.startsWith('/data/') || url.pathname.startsWith('/icons/')
  || url.pathname === '/manifest.json';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k.startsWith('simho-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Otro origen (Supabase, fuentes) o cualquier pedido con credenciales: red directa, sin caché.
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('apikey') || req.headers.has('authorization')) return;

  if (req.mode === 'navigate') {
    // Páginas: siempre la versión de la red; sin conexión, el index.html del build guardado.
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  if (!esEstatico(url)) return;
  // Estáticos con hash: primero el caché; si falta, red y se guarda.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') {
      const copia = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copia));
    }
    return res;
  })));
});
