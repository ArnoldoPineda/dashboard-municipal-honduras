import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import {
  rankear, contarExcluidos, paresSugeridos, motivoExcluido, excluirDeRazones, SEMAFORO,
  ROTULO_SIN_LIQUIDACION, ROTULO_SIN_ART91, ROTULO_RENDICION_PARCIAL,
  type ClaveSemaforo,
} from './indicadores';
import fixture from './__fixtures__/municipios2021_2025.json';

const filas = (fixture.filas as unknown[][]).map(
  (f) => Object.fromEntries(fixture.campos.map((c, i) => [c, f[i]])),
) as unknown as Municipality[];
const de = (anio: number) => filas.filter((m) => m.year === anio);

let seq = 0;
const fila = (name: string, corrientes: number, transf: number, extra: Partial<Municipality> = {}) => ({
  name, department: 'COMAYAGUA', code: ++seq, category: 'B', year: 2025, population: 1000,
  ingresos_recaudados: 100, ingresos_tributarios: corrientes, ingresos_no_tributarios: 0,
  transferencias_art91: transf, otras_transferencias: 0, total_egresos: 100, ...extra,
}) as unknown as Municipality;
const sinLiq = (name: string) => fila(name, 0, 0, { total_egresos: 0 });
const sin91 = (name: string) => fila(name, 50, 0);
const sinDato = (name: string) => fila(name, 50, 50, { ingresos_recaudados: 0 });
const id = (m: Municipality) => `${m.department}|${m.code}`;
const pos = (r: ReturnType<typeof rankear>) => r.map((x) => x.posicion);

