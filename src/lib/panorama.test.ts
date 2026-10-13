import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import {
  resumenNacional, distribucionAutonomia, resumenPorCategoria, resumenPorDepartamento,
  lecturaNacional, clasesQuintil, mediana, indicadoresAgregados,
} from './indicadores';
import fixture from './__fixtures__/municipios2021_2025.json';

// 1 490 filas 2021–2025 (Supabase, solo lectura), en formato columnar y recortadas a los campos usados.
const filas = (fixture.filas as unknown[][]).map(
  (f) => Object.fromEntries(fixture.campos.map((c, i) => [c, f[i]])),
) as unknown as Municipality[];
const de = (anio: number) => filas.filter((m) => m.year === anio);
const cerca = (v: number | null | undefined, ref: number, tol = 0.1) => expect(Math.abs((v as number) - ref)).toBeLessThanOrEqual(tol);

describe('resumenNacional 2025', () => {
  const r = resumenNacional(filas, 2025);
  it('295 en estadísticas, 3 excluidos, 18 departamentos', () => {
    expect(r.n).toBe(295);
    expect([...r.excluidos].sort()).toEqual(['El Triunfo', 'Pespire', 'San Juan Guarita']);
    expect(r.departamentos).toBe(18);
  });
  it('mediana / agregado de las 4 tarjetas', () => {
    cerca(r.indicadores.autonomia.mediana, 17.0); cerca(r.indicadores.autonomia.agregado, 60.1);
    cerca(r.indicadores.propiosPerCapita.mediana, 357, 1); cerca(r.indicadores.propiosPerCapita.agregado, 1381, 1);
    cerca(r.indicadores.dependenciaTransferencias.mediana, 81.9); cerca(r.indicadores.dependenciaTransferencias.agregado, 34.3);
    cerca(r.indicadores.balanceSobreIngresos.mediana, 14.8); cerca(r.indicadores.balanceSobreIngresos.agregado, 13.4);
  });
});

describe('distribucionAutonomia 2025', () => {
  it('91 · 96 · 52 · 40 · 16 (por valor mostrado a 1 decimal)', () => {
    expect(distribucionAutonomia(de(2025)).map((g) => g.n)).toEqual([91, 96, 52, 40, 16]);
  });
  it('un 9.996 % (se muestra 10.0 %) cae en 10–25', () => {
    const fila = { year: 2025, ingresos_recaudados: 1000, ingresos_tributarios: 99.96, transferencias_art91: 1, total_egresos: 1 } as Municipality;
    expect(distribucionAutonomia([fila]).map((g) => g.n)).toEqual([0, 1, 0, 0, 0]);
  });
});

describe('resumenPorCategoria 2025', () => {
  // categoría, n, población, med. autonomía, med. propios/hab., med. dependencia (tolerancia ±0.1; propios ±1)
  const REF: [string, number, number, number, number, number][] = [
    ['A', 43, 5_665_201, 68.3, 1183, 31.7],
    ['B', 40, 1_491_307, 46.9, 765, 53.05],
    ['C', 170, 2_350_137, 13.35, 312, 86.4],
    ['D', 42, 453_352, 5.3, 129.5, 94.5],
  ];
  const r = resumenPorCategoria(de(2025));
  it.each(REF)('%s', (cat, n, pob, aut, ppc, dep) => {
    const c = r.find((x) => x.categoria === cat)!;
    expect(c.n).toBe(n);
    expect(c.poblacion).toBe(pob);
    cerca(c.autonomia, aut); cerca(c.propiosPc, ppc, 1); cerca(c.dependencia, dep);
  });
});

describe('resumenPorDepartamento 2025 — Comayagua', () => {
  const val = (m: Parameters<typeof resumenPorDepartamento>[1]) =>
    resumenPorDepartamento(de(2025), m).find((d) => d.department === 'COMAYAGUA')!;
  it('autonomía = mediana municipal; las demás, agregado Σ/Σ', () => {
    cerca(val('autonomia').valor, 19.2);
    cerca(val('propiosPc').valor, 823, 1);
    cerca(val('dependencia').valor, 43.1);
    cerca(val('inversionPc').valor, 857, 1);
  });
  it('18 departamentos; categoría predominante con conteo', () => {
    const cats = resumenPorDepartamento(de(2025), 'categoria');
    expect(cats).toHaveLength(18);
    const com = cats.find((d) => d.department === 'COMAYAGUA')!;
    const total = Object.values(com.conteo!).reduce((s, x) => s + x, 0);
    expect(total).toBeGreaterThan(0);
    expect(com.conteo![com.categoria!]).toBe(Math.max(...Object.values(com.conteo!)));
  });
  it('empate de categorías → la más alta', () => {
    const f = (category: string, code: number) => ({ department: 'X', code, category, year: 2025, ingresos_recaudados: 10, ingresos_tributarios: 5, transferencias_art91: 1, total_egresos: 5 });
    const r = resumenPorDepartamento([f('C', 1), f('B', 2)] as Municipality[], 'categoria');
    expect(r[0].categoria).toBe('B');
  });
});

describe('tendencia 2021–2025', () => {
  it('mediana y agregado de autonomía', () => {
    const med = [2021, 2022, 2023, 2024, 2025].map((y) => mediana(de(y), 'autonomia'));
    const agg = [2021, 2022, 2023, 2024, 2025].map((y) => indicadoresAgregados(de(y)).autonomia);
    [12.4, 13.7, 13.7, 11.4, 17.0].forEach((ref, i) => cerca(med[i], ref));
    [54.5, 59.8, 52.1, 52.9, 60.1].forEach((ref, i) => cerca(agg[i], ref));
  });
});

describe('lecturaNacional 2025', () => {
  it('frases de referencia', () => {
    const t = lecturaNacional(resumenNacional(filas, 2025));
    expect(t).toContain('menos del 17 %');
    expect(t).toContain('187 de 295 (63 %) no llegan al 25 %');
    expect(t).toContain('la categoría A recauda 9 veces más por habitante que la D');
    expect(t).toContain('agregado nacional (60.1 %)');
  });
});

describe('clasesQuintil', () => {
  const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('mayor es mejor: valores altos → clase 4 (tono claro)', () => {
    const c = clasesQuintil(v, 'mayor');
    expect(c.cortes).toHaveLength(4);
    expect(c.clase(1)).toBe(0);
    expect(c.clase(10)).toBe(4);
    expect(c.rangos[0].desde).toBe(1);
    expect(c.rangos[4].hasta).toBe(10);
  });
  it('menor es mejor (dependencia): valores bajos → clase 4; la leyenda se invierte', () => {
    const c = clasesQuintil(v, 'menor');
    expect(c.clase(1)).toBe(4);
    expect(c.clase(10)).toBe(0);
    expect(c.rangos[4].desde).toBe(1);   // clase clara = rango más bajo
    expect(c.rangos[0].hasta).toBe(10);
  });
  it('sin datos, nulos y no finitos', () => {
    expect(clasesQuintil([], 'mayor').clase(5)).toBeNull();
    expect(clasesQuintil([null, NaN, 3], 'mayor').clase(null)).toBeNull();
    expect(clasesQuintil([3], 'mayor').clase(3)).toBe(4);
  });
});
