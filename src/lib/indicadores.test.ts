import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import { indicadoresMunicipio, indicadoresAgregados, mediana } from './indicadores';

const M = 1e6;
const row = (o: Partial<Municipality>) => o as Municipality;

// Siguatepeque (Comayagua, 03-18), 2025 — insumos del plan §2, en millones redondeados.
const siguatepeque = row({
  ingresos_recaudados: 303.0 * M, recursos_balance: 106.7 * M, prestamos: 0,
  ingresos_tributarios: 134.3 * M, tasas_servicios: 34.7 * M, derechos: 39.8 * M,
  ingresos_no_tributarios: 13.9 * M, transferencias_art91: 25.6 * M, impuesto_bi: 12.3 * M,
  population: 122477, gastos_funcionamiento: 83.5 * M, bienes_capitalizables: 98.9 * M,
  servicios_deuda: 5.7 * M, total_egresos: 208.5 * M, presupuesto_municipal: 198.7 * M,
});

// Tolerancia ±0.1 en la unidad mostrada (millones o %); per cápita se muestra en lempiras enteros → ±1.
describe('Siguatepeque 2025', () => {
  const r = indicadoresMunicipio(siguatepeque);
  it.each([
    ['ingresosCorrientes', r.ingresosCorrientes / M, 148.2],
    ['ingresosDelAnio', r.ingresosDelAnio / M, 196.3],
    ['autonomia', r.autonomia, 75.5],
    ['dependenciaTransferencias', r.dependenciaTransferencias, 13.0],
    ['funcionamientoSobreCorrientes', r.funcionamientoSobreCorrientes, 56.3],
    ['inversionSobreGasto', r.inversionSobreGasto, 47.4],
    ['servicioDeudaSobreCorrientes', r.servicioDeudaSobreCorrientes, 3.8],
    ['ahorroCorriente', r.ahorroCorriente / M, 64.7],
    ['balanceSobreIngresos', r.balanceSobreIngresos, 35.2],
    ['resultadoConBalance', r.resultadoConBalance / M, 94.5],
    ['resultadoSinBalance', r.resultadoSinBalance / M, -12.2],
  ])('%s', (_k, got, want) => expect(Math.abs((got as number) - want)).toBeLessThanOrEqual(0.1));

  it.each([
    ['propiosPerCapita', r.propiosPerCapita, 1210],
    ['ibiPerCapita', r.ibiPerCapita, 100],
    ['inversionPerCapita', r.inversionPerCapita, 808],
  ])('%s', (_k, got, want) => expect(Math.abs((got as number) - want)).toBeLessThanOrEqual(1));
});

describe('bordes', () => {
  it('fila vacía: ratios null, montos 0, sin NaN', () => {
    const r = indicadoresMunicipio(row({}));
    expect(r.autonomia).toBeNull();
    expect(r.propiosPerCapita).toBeNull();
    expect(r.ejecucion).toBeNull();
    expect(r.ahorroCorriente).toBe(0);
    Object.values(r).forEach((v) => expect(Number.isNaN(v)).toBe(false));
  });
  it('resta préstamos y bonos; suma otras transferencias; ejecución vs aprobado', () => {
    const r = indicadoresMunicipio(row({
      ingresos_recaudados: 1000, recursos_balance: 100, prestamos: 50, colocacion_bonos: 50,
      transferencias_art91: 120, otras_transferencias: 40, total_egresos: 900, presupuesto_municipal: 1200,
    }));
    expect(r.ingresosDelAnio).toBe(800);
    expect(r.dependenciaTransferencias).toBeCloseTo(20);
    expect(r.resultadoSinBalance).toBe(-100);
    expect(r.ejecucion).toBeCloseTo(75);
  });
  it('agregado = razón de sumas, no media de razones', () => {
    const a = indicadoresAgregados([
      row({ ingresos_recaudados: 100, ingresos_tributarios: 90 }),
      row({ ingresos_recaudados: 900, ingresos_tributarios: 10 }),
    ]);
    expect(a.autonomia).toBeCloseTo(10, 10);
  });
  it('mediana impar, par y sin datos', () => {
    const r = (t: number) => row({ ingresos_recaudados: 100, ingresos_tributarios: t });
    expect(mediana([r(10), r(30), r(20)], 'autonomia')).toBeCloseTo(20);
    expect(mediana([r(10), r(20)], 'autonomia')).toBeCloseTo(15);
    expect(mediana([row({})], 'autonomia')).toBeNull();
  });
});
