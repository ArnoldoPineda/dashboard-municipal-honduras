// Casos borde de las funciones de Panorama (indicadores.ts) y colorMetrica.ts. Sin red ni fixture.
import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import {
  distribucionAutonomia, resumenPorCategoria, resumenNacional, resumenPorDepartamento,
  lecturaNacional, clasesQuintil, ResumenNacional,
} from './indicadores';
import { contraste, textoSobre, colorMetrica, textoClase, SECUENCIAL, SIN_DATO, ID_TRAMA, CATEGORICA } from './colorMetrica';

/** Fila mínima: autonomía = aut % (ingresos 100, tributarios aut), con Art. 91 y egresos > 0 (entra en estadísticas). */
let seq = 0;
const fila = (o: Record<string, unknown> = {}): Municipality => ({
  name: `M${++seq}`, code: seq, department: 'X', category: 'C', year: 2025,
  ingresos_recaudados: 100, ingresos_tributarios: 10, transferencias_art91: 1, total_egresos: 50, population: 1000,
  ...o,
}) as unknown as Municipality;
const conAut = (aut: number, o: Record<string, unknown> = {}) => fila({ ingresos_tributarios: aut, ...o });
const sinLiq = (o: Record<string, unknown> = {}) => fila({ total_egresos: 0, ingresos_tributarios: 0, ingresos_no_tributarios: 0, ...o });

describe('distribucionAutonomia — bordes', () => {
  it('lista vacía → 5 grupos en 0', () => {
    expect(distribucionAutonomia([]).map((g) => g.n)).toEqual([0, 0, 0, 0, 0]);
  });
  it('9.96 % se muestra 10.0 → grupo 10–25', () => {
    expect(distribucionAutonomia([conAut(9.96)]).map((g) => g.n)).toEqual([0, 1, 0, 0, 0]);
  });
  it('9.94 % se muestra 9.9 → grupo < 10', () => {
    expect(distribucionAutonomia([conAut(9.94)]).map((g) => g.n)).toEqual([1, 0, 0, 0, 0]);
  });
  it('cortes exactos 10/25/50/75 caen en el grupo superior; 0 y >100 en los extremos', () => {
    const r = distribucionAutonomia([10, 25, 50, 75, 0, 150].map((a) => conAut(a)));
    expect(r.map((g) => g.n)).toEqual([1, 1, 1, 1, 2]);
  });
  it('autonomía negativa → < 10', () => {
    expect(distribucionAutonomia([conAut(-5)])[0].n).toBe(1);
  });
  it('excluidos y valores no calculables no cuentan; la suma = n en estadísticas', () => {
    const filas = [conAut(30), sinLiq(), conAut(30, { transferencias_art91: 0 }) /* sin Art.91 */,
      fila({ ingresos_recaudados: 0 }) /* denominador 0 → null */];
    expect(distribucionAutonomia(filas).reduce((s, g) => s + g.n, 0)).toBe(1);
  });
  it('NaN / Infinity / null en los montos se tratan como 0 y no rompen', () => {
    const r = distribucionAutonomia([conAut(NaN), conAut(Infinity), conAut(null as unknown as number)]);
    // tributarios no finitos = 0 y no hay no tributarios → corrientes 0 → autonomía 0, y sinLiquidación solo si egresos<=0 (hay 50)
    expect(r.map((g) => g.n)).toEqual([3, 0, 0, 0, 0]);
  });
});

