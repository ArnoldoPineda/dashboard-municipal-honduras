import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import {
  porCapita, deflactar, variacionPct, tcac, filasDeAlcance, indicadoresPorAnio, pieTabla,
  sumarInsumos, indicadoresMunicipio, excluirDeEstadisticas,
} from './indicadores';
import { fmtL, fmtPct, fmtNum } from './formato';
import { IPC, ipcCompleto } from '../data/ipc';
import fixture from './__fixtures__/municipios2021_2025.json';

const filas = (fixture.filas as unknown[][]).map(
  (f) => Object.fromEntries(fixture.campos.map((c, i) => [c, f[i]])),
) as unknown as Municipality[];
const de = (anio: number) => filas.filter((m) => m.year === anio);
const cerca = (v: number | null | undefined, ref: number, tol = 0.05) => expect(Math.abs((v as number) - ref)).toBeLessThanOrEqual(tol);

describe('referencias 2025', () => {
  it('país: autonomía agregada 60.1 % y mediana 17.0 %', () => {
    const r = indicadoresPorAnio(filas, [2025])[2025].autonomia;
    cerca(r.agregado, 60.1);
    cerca(r.mediana, 17.0);
  });
  it('ingresos corrientes nacionales (295 en estadísticas): L 13,752,143,869.82 → "L 13,752,143,870"', () => {
    const c = sumarInsumos(de(2025)).ingresosCorrientes;
    expect(Math.abs(c - 13752143869.82)).toBeLessThan(0.01);
    expect(fmtL(c, { completo: true })).toBe('L 13,752,143,870');
  });
  it('Siguatepeque (0318), alcance municipio: autonomía 75.5 %, resultado sin balance −L 12.2 M', () => {
    const f = filasDeAlcance(filas, { tipo: 'municipio', ine: '0318' }).filter((m) => m.year === 2025);
    expect(f).toHaveLength(1);
    cerca(indicadoresPorAnio(f, [2025])[2025].autonomia.mediana, 75.5);
    expect(fmtL(indicadoresMunicipio(f[0]).resultadoSinBalance)).toBe('−L 12.2 M');
  });
  it('alcances: 298 filas en el país, 18 departamentos, categorías A–D suman 298', () => {
    const y = de(2025);
    expect(filasDeAlcance(y, { tipo: 'pais' })).toHaveLength(298);
    const porDepto = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18']
      .map((cod) => filasDeAlcance(y, { tipo: 'departamento', cod }).length);
    expect(porDepto.every((x) => x > 0)).toBe(true);
    expect(porDepto.reduce((s, x) => s + x, 0)).toBe(298);
    expect(['A', 'B', 'C', 'D'].map((categoria) => filasDeAlcance(y, { tipo: 'categoria', categoria }).length).reduce((s, x) => s + x, 0)).toBe(298);
  });
  it('pie de la Base de Datos: mediana de autonomía 17.0 %, total de corrientes sin excluidos', () => {
    const pie = pieTabla(de(2025), [
      { clave: 'aut', agregacion: 'mediana', valor: (m) => indicadoresMunicipio(m).autonomia },
      { clave: 'corr', agregacion: 'suma', valor: (m) => indicadoresMunicipio(m).ingresosCorrientes },
      { clave: 'nombre', agregacion: 'ninguna', valor: () => 1 },
    ]);
    cerca(pie.aut, 17.0);
    expect(Math.abs((pie.corr as number) - 13752143869.82)).toBeLessThan(0.01);
    expect(pie.nombre).toBeNull();
    expect(de(2025).filter(excluirDeEstadisticas)).toHaveLength(3);
  });
});

describe('casos borde', () => {
  it('porCapita: denominador 0, negativo o nulo → null', () => {
    expect(porCapita(1000, 0)).toBeNull();
    expect(porCapita(1000, -5)).toBeNull();
    expect(porCapita(1000, null)).toBeNull();
    expect(porCapita(null, 10)).toBeNull();
    expect(porCapita(1000, 4)).toBe(250);
  });
  it('deflactar: IPC ausente → null; a precios del año base', () => {
    expect(deflactar(100, 2021, 2025, {})).toBeNull();
    expect(deflactar(100, 2021, 2025, { 2021: 100, 2025: null })).toBeNull();
    expect(deflactar(100, 2021, 2025, { 2021: 0, 2025: 120 })).toBeNull();
    expect(deflactar(100, 2021, 2025, { 2021: 100, 2025: 125 })).toBe(125);
    expect(deflactar(100, 2025, 2025, { 2025: 125 })).toBe(100);
  });
  it('variacionPct: anterior 0 o año sin dato → null; usa |anterior| con negativos', () => {
    expect(variacionPct(0, 10)).toBeNull();
    expect(variacionPct(null, 10)).toBeNull();
    expect(variacionPct(10, undefined)).toBeNull();
    expect(variacionPct(100, 110)).toBeCloseTo(10);
    expect(variacionPct(-100, -50)).toBeCloseTo(50);
  });
  it('tcac: extremos ≤ 0, años < 1 o sin dato → null', () => {
    expect(tcac(100, 121, 2)).toBeCloseTo(10);
    expect(tcac(0, 121, 2)).toBeNull();
    expect(tcac(-5, 121, 2)).toBeNull();
    expect(tcac(100, -1, 2)).toBeNull();
    expect(tcac(100, 121, 0)).toBeNull();
    expect(tcac(null, 121, 2)).toBeNull();
  });
  it('indicadoresPorAnio: año sin filas → nulls', () => {
    const r = indicadoresPorAnio(filas, [2019])[2019];
    expect(r.autonomia).toEqual({ mediana: null, agregado: null });
  });
  it('pieTabla: grupo vacío o sin valores → null', () => {
    expect(pieTabla([], [{ clave: 'x', agregacion: 'suma', valor: () => 1 }]).x).toBeNull();
  });
  it('IPC: la serie está pendiente (no se inventan valores) y "Real" queda deshabilitado', () => {
    expect(Object.values(IPC.valores).every((v) => v == null)).toBe(true);
    expect(ipcCompleto([2021, 2025])).toBe(false);
  });
  it('fmtPct y fmtNum', () => {
    expect(fmtPct(60.06)).toBe('60.1 %');
    expect(fmtPct(null)).toBe('—');
    expect(fmtNum(9959997.4)).toBe('9,959,997');
    expect(fmtNum(NaN)).toBe('—');
  });
});
