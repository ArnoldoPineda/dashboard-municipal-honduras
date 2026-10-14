import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import {
  sumarInsumos, sumarTotales, notaTotales, pieTabla, mediana, indicadoresAgregados,
  excluirDeTotales, excluirDeRazones, excluirDeEstadisticas, sinLiquidacion, sinArt91, rendicionParcial,
} from './indicadores';

const fila = (o: Record<string, unknown>) => ({
  department: 'X', code: 1, year: 2023, total_egresos: 50, ingresos_recaudados: 100,
  ingresos_tributarios: 100, ingresos_no_tributarios: 0, transferencias_art91: 10, otras_transferencias: 0,
  presupuesto_municipal: 1000, population: 10, ...o,
}) as unknown as Municipality;

const ok1 = fila({ code: 1, ingresos_tributarios: 100 });
const ok2 = fila({ code: 2, ingresos_tributarios: 300 });
// sin liquidación: egresos 0 y corrientes 0 (con montos "trampa" para detectar fugas)
const sinLiq = fila({ code: 3, total_egresos: 0, ingresos_tributarios: 0, transferencias_art91: 5000, presupuesto_municipal: 99999, population: 999 });
const s91 = fila({ code: 4, ingresos_tributarios: 1000, transferencias_art91: 0, presupuesto_municipal: 7, population: 3 });
const parcial = fila({ department: 'GRACIAS A DIOS', code: 6, year: 2021, ingresos_tributarios: 5000, presupuesto_municipal: 11, population: 5 });

describe('clasificación', () => {
  it('cada fila cae en una sola categoría', () => {
    expect([sinLiquidacion(sinLiq), sinArt91(sinLiq), rendicionParcial(sinLiq)]).toEqual([true, false, false]);
    expect([sinLiquidacion(s91), sinArt91(s91), rendicionParcial(s91)]).toEqual([false, true, false]);
    expect([sinLiquidacion(parcial), sinArt91(parcial), rendicionParcial(parcial)]).toEqual([false, false, true]);
  });
  it('excluirDeEstadisticas === excluirDeRazones', () => {
    expect(excluirDeEstadisticas).toBe(excluirDeRazones);
  });
  it('niveles por tipo de fila', () => {
    expect([ok1, sinLiq, s91, parcial].map(excluirDeTotales)).toEqual([false, true, false, false]);
    expect([ok1, sinLiq, s91, parcial].map(excluirDeRazones)).toEqual([false, true, true, true]);
  });
  it('sin liquidación gana aunque esté en la clave de rendición parcial', () => {
    const f = fila({ department: 'GRACIAS A DIOS', code: 6, year: 2021, total_egresos: 0, ingresos_tributarios: 0 });
    expect(rendicionParcial(f)).toBe(false);
    expect(excluirDeTotales(f)).toBe(true);
  });
});

describe('sumas', () => {
  it('sin liquidación queda fuera de ambos niveles', () => {
    expect(sumarTotales([ok1, sinLiq]).presupuesto).toBe(1000);
    expect(sumarInsumos([ok1, sinLiq], 'razones').presupuesto).toBe(1000);
    expect(sumarTotales([sinLiq]).poblacion).toBe(0);
  });
  it('sin Art. 91 suma en totales, no en razones, ni mediana ni agregados', () => {
    const rows = [ok1, ok2, s91];
    expect(sumarTotales(rows).ingresosCorrientes).toBe(1400);
    expect(sumarTotales(rows).poblacion).toBe(23);
    expect(sumarInsumos(rows, 'razones').ingresosCorrientes).toBe(400);
    expect(sumarInsumos(rows).poblacion).toBe(20); // nivel por defecto = razones
    expect(mediana(rows, 'ingresosCorrientes')).toBe(200);
    expect(indicadoresAgregados(rows).ingresosCorrientes).toBe(400);
  });
  it('rendición parcial se comporta igual que sin Art. 91', () => {
    const rows = [ok1, ok2, parcial];
    expect(sumarTotales(rows).ingresosCorrientes).toBe(5400);
    expect(sumarInsumos(rows, 'razones').ingresosCorrientes).toBe(400);
    expect(mediana(rows, 'ingresosCorrientes')).toBe(200);
    expect(indicadoresAgregados(rows).ingresosCorrientes).toBe(400);
  });
  it('solo filas excluidas de razones: mediana null, agregado sin denominador', () => {
    expect(mediana([s91, parcial], 'ingresosCorrientes')).toBeNull();
    expect(indicadoresAgregados([s91, parcial]).autonomia).toBeNull();
  });
});

describe('notaTotales', () => {
  it('0 casos (incluye lista vacía y sin liquidación) → null', () => {
    expect(notaTotales([])).toBeNull();
    expect(notaTotales([ok1, sinLiq])).toBeNull();
  });
  it('1 caso', () => {
    expect(notaTotales([ok1, s91])).toMatch(/^Incluye 1 municipio\(s\) sin transferencia Art\. 91/);
    expect(notaTotales([ok1, parcial])).toBe('Incluye 1 municipio(s) con rendición parcial (dato incompleto).');
  });
  it('2 casos', () => {
    expect(notaTotales([s91, fila({ code: 9, transferencias_art91: 0 })])).toMatch(/^Incluye 2 municipio\(s\) sin transferencia Art\. 91/);
  });
  it('mezcla sin Art. 91 + rendición parcial: ambas frases, en ese orden', () => {
    expect(notaTotales([ok1, s91, parcial, sinLiq])).toBe(
      'Incluye 1 municipio(s) sin transferencia Art. 91 en la fuente; las transferencias pueden estar subestimadas. '
      + 'Incluye 1 municipio(s) con rendición parcial (dato incompleto).');
  });
});

describe('pieTabla', () => {
  it('suma con nivel totales y mediana con nivel razones sobre la mezcla', () => {
    const rows = [ok1, ok2, sinLiq, s91, parcial];
    const v = (m: Municipality) => Number(m.ingresos_tributarios);
    const pie = pieTabla(rows, [
      { clave: 's', agregacion: 'suma', valor: v },
      { clave: 'm', agregacion: 'mediana', valor: v },
      { clave: 'n', agregacion: 'ninguna', valor: v },
    ]);
    expect(pie.s).toBe(100 + 300 + 1000 + 5000);
    expect(pie.m).toBe(200);
    expect(pie.n).toBeNull();
  });
  it('mediana null si solo hay filas excluidas de razones; suma sigue viva', () => {
    const pie = pieTabla([s91, parcial], [
      { clave: 's', agregacion: 'suma', valor: () => 1 },
      { clave: 'm', agregacion: 'mediana', valor: () => 1 },
    ]);
    expect(pie).toEqual({ s: 2, m: null });
  });
});
