import { describe, it, expect, afterEach } from '@jest/globals';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useEsMovil } from './useMediaQuery';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const orig = window.matchMedia;
afterEach(() => { (window as any).matchMedia = orig; });

function montar() {
  const el = document.createElement('div');
  const root = createRoot(el);
  const vistos: boolean[] = [];
  const C = () => { const m = useEsMovil(); vistos.push(m); return <span>{String(m)}</span>; };
  act(() => { root.render(<C />); });
  return { el, vistos, root };
}

describe('useEsMovil', () => {
  it('sin matchMedia devuelve false', () => {
    (window as any).matchMedia = undefined;
    const { el, root } = montar();
    expect(el.textContent).toBe('false');
    act(() => root.unmount());
  });
  it('valor inicial sincrono (primer render ya true), sigue "change" y limpia el listener', () => {
    let matches = true; let l: any = null; let removed = 0;
    (window as any).matchMedia = () => ({
      get matches() { return matches; },
      addEventListener: (_: string, f: any) => { l = f; },
      removeEventListener: () => { removed++; },
    });
    const { el, vistos, root } = montar();
    expect(vistos[0]).toBe(true);
    expect(el.textContent).toBe('true');
    matches = false;
    act(() => l());
    expect(el.textContent).toBe('false');
    act(() => root.unmount());
    expect(removed).toBe(1);
  });
  it('matchMedia sin addEventListener (Safari < 14) no rompe', () => {
    (window as any).matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
    expect(() => { const { root } = montar(); act(() => root.unmount()); }).not.toThrow();
  });
});
