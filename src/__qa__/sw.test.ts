/** @jest-environment node */
import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = process.cwd();
const SW = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');

function cargar(cachesInit: Record<string, Map<string, any>> = {}, fetchImpl: any = async () => { throw new Error('red caida'); }) {
  const handlers: Record<string, Function> = {};
  const store = new Map<string, Map<string, any>>(Object.entries(cachesInit));
  const puts: string[] = [];
  const deleted: string[] = [];
  const key = (r: any) => (typeof r === 'string' ? r : new URL(r.url).pathname);
  const caches = {
    keys: async () => [...store.keys()],
    delete: async (k: string) => { deleted.push(k); return store.delete(k); },
    open: async (n: string) => {
      if (!store.has(n)) store.set(n, new Map());
      const m = store.get(n)!;
      return { addAll: async () => {}, put: async (r: any, v: any) => { puts.push(key(r)); m.set(key(r), v); } };
    },
    match: async (r: any) => { for (const m of store.values()) if (m.has(key(r))) return m.get(key(r)); return undefined; },
  };
  const self: any = {
    location: { origin: 'https://simho.test' },
    addEventListener: (t: string, f: Function) => { handlers[t] = f; },
    skipWaiting: () => {}, clients: { claim: async () => {} },
  };
  new Function('self', 'caches', 'fetch', 'URL', SW)(self, caches, fetchImpl, URL);
  const req = (url: string, o: any = {}) => ({ method: 'GET', url, mode: 'cors', ...o, headers: { has: (k: string) => Object.keys(o.headers || {}).some((h) => h.toLowerCase() === k) } });
  const dispatch = async (r: any) => {
    let p: any; let responded = false;
    handlers.fetch({ request: r, respondWith: (x: any) => { responded = true; p = x; } });
    return { responded, res: responded ? await p : undefined };
  };
  return { handlers, store, puts, deleted, req, dispatch };
}
const resp = (o: any = {}) => ({ ok: true, type: 'basic', headers: { get: () => 'application/javascript' }, clone() { return { ...this, copia: true }; }, ...o });
const tick = () => new Promise((s) => setTimeout(s, 0));

describe('public/sw.js fetch', () => {
  it('otro origen: sin respondWith', async () => {
    const f = cargar();
    expect((await f.dispatch(f.req('https://xyz.supabase.co/rest/v1/t'))).responded).toBe(false);
  });
  it('same-origin con apikey o authorization: sin respondWith', async () => {
    const f = cargar();
    expect((await f.dispatch(f.req('https://simho.test/static/js/main.x.js', { headers: { apikey: 'k' } }))).responded).toBe(false);
    expect((await f.dispatch(f.req('https://simho.test/static/js/main.x.js', { headers: { Authorization: 'Bearer x' } }))).responded).toBe(false);
  });
  it('no-GET ignorado', async () => {
    const f = cargar();
    expect((await f.dispatch(f.req('https://simho.test/static/js/a.js', { method: 'POST' }))).responded).toBe(false);
  });
  it('ruta no estatica same-origin (/api/x): sin respondWith', async () => {
    const f = cargar();
    expect((await f.dispatch(f.req('https://simho.test/api/x'))).responded).toBe(false);
  });
  it('estatico en cache: se sirve sin red', async () => {
    const hit = resp();
    let red = 0;
    const f = cargar({ 'simho-estaticos-dev': new Map([['/static/js/main.x.js', hit]]) }, async () => { red++; return resp(); });
    const r = await f.dispatch(f.req('https://simho.test/static/js/main.x.js'));
    expect(r.res).toBe(hit); expect(red).toBe(0);
  });
  it('estatico sin cache: red y guarda si ok y basic', async () => {
    const f = cargar({}, async () => resp());
    const r = await f.dispatch(f.req('https://simho.test/static/js/main.x.js'));
    expect(r.responded).toBe(true);
    await tick();
    expect(f.puts).toEqual(['/static/js/main.x.js']);
  });
  it.each([[{ ok: false }], [{ type: 'cors' }], [{ type: 'opaque' }], [{ headers: { get: () => 'text/html; charset=utf-8' } }]])('no guarda si %j', async (o) => {
    const f = cargar({}, async () => resp(o));
    await f.dispatch(f.req('https://simho.test/static/js/main.x.js'));
    await tick();
    expect(f.puts).toEqual([]);
  });
  it('navegacion: usa red', async () => {
    const net = resp();
    const f = cargar({}, async () => net);
    expect((await f.dispatch(f.req('https://simho.test/mapa', { mode: 'navigate' }))).res).toBe(net);
  });
  it('navegacion sin red: index.html del cache', async () => {
    const idx = resp();
    const f = cargar({ 'simho-estaticos-dev': new Map([['/index.html', idx]]) });
    expect((await f.dispatch(f.req('https://simho.test/mapa', { mode: 'navigate' }))).res).toBe(idx);
  });
  it('navegacion cross-origin no se intercepta', async () => {
    const f = cargar();
    expect((await f.dispatch(f.req('https://otro.com/', { mode: 'navigate' }))).responded).toBe(false);
  });
  it('navegacion con apikey (same-origin) no se intercepta', async () => {
    const f = cargar();
    expect((await f.dispatch(f.req('https://simho.test/x', { mode: 'navigate', headers: { apikey: 'k' } }))).responded).toBe(false);
  });
});

