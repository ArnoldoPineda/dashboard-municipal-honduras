// PWA sobre el build de producción (requiere `npm run build` antes): el service worker guarda solo estáticos
// del mismo origen, nunca Supabase; sin conexión se ve el aviso; una versión nueva borra el caché anterior.
import { test, expect } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';
import type { AddressInfo } from 'net';

const BUILD = path.resolve(__dirname, '..', 'build');
const TIPOS: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
let servidor: http.Server;
let base = '';
let versionForzada: string | null = null; // simula un deploy nuevo cambiando la VERSION servida en sw.js

test.skip(!fs.existsSync(path.join(BUILD, 'sw.js')), 'Falta el build: correr `npm run build` antes.');

test.beforeAll(async () => {
  servidor = http.createServer((req, res) => {
    const ruta = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let archivo = path.join(BUILD, ruta);
    if (!archivo.startsWith(BUILD) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) archivo = path.join(BUILD, 'index.html');
    let cuerpo: Buffer | string = fs.readFileSync(archivo);
    if (ruta === '/sw.js' && versionForzada) cuerpo = cuerpo.toString().replace(/const VERSION = '[^']+';/, `const VERSION = '${versionForzada}';`);
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(cuerpo);
  });
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});
test.afterAll(() => { servidor?.close(); });

// Espera explícita: registro listo, SW en estado «activated» (ready resuelve ya en «activating») y página controlada.
const listo = (page: import('@playwright/test').Page) => page.evaluate(async () => {
  const sw = (await navigator.serviceWorker.ready).active!;
  if (sw.state !== 'activated') await new Promise<void>((ok) => sw.addEventListener('statechange', () => { if (sw.state === 'activated') ok(); }));
  if (!navigator.serviceWorker.controller) await new Promise((ok) => navigator.serviceWorker.addEventListener('controllerchange', ok, { once: true }));
});
const contenidoCaches = (page: import('@playwright/test').Page) => page.evaluate(async () => {
  const claves = await caches.keys();
  const urls: string[] = [];
  for (const k of claves) (await (await caches.open(k)).keys()).forEach((r) => urls.push(r.url));
  return { claves, urls };
});

test('PWA: solo estáticos del build en caché, nunca Supabase', async ({ page }) => {
  const pedidosSupabase: string[] = [];
  page.on('request', (r) => { if (r.url().includes('supabase')) pedidosSupabase.push(r.url()); });
  await page.goto(`${base}/rankings`);
  await listo(page);
  await page.reload(); // ya controlada por el SW
  await page.waitForFunction(() => !/Cargando/.test(document.body.innerText), null, { timeout: 60_000 });
  await page.goto(`${base}/`);
  await page.waitForLoadState('networkidle');
  // Un /static/ inexistente vuelve como index.html (fallback SPA): no se guarda como estático.
  await page.evaluate(() => fetch('/static/js/no-existe.123.chunk.js'));

  // El SW guarda el topo JSON sin esperar el put: se espera a que aparezca en vez de leer el caché una sola vez.
  await expect.poll(async () => (await contenidoCaches(page)).urls.some((u) => u.includes('/data/honduras-municipios-topo.json')), { timeout: 15_000 }).toBe(true);
  const { claves, urls } = await contenidoCaches(page);
  expect(claves).toHaveLength(1);
  expect(claves[0]).toMatch(/^simho-estaticos-[0-9a-f]{12}$/);
  expect(pedidosSupabase.length).toBeGreaterThan(0); // los datos sí se pidieron (a la red)
  for (const u of urls) {
    const url = new URL(u);
    expect(url.origin).toBe(base);
    expect(url.pathname).toMatch(/^\/(index\.html|manifest\.json|static\/|icons\/|data\/)/);
  }
  expect(urls.some((u) => u.includes('/static/js/main.'))).toBe(true);
  expect(urls.some((u) => u.includes('no-existe'))).toBe(false);
  expect(urls.some((u) => u.includes('/data/honduras-municipios-topo.json'))).toBe(true);
});

test('PWA: sin conexión la app abre desde el caché con el aviso', async ({ page, context }) => {
  await page.goto(`${base}/`);
  await listo(page);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  await page.goto(`${base}/dashboard`);
  await expect(page.getByRole('status').filter({ hasText: 'Sin conexión — datos no disponibles' })).toBeVisible();
  await expect(page.getByText('SIMHO', { exact: true })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('Sin conexión — datos no disponibles')).toBeHidden();
});

test('PWA: un deploy nuevo (otra VERSION) borra el caché anterior', async ({ page }) => {
  await page.goto(`${base}/`);
  await listo(page);
  const antes = (await contenidoCaches(page)).claves;
  versionForzada = 'nuevo0000000';
  try {
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const cambio = new Promise((ok) => navigator.serviceWorker.addEventListener('controllerchange', ok, { once: true }));
      await reg.update();
      await cambio;
    });
    await expect.poll(async () => (await contenidoCaches(page)).claves).toEqual(['simho-estaticos-nuevo0000000']);
    expect(antes).not.toContain('simho-estaticos-nuevo0000000');
  } finally {
    versionForzada = null;
  }
});
