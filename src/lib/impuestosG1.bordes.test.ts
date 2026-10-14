// Casos borde de impuestosG1 / CAMPOS_IMPUESTOS_G1 y de la suma de aggregate() (AnalyticsPage no exporta aggregate:
// se replica su regla `rows.reduce((acc, r) => acc + impuestosG1(r), 0)`). No duplica impuestosG1.test.ts.
import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import { impuestosG1, CAMPOS_IMPUESTOS_G1 } from './indicadores';
import datos from './__fixtures__/g1_2021_2025.json';

const filas = (datos.filas as unknown[][]).map((f) => Object.fromEntries(datos.campos.map((c, i) => [c, f[i]])) as unknown as Municipality);
const num = (v: unknown) => Number(v) || 0;
const id = (m: Municipality) => `${m.year} ${m.department} ${m.code} ${m.name}`;
const mk = (o: Record<string, unknown>) => o as unknown as Municipality;
const g1 = (m: Municipality) => impuestosG1(m) + num(m.tasas_servicios) + num(m.derechos);

describe('impuestosG1: valores raros', () => {
  it('string numérico cuenta como número', () => {
    expect(impuestosG1(mk({ impuesto_bi: '123.4', impuesto_personal: '10' }))).toBeCloseTo(133.4, 6);
  });
  it('null, undefined, NaN, Infinity, string no numérico cuentan 0 sin romper', () => {
    expect(impuestosG1(mk({ impuesto_bi: null, impuesto_personal: undefined, impuesto_industria: NaN, impuesto_comercio: Infinity, impuesto_servicios: 'abc', impuesto_pecuario: 7 }))).toBe(7);
  });
  it('fila vacía = 0', () => {
    expect(impuestosG1(mk({}))).toBe(0);
  });
  it('string vacío cuenta 0; negativo se suma tal cual', () => {
    expect(impuestosG1(mk({ impuesto_bi: '', impuesto_personal: -5, impuesto_comercio: 8 }))).toBe(3);
  });
  it('CAMPOS_IMPUESTOS_G1: 8 campos únicos, sin IBI duplicado, sin tasas/derechos', () => {
    expect(new Set(CAMPOS_IMPUESTOS_G1).size).toBe(8);
    expect(CAMPOS_IMPUESTOS_G1).not.toContain('tasas_servicios');
    expect(CAMPOS_IMPUESTOS_G1).not.toContain('derechos');
  });
});

describe('fixture 2021–2025', () => {
  it('suma por departamento y por país: Impuestos + Tasas + Derechos = G1 (L 1 por fila agregada)', () => {
    const grupos = new Map<string, Municipality[]>([['PAIS', filas]]);
    filas.forEach((m) => {
      const k = `${m.department}|${m.year}`;
      grupos.set(k, [...(grupos.get(k) ?? []), m]);
    });
    const mal: string[] = [];
    grupos.forEach((rows, k) => {
      const suma = rows.reduce((a, m) => a + g1(m), 0);
      const ref = rows.reduce((a, m) => a + num(m.ingresos_tributarios), 0);
      if (Math.abs(suma - ref) > rows.length) mal.push(`${k}: dif L ${(suma - ref).toFixed(2)}`);
    });
    const pais = filas.reduce((a, m) => a + g1(m), 0) - filas.reduce((a, m) => a + num(m.ingresos_tributarios), 0);
    expect(Math.abs(pais)).toBeLessThanOrEqual(filas.length);
    expect(mal).toEqual([]);
  });

  it('IBI <= Impuestos en todas las filas', () => {
    const exc = filas.filter((m) => num(m.impuesto_bi) > impuestosG1(m) + 1e-6).map((m) => `${id(m)}: IBI ${m.impuesto_bi} > Impuestos ${impuestosG1(m)}`);
    expect(exc).toEqual([]);
  });

  it('ninguna fila con impuestos (total o por campo) negativos', () => {
    const neg = filas.flatMap((m) => CAMPOS_IMPUESTOS_G1.filter((c) => num(m[c]) < 0).map((c) => `${id(m)}: ${c}=${m[c]}`));
    expect(neg).toEqual([]);
  });

  it('ninguna fila con valores no numéricos (string/NaN) en los 8 campos', () => {
    const raros = filas.flatMap((m) => CAMPOS_IMPUESTOS_G1.filter((c) => m[c] !== null && typeof m[c] !== 'number').map((c) => `${id(m)}: ${c}=${JSON.stringify(m[c])}`));
    expect(raros).toEqual([]);
  });
});
