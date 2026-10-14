// Exportación compartida (Análisis y Base de Datos): .xlsx con hojas Datos, Diccionario y Notas, y CSV UTF-8 con BOM.
// SheetJS CE 0.20.3 (tarball oficial cdn.sheetjs.com) se carga con import() dinámico: no entra al bundle inicial.
import { ROTULO_POBLACION, ROTULO_CATEGORIA } from './indicadores';

/** 'variable': el formato numérico lo da `tipoFila` (filas de conceptos con montos y porcentajes mezclados). */
export type TipoColumna = 'texto' | 'entero' | 'monto' | 'pct' | 'lph' | 'variable';
export interface ColumnaExport { clave: string; titulo: string; tipo: TipoColumna }
export type Celda = string | number | null;
export interface TablaExport {
  columnas: ColumnaExport[];
  filas: Celda[][];
  /** Formato de cada fila para las columnas 'variable'. */
  tipoFila?: Exclude<TipoColumna, 'variable'>[];
  /** Campos que describe el Diccionario (por defecto, las claves de las columnas). */
  campos?: string[];
}
export interface EntradaDiccionario { definicion: string; unidad: string; fuente: string }

const SEFIN = 'SEFIN — Liquidación Presupuestaria Municipal';
const SIMHO = 'SIMHO, calculado sobre SEFIN (src/lib/indicadores.ts)';
const L = 'Lempiras';
const PCT = '% (0–100)';
const LPH = 'Lempiras por habitante';
const col = (c: string): EntradaDiccionario => ({ definicion: `Valor reportado por SEFIN en la columna "${c}", sin modificar.`, unidad: L, fuente: SEFIN });

