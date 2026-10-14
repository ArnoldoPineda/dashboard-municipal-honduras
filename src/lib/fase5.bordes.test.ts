import { describe, it, expect } from '@jest/globals';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Municipality } from '../hooks/useMunicipalities';
import {
  porCapita, deflactar, variacionPct, tcac, filasDeAlcance, indicadoresPorAnio, pieTabla,
  INDICADORES_ANALISIS, ColumnaPie,
} from './indicadores';
import { DICCIONARIO, hojas, libro, csv, nombreArchivo, TablaExport } from './exportar';

// Fila válida (con liquidación y Art. 91) salvo que se sobreescriba.
const mun = (o: Partial<Municipality> = {}) => ({
  department: 'COMAYAGUA', code: 18, year: 2025, name: 'X', category: 'A', population: 1000,
  ingresos_recaudados: 1000, ingresos_tributarios: 400, ingresos_no_tributarios: 100, transferencias_art91: 300,
  total_egresos: 800, gastos_funcionamiento: 300, presupuesto_municipal: 1000, ...o,
}) as unknown as Municipality;
const col = (valor: (m: Municipality) => number | null, agregacion: ColumnaPie['agregacion'] = 'suma'): ColumnaPie => ({ clave: 'c', agregacion, valor });

describe('bordes: funciones puras', () => {
  it('tcac con años no consecutivos usa el número de años transcurridos', () => {
    expect(tcac(100, 133.1, 3)).toBeCloseTo(10, 6); // 2021 → 2024
    expect(tcac(100, 100, 4)).toBe(0);
    expect(tcac(100, 121, 0.5)).toBeNull();
    expect(tcac(100, 121, NaN)).toBeNull();
    expect(tcac(NaN, 121, 2)).toBeNull();
  });
  it('tcac con extremo Infinity → null (no −100 %)', () => {
    expect(tcac(Infinity, 121, 2)).toBeNull();
    expect(tcac(100, Infinity, 2)).toBeNull();
  });
  it('variacionPct con cambio de signo', () => {
    expect(variacionPct(-100, 50)).toBeCloseTo(150);
    expect(variacionPct(100, -50)).toBeCloseTo(-150);
    expect(variacionPct(5, 0)).toBeCloseTo(-100);
    expect(variacionPct(NaN, 5)).toBeNull();
    expect(variacionPct(5, NaN)).toBeNull();
    expect(variacionPct(5, Infinity)).toBeNull();
  });
  it('deflactar con IPC 0, negativo, NaN o Infinity', () => {
    expect(deflactar(100, 2021, 2025, { 2021: 100, 2025: 0 })).toBeNull();
    expect(deflactar(100, 2021, 2025, { 2021: -1, 2025: 100 })).toBeNull();
    expect(deflactar(100, 2021, 2025, { 2021: NaN, 2025: 100 })).toBeNull();
    expect(deflactar(100, 2021, 2025, { 2021: 100, 2025: NaN })).toBeNull();
    expect(deflactar(NaN, 2021, 2025, { 2021: 100, 2025: 100 })).toBeNull();
    expect(deflactar(0, 2021, 2025, { 2021: 100, 2025: 125 })).toBe(0);
  });
  it('deflactar con IPC Infinity → null (dato inválido, no 0)', () => {
    expect(deflactar(100, 2021, 2025, { 2021: Infinity, 2025: 100 })).toBeNull();
  });
  it('porCapita con NaN / Infinity', () => {
    expect(porCapita(NaN, 10)).toBeNull();
    expect(porCapita(10, NaN)).toBeNull();
    expect(porCapita(10, Infinity)).toBeNull();
  });
  it('filasDeAlcance con códigos inexistentes → []', () => {
    const f = [mun(), mun({ department: 'COPAN', code: 1 })];
    expect(filasDeAlcance(f, { tipo: 'departamento', cod: '99' })).toEqual([]);
    expect(filasDeAlcance(f, { tipo: 'municipio', ine: '9999' })).toEqual([]);
    expect(filasDeAlcance(f, { tipo: 'categoria', categoria: 'Z' })).toEqual([]);
    expect(filasDeAlcance([], { tipo: 'pais' })).toEqual([]);
  });
  it('filasDeAlcance: fila con departamento desconocido no cae en un municipio real', () => {
    const f = [mun({ department: 'INEXISTENTE' })];
    expect(filasDeAlcance(f, { tipo: 'municipio', ine: '9999' })).toEqual([]);
  });
  it('indicadoresPorAnio de un municipio excluido devuelve su propio valor (mediana = agregado)', () => {
    const excl = mun({ transferencias_art91: 0 }); // sin Art. 91 → excluido
    const r = indicadoresPorAnio([excl], [2025])[2025].autonomia;
    expect(r.mediana).not.toBeNull();
    expect(r.mediana).toBe(r.agregado);
  });
  it('indicadoresPorAnio: una válida + una excluida → cuenta solo la válida; todas excluidas → null', () => {
    const ok = mun(), excl = mun({ code: 2, transferencias_art91: 0, ingresos_tributarios: 900 });
    const a = indicadoresPorAnio([ok, excl], [2025])[2025];
    expect(a.autonomia.mediana).toBe(a.autonomia.agregado);
    expect(a.autonomia.mediana).toBeCloseTo(50); // (400+100)/1000, no contaminado por la excluida
    const todas = indicadoresPorAnio([excl, mun({ code: 3, transferencias_art91: 0 })], [2025])[2025];
    expect(todas.autonomia.mediana).toBeNull();
    expect(Object.keys(todas).sort()).toEqual([...INDICADORES_ANALISIS].sort());
  });
  it('indicadoresPorAnio ignora filas de otros años; anios vacío → {}', () => {
    expect(indicadoresPorAnio([mun({ year: 2024 })], [2025])[2025].autonomia.agregado).toBeNull();
    expect(indicadoresPorAnio([mun()], [])).toEqual({});
  });
  it('pieTabla: NaN/Infinity se ignoran', () => {
    const f = [mun({ code: 1 }), mun({ code: 2 }), mun({ code: 3 })];
    const vals = [10, NaN, Infinity];
    let i = 0;
    expect(pieTabla(f, [col(() => vals[i++ % 3])]).c).toBe(10);
    expect(pieTabla(f, [col(() => NaN, 'mediana')]).c).toBeNull();
    expect(pieTabla(f, [col(() => Infinity)]).c).toBeNull();
  });
  it('pieTabla: la fila sin Art. 91 suma en el total pero no en la mediana; sin liquidación, en ninguno', () => {
    const f = [mun({ transferencias_art91: 0 }), mun({ total_egresos: 0, ingresos_tributarios: 0, ingresos_no_tributarios: 0 })];
    const r = pieTabla(f, [{ clave: 's', agregacion: 'suma', valor: () => 5 }, { clave: 'm', agregacion: 'mediana', valor: () => 5 }]);
    expect(r).toEqual({ s: 5, m: null });
  });
  it('pieTabla: mediana con cantidad par, suma con negativos y mediana con un solo valor', () => {
    const f = [1, 2, 3, 4].map((code) => mun({ code }));
    let i = 0;
    expect(pieTabla(f, [col(() => [4, 1, 3, 2][i++], 'mediana')]).c).toBe(2.5);
    i = 0;
    expect(pieTabla(f, [col(() => [4, -1, 0, 2][i++], 'suma')]).c).toBe(5);
    i = 0;
    expect(pieTabla(f, [col(() => [null, 7, null, null][i++], 'mediana')]).c).toBe(7);
  });
});

