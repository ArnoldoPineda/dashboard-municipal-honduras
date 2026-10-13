import { describe, it, expect } from '@jest/globals';
import { SECUENCIAL, CATEGORICA, SIN_DATO, textoSobre, contraste, colorMetrica, METRICAS } from './colorMetrica';
import { clasesQuintil } from './indicadores';

describe('contraste AA de los rótulos', () => {
  it.each([...SECUENCIAL, ...Object.values(CATEGORICA), SIN_DATO])('%s', (fondo) => {
    expect(contraste(fondo, textoSobre(fondo))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('colorMetrica', () => {
  const c = clasesQuintil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'mayor');
  it('secuencial por clase; categórica; sin dato; excluido con trama', () => {
    expect(colorMetrica('autonomia', { valor: 10 }, c)).toBe(SECUENCIAL[4]);
    expect(colorMetrica('autonomia', { valor: 1 }, c)).toBe(SECUENCIAL[0]);
    expect(colorMetrica('autonomia', { valor: null }, c)).toBe(SIN_DATO);
    expect(colorMetrica('categoria', { categoria: 'A' })).toBe(CATEGORICA.A);
    expect(colorMetrica('autonomia', { valor: 10, excluida: true }, c)).toMatch(/^url\(#/);
  });
  it('dirección desde SEMAFORO: dependencia es "menor es mejor"', () => {
    expect(METRICAS.dependencia.direccion).toBe('menor');
    expect(METRICAS.autonomia.direccion).toBe('mayor');
  });
});