/** Catálogo único de campos exportables. Toda columna exportada debe estar aquí (lo verifica exportar.test.ts). */
export const DICCIONARIO: Record<string, EntradaDiccionario> = {
  // Identificación
  cod_ine:     { definicion: 'Código INE del municipio: 2 dígitos de departamento + 2 de municipio (DDMM).', unidad: 'Texto', fuente: 'SIMHO (src/data/departamentos.ts)' },
  department:  { definicion: 'Departamento.', unidad: 'Texto', fuente: SEFIN },
  name:        { definicion: 'Municipio (nombre oficial).', unidad: 'Texto', fuente: SEFIN },
  categoria:   { definicion: ROTULO_CATEGORIA, unidad: 'A–D', fuente: SEFIN },
  year:        { definicion: 'Año fiscal de la liquidación.', unidad: 'Año', fuente: SEFIN },
  population:  { definicion: ROTULO_POBLACION + '. Columna de población de SEFIN.', unidad: 'Habitantes', fuente: SEFIN },
  nota:        { definicion: 'Motivo por el que la fila queda fuera de totales y medianas (⚠): sin liquidación, sin transferencia Art. 91 o rendición parcial.', unidad: 'Texto', fuente: 'SIMHO (docs/ATIPICOS.md)' },
  concepto:    { definicion: 'Renglón del cuadro presupuestario.', unidad: 'Texto', fuente: 'SIMHO' },
  // SEFIN: montos
  presupuesto_municipal:     col('PRESUPUESTO MUNICIPAL'),
  gastos_presupuestados:     col('GASTOS PRESUPUESTADOS'),
  ingresos_propios:          col('INGRESOS PROPIOS'),
  ingresos_recaudados:       { ...col('INGRESOS RECAUDADOS'), definicion: 'Ingresos totales recaudados, incluidos recursos de balance, préstamos y bonos (columna SEFIN "INGRESOS RECAUDADOS").' },
  autonomia_financiera:      { definicion: 'Autonomía financiera según SEFIN (columna "AUTONOMIA FINANCIERA"), tal como viene en la fuente.', unidad: 'Según la fuente', fuente: SEFIN },
  ingresos_corrientes:       col('INGRESOS CORRIENTES'),
  ingresos_tributarios:      { ...col('INGRESOS TRIBUTARIOS'), definicion: 'Ingresos tributarios (G1). Ya incluye tasas por servicios y derechos.' },
  impuesto_bi:               col('IMPUESTO SOBRE BIENES INMUEBLES'),
  impuesto_personal:         col('IMPUESTO PERSONAL O VECINAL'),
  impuesto_industria:        col('IMPUESTO S/INDUSTRIA'),
  impuesto_comercio:         col('IMPUESTO S/COMERCIO'),
  impuesto_servicios:        col('IMPUESTO S/SERVICIOS'),
  impuesto_pecuario:         col('IMPUESTO PECUARIO'),
  impuesto_extraccion:       col('IMPUESTO S/EXTRACCION'),
  impuesto_telecomunicaciones: col('IMPUESTO DE TELECOMUNICACIONES'),
  tasas_servicios:           { ...col('TASAS POR SERVICIOS'), definicion: 'Tasas por servicios (parte de G1).' },
  derechos:                  { ...col('DERECHOS'), definicion: 'Derechos (parte de G1).' },
  ingresos_no_tributarios:   { ...col('INGRESOS NO TRIBUTARIOS'), definicion: 'Ingresos no tributarios (G2).' },
  ingresos_capital:          col('INGRESOS DE CAPITAL'),
  prestamos:                 col('PRESTAMOS'),
  venta_activos:             col('VENTA DE ACTIVOS'),
  contribuciones:            col('CONTRIBUCIONES'),
  colocacion_bonos:          col('COLOCACION EN BONOS'),
  transferencias_art91:      { ...col('TRANSFERENCIAS Art. 91'), definicion: 'Transferencias del Gobierno Central según el Art. 91 de la Ley de Municipalidades.' },
  otras_transferencias:      col('OTRAS TRANSFERENCIAS'),
  subsidios:                 col('SUBSIDIOS'),
  herencias_legados:         col('HERENCIAS LEGADOS Y DONACIONES'),
  otros_ingresos_capital:    col('OTROS INGRESOS DE CAPITAL'),
  recursos_balance:          { ...col('RECURSOS DE BALANCE'), definicion: 'Recursos de balance: caja de años anteriores incorporada al presupuesto.' },
  gastos_funcionamiento:     col('GASTOS DE FUNCIONAMIENTO'),
  servicios_personales:      col('SERVICIOS PERSONALES'),
  servicios_no_personales:   col('SERVICIOS NO PERSONALES'),
  materiales_suministro:     col('MATERIALES Y SUMINISTRO Y MAQUINARIA'),
  transferencias_corrientes: col('TRANSFERENCIAS CORRIENTES'),
  otros_gastos:              col('OTROS (gastos de funcionamiento)'),
  gastos_capital_deuda:      col('GASTOS DE CAPITAL Y DEUDA PUBLICA'),
  bienes_capitalizables:     { ...col('BIENES CAPITALIZABLES'), definicion: 'Bienes capitalizables: la inversión real que usa SIMHO.' },
  transferencias_capital:    col('TRANSFERENCIAS (gastos de capital)'),
  activos_financieros:       col('ACTIVOS FINANCIEROS'),
  servicios_deuda:           col('SERVICIOS DE DEUDA'),
  otros_gastos_capital:      col('OTROS GASTOS (capital)'),
  asignaciones_globales:     col('ASIGNACIONES GLOBALES'),
  total_egresos:             col('TOTAL EGRESOS'),
  superavit_deficit:         { ...col('SUPERAVIT O DEFICIT'), definicion: 'Superávit o déficit según SEFIN (incluye recursos de balance).' },
  gasto_corriente:           { ...col('Gasto Corriente'), definicion: 'Columna "Gasto Corriente" de SEFIN. En la fuente es igual a "Ingreso Corriente Ajustado"; no es un gasto.' },
  ingreso_corriente_ajustado: col('Ingreso Corriente Ajustado'),
  // SIMHO
  ingresosCorrientes:            { definicion: 'Ingresos corrientes = Tributarios (G1) + No tributarios (G2).', unidad: L, fuente: SIMHO },
  ingresosDelAnio:               { definicion: 'Ingresos del año = Ingresos recaudados − Recursos de balance − Préstamos − Colocación de bonos.', unidad: L, fuente: SIMHO },
  transferencias:                { definicion: 'Transferencias = Art. 91 + Otras transferencias.', unidad: L, fuente: SIMHO },
  autonomia:                     { definicion: 'Autonomía = Ingresos corrientes ÷ Ingresos del año × 100.', unidad: PCT, fuente: SIMHO },
  dependenciaTransferencias:     { definicion: 'Dependencia = (Art. 91 + Otras transferencias) ÷ Ingresos del año × 100.', unidad: PCT, fuente: SIMHO },
  propiosPerCapita:              { definicion: 'Ingresos corrientes ÷ Población.', unidad: LPH, fuente: SIMHO },
  ibiPerCapita:                  { definicion: 'Impuesto sobre bienes inmuebles ÷ Población.', unidad: LPH, fuente: SIMHO },
  funcionamientoSobreCorrientes: { definicion: 'Gastos de funcionamiento ÷ Ingresos corrientes × 100.', unidad: PCT, fuente: SIMHO },
  inversionSobreGasto:           { definicion: 'Bienes capitalizables ÷ Total egresos × 100.', unidad: PCT, fuente: SIMHO },
  inversionPerCapita:            { definicion: 'Bienes capitalizables ÷ Población.', unidad: LPH, fuente: SIMHO },
  ahorroCorriente:               { definicion: 'Ahorro corriente = Ingresos corrientes − Gastos de funcionamiento.', unidad: L, fuente: SIMHO },
  servicioDeudaSobreCorrientes:  { definicion: 'Servicios de deuda ÷ Ingresos corrientes × 100.', unidad: PCT, fuente: SIMHO },
  balanceSobreIngresos:          { definicion: 'Recursos de balance ÷ Ingresos recaudados × 100.', unidad: PCT, fuente: SIMHO },
  resultadoConBalance:           { definicion: 'Resultado con balance = Ingresos recaudados − Total egresos.', unidad: L, fuente: SIMHO },
  resultadoSinBalance:           { definicion: 'Resultado sin balance = Ingresos del año − Total egresos.', unidad: L, fuente: SIMHO },
  ejecucion:                     { definicion: 'Ejecución = Total egresos ÷ Presupuesto aprobado × 100 (la base no trae presupuesto vigente).', unidad: PCT, fuente: SIMHO },
  var:                           { definicion: 'Variación % del último año seleccionado frente al anterior: (último − anterior) ÷ |anterior| × 100.', unidad: PCT, fuente: SIMHO },
  tcac:                          { definicion: 'Crecimiento promedio anual (TCAC) entre el primer y el último año: ((último ÷ primero)^(1/años) − 1) × 100. Vacío si algún extremo es ≤ 0.', unidad: PCT, fuente: SIMHO },
};

