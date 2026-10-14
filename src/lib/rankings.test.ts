import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import {
  rankear, contarExcluidos, paresSugeridos, comparacionPares, excluirDeRazones, inversionCasiNula, atipicos,
  ROTULO_INVERSION_CASI_NULA,
  ROTULO_SIN_LIQUIDACION, ROTULO_SIN_ART91, ROTULO_RENDICION_PARCIAL,
} from './indicadores';
import fixture from './__fixtures__/municipios2021_2025.json';

// 1 490 filas 2021–2025 (Supabase, solo lectura), formato columnar.
const filas = (fixture.filas as unknown[][]).map(
  (f) => Object.fromEntries(fixture.campos.map((c, i) => [c, f[i]])),
) as unknown as Municipality[];
const de = (anio: number) => filas.filter((m) => m.year === anio);

// Fila sintética: autonomía = corrientes ÷ ingresos del año; dependencia = transferencias ÷ ingresos del año.
const fila = (name: string, corrientes: number, transf: number, extra: Partial<Municipality> = {}) => ({
  name, department: 'COMAYAGUA', code: name.length, category: 'B', year: 2025, population: 1000,
  ingresos_recaudados: 100, ingresos_tributarios: corrientes, ingresos_no_tributarios: 0,
  transferencias_art91: transf, otras_transferencias: 0, total_egresos: 100, ...extra,
}) as unknown as Municipality;

describe('rankear — orden según SEMAFORO', () => {
  const a = fila('Alta', 60, 40);   // autonomía 60, dependencia 40
  const b = fila('Media', 30, 70);  // 30, 70
  const c = fila('Baja', 10, 90);   // 10, 90
  const todas = [b, c, a];

  it('"mayor es mejor" (autonomía): de mayor a menor', () => {
    const r = rankear(todas, todas, 'autonomia');
    expect(r.map((x) => x.fila.name)).toEqual(['Alta', 'Media', 'Baja']);
    expect(r.map((x) => x.posicion)).toEqual([1, 2, 3]);
  });

  it('"menor es mejor" (dependencia): de menor a mayor', () => {
    const r = rankear(todas, todas, 'dependenciaTransferencias');
    expect(r.map((x) => x.fila.name)).toEqual(['Alta', 'Media', 'Baja']);
    expect(r[0].valor).toBe(40);
  });

  it('"menor es mejor" (funcionamiento ÷ corrientes)', () => {
    const f = [fila('Cara', 50, 50, { gastos_funcionamiento: 45 }), fila('Barata', 50, 50, { gastos_funcionamiento: 10 })];
    expect(rankear(f, f, 'funcionamientoSobreCorrientes').map((x) => x.fila.name)).toEqual(['Barata', 'Cara']);
  });

  it('empates comparten posición (1, 2, 2, 4)', () => {
    const f = [a, fila('Media bis', 30, 70), b, c];
    expect(rankear(f, f, 'autonomia').map((x) => x.posicion)).toEqual([1, 2, 2, 4]);
  });

  it('sin dato y excluidas al final, sin posición; excluidas con su motivo', () => {
    const sinDato = fila('SinDato', 50, 50, { ingresos_recaudados: 0 });            // ingresos del año 0 → null
    const sin91 = fila('Sin91', 50, 0);                                               // excluida: sin Art. 91
    const sinLiq = fila('SinLiq', 0, 0, { total_egresos: 0 });                        // excluida: sin liquidación
    const f = [sinLiq, sin91, sinDato, c, a, b];
    const r = rankear(f, f, 'autonomia');
    expect(r.map((x) => x.fila.name)).toEqual(['Alta', 'Media', 'Baja', 'SinDato', 'Sin91', 'SinLiq']);
    expect(r.map((x) => x.posicion)).toEqual([1, 2, 3, null, null, null]);
    expect(r[3].motivo).toBeNull();
    expect(r[4].motivo).toBe(ROTULO_SIN_ART91);
    expect(r[5].motivo).toBe(ROTULO_SIN_LIQUIDACION);
    expect(r[4].percentil).toBeNull();
    expect(r[5].valor).toBeNull();                                                     // sin liquidación: sin valor
    expect(rankear(f, f, 'propiosPerCapita').find((x) => x.fila.name === 'SinLiq')!.valor).toBeNull(); // no 0 L/hab.
  });

  it('la posición se cuenta en el filtro; el percentil en la categoría completa', () => {
    const r = rankear(todas, [c, b], 'autonomia');
    expect(r.map((x) => [x.fila.name, x.posicion])).toEqual([['Media', 1], ['Baja', 2]]);
    expect(r[0].percentil).toBe(comparacionPares(todas, b, 'autonomia').percentil); // 33, no 50
  });
});

