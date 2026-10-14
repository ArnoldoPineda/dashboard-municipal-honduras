// Render del pie de fuente: el rótulo de precios constantes aparece con la nota y desaparece al quitarla
// (Análisis la pone con "Real" y la quita con "Nominal" o al desmontarse; flujo completo en e2e/flujos.spec.ts).
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React, { useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import PieFuente, { TEXTO_FUENTE } from './PieFuente';
import { NavbarProvider, useNavbar } from '../context/NavbarContext';
import { ROTULO_PRECIOS_REALES } from '../data/ipc';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** Imita a Análisis: pone la nota con "Real" y la limpia al cambiar o al desmontarse. */
function PaginaConNota({ real }: { real: boolean }) {
  const { setNotaPie } = useNavbar();
  useEffect(() => { setNotaPie(real ? ROTULO_PRECIOS_REALES : null); return () => setNotaPie(null); }, [real, setNotaPie]);
  return null;
}

describe('PieFuente', () => {
  let div: HTMLDivElement;
  let root: Root;
  const pintar = (pagina: React.ReactNode) => act(() => {
    root.render(<NavbarProvider>{pagina}<PieFuente /></NavbarProvider>);
  });
  const texto = () => div.querySelector('footer')?.textContent ?? '';

  beforeEach(() => { div = document.createElement('div'); document.body.appendChild(div); root = createRoot(div); });
  afterEach(() => { act(() => root.unmount()); div.remove(); });

  it('sin nota: solo la fuente', () => {
    pintar(null);
    expect(texto()).toBe(TEXTO_FUENTE);
  });

  it('con "Real" aparece el rótulo de precios constantes; con "Nominal" desaparece', () => {
    pintar(<PaginaConNota real />);
    expect(texto()).toBe(`${TEXTO_FUENTE} · ${ROTULO_PRECIOS_REALES}`);
    pintar(<PaginaConNota real={false} />);
    expect(texto()).toBe(TEXTO_FUENTE);
  });

  it('al salir de la página (desmontar) el rótulo desaparece', () => {
    pintar(<PaginaConNota real />);
    expect(texto()).toContain(ROTULO_PRECIOS_REALES);
    pintar(null);
    expect(texto()).toBe(TEXTO_FUENTE);
  });
});