const FORMATO: Record<Exclude<TipoColumna, 'texto' | 'variable'>, string> = { entero: '#,##0', monto: '#,##0', lph: '#,##0', pct: '0.0' };

/** Contenido de las 3 hojas como matrices (sin depender de SheetJS; es lo que prueban los tests). */
export function hojas(tabla: TablaExport, notas: [string, string][]) {
  const campos = tabla.campos ?? tabla.columnas.map((c) => c.clave);
  const diccionario: Celda[][] = [['Campo', 'Definición o fórmula', 'Unidad', 'Fuente'],
    ...campos.map((k) => { const d = DICCIONARIO[k]; return [k, d?.definicion ?? '[PENDIENTE]', d?.unidad ?? '', d?.fuente ?? '']; })];
  const notasHoja: Celda[][] = [['Nota', 'Detalle'], ...notas,
    ['Fuente', SEFIN],
    ['Población', `${ROTULO_POBLACION}: columna de población de SEFIN, pendiente de reemplazar por la proyección del INE.`],
    ['Categoría', ROTULO_CATEGORIA],
    ['Exclusiones', 'Las filas sin liquidación, sin transferencia Art. 91 o con rendición parcial no entran en totales ni medianas.'],
    ['Generado', new Date().toLocaleString('es-HN', { dateStyle: 'long', timeStyle: 'short' }) + ' (hora local)'],
  ];
  return { datos: [tabla.columnas.map((c) => c.titulo), ...tabla.filas] as Celda[][], diccionario, notas: notasHoja };
}

