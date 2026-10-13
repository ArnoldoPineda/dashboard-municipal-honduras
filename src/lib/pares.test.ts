import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import {
  comparacionPares, semaforo, lecturaSimho, indicadoresMunicipio, ClaveSemaforo, Comparacion,
} from './indicadores';
import { opcionesMunicipios, ineDeEtiqueta, filasPorINE } from './municipios';
import catA from './__fixtures__/catA2025.json';

// 43 municipios de categoría A 2025 (Supabase, leído 2026-10-13), recortados a los campos de los indicadores.
const filas = catA as unknown as Municipality[];
const sigua = filas.find((m) => m.name === 'Siguatepeque')!;

// Valores de referencia de la Fase 3 (N = 43). Tolerancia: ±1 en percentil.
const REF: [ClaveSemaforo, number, number, number][] = [
  // clave, valor, mediana, percentil
  ['autonomia',                     75.5,        68.3,       65],
  ['propiosPerCapita',              1210,        1183,       51],
  ['funcionamientoSobreCorrientes', 56.4,        55.1,       56],
  ['inversionSobreGasto',           47.4,        23.4,       86],
  ['servicioDeudaSobreCorrientes',  3.9,         0.0,        51],
  ['balanceSobreIngresos',          35.2,        9.8,        98],
  ['ibiPerCapita',                  100,         110,        44],
  ['inversionPerCapita',            807,         462,        74],
  ['dependenciaTransferencias',     13.0,        31.7,       21],
  ['resultadoSinBalance',           -12_200_000, -6_700_000, 35],
];

describe('comparacionPares — Siguatepeque 2025', () => {
  it.each(REF)('%s', (clave, valor, med, pct) => {
    const c = comparacionPares(filas, sigua, clave);
    const v = indicadoresMunicipio(sigua)[clave] as number;
    const escala = Math.abs(valor) >= 1e6 ? 1e6 : 1;          // montos en millones (±0.1 M)
    const tol = escala === 1e6 ? 0.1 : clave.endsWith('PerCapita') ? 1 : 0.1; // per cápita en lempiras enteros
    expect(c.n).toBe(43);
    expect(Math.abs(v / escala - valor / escala)).toBeLessThanOrEqual(tol);
    expect(Math.abs((c.mediana as number) / escala - med / escala)).toBeLessThanOrEqual(tol);
    expect(Math.abs((c.percentil as number) - pct)).toBeLessThanOrEqual(1);
  });

  it('fila excluida: mediana de los pares, sin percentil', () => {
    const excluida = { ...sigua, transferencias_art91: 0, otras_transferencias: 0 } as Municipality;
    const c = comparacionPares(filas, excluida, 'autonomia');
    expect(c.percentil).toBeNull();
    expect(c.mediana).not.toBeNull();
  });
});

describe('semaforo', () => {
  const comp = (k: ClaveSemaforo) => comparacionPares(filas, sigua, k);
  const s = (k: ClaveSemaforo) => semaforo(k, indicadoresMunicipio(sigua)[k] as number, comp(k).percentil);

  it('Siguatepeque 2025 con reglas estrictas', () => {
    expect(s('autonomia')).toEqual({ etiqueta: 'EN LA MEDIANA', tono: 'gris' });             // P65
    expect(s('propiosPerCapita')).toEqual({ etiqueta: 'EN LA MEDIANA', tono: 'gris' });      // P51
    expect(s('funcionamientoSobreCorrientes').etiqueta).toBe('EN LA MEDIANA');               // fav 44
    expect(s('inversionSobreGasto')).toEqual({ etiqueta: 'SOBRE LA MEDIANA', tono: 'turquesa' }); // P86
    expect(s('servicioDeudaSobreCorrientes').etiqueta).toBe('EN LA MEDIANA');                // fav 49
    expect(s('balanceSobreIngresos')).toEqual({ etiqueta: 'ALERTA', tono: 'naranja' });      // 35.2 % ≥ 25 %
    expect(s('dependenciaTransferencias')).toEqual({ etiqueta: 'SOBRE LA MEDIANA', tono: 'turquesa' }); // P21 → fav 79
  });

  it('bordes y alertas', () => {
    expect(semaforo('autonomia', 50, 70).etiqueta).toBe('SOBRE LA MEDIANA');
    expect(semaforo('autonomia', 50, 30).etiqueta).toBe('BAJO LA MEDIANA');
    expect(semaforo('autonomia', 50, 31).etiqueta).toBe('EN LA MEDIANA');
    expect(semaforo('funcionamientoSobreCorrientes', 90, 75)).toEqual({ etiqueta: 'BAJO LA MEDIANA', tono: 'naranja' });
    expect(semaforo('servicioDeudaSobreCorrientes', 30.1, 0).etiqueta).toBe('ALERTA');      // > 30 se impone
    expect(semaforo('servicioDeudaSobreCorrientes', 30, 0).etiqueta).toBe('SOBRE LA MEDIANA');
    expect(semaforo('balanceSobreIngresos', 24.9, 50).etiqueta).toBe('EN LA MEDIANA');
    expect(semaforo('autonomia', 50, null)).toEqual({ etiqueta: 'SIN COMPARACIÓN', tono: 'gris' });
  });
});

describe('lecturaSimho', () => {
  const comps = Object.fromEntries(
    REF.map(([k]) => [k, comparacionPares(filas, sigua, k)]),
  ) as Record<ClaveSemaforo, Comparacion>;

  it('Siguatepeque 2025: fortalezas, alerta de balance y déficit en 2 frases', () => {
    const t = lecturaSimho(sigua, comps);
    expect(t).toBe(
      'Inversión alta (47.4 % del gasto, P86 de su categoría) y baja dependencia de transferencias (13.0 %, P21), '
      + 'pero acumula L 106.7 M de recursos de balance, el 35 % de sus ingresos (P98). '
      + 'Sin ese saldo, el año cierra con un déficit de L 12.2 M.',
    );
    expect(t.split('. ').length).toBeLessThanOrEqual(2);
  });

  it('sin comparaciones ni alertas ni déficit → frase neutra', () => {
    const neutra = { ...sigua, recursos_balance: 0, total_egresos: 100 } as Municipality;
    expect(lecturaSimho(neutra, {})).toBe('Indicadores en línea con la mediana de su categoría.');
  });
});

describe('buscador por código INE — homónimos', () => {
  const homonimos = [
    { department: 'COPAN', code: 9, name: 'Concepción', year: 2025 },
    { department: 'INTIBUCA', code: 3, name: 'Concepción', year: 2025 },
    { department: 'INTIBUCA', code: 3, name: 'Concepción', year: 2024 },
  ] as Municipality[];

  it('una opción por municipio, con departamento, y navegación por INE', () => {
    const ops = opcionesMunicipios(homonimos);
    expect(ops).toEqual([
      { ine: '0409', etiqueta: 'Concepción — Copán' },
      { ine: '1003', etiqueta: 'Concepción — Intibucá' },
    ]);
    expect(ineDeEtiqueta('Concepción — Intibucá', ops)).toBe('1003');
    expect(ineDeEtiqueta('Concepción', ops)).toBeNull();
    expect(filasPorINE(homonimos, '1003')).toHaveLength(2);
  });
});
