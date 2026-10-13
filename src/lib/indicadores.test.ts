import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import { indicadoresMunicipio, indicadoresAgregados, mediana, atipicos, sinLiquidacion, sumarInsumos, datoIncompleto, excluirDeEstadisticas, notaDatoIncompleto, sinArt91, ROTULO_SIN_ART91, ROTULO_RENDICION_PARCIAL } from './indicadores';

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

// Fila exacta de Supabase `municipalities`, Siguatepeque 2025 (leída 2026-10-13, anon key, solo lectura).
// Solo campos no nulos ni cero; el resto se omite.
const siguatepequeExacta = row({
  code: 18, name: 'Siguatepeque', department: 'COMAYAGUA', year: 2025, population: 122477,
  presupuesto_municipal: 198668937.96, gastos_presupuestados: 198668937.96,
  ingresos_propios: 169627706.56, ingresos_recaudados: 302985517.61, autonomia_financiera: 55.985417355275416,
  ingresos_corrientes: 148169116.66, ingresos_tributarios: 134312058.74, impuesto_bi: 12270584.66,
  impuesto_personal: 4844856.15, impuesto_industria: 4463259.13, impuesto_comercio: 18043571.32,
  impuesto_servicios: 16568066.87, impuesto_extraccion: 426994.73, impuesto_telecomunicaciones: 3221069.26,
  tasas_servicios: 34696007.96, derechos: 39777648.66, ingresos_no_tributarios: 13857057.92,
  ingresos_capital: 154816400.95, venta_activos: 5958575.06, contribuciones: 80934.34,
  transferencias_art91: 25574594.99, subsidios: 350000, herencias_legados: 696194.32,
  otros_ingresos_capital: 15419080.5, recursos_balance: 106737021.74, gastos_funcionamiento: 83517490.73,
  servicios_personales: 56344503.05, servicios_no_personales: 5202059.26, materiales_suministro: 2230515.48,
  transferencias_corrientes: 430081.86, otros_gastos: 19310331.08, gastos_capital_deuda: 124960128.16,
  bienes_capitalizables: 98879306.85, transferencias_capital: 20360352.01, servicios_deuda: 5720469.3,
  total_egresos: 208477618.89, superavit_deficit: 94507898.72, gasto_corriente: 195202301.7,
  ingreso_corriente_ajustado: 195202301.7,
});

describe('Siguatepeque 2025 — fila exacta de Supabase', () => {
  const r = indicadoresMunicipio(siguatepequeExacta);
  it.each([
    ['ingresosCorrientes', r.ingresosCorrientes / M, 148.2],
    ['ingresosDelAnio', r.ingresosDelAnio / M, 196.2],
    ['autonomia', r.autonomia, 75.5],
    ['dependenciaTransferencias', r.dependenciaTransferencias, 13.0],
    ['funcionamientoSobreCorrientes', r.funcionamientoSobreCorrientes, 56.4],
    ['inversionSobreGasto', r.inversionSobreGasto, 47.4],
    ['servicioDeudaSobreCorrientes', r.servicioDeudaSobreCorrientes, 3.9],
    ['ahorroCorriente', r.ahorroCorriente / M, 64.7],
    ['balanceSobreIngresos', r.balanceSobreIngresos, 35.2],
    ['resultadoConBalance', r.resultadoConBalance / M, 94.5],
    ['resultadoSinBalance', r.resultadoSinBalance / M, -12.2],
    ['ejecucion', r.ejecucion, 104.9],
  ])('%s', (_k, got, want) => expect(Math.abs((got as number) - want)).toBeLessThanOrEqual(0.1));

  // Per cápita se muestra en lempiras enteros.
  it.each([
    ['propiosPerCapita', r.propiosPerCapita, 1210],
    ['ibiPerCapita', r.ibiPerCapita, 100],
    ['inversionPerCapita', r.inversionPerCapita, 807],
  ])('%s', (_k, got, want) => expect(Math.round(got as number)).toBe(want));

  it('resultado con balance = superavit_deficit de SEFIN', () => {
    expect(r.resultadoConBalance).toBeCloseTo(94507898.72, 1);
  });
  it('sin atípicos', () => expect(atipicos(siguatepequeExacta)).toEqual([]));
});

describe('sin liquidación', () => {
  const sinLiq = row({ ingresos_recaudados: 10000, presupuesto_municipal: 500, population: 9 });
  const normal = row({ ingresos_recaudados: 100, ingresos_tributarios: 40, transferencias_art91: 10, total_egresos: 90, presupuesto_municipal: 80, population: 4 });
  it('egresos 0 y corrientes 0 → sin liquidación; Siguatepeque no', () => {
    expect(sinLiquidacion(sinLiq)).toBe(true);
    expect(sinLiquidacion(normal)).toBe(false);
    expect(sinLiquidacion(siguatepequeExacta)).toBe(false);
    expect(sinLiquidacion(row({ total_egresos: 0, ingresos_tributarios: 5 }))).toBe(false);
  });
  it('fuera de totales y medianas', () => {
    expect(sumarInsumos([sinLiq, normal])).toMatchObject({ presupuesto: 80, poblacion: 4, ingresosTotales: 100 });
    expect(indicadoresAgregados([sinLiq, normal]).autonomia).toBeCloseTo(40);
    expect(mediana([sinLiq, normal], 'autonomia')).toBeCloseTo(40);
  });
});