const T = (filas: TablaExport['filas']): TablaExport => ({
  columnas: [{ clave: 'name', titulo: 'Municipio', tipo: 'texto' }, { clave: 'population', titulo: 'Población', tipo: 'entero' }],
  filas,
});
const celda1 = (t: TablaExport) => csv(t).slice(1).split('\r\n')[1];

describe('bordes: exportar', () => {
  it('CSV: saltos de línea dentro de celda quedan entrecomillados', () => {
    const s = csv(T([['a\nb', 1], ['c\r\nd', 2]])).slice(1);
    expect(s).toContain('"a\nb";1');
    expect(s).toContain('"c\r\nd";2');
  });
  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\t=1', '=HYPERLINK("http://x")'])(
    'CSV: inyección de fórmulas, celda de texto %j se neutraliza', (p) => {
      // Seguro = la celda no empieza (tras comilla opcional de CSV) con =,+,-,@,tab.
      expect(/^"?[=+\-@\t]/.test(celda1(T([[p, 1]])))).toBe(false);
    });
  it('CSV: números negativos (tipo number) no se tocan', () => {
    expect(celda1(T([['x', -5]]))).toBe('x;-5');
  });
  it('CSV: NaN / Infinity en celdas numéricas no se exportan como texto', () => {
    const l = csv(T([['x', NaN], ['y', Infinity]])).slice(1).split('\r\n');
    expect(l[1]).not.toMatch(/NaN/);
    expect(l[2]).not.toMatch(/Infinity/);
  });
  it('CSV: tabla vacía = solo encabezado; texto vacío', () => {
    expect(csv(T([])).slice(1)).toBe('Municipio;Población');
    expect(celda1(T([['', 0]]))).toBe(';0');
  });
  it('libro con tabla vacía (solo encabezado)', () => {
    const rd = XLSX.read(XLSX.write(libro(XLSX, T([]), []), { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
    expect(rd.SheetNames).toEqual(['Datos', 'Diccionario', 'Notas']);
    expect(XLSX.utils.sheet_to_json<unknown[]>(rd.Sheets.Datos, { header: 1 })).toEqual([['Municipio', 'Población']]);
  });
  it('libro: NaN y fila más corta que las columnas no revientan la escritura', () => {
    const wb = libro(XLSX, T([['a', NaN], ['b']]), []);
    expect(() => XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })).not.toThrow();
  });
  it('libro: texto que empieza con "=" se guarda como cadena, no como fórmula (xlsx)', () => {
    const ws = libro(XLSX, T([['=1+1', 1]]), []).Sheets.Datos;
    expect(ws.A2.t).toBe('s');
    expect(ws.A2.f).toBeUndefined();
  });
  it('hojas: campo desconocido → [PENDIENTE]; campos vacío → solo encabezado', () => {
    expect(hojas({ ...T([]), campos: ['no_existe'] }, []).diccionario[1]).toEqual(['no_existe', '[PENDIENTE]', '', '']);
    expect(hojas({ ...T([]), campos: [] }, []).diccionario).toHaveLength(1);
  });
  it('hojas: "constructor"/"toString" como campo no hereda de Object.prototype', () => {
    const d = hojas({ ...T([]), campos: ['constructor', 'toString'] }, []).diccionario;
    expect(d[1][1]).toBe('[PENDIENTE]');
    expect(d[2][1]).toBe('[PENDIENTE]');
  });
  it('nombreArchivo con caracteres raros', () => {
    expect(nombreArchivo('Base/de\\Datos:*?', 'a<b>|"c"', [2025])).toBe('SIMHO_BaseDeDatos_a-b-c_2025.xlsx');
    expect(nombreArchivo('..\\..\\evil', '../x', [2025])).toBe('SIMHO_Evil_x_2025.xlsx');
    expect(nombreArchivo('Análisis', 'Ñandú — Güinope 😀', [2021])).toBe('SIMHO_Analisis_Nandu-Guinope_2021.xlsx');
    expect(nombreArchivo('Vista', '日本語', [2021, 2021])).toBe('SIMHO_Vista_Pais_2021-2021.xlsx');
    expect(nombreArchivo('V', 'A', [2025], 'csv')).toMatch(/\.csv$/);
  });
  it('nombreArchivo: vista vacía no deja "SIMHO__"', () => {
    expect(nombreArchivo('', 'X', [2025])).not.toMatch(/SIMHO__/);
  });
  it('nombreArchivo: alcance muy largo no supera 255 caracteres', () => {
    expect(nombreArchivo('V', 'A'.repeat(500), [2025]).length).toBeLessThanOrEqual(255);
  });
});

describe('cobertura del DICCIONARIO', () => {
  const src = (p: string) => readFileSync(join(__dirname, '..', 'pages', p), 'utf8');
  const bd = src('BaseDatosPage.tsx');
  const an = src('AnalyticsPage.tsx');
  const todas = (re: RegExp, s: string) => Array.from(s.matchAll(re), (m) => m[1]);

  it('BaseDatosPage: todas las claves de columnas (VISTAS + name + nota) están en DICCIONARIO', () => {
    const claves = new Set([
      ...todas(/\bsefin\('([^']+)'/g, bd), ...todas(/\bind\('([^']+)'/g, bd), ...todas(/\bclave:\s*'([^']+)'/g, bd), 'name', 'nota',
    ]);
    expect(claves.size).toBeGreaterThan(40);
    expect(Array.from(claves).filter((k) => !(k in DICCIONARIO))).toEqual([]);
  });
  it('AnalyticsPage: field de TABLE_ROWS, INDICADORES_ANALISIS, concepto, var y tcac están en DICCIONARIO', () => {
    const fields = todas(/\bfield:\s*'([^']+)'/g, an);
    expect(fields.length).toBeGreaterThan(20);
    const claves = [...fields, ...INDICADORES_ANALISIS, 'concepto', 'var', 'tcac'];
    expect(claves.filter((k) => !(k in DICCIONARIO))).toEqual([]);
  });
  it('DICCIONARIO: sin claves vacías ni definiciones [PENDIENTE]', () => {
    Object.entries(DICCIONARIO).forEach(([k, d]) => { expect(k.trim()).not.toBe(''); expect(d.definicion).not.toContain('[PENDIENTE]'); });
  });
});
