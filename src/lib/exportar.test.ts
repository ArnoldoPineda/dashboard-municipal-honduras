import { describe, it, expect } from '@jest/globals';
import * as XLSX from 'xlsx';
import { DICCIONARIO, hojas, libro, csv, nombreArchivo, TablaExport } from './exportar';

const tabla: TablaExport = {
  columnas: [
    { clave: 'name', titulo: 'Municipio', tipo: 'texto' },
    { clave: 'population', titulo: 'Población', tipo: 'entero' },
    { clave: 'ingresosCorrientes', titulo: 'Ingresos corrientes (L)', tipo: 'monto' },
    { clave: 'autonomia', titulo: 'Autonomía (%)', tipo: 'pct' },
  ],
  filas: [
    ['Siguatepeque', 120345, 98765432.1, 75.5],
    ['San Marcos de Colón; "norte"', 30000, 1234567, null],
    ['Pespire', 25000, 0, 12.3],
  ],
};
const notas: [string, string][] = [['Filtros', 'Año 2025 · todas las categorías'], ['Excluidos', 'Pespire: Sin transferencia Art. 91']];

const releer = () => XLSX.read(XLSX.write(libro(XLSX, tabla, notas), { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer', cellNF: true });

describe('libro .xlsx', () => {
  it('tres hojas: Datos, Diccionario y Notas', () => {
    expect(releer().SheetNames).toEqual(['Datos', 'Diccionario', 'Notas']);
  });
  it('Datos: encabezado + una fila por registro', () => {
    const filas = XLSX.utils.sheet_to_json<unknown[]>(releer().Sheets.Datos, { header: 1 });
    expect(filas).toHaveLength(tabla.filas.length + 1);
    expect(filas[0]).toEqual(['Municipio', 'Población', 'Ingresos corrientes (L)', 'Autonomía (%)']);
  });
  it('los números son números (tipo n) con formato de miles; el texto es texto', () => {
    const ws = releer().Sheets.Datos;
    expect(ws.B2.t).toBe('n');
    expect(ws.C2.t).toBe('n');
    expect(ws.C2.v).toBeCloseTo(98765432.1);
    expect(ws.C2.z).toBe('#,##0');
    expect(ws.D2.z).toBe('0.0');
    expect(ws.A2.t).toBe('s');
    expect(ws.D3).toBeUndefined(); // null → celda vacía, no "0" ni "—"
  });
  it('columnas "variable": formato por fila', () => {
    const t: TablaExport = {
      columnas: [{ clave: 'concepto', titulo: 'Concepto', tipo: 'texto' }, { clave: '2025', titulo: '2025', tipo: 'variable' }],
      filas: [['Ingresos corrientes', 1000], ['Autonomía', 60.1]],
      tipoFila: ['monto', 'pct'],
      campos: ['concepto', 'ingresosCorrientes', 'autonomia'],
    };
    const ws = XLSX.read(XLSX.write(libro(XLSX, t, []), { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer', cellNF: true }).Sheets.Datos;
    expect(ws.B2.z).toBe('#,##0');
    expect(ws.B3.z).toBe('0.0');
  });
  it('Diccionario: una fila por campo, ninguno [PENDIENTE]', () => {
    const d = hojas(tabla, notas).diccionario;
    expect(d).toHaveLength(tabla.columnas.length + 1);
    expect(d.slice(1).every((f) => f[1] !== '[PENDIENTE]' && f[2] && f[3])).toBe(true);
  });
  it('Notas: filtros, excluidos, fuente, población provisional, categoría y fecha', () => {
    const n = hojas(tabla, notas).notas.map((f) => String(f[0]));
    expect(n).toEqual(expect.arrayContaining(['Filtros', 'Excluidos', 'Fuente', 'Población', 'Categoría', 'Generado']));
  });
  it('el catálogo no tiene entradas incompletas', () => {
    Object.entries(DICCIONARIO).forEach(([, d]) => { expect(d.definicion && d.unidad && d.fuente).toBeTruthy(); });
  });
});

describe('CSV y nombre de archivo', () => {
  it('CSV con BOM, separador ";", tildes y comillas escapadas; números sin formato', () => {
    const t = csv(tabla);
    expect(t.charCodeAt(0)).toBe(0xfeff);
    const lineas = t.slice(1).split('\r\n');
    expect(lineas).toHaveLength(4);
    expect(lineas[0]).toBe('Municipio;Población;Ingresos corrientes (L);Autonomía (%)');
    expect(lineas[1]).toBe('Siguatepeque;120345;98765432.1;75.5');
    expect(lineas[2]).toBe('"San Marcos de Colón; ""norte""";30000;1234567;');
  });
  it('SIMHO_<vista>_<alcance>_<años>', () => {
    expect(nombreArchivo('Base de Datos', 'Todas las categorías', [2025])).toBe('SIMHO_BaseDeDatos_Todas-las-categorias_2025.xlsx');
    expect(nombreArchivo('Análisis', 'Siguatepeque — Comayagua', [2025, 2021, 2023], 'csv')).toBe('SIMHO_Analisis_Siguatepeque-Comayagua_2021-2025.csv');
    expect(nombreArchivo('Análisis', '', [])).toBe('SIMHO_Analisis_Pais_sin-anio.xlsx');
  });
});