describe('public/sw.js activate', () => {
  it('borra simho-* distintos del actual, no toca ajenos ni el actual', async () => {
    const f = cargar({
      'simho-estaticos-dev': new Map(), 'simho-estaticos-viejo': new Map(), 'simho-otro': new Map(), 'ajeno-cache': new Map(), 'workbox-x': new Map(),
    });
    let p: any;
    f.handlers.activate({ waitUntil: (x: any) => { p = x; } });
    await p;
    expect(f.deleted.sort()).toEqual(['simho-estaticos-viejo', 'simho-otro']);
    expect([...f.store.keys()].sort()).toEqual(['ajeno-cache', 'simho-estaticos-dev', 'workbox-x']);
  });
});

describe('scripts/version-sw.js', () => {
  const script = path.join(ROOT, 'scripts/version-sw.js');
  const montar = (swTxt: string, manifest: any = { files: {}, entrypoints: ['static/js/main.a.js', 'static/css/main.b.css'] }) => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vsw-'));
    fs.mkdirSync(path.join(d, 'build'));
    fs.writeFileSync(path.join(d, 'build/asset-manifest.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(d, 'build/sw.js'), swTxt);
    return d;
  };
  const run = (d: string) => execFileSync('node', [script], { cwd: d, stdio: 'pipe' }).toString();
  const leer = (d: string) => fs.readFileSync(path.join(d, 'build/sw.js'), 'utf8');

  it('reemplaza VERSION (hash 12 hex) y ENTRADAS; el SW resultante carga', () => {
    const d = montar(SW);
    run(d);
    const out = leer(d);
    expect(out).toMatch(/const VERSION = '[0-9a-f]{12}';/);
    expect(out).toContain('const ENTRADAS = ["/static/js/main.a.js","/static/css/main.b.css"];');
    expect(out).not.toContain("'dev'");
    expect(() => new Function('self', 'caches', 'fetch', 'URL', out)({ addEventListener() {}, location: { origin: 'x' } }, {}, () => {}, URL)).not.toThrow();
  });
  it('version estable con el mismo manifest y distinta si cambia', () => {
    const v = (m: any) => { const d = montar(SW, m); run(d); return leer(d).match(/VERSION = '(\w+)'/)![1]; };
    const a = { files: {}, entrypoints: ['a.js'] };
    expect(v(a)).toBe(v(a));
    expect(v(a)).not.toBe(v({ files: {}, entrypoints: ['b.js'] }));
  });
  it('falla si faltan ambos placeholders', () => {
    expect(() => run(montar("const VERSION = 'x';\nconst ENTRADAS = [1];"))).toThrow();
  });
  it('falla si ya fue versionado (segunda corrida)', () => {
    const d = montar(SW); run(d);
    expect(() => run(d)).toThrow();
  });
  it('falla si solo falta uno de los placeholders', () => {
    expect(() => run(montar("const VERSION = 'dev';\nconst ENTRADAS = [1];"))).toThrow();
  });
  it('manifest sin entrypoints: falla con error claro (no TypeError)', () => {
    const d = montar(SW, { files: {} });
    let msg = '';
    try { run(d); } catch (e: any) { msg = String(e.stderr); }
    expect(msg).toContain('version-sw');
  });
});
