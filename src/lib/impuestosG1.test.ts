// G1 = Impuestos + Tasas por servicios + Derechos, para todos los municipios 2021–2025 (tolerancia L 1).
// Fixture: lectura de Supabase (anon, solo lectura) con los campos de G1; ver su campo "fuente".
import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import { impuestosG1, CAMPOS_IMPUESTOS_G1 } from './indicadores';
import datos from './__fixtures__/g1_2021_2025.json';

const filas = (datos.filas as unknown[][]).map((f) => Object.fromEntries(datos.campos.map((c, i) => [c, f[i]])) as unknown as Municipality);
const num = (v: unknown) => Number(v) || 0;
const TOLERANCIA = 1; // L

describe('Impuestos de G1', () => {
  it('el fixture trae los 298 municipios de cada año 2021–2025 y los 8 campos de impuestos', () => {
    const porAnio = filas.reduce<Record<number, number>>((a, m) => ({ ...a, [m.year]: (a[m.year] ?? 0) + 1 }), {});
    expect(porAnio).toEqual({ 2021: 298, 2022: 298, 2023: 298, 2024: 298, 2025: 298 });
    CAMPOS_IMPUESTOS_G1.forEach((c) => expect(datos.campos).toContain(c));
  });

  it('Impuestos + Tasas + Derechos = Ingresos Tributarios (G1) en todas las filas, ± L 1', () => {
    const noCuadran = filas
      .map((m) => ({ m, dif: impuestosG1(m) + num(m.tasas_servicios) + num(m.derechos) - num(m.ingresos_tributarios) }))
      .filter(({ dif }) => Math.abs(dif) > TOLERANCIA)
      .map(({ m, dif }) => `${m.year} ${m.department} ${m.code} ${m.name}: diferencia L ${dif.toFixed(2)}`);
    expect(noCuadran).toEqual([]);
  });

  it('Siguatepeque 2021: Impuestos 30,797,096 · IBI 4,815,328 · G1 71.96 M', () => {
    const s = filas.find((m) => m.year === 2021 && m.name === 'Siguatepeque')!;
    expect(Math.round(impuestosG1(s))).toBe(30797096);
    expect(Math.round(num(s.impuesto_bi))).toBe(4815328);
    expect(Math.round(num(s.tasas_servicios))).toBe(17178454);
    expect(Math.round(num(s.derechos))).toBe(23988334);
    expect(Math.abs(impuestosG1(s) + num(s.tasas_servicios) + num(s.derechos) - num(s.ingresos_tributarios))).toBeLessThanOrEqual(TOLERANCIA);
  });

  it('nulos cuentan como 0', () => {
    expect(impuestosG1({ impuesto_bi: 5, impuesto_personal: null } as unknown as Municipality)).toBe(5);
  });
});