describe('resumenPorCategoria — bordes', () => {
  it('vacío → A–D con n 0, población 0 y medianas null', () => {
    const r = resumenPorCategoria([]);
    expect(r.map((c) => c.categoria)).toEqual(['A', 'B', 'C', 'D']);
    r.forEach((c) => expect(c).toMatchObject({ n: 0, poblacion: 0, autonomia: null, propiosPc: null, dependencia: null }));
  });
  it('categoría desconocida, minúscula o null no se cuenta en A–D', () => {
    const r = resumenPorCategoria([fila({ category: 'E' }), fila({ category: 'a' }), fila({ category: null })]);
    expect(r.reduce((s, c) => s + c.n, 0)).toBe(0);
  });
  it('categoría solo con excluidos → n 0, población 0, medianas null', () => {
    const r = resumenPorCategoria([sinLiq({ category: 'D' })]).find((c) => c.categoria === 'D')!;
    expect(r).toMatchObject({ n: 0, poblacion: 0, autonomia: null });
  });
  it('un solo municipio: mediana = su valor', () => {
    const r = resumenPorCategoria([conAut(40, { category: 'A' })]).find((c) => c.categoria === 'A')!;
    expect(r.n).toBe(1);
    expect(r.autonomia).toBeCloseTo(40);
    expect(r.propiosPc).toBeCloseTo(40 / 1000);
  });
  it('población 0 → propios por habitante null', () => {
    const r = resumenPorCategoria([fila({ category: 'B', population: 0 })]).find((c) => c.categoria === 'B')!;
    expect(r.propiosPc).toBeNull();
  });
});

describe('resumenNacional — bordes', () => {
  it('vacío o año sin filas', () => {
    [resumenNacional([], 2025), resumenNacional([fila()], 1999)].forEach((r) => {
      expect(r.n).toBe(0);
      expect(r.excluidos).toEqual([]);
      expect(r.departamentos).toBe(0);
      expect(r.indicadores.autonomia).toEqual({ mediana: null, agregado: null });
      expect(r.distribucion.map((g) => g.n)).toEqual([0, 0, 0, 0, 0]);
    });
  });
  it('excluidos listados por nombre; sin nombre → cadena vacía; solo cuenta el año pedido', () => {
    const r = resumenNacional([fila(), sinLiq({ name: 'Pespire' }), sinLiq({ name: undefined }), sinLiq({ name: 'Otro año', year: 2024 })], 2025);
    expect(r.n).toBe(1);
    expect(r.excluidos).toEqual(['Pespire', '']);
  });
  it('departamentos: sin distinguir mayúsculas ni espacios; los de solo excluidos no cuentan', () => {
    const r = resumenNacional([fila({ department: 'Cortés' }), fila({ department: ' CORTÉS ' }), sinLiq({ department: 'Solo excl.' }), fila({ department: null })], 2025);
    expect(r.departamentos).toBe(2); // CORTÉS y '' (department null)
  });
});

describe('resumenPorDepartamento — bordes', () => {
  it('vacío → []', () => {
    expect(resumenPorDepartamento([], 'autonomia')).toEqual([]);
    expect(resumenPorDepartamento([], 'categoria')).toEqual([]);
  });
  it('empate de categorías → gana la más alta (A antes que B, y D vs C → C)', () => {
    const r1 = resumenPorDepartamento([fila({ category: 'B' }), fila({ category: 'A' })], 'categoria')[0];
    expect(r1.categoria).toBe('A');
    const r2 = resumenPorDepartamento([fila({ category: 'D' }), fila({ category: 'C' }), fila({ category: 'D' }), fila({ category: 'C' })], 'categoria')[0];
    expect(r2.categoria).toBe('C');
  });
  it('un excluido no cuenta para el empate/mayoría', () => {
    const r = resumenPorDepartamento([fila({ category: 'C' }), sinLiq({ category: 'A' }), sinLiq({ category: 'A' })], 'categoria')[0];
    expect(r.categoria).toBe('C');
    expect(r.conteo).toEqual({ A: 0, B: 0, C: 1, D: 0 });
  });
  it('departamento con todos excluidos: categoria undefined, conteo en 0; numéricas valor null', () => {
    const f = [sinLiq({ category: 'A' }), sinLiq({ category: 'B' })];
    const c = resumenPorDepartamento(f, 'categoria')[0];
    expect(c.categoria).toBeUndefined();
    expect(c.conteo).toEqual({ A: 0, B: 0, C: 0, D: 0 });
    (['autonomia', 'propiosPc', 'dependencia', 'inversionPc'] as const).forEach((m) =>
      expect(resumenPorDepartamento(f, m)[0].valor).toBeNull());
  });
  it('agrupa por departamento normalizado (trim + mayúsculas) y el nombre sale en mayúsculas', () => {
    const r = resumenPorDepartamento([fila({ department: 'cortés' }), fila({ department: ' CORTÉS' })], 'autonomia');
    expect(r).toHaveLength(1);
    expect(r[0].department).toBe('CORTÉS');
  });
  it('department null → grupo "" sin lanzar', () => {
    expect(() => resumenPorDepartamento([fila({ department: null })], 'propiosPc')).not.toThrow();
  });
  it('autonomía: mediana de 3 municipios (no el agregado)', () => {
    const r = resumenPorDepartamento([conAut(10), conAut(20), conAut(90)], 'autonomia')[0];
    expect(r.valor).toBeCloseTo(20);
  });
  it('propios por habitante con población total 0 → null', () => {
    expect(resumenPorDepartamento([fila({ population: 0 })], 'propiosPc')[0].valor).toBeNull();
  });
  it('categoría con nombre de propiedad de Object ("toString", "constructor") no corrompe el conteo', () => {
    const r = resumenPorDepartamento([fila({ category: 'toString' }), fila({ category: 'A' })], 'categoria')[0];
    expect(Object.values(r.conteo!).every(Number.isFinite)).toBe(true);
    expect(r.categoria).toBe('A');
  });
});