describe('dato incompleto', () => {
  it('Art. 91 + otras = 0 con corrientes > 0 → sin Art. 91; con Art. 91 o sin corrientes no', () => {
    const r = (art91: number, otras = 0, trib = 500) =>
      row({ ingresos_recaudados: 1000, ingresos_tributarios: trib, transferencias_art91: art91, otras_transferencias: otras, total_egresos: 900 });
    expect(sinArt91(r(0))).toBe(true);
    expect(datoIncompleto(r(0))).toBe(true);
    expect(notaDatoIncompleto(r(0))).toBe(ROTULO_SIN_ART91);
    expect(atipicos(r(0))).toContain(ROTULO_SIN_ART91);
    expect(datoIncompleto(r(1))).toBe(false);          // Juticalpa 2025: 98.7 % pero con Art. 91
    expect(datoIncompleto(r(0, 5))).toBe(false);       // otras transferencias cuentan
    expect(datoIncompleto(row({ ingresos_recaudados: 100, total_egresos: 50 }))).toBe(false); // corrientes = 0
    expect(datoIncompleto(row({ ingresos_recaudados: 100 }))).toBe(false); // sin liquidación
    expect(datoIncompleto(siguatepequeExacta)).toBe(false);
  });
  it('rendición parcial (Wampusirpe 2021, San Antonio de Flores 2022) → incompleto; otro año no', () => {
    const w = (year: number) => row({ department: 'GRACIAS A DIOS', code: 6, year, ingresos_recaudados: 100, ingresos_tributarios: 10, total_egresos: 50 });
    expect(datoIncompleto(w(2021))).toBe(true);
    expect(notaDatoIncompleto(w(2021))).toBe(ROTULO_RENDICION_PARCIAL);
    expect(sinArt91(w(2021))).toBe(false);             // la rendición parcial tiene su propio rótulo
    expect(notaDatoIncompleto(w(2022))).toBe(ROTULO_SIN_ART91); // otro año: solo la regla Art. 91
    expect(datoIncompleto(row({ department: 'EL PARAISO', code: 11, year: 2022, ingresos_recaudados: 1, ingresos_tributarios: 0.5, total_egresos: 1 }))).toBe(true);
  });
  it('excluirDeEstadisticas: fuera de sumas, agregados y medianas', () => {
    const inc = row({ ingresos_recaudados: 1000, ingresos_tributarios: 1000, total_egresos: 900, population: 7 });
    const ok = row({ ingresos_recaudados: 100, ingresos_tributarios: 20, transferencias_art91: 30, total_egresos: 90, population: 3 });
    expect(excluirDeEstadisticas(inc)).toBe(true);
    expect(excluirDeEstadisticas(ok)).toBe(false);
    expect(sumarInsumos([inc, ok]).poblacion).toBe(3);
    expect(indicadoresAgregados([inc, ok]).autonomia).toBeCloseTo(20);
    expect(mediana([inc, ok], 'autonomia')).toBeCloseTo(20);
  });
});

describe('bordes', () => {
  it('no finitos → null en ratios, 0 en montos', () => {
    const r = indicadoresMunicipio(row({ ingresos_recaudados: Infinity, ingresos_tributarios: NaN, population: '1e999' as any }));
    expect(r.ingresosDelAnio).toBe(0);
    expect(r.autonomia).toBeNull();
    expect(r.propiosPerCapita).toBeNull();
    Object.values(r).forEach((v) => expect(v === null || Number.isFinite(v)).toBe(true));
  });
  it('ingresos corrientes negativos → atípico', () => {
    expect(atipicos(row({ ingresos_tributarios: -5 }))).toContain('Ingresos corrientes negativos');
  });
  it('fila sin liquidación → corrientes en cero y sin egresos', () => {
    const a = atipicos(row({ ingresos_recaudados: 10000, population: 5, presupuesto_municipal: 1 }));
    expect(a).toEqual(expect.arrayContaining(['Ingresos corrientes en cero', 'Sin egresos reportados']));
  });
  it('subtotal SEFIN que no cuadra con sus renglones', () => {
    expect(atipicos(row({ ingresos_tributarios: 100, impuesto_bi: 50 }))).toContain('Tributarios ≠ suma de renglones');
  });
  it('ejecución > 200 %', () => {
    expect(atipicos(row({ total_egresos: 201, presupuesto_municipal: 100 }))).toContain('Egresos > 2 × presupuesto aprobado');
  });
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
      row({ ingresos_recaudados: 100, ingresos_tributarios: 90, transferencias_art91: 1 }),
      row({ ingresos_recaudados: 900, ingresos_tributarios: 10, transferencias_art91: 1 }),
    ]);
    expect(a.autonomia).toBeCloseTo(10, 10);
  });
  it('mediana impar, par y sin datos', () => {
    const r = (t: number) => row({ ingresos_recaudados: 100, ingresos_tributarios: t, transferencias_art91: 1 });
    expect(mediana([r(10), r(30), r(20)], 'autonomia')).toBeCloseTo(20);
    expect(mediana([r(10), r(20)], 'autonomia')).toBeCloseTo(15);
    expect(mediana([row({})], 'autonomia')).toBeNull();
  });
});
