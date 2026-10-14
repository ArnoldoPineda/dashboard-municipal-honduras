import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import { IPC, ipcCompleto, ANIO_BASE_REAL, ROTULO_PRECIOS_REALES, tituloGrafico } from './ipc';
import { deflactar, sumarTotales } from '../lib/indicadores';
import fixture from '../lib/__fixtures__/municipios2021_2025.json';

const filas = (fixture.filas as unknown[][]).map(
  (f) => Object.fromEntries(fixture.campos.map((c, i) => [c, f[i]])),
) as unknown as Municipality[];
const ANIOS = [2021, 2022, 2023, 2024, 2025];

describe('IPC BCH (dic-2025 = 100) y precios constantes de 2025', () => {
  it('serie completa 2021–2025 y base 2025', () => {
    expect(ipcCompleto(ANIOS)).toBe(true);
    expect(ANIO_BASE_REAL).toBe(2025);
    expect(ROTULO_PRECIOS_REALES).toBe('Precios constantes de 2025 — IPC promedio anual BCH (dic-2025 = 100)');
  });

  it('deflactar 2021: factor IPC2025 ÷ IPC2021 = 1.2731', () => {
    expect(deflactar(1, 2021, 2025, IPC.valores)).toBeCloseTo(1.2731, 4);
    expect(deflactar(1, 2025, 2025, IPC.valores)).toBe(1);
  });

  // Totales sin las filas sin liquidación (sumarTotales, como Análisis País). Nominal: 19.795 / 22.204 / 28.370 / 31.657 / 32.729.
  // 2023–2024 dan 31.04 y 33.11 (confirmado: los esperados 31.1 y 33.2 salían de nominales redondeados).
  it('presupuesto País real 2021–2025 (mil M): 25.2 / 25.9 / 31.0 / 33.1 / 32.7', () => {
    const real = ANIOS.map((y) => deflactar(sumarTotales(filas.filter((m) => m.year === y)).presupuesto, y, 2025, IPC.valores)! / 1e9);
    [25.201, 25.912, 31.038, 33.111, 32.729].forEach((e, i) => expect(Math.abs(real[i] - e)).toBeLessThanOrEqual(0.001));
  });

  it('títulos de gráficos: "(precios constantes 2025)" solo en Real y solo en montos y per cápita', () => {
    expect(tituloGrafico('Evolución de ingresos', false, false)).toBe('Evolución de ingresos · L');
    expect(tituloGrafico('Evolución de ingresos', false, true)).toBe('Evolución de ingresos · L (precios constantes 2025)');
    expect(tituloGrafico('Estructura de egresos', true, false)).toBe('Estructura de egresos · L/hab.');
    expect(tituloGrafico('Estructura de egresos', true, true)).toBe('Estructura de egresos · L/hab. (precios constantes 2025)');
    expect(tituloGrafico('Autonomía (%)', false, true)).toBe('Autonomía (%)');
  });
});