describe('lecturaNacional — bordes', () => {
  const SIN = 'Sin datos suficientes para la lectura nacional.';
  const base = (o: Partial<ResumenNacional> = {}): ResumenNacional => {
    const r = resumenNacional([conAut(10), conAut(20), conAut(30)], 2025);
    return { ...r, ...o };
  };
  it('n = 0 → texto de sin datos', () => {
    expect(lecturaNacional(resumenNacional([], 2025))).toBe(SIN);
  });
  it('mediana null → sin datos aunque n > 0', () => {
    const r = base();
    expect(lecturaNacional({ ...r, indicadores: { ...r.indicadores, autonomia: { mediana: null, agregado: 50 } } })).toBe(SIN);
  });
  it('n manual 0 con mediana presente → sin datos (sin dividir entre 0)', () => {
    expect(lecturaNacional(base({ n: 0 }))).toBe(SIN);
  });
  it('agregado null → solo la frase 1, sin "NaN" ni "undefined"', () => {
    const r = base();
    const t = lecturaNacional({ ...r, indicadores: { ...r.indicadores, autonomia: { mediana: 20, agregado: null } } });
    expect(t).toMatch(/^La mitad de los municipios/);
    expect(t).not.toMatch(/NaN|undefined|null/);
    expect(t).not.toContain('agregado nacional');
  });
  it('propiosPc de D = 0 o null → no hay "veces" (sin Infinity)', () => {
    const r = base();
    const cats = r.categorias.map((c) => (c.categoria === 'A' ? { ...c, propiosPc: 1000 } : c.categoria === 'D' ? { ...c, propiosPc: 0 } : c));
    const t = lecturaNacional({ ...r, categorias: cats, indicadores: { ...r.indicadores, autonomia: { mediana: 17, agregado: 60 } } });
    expect(t).not.toMatch(/Infinity|NaN|veces/);
    expect(t).toContain('agregado nacional (60.0 %)');
  });
  it('brecha agregado − mediana exactamente 15 → incluye la frase del agregado; 14.9 no', () => {
    const r = base();
    const con = (agg: number) => lecturaNacional({ ...r, indicadores: { ...r.indicadores, autonomia: { mediana: 20, agregado: agg } } });
    expect(con(35)).toContain('agregado nacional');
    expect(con(34.9)).not.toContain('agregado nacional');
  });
  it('categoría A < 2× D → no se afirma "veces más"', () => {
    const r = base();
    const cats = r.categorias.map((c) => (c.categoria === 'A' ? { ...c, propiosPc: 150 } : c.categoria === 'D' ? { ...c, propiosPc: 100 } : c));
    expect(lecturaNacional({ ...r, categorias: cats })).not.toContain('veces');
  });
});