describe('rankear — 2025 real', () => {
  const anio = de(2025);
  const r = rankear(anio, anio, 'autonomia');

  it('cada municipio aparece una vez; rankeados + excluidos = total', () => {
    expect(r).toHaveLength(anio.length);
    const rankeados = r.filter((x) => x.posicion != null).length;
    const excluidos = r.filter((x) => x.motivo).length;
    expect(excluidos).toBe(anio.filter(excluirDeRazones).length);
    expect(rankeados + excluidos + r.filter((x) => !x.motivo && x.posicion == null).length).toBe(anio.length);
  });

  it('posiciones no decrecientes y valores ordenados de mayor a menor', () => {
    const ok = r.filter((x) => x.posicion != null);
    ok.slice(1).forEach((x, i) => {
      expect(x.posicion!).toBeGreaterThanOrEqual(ok[i].posicion!);
      expect(x.valor!).toBeLessThanOrEqual(ok[i].valor!);
    });
  });

  it('Siguatepeque: percentil igual al de la Ficha (comparacionPares)', () => {
    const s = r.find((x) => x.fila.name === 'Siguatepeque')!;
    expect(s.percentil).toBe(comparacionPares(anio, s.fila, 'autonomia').percentil);
    expect(s.percentil).toBe(65);
  });
});

describe('contarExcluidos', () => {
  it('2025: Pespire sin liquidación + 2 sin Art. 91', () => {
    expect(contarExcluidos(de(2025))).toEqual({ total: 3, sinLiquidacion: 1, sinArt91: 2, rendicionParcial: 0 });
  });
  it('2021–2025: 13 filas (4 sin liquidación, 7 sin Art. 91, 2 rendiciones parciales)', () => {
    expect(contarExcluidos(filas)).toEqual({ total: 13, sinLiquidacion: 4, sinArt91: 7, rendicionParcial: 2 });
  });
  it('coincide con excluirDeRazones en cada año', () => {
    [2021, 2022, 2023, 2024, 2025].forEach((y) => expect(contarExcluidos(de(y)).total).toBe(de(y).filter(excluirDeRazones).length));
  });
  it('rótulo de rendición parcial', () => {
    const rp = filas.find((m) => m.department === 'EL PARAISO' && m.code === 11 && m.year === 2022)!;
    expect(rankear([rp], [rp], 'autonomia')[0].motivo).toBe(ROTULO_RENDICION_PARCIAL);
  });
});

describe('paresSugeridos', () => {
  const anio = de(2025);
  const sigua = anio.find((m) => m.name === 'Siguatepeque')!;

  it('misma categoría, sin excluidos ni el propio ni los ya elegidos, por cercanía de población', () => {
    const p = paresSugeridos(anio, sigua, [], 4);
    expect(p).toHaveLength(4);
    p.forEach((m) => { expect(m.category).toBe(sigua.category); expect(excluirDeRazones(m)).toBe(false); expect(m.name).not.toBe('Siguatepeque'); });
    const dif = p.map((m) => Math.abs((m.population ?? 0) - (sigua.population ?? 0)));
    expect([...dif].sort((x, y) => x - y)).toEqual(dif);
    const sinPrimero = paresSugeridos(anio, sigua, [p[0]], 4);
    expect(sinPrimero).not.toContain(p[0]);
    expect(paresSugeridos(anio, sigua, [], 0)).toEqual([]);
  });
});

describe('inversión casi nula (atípico de fuente, docs/ATIPICOS.md §8)', () => {
  it('2025: 6 filas < L 50 por habitante; Pespire (sin liquidación) no cuenta', () => {
    expect(de(2025).filter(inversionCasiNula).map((m) => m.name).sort()).toEqual(
      ['Jano', 'La Unión', 'Nueva Frontera', 'Texiguat', 'Tomalá', 'Trojes']);
    expect(filas.filter(inversionCasiNula)).toHaveLength(42);
  });
  it('se marca en atipicos() pero no se excluye ni pierde posición', () => {
    const anio = de(2025);
    const tomala = anio.find((m) => m.name === 'Tomalá')!;
    expect(atipicos(tomala)).toContain(ROTULO_INVERSION_CASI_NULA);
    expect(excluirDeRazones(tomala)).toBe(false);
    expect(rankear(anio, anio, 'inversionPerCapita').find((x) => x.fila === tomala)!.posicion).not.toBeNull();
    expect(atipicos(anio.find((m) => m.name === 'Humuya')!)).not.toContain(ROTULO_INVERSION_CASI_NULA);
  });
});