describe('rankear — bordes sintéticos', () => {
  it('lista vacía', () => {
    expect(rankear([], [], 'autonomia')).toEqual([]);
    const a = fila('A', 10, 10);
    expect(rankear([a], [], 'autonomia')).toEqual([]);
  });

  it('un solo municipio: posición 1', () => {
    const a = fila('A', 10, 90);
    expect(pos(rankear([a], [a], 'autonomia'))).toEqual([1]);
  });

  it('todas excluidas: sin posición ni percentil, con motivo', () => {
    const f = [sinLiq('L'), sin91('S')];
    const r = rankear(f, f, 'autonomia');
    expect(pos(r)).toEqual([null, null]);
    expect(r.map((x) => x.percentil)).toEqual([null, null]);
    expect(r.every((x) => x.motivo)).toBe(true);
  });

  it('todas sin dato: sin posición, motivo null, orden alfabético', () => {
    const f = [sinDato('B'), sinDato('A')];
    const r = rankear(f, f, 'autonomia');
    expect(r.map((x) => x.fila.name)).toEqual(['A', 'B']);
    expect(pos(r)).toEqual([null, null]);
    expect(r.every((x) => x.motivo === null && x.valor === null)).toBe(true);
  });

  it('todos empatados: todos en posición 1', () => {
    const f = [fila('A', 30, 70), fila('B', 30, 70), fila('C', 30, 70)];
    expect(pos(rankear(f, f, 'autonomia'))).toEqual([1, 1, 1]);
  });

  it('empate en la última posición (1, 2, 2) y (1, 1, 3, 3)', () => {
    const f = [fila('A', 60, 40), fila('B', 30, 70), fila('C', 30, 70)];
    expect(pos(rankear(f, f, 'autonomia'))).toEqual([1, 2, 2]);
    const g = [fila('A', 60, 40), fila('B', 60, 40), fila('C', 10, 90), fila('D', 10, 90)];
    expect(pos(rankear(g, g, 'autonomia'))).toEqual([1, 1, 3, 3]);
  });

  it('empate con posición saltada tras el empate en "menor es mejor"', () => {
    const f = [fila('A', 60, 10), fila('B', 60, 10), fila('C', 60, 10), fila('D', 60, 50)];
    expect(pos(rankear(f, f, 'dependenciaTransferencias'))).toEqual([1, 1, 1, 4]);
  });

  it('servicioDeuda = 0 en todos (menor es mejor): válido y empatados en 1', () => {
    const f = [fila('A', 50, 50, { servicios_deuda: 0 }), fila('B', 50, 50, { servicios_deuda: 0 })];
    const r = rankear(f, f, 'servicioDeudaSobreCorrientes');
    expect(r.map((x) => x.valor)).toEqual([0, 0]);
    expect(pos(r)).toEqual([1, 1]);
  });

  it('servicioDeuda: 0 gana a >0 (menor es mejor); sin corrientes = sin dato', () => {
    const f = [fila('Debe', 50, 50, { servicios_deuda: 20 }), fila('Libre', 50, 50, { servicios_deuda: 0 })];
    expect(rankear(f, f, 'servicioDeudaSobreCorrientes').map((x) => x.fila.name)).toEqual(['Libre', 'Debe']);
  });

  it('balanceSobreIngresos = 0 gana a >0; null ingresos → sin dato antes de excluidas', () => {
    const f = [
      sin91('Ex'), sinDato('SD'),
      fila('Mucho', 50, 50, { recursos_balance: 40 }), fila('Cero', 50, 50, { recursos_balance: 0 }),
    ];
    const r = rankear(f, f, 'balanceSobreIngresos');
    expect(r.map((x) => x.fila.name)).toEqual(['Cero', 'Mucho', 'SD', 'Ex']);
    expect(pos(r)).toEqual([1, 2, null, null]);
  });

  it('valor negativo y cero en "mayor es mejor" (ahorroCorriente) ordenan bien', () => {
    const f = [fila('Neg', 10, 90, { gastos_funcionamiento: 50 }), fila('Cero', 10, 90, { gastos_funcionamiento: 10 }), fila('Pos', 10, 90, { gastos_funcionamiento: 0 })];
    const r = rankear(f, f, 'ahorroCorriente');
    expect(r.map((x) => x.valor)).toEqual([10, 0, -40]);
    expect(pos(r)).toEqual([1, 2, 3]);
  });

  it('visibles fuera de filasAnio: se rankean igual; percentil se calcula contra filasAnio', () => {
    const base = [fila('P1', 10, 90), fila('P2', 30, 70)];
    const ajena = fila('Ajena', 20, 80);
    const r = rankear(base, [ajena], 'autonomia');
    expect(pos(r)).toEqual([1]);
    expect(r[0].percentil).toBe(50); // 1 de 2 pares con valor menor
  });

  it('filasAnio vacío con visibles: percentil null, posición intacta', () => {
    const a = fila('A', 10, 90);
    const r = rankear([], [a], 'autonomia');
    expect(pos(r)).toEqual([1]);
    expect(r[0].percentil).toBeNull();
  });

  it('percentil null en fila excluida y en fila sin dato; número en rankeada', () => {
    const a = fila('A', 10, 90), b = fila('B', 20, 80);
    const f = [a, b, sin91('S'), sinLiq('L'), sinDato('D')];
    const r = rankear(f, f, 'autonomia');
    const por = Object.fromEntries(r.map((x) => [x.fila.name, x]));
    expect(por.S.percentil).toBeNull();
    expect(por.L.percentil).toBeNull();
    expect(por.D.percentil).toBeNull();
    expect(por.A.percentil).toBe(0);
    expect(por.B.percentil).toBe(50);
  });

  it('no mezcla años/categorías en el percentil', () => {
    const a = fila('A', 10, 90);
    const otraCat = fila('X', 5, 95, { category: 'C' });
    const otroAnio = fila('Y', 5, 95, { year: 2024 });
    expect(rankear([a, otraCat, otroAnio], [a], 'autonomia')[0].percentil).toBe(0);
  });

  it('motivoExcluido: prioridad sin liquidación > rendición parcial > sin Art. 91; null si normal', () => {
    expect(motivoExcluido(fila('N', 10, 90))).toBeNull();
    expect(motivoExcluido(sinLiq('L'))).toBe(ROTULO_SIN_LIQUIDACION);
    expect(motivoExcluido(sin91('S'))).toBe(ROTULO_SIN_ART91);
    const rp = fila('RP', 50, 0, { department: 'EL PARAISO', code: 11, year: 2022 });
    expect(motivoExcluido(rp)).toBe(ROTULO_RENDICION_PARCIAL); // rendición parcial gana a sin Art. 91
    const rpSinLiq = fila('RPL', 0, 0, { department: 'EL PARAISO', code: 11, year: 2022, total_egresos: 0 });
    expect(motivoExcluido(rpSinLiq)).toBe(ROTULO_SIN_LIQUIDACION);
  });

  it('motivoExcluido es null exactamente cuando !excluirDeRazones (2021–2025 reales)', () => {
    filas.forEach((m) => expect(motivoExcluido(m) != null).toBe(excluirDeRazones(m)));
  });

  it('datos numéricos basura (NaN, null, texto) no rompen ni producen NaN en valor', () => {
    const f = [
      fila('Nan', NaN, NaN), fila('Txt', 'abc' as unknown as number, 10),
      fila('Ok', 10, 90), fila('Inf', Infinity, 10),
    ];
    const r = rankear(f, f, 'autonomia');
    expect(r).toHaveLength(4);
    r.forEach((x) => expect(Number.isNaN(x.valor as number)).toBe(false));
  });

  it('nombres duplicados con mismo valor: posiciones iguales y sin pérdida de filas', () => {
    const f = [fila('Mismo', 30, 70, { department: 'A' }), fila('Mismo', 30, 70, { department: 'B' })];
    const r = rankear(f, f, 'autonomia');
    expect(pos(r)).toEqual([1, 1]);
    expect(new Set(r.map((x) => id(x.fila))).size).toBe(2);
  });

  it('no muta los arreglos de entrada', () => {
    const f = [fila('B', 10, 90), fila('A', 60, 40)];
    const copia = [...f];
    rankear(f, f, 'autonomia');
    expect(f).toEqual(copia);
    expect(f.map((x) => x.name)).toEqual(['B', 'A']);
  });
});