describe('clasesQuintil — bordes', () => {
  it('lista vacía y solo nulos → sin cortes, clase null, sin rangos', () => {
    [[], [null, undefined, NaN, Infinity, -Infinity]].forEach((v) => {
      const c = clasesQuintil(v, 'mayor');
      expect(c.cortes).toEqual([]);
      expect(c.rangos).toEqual([]);
      expect(c.clase(5)).toBeNull();
    });
  });
  it('un solo valor: rango [v, v], clase definida 0–4', () => {
    ['mayor', 'menor'].forEach((d) => {
      const c = clasesQuintil([7], d as 'mayor' | 'menor');
      expect(c.cortes).toEqual([7, 7, 7, 7]);
      expect(c.clase(7)).toBeGreaterThanOrEqual(0);
      expect(c.clase(7)).toBeLessThanOrEqual(4);
      c.rangos.forEach((r) => { expect(r.desde).toBe(7); expect(r.hasta).toBe(7); });
    });
  });
  it('todos iguales: clases en 0–4, 5 rangos, ninguno invertido', () => {
    ['mayor', 'menor'].forEach((d) => {
      const c = clasesQuintil([5, 5, 5, 5, 5, 5], d as 'mayor' | 'menor');
      expect(c.rangos).toHaveLength(5);
      c.rangos.forEach((r) => expect(r.desde).toBeLessThanOrEqual(r.hasta));
      const k = c.clase(5)!;
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(4);
    });
  });
  it('rangos nunca invertidos ni con huecos (datos normales, ambas direcciones)', () => {
    ['mayor', 'menor'].forEach((d) => {
      const c = clasesQuintil([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5], d as 'mayor' | 'menor');
      c.rangos.forEach((r) => expect(r.desde).toBeLessThanOrEqual(r.hasta));
      for (let k = 0; k < 4; k++) {
        const [a, b] = d === 'mayor' ? [c.rangos[k], c.rangos[k + 1]] : [c.rangos[k + 1], c.rangos[k]];
        expect(a.hasta).toBe(b.desde); // clases contiguas
      }
    });
  });
  it("'menor': el menor valor da clase 4 y el mayor clase 0", () => {
    const c = clasesQuintil([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 'menor');
    expect(c.clase(10)).toBe(4);
    expect(c.clase(100)).toBe(0);
  });
  it("'menor' con muchos empates en el mínimo: el menor valor debe seguir siendo clase 4", () => {
    const c = clasesQuintil([1, 1, 1, 1, 1, 1, 1, 1, 5, 9], 'menor');
    expect(c.clase(1)).toBe(4);
  });
  it("'mayor' con muchos empates en el máximo: el mayor valor debe ser clase 4 y el menor clase 0", () => {
    const c = clasesQuintil([1, 9, 9, 9, 9, 9, 9, 9, 9, 9], 'mayor');
    expect(c.clase(9)).toBe(4);
    expect(c.clase(1)).toBe(0);
  });
  it('valor exactamente en un corte pasa a la clase superior (bruta)', () => {
    const c = clasesQuintil([0, 10, 20, 30, 40], 'mayor');
    expect(c.cortes).toEqual([8, 16, 24, 32]);
    expect(c.clase(8)).toBe(1);
    expect(c.clase(7.999)).toBe(0);
    expect(c.clase(32)).toBe(4);
    // "menor" cuenta en espejo (x <= corte): el valor en el corte queda del lado mejor (claro).
    expect(clasesQuintil([0, 10, 20, 30, 40], 'menor').clase(8)).toBe(4);
  });
  it('fuera de rango: por debajo del mínimo → 0, por encima del máximo → 4 (mayor)', () => {
    const c = clasesQuintil([1, 2, 3, 4, 5], 'mayor');
    expect(c.clase(-100)).toBe(0);
    expect(c.clase(1e9)).toBe(4);
  });
  it('clase(null/undefined/NaN/±Infinity) → null', () => {
    const c = clasesQuintil([1, 2, 3, 4, 5], 'mayor');
    [null, undefined, NaN, Infinity, -Infinity].forEach((x) => expect(c.clase(x)).toBeNull());
  });
  it('no filtra con 0 como falsy: 0 es un valor válido', () => {
    const c = clasesQuintil([0, 0, 5, 10], 'mayor');
    expect(c.clase(0)).not.toBeNull();
    expect(c.rangos[0].desde).toBe(0);
  });
  it('no muta el arreglo de entrada', () => {
    const v = [5, 3, 1];
    clasesQuintil(v, 'mayor');
    expect(v).toEqual([5, 3, 1]);
  });
  it('negativos', () => {
    const c = clasesQuintil([-10, -5, 0, 5, 10], 'mayor');
    expect(c.clase(-10)).toBe(0);
    expect(c.clase(10)).toBe(4);
  });
});

describe('colorMetrica / contraste — bordes', () => {
  const cl = clasesQuintil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'mayor');
  it('excluida=true gana sobre todo (numérica, categoría, sin valor, sin clases)', () => {
    const esperado = `url(#${ID_TRAMA})`;
    expect(colorMetrica('autonomia', { valor: 5, excluida: true }, cl)).toBe(esperado);
    expect(colorMetrica('categoria', { categoria: 'A', excluida: true })).toBe(esperado);
    expect(colorMetrica('propiosPc', { excluida: true })).toBe(esperado);
  });
  it('excluida=false / ausente no activa la trama', () => {
    expect(colorMetrica('autonomia', { valor: 5, excluida: false }, cl)).toBe(SECUENCIAL[cl.clase(5)!]);
  });
  it('categoría desconocida, vacía, null, minúscula → SIN_DATO', () => {
    ['E', '', null, undefined, 'a'].forEach((c) =>
      expect(colorMetrica('categoria', { categoria: c as string | null | undefined })).toBe(SIN_DATO));
  });
  it('categoría con nombre de propiedad de Object ("toString", "constructor", "__proto__") → SIN_DATO', () => {
    ['toString', 'constructor', '__proto__'].forEach((c) =>
      expect(colorMetrica('categoria', { categoria: c })).toBe(SIN_DATO));
  });
  it('categorías A–D devuelven su color', () => {
    Object.entries(CATEGORICA).forEach(([k, v]) => expect(colorMetrica('categoria', { categoria: k })).toBe(v));
  });
  it('métrica numérica sin clases, o valor null/NaN/Infinity → SIN_DATO', () => {
    expect(colorMetrica('autonomia', { valor: 5 })).toBe(SIN_DATO);
    [null, undefined, NaN, Infinity].forEach((v) => expect(colorMetrica('autonomia', { valor: v }, cl)).toBe(SIN_DATO));
  });
  it('métrica numérica ignora la categoría', () => {
    expect(colorMetrica('autonomia', { categoria: 'A' }, cl)).toBe(SIN_DATO);
  });
  it('clases vacías (sin datos) → SIN_DATO', () => {
    expect(colorMetrica('autonomia', { valor: 5 }, clasesQuintil([], 'mayor'))).toBe(SIN_DATO);
  });
  it('dirección menor: valor mínimo → color claro (SECUENCIAL[4])', () => {
    const c = clasesQuintil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'menor');
    expect(colorMetrica('dependencia', { valor: 1 }, c)).toBe(SECUENCIAL[4]);
    expect(colorMetrica('dependencia', { valor: 10 }, c)).toBe(SECUENCIAL[0]);
  });
  it('contraste: negro/blanco = 21, mismo color = 1, simétrico', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#336699', '#336699')).toBeCloseTo(1, 5);
    expect(contraste('#12302d', '#e6edf3')).toBeCloseTo(contraste('#e6edf3', '#12302d'), 10);
  });
  it('textoSobre: fondo negro → claro, fondo blanco → oscuro', () => {
    expect(textoSobre('#000000')).toBe('#e6edf3');
    expect(textoSobre('#ffffff')).toBe('#062621');
  });
  it('textoClase: null → sin dato; 0 → "Clase 1 de 5"; 4 → "Clase 5 de 5"', () => {
    expect(textoClase(null)).toBe('Sin dato comparable');
    expect(textoClase(0)).toContain('Clase 1 de 5');
    expect(textoClase(4)).toContain('Clase 5 de 5');
  });
});