/** Libro de SheetJS: números como números, con formato de miles; anchos de columna legibles. */
export function libro(XLSX: typeof import('xlsx'), tabla: TablaExport, notas: [string, string][]) {
  const h = hojas(tabla, notas);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(h.datos);
  tabla.filas.forEach((fila, i) => fila.forEach((v, j) => {
    if (typeof v !== 'number') return;
    const c = tabla.columnas[j];
    const tipo = c.tipo === 'variable' ? (tabla.tipoFila?.[i] ?? 'monto') : c.tipo;
    if (tipo === 'texto') return;
    const celda = ws[XLSX.utils.encode_cell({ r: i + 1, c: j })];
    if (celda) celda.z = FORMATO[tipo];
  }));
  ws['!cols'] = tabla.columnas.map((c) => ({ wch: c.tipo === 'texto' || c.tipo === 'variable' ? Math.max(14, c.titulo.length) : Math.max(14, Math.min(28, c.titulo.length)) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  const wd = XLSX.utils.aoa_to_sheet(h.diccionario);
  wd['!cols'] = [{ wch: 30 }, { wch: 90 }, { wch: 22 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, wd, 'Diccionario');
  const wn = XLSX.utils.aoa_to_sheet(h.notas);
  wn['!cols'] = [{ wch: 18 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wn, 'Notas');
  return wb;
}

/** "Base de Datos", "Siguatepeque — Comayagua", [2021, 2025] → "SIMHO_BaseDeDatos_Siguatepeque-Comayagua_2021-2025.xlsx". */
export function nombreArchivo(vista: string, alcance: string, anios: number[], ext: 'xlsx' | 'csv' = 'xlsx') {
  const limpio = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const a = [...anios].sort((x, y) => x - y);
  const rango = !a.length ? 'sin-anio' : a.length === 1 ? String(a[0]) : `${a[0]}-${a[a.length - 1]}`;
  const vistaPascal = limpio(vista).split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('') || 'Datos';
  return `SIMHO_${vistaPascal.slice(0, 60)}_${limpio(alcance).slice(0, 100).replace(/-$/, '') || 'Pais'}_${rango}.${ext}`;
}

/** CSV de la hoja Datos: UTF-8 con BOM (Excel lee las tildes), separador ";" y números sin formato. */
export function csv(tabla: TablaExport): string {
  const esc = (v: Celda) => {
    if (v == null) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    const seguro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v; // Excel no evalúa la celda como fórmula
    return /[";\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  return '﻿' + [tabla.columnas.map((c) => c.titulo), ...tabla.filas].map((f) => f.map(esc).join(';')).join('\r\n');
}

function bajar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function descargarXlsx(tabla: TablaExport, notas: [string, string][], nombre: string) {
  try {
    const XLSX = await import('xlsx');
    XLSX.writeFile(libro(XLSX, tabla, notas), nombre, { compression: true });
  } catch {
    window.alert('No se pudo generar el Excel. Recargá la página e intentá de nuevo, o descargá el CSV.');
  }
}

export function descargarCsv(tabla: TablaExport, nombre: string) {
  bajar(new Blob([csv(tabla)], { type: 'text/csv;charset=utf-8' }), nombre);
}