describe('rankear — invariancia al orden de visibles', () => {
  const anio = de(2025);
  const claves = Object.keys(SEMAFORO) as ClaveSemaforo[];
  const firma = (r: ReturnType<typeof rankear>) => Object.fromEntries(r.map((x) => [id(x.fila), [x.posicion, x.valor, x.percentil, x.motivo]]));
  // Orden pseudoaleatorio determinista.
  const barajar = <T,>(a: T[]) => { let s = 7; return [...a].sort(() => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5); };

  it.each(claves)('%s: mismas posiciones/valores/percentiles con visibles invertido y barajado', (k) => {
    const base = firma(rankear(anio, anio, k));
    expect(firma(rankear(anio, [...anio].reverse(), k))).toEqual(base);
    expect(firma(rankear(anio, barajar(anio), k))).toEqual(base);
  });

  it('el orden de salida también es el mismo (sin empates de nombre ambiguos)', () => {
    const a = rankear(anio, anio, 'autonomia').map((x) => id(x.fila));
    const b = rankear(anio, [...anio].reverse(), 'autonomia').map((x) => id(x.fila));
    expect(b).toEqual(a);
  });
});

describe('rankear — 2025 real por categoría', () => {
  const anio = de(2025);
  const claves = Object.keys(SEMAFORO) as ClaveSemaforo[];

  describe.each(['A', 'B', 'C', 'D'])('categoría %s', (cat) => {
    const vis = anio.filter((m) => m.category === cat);

    it('hay municipios en la categoría', () => {
      expect(vis.length).toBeGreaterThan(0);
    });

    it.each(claves)('%s: posiciones 1..N con salto solo tras empates; grupos y conteo cuadran', (k) => {
      const r = rankear(anio, vis, k);
      expect(r).toHaveLength(vis.length);
      const rank = r.filter((x) => x.posicion != null);
      const sd = r.filter((x) => x.posicion == null && !x.motivo);
      const ex = r.filter((x) => x.motivo);
      expect(rank.length + sd.length + ex.length).toBe(vis.length);
      expect(ex.length).toBe(vis.filter(excluirDeRazones).length);
      // Orden: rankeadas, luego sin dato, luego excluidas.
      expect(r.map((x) => (x.motivo ? 2 : x.posicion == null ? 1 : 0))).toEqual(
        [...r.map((x) => (x.motivo ? 2 : x.posicion == null ? 1 : 0))].sort((a, b) => a - b));
      // Posición = 1 + cantidad con valor estrictamente mejor.
      const mejor = SEMAFORO[k] === 'mayor' ? (a: number, b: number) => a > b : (a: number, b: number) => a < b;
      rank.forEach((x) => {
        expect(x.posicion).toBe(1 + rank.filter((y) => mejor(y.valor!, x.valor!)).length);
      });
      if (rank.length) expect(rank[0].posicion).toBe(1);
      // Excluidas sin percentil ni posición; sin dato sin posición.
      ex.forEach((x) => { expect(x.posicion).toBeNull(); expect(x.percentil).toBeNull(); });
      sd.forEach((x) => expect(x.valor).toBeNull());
      rank.forEach((x) => expect(x.valor).not.toBeNull());
    });
  });

  it('todas las categorías juntas: suma por categoría = total', () => {
    const total = ['A', 'B', 'C', 'D'].reduce((s, c) => s + anio.filter((m) => m.category === c).length, 0);
    expect(total).toBe(anio.length); // detecta categorías fuera de A–D
  });
});

