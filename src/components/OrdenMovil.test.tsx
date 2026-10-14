import { describe, it, expect } from '@jest/globals';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import OrdenMovil, { Orden } from './OrdenMovil';
import TablaScroll from './TablaScroll';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const ops = [{ clave: 'a', titulo: 'A' }, { clave: 'b', titulo: 'B' }];

function montar() {
  const el = document.createElement('div'); document.body.appendChild(el);
  const log: Orden[] = [];
  const W = () => { const [o, setO] = useState<Orden>(null); log.push(o); return <OrdenMovil opciones={ops} orden={o} onCambio={setO} />; };
  const root = createRoot(el);
  act(() => { root.render(<W />); });
  const sel = () => el.querySelector('select')!;
  const btn = () => el.querySelector('button')!;
  const elegir = (v: string) => act(() => {
    const s = sel();
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(s, v);
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  return { log, sel, btn, elegir };
}

describe('OrdenMovil', () => {
  it('estado inicial: Predeterminado y boton deshabilitado', () => {
    const m = montar();
    expect(m.sel().value).toBe('');
    expect(m.btn().disabled).toBe(true);
  });
  it('elegir columna -> asc; boton alterna; Predeterminado -> null', () => {
    const m = montar();
    m.elegir('a');
    expect(m.log[m.log.length - 1]).toEqual({ clave: 'a', dir: 1 });
    expect(m.btn().disabled).toBe(false);
    act(() => { m.btn().click(); });
    expect(m.log[m.log.length - 1]).toEqual({ clave: 'a', dir: -1 });
    expect(m.btn().textContent).toBe('▼');
    act(() => { m.btn().click(); });
    expect(m.log[m.log.length - 1]).toEqual({ clave: 'a', dir: 1 });
    m.elegir('');
    expect(m.log[m.log.length - 1]).toBeNull();
    expect(m.btn().disabled).toBe(true);
  });
  it('cambiar de columna conserva la direccion', () => {
    const m = montar();
    m.elegir('a'); act(() => { m.btn().click(); }); m.elegir('b');
    expect(m.log[m.log.length - 1]).toEqual({ clave: 'b', dir: -1 });
  });
});

describe('TablaScroll', () => {
  it('no rompe sin ResizeObserver y renderiza hijos', () => {
    const prev = (globalThis as any).ResizeObserver; delete (globalThis as any).ResizeObserver;
    const el = document.createElement('div'); const root = createRoot(el);
    expect(() => act(() => { root.render(<TablaScroll><table><tbody><tr><td>x</td></tr></tbody></table></TablaScroll>); })).not.toThrow();
    expect(el.querySelector('td')!.textContent).toBe('x');
    expect(el.querySelector('[data-mas-der]')).toBeNull();
    act(() => root.unmount());
    (globalThis as any).ResizeObserver = prev;
  });
  it('con ResizeObserver: observa y desconecta al desmontar', () => {
    const calls: string[] = [];
    (globalThis as any).ResizeObserver = class { observe() { calls.push('o'); } disconnect() { calls.push('d'); } };
    const el = document.createElement('div'); const root = createRoot(el);
    act(() => { root.render(<TablaScroll><div /></TablaScroll>); });
    act(() => root.unmount());
    delete (globalThis as any).ResizeObserver;
    expect(calls).toEqual(['o', 'o', 'd']);
  });
  it('data-mas-der aparece cuando scrollWidth > clientWidth', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 500 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 });
    const el = document.createElement('div'); const root = createRoot(el);
    act(() => { root.render(<TablaScroll><div /></TablaScroll>); });
    expect(el.querySelector('[data-mas-der]')).not.toBeNull();
    act(() => root.unmount());
    delete (HTMLElement.prototype as any).scrollWidth; delete (HTMLElement.prototype as any).clientWidth;
  });
});
