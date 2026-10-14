// Desglose de los 8 impuestos de G1 (cuadro de Análisis): suma de los 8 = Impuestos y Industria + Comercio + Servicios = su
// subtotal en los 1,490 municipios-año 2021–2025. Las sumas van campo por campo, sin pasar por los helpers que se prueban.
import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import { IMPUESTOS_G1, CAMPOS_IMPUESTOS_G1, CAMPOS_ICS, impuestosG1, impuestosICS } from './indicadores';
import { DICCIONARIO } from './exportar';
import datos from './__fixtures__/g1_2021_2025.json';

const filas = (datos.filas as unknown[][]).map((f) => Object.fromEntries(datos.campos.map((c, i) => [c, f[i]])) as unknown as Municipality);
const num = (v: unknown) => Number(v) || 0;
const id = (m: Municipality) => `${m.year} ${m.department} ${m.code} ${m.name}`;
const OCHO = ['impuesto_bi', 'impuesto_personal', 'impuesto_industria', 'impuesto_comercio', 'impuesto_servicios',
  'impuesto_pecuario', 'impuesto_extraccion', 'impuesto_telecomunicaciones'] as const;

describe('Lista central de impuestos de G1', () => {
  it('trae los 8 impuestos SEFIN, sin repetir, en el orden del cuadro', () => {
    expect([...CAMPOS_IMPUESTOS_G1].sort()).toEqual([...OCHO].sort());
    expect(IMPUESTOS_G1.map((i) => i.etiqueta)).toEqual([
      'IBI (bienes inmuebles)', 'Industria', 'Comercio', 'Servicios', 'Personal o vecinal', 'Telecomunicaciones',
      'Extracción o explotación de recursos', 'Pecuario',
    ]);
    expect(CAMPOS_ICS).toEqual(['impuesto_industria', 'impuesto_comercio', 'impuesto_servicios']);
  });
  it('cada fila del desglose tiene definición en el diccionario de exportación', () => {
    expect([...CAMPOS_IMPUESTOS_G1, 'impuestos_ics', 'impuestos'].filter((k) => !(k in DICCIONARIO))).toEqual([]);
  });
});

describe('Desglose en los 1,490 municipios-año', () => {
  it('hay 1,490 filas', () => expect(filas).toHaveLength(1490));
  it('la suma de los 8 impuestos = fila Impuestos', () => {
    expect(filas.filter((m) => Math.abs(OCHO.reduce((a, c) => a + num(m[c]), 0) - impuestosG1(m)) > 1e-6).map(id)).toEqual([]);
  });
  it('Industria + Comercio + Servicios = subtotal', () => {
    expect(filas.filter((m) => Math.abs(num(m.impuesto_industria) + num(m.impuesto_comercio) + num(m.impuesto_servicios) - impuestosICS(m)) > 1e-6).map(id)).toEqual([]);
  });
});

describe('Siguatepeque (valores del Excel SEFIN)', () => {
  const s = (y: number) => filas.find((m) => m.year === y && m.name === 'Siguatepeque')!;
  const R = (v: unknown) => Math.round(num(v));
  it.each([
    [2021, { impuesto_bi: 4815328, impuesto_personal: 1773151, impuesto_industria: 4216775, impuesto_comercio: 9358377, impuesto_servicios: 8804318, impuesto_extraccion: 77353, impuesto_telecomunicaciones: 1751795, impuesto_pecuario: 0 }],
    [2022, { impuesto_bi: 10519206, impuesto_personal: 2531045, impuesto_industria: 5101116, impuesto_comercio: 12796753, impuesto_servicios: 11767588, impuesto_extraccion: 104299, impuesto_telecomunicaciones: 2746749, impuesto_pecuario: 0 }],
  ])('%i', (y, esperado) => {
    const m = s(y as number);
    Object.entries(esperado).forEach(([c, v]) => expect([c, R(m[c as keyof Municipality])]).toEqual([c, v]));
  });
  it('Pecuario en 0 los 5 años (la fila se oculta con 2021–2025 visibles)', () => {
    expect([2021, 2022, 2023, 2024, 2025].map((y) => num(s(y).impuesto_pecuario))).toEqual([0, 0, 0, 0, 0]);
  });
});