describe('contarExcluidos — bordes', () => {
  it('lista vacía', () => {
    expect(contarExcluidos([])).toEqual({ total: 0, sinLiquidacion: 0, sinArt91: 0, rendicionParcial: 0 });
  });
  it('categorías mutuamente excluyentes: total = suma de partes', () => {
    const c = contarExcluidos([sinLiq('L'), sin91('S'), fila('N', 1, 1),
      fila('RP', 50, 0, { department: 'GRACIAS A DIOS', code: 6, year: 2021 })]);
    expect(c).toEqual({ total: 3, sinLiquidacion: 1, sinArt91: 1, rendicionParcial: 1 });
  });
  it('fila vacía {} cuenta como sin liquidación', () => {
    expect(contarExcluidos([{} as Municipality]).sinLiquidacion).toBe(1);
  });
});

describe('paresSugeridos — bordes', () => {
  const base = fila('Base', 10, 90, { population: 1000 });
  const mk = (name: string, pob: number, extra: Partial<Municipality> = {}) => fila(name, 10, 90, { population: pob, ...extra });

  it('no hay suficientes pares: devuelve los que haya', () => {
    const p = [mk('P1', 1100), mk('P2', 900)];
    expect(paresSugeridos([base, ...p], base, [], 10)).toHaveLength(2);
  });

  it('sin pares (solo la base / lista vacía): []', () => {
    expect(paresSugeridos([base], base, [], 4)).toEqual([]);
    expect(paresSugeridos([], base, [], 4)).toEqual([]);
  });

  it('cuantos negativo, NaN o 0: []', () => {
    const p = [mk('P1', 1100)];
    expect(paresSugeridos([base, ...p], base, [], -3)).toEqual([]);
    expect(paresSugeridos([base, ...p], base, [], NaN)).toEqual([]);
    expect(paresSugeridos([base, ...p], base, [], 0)).toEqual([]);
  });

  it('cuantos fraccionario no lanza', () => {
    const p = [mk('P1', 1100), mk('P2', 1200)];
    expect(() => paresSugeridos([base, ...p], base, [], 1.5)).not.toThrow();
  });

  it('fila base excluida: igualmente devuelve pares sanos, sin excluidos', () => {
    const b = sin91('BaseEx');
    const ps = [mk('P1', 1100), mk('Ex', 1000, { transferencias_art91: 0 }), mk('P2', 5000)];
    const r = paresSugeridos([b, ...ps], b, [], 5);
    expect(r.map((m) => m.name)).toEqual(['P1', 'P2']);
  });

  it('empate de distancia: desempata por nombre', () => {
    const f = [mk('Zeta', 1100), mk('Alfa', 900)];
    expect(paresSugeridos([base, ...f], base, [], 2).map((m) => m.name)).toEqual(['Alfa', 'Zeta']);
  });

  it('descarta otras categorías y otros años', () => {
    const f = [mk('C', 1000, { category: 'C' }), mk('Y', 1000, { year: 2024 }), mk('OK', 3000)];
    expect(paresSugeridos([base, ...f], base, [], 5).map((m) => m.name)).toEqual(['OK']);
  });

  it('yaElegidos se identifica por departamento+código, no por referencia', () => {
    const p = mk('P1', 1100);
    const clon = { ...p } as Municipality;
    expect(paresSugeridos([base, p], base, [clon], 5)).toEqual([]);
  });

  it('población nula/ausente en la base o en pares no rompe', () => {
    const sinPob = fila('SP', 10, 90, { population: undefined as unknown as number });
    const p = [mk('P1', 1100), sinPob];
    const r = paresSugeridos([sinPob, ...p], sinPob, [], 5);
    expect(r.map((m) => m.name)).toEqual(['P1']); // sinPob es la base (misma fila): se excluye a sí misma
  });

  it('no muta filasAnio', () => {
    const f = [base, mk('B', 2000), mk('A', 1100)];
    const copia = [...f];
    paresSugeridos(f, base, [], 5);
    expect(f).toEqual(copia);
  });

  it('2025 real: cada categoría, 5 pares sin repetidos ni la base; invariante al orden de filasAnio', () => {
    const anio = de(2025);
    ['A', 'B', 'C', 'D'].forEach((cat) => {
      const b = anio.find((m) => m.category === cat && !excluirDeRazones(m))!;
      const r = paresSugeridos(anio, b, [], 5);
      expect(new Set(r.map(id)).size).toBe(r.length);
      expect(r.map(id)).not.toContain(id(b));
      expect(paresSugeridos([...anio].reverse(), b, [], 5).map(id)).toEqual(r.map(id));
    });
  });

  it('2025 real: fila base excluida (Pespire sin liquidación) funciona', () => {
    const anio = de(2025);
    const ex = anio.find(excluirDeRazones)!;
    const r = paresSugeridos(anio, ex, [], 3);
    expect(r.length).toBeLessThanOrEqual(3);
    r.forEach((m) => expect(excluirDeRazones(m)).toBe(false));
  });
});
