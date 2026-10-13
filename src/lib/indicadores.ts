// Fuente única de indicadores financieros municipales (docs/PLAN_REDISENO.md §1).
// Por municipio y año. Agregados (departamento, nación): suma de numeradores y denominadores.
import type { Municipality } from '../hooks/useMunicipalities';

/** Rótulo único de la población mostrada (SEFIN "ajustada" hasta cargar INE). */
export const ROTULO_POBLACION = 'Población: proyección (provisional)';
/** Rótulo único de la categoría A–D: columna `category`; nota del Excel SEFIN 2021–2022 (docs/ATIPICOS.md §6). */
export const ROTULO_CATEGORIA = 'Categoría SGJD 2020 (según nota del Excel SEFIN)';
export const ROTULO_SIN_LIQUIDACION = 'Sin liquidación';
export const ROTULO_DATO_INCOMPLETO = 'Dato incompleto';
/** Autonomía desde la que se presume que faltan las transferencias (docs/ATIPICOS.md §5). */
export const UMBRAL_AUTONOMIA_INCOMPLETA = 99;
const NOTA_AUTONOMIA_INCOMPLETA =
  'Dato incompleto: autonomía ≥ 99 % porque Art. 91 y otras transferencias vienen en 0 en la fuente SEFIN. Excluido de rankings, medianas y agregados.';
const NOTA_RENDICION_PARCIAL =
  'Dato incompleto (rendición parcial): el Excel SEFIN indica que el municipio no rindió el año completo. Excluido de rankings, medianas y agregados.';
/**
 * Rendiciones parciales según las notas al pie del Excel SEFIN que no caen en "sin liquidación"
 * (docs/ATIPICOS.md §6). Clave: "DEPARTAMENTO|code|año".
 */
const RENDICION_PARCIAL = new Set(['GRACIAS A DIOS|6|2021', 'EL PARAISO|11|2022']);
/** La ejecución se mide contra el aprobado (no hay vigente); por encima de este % se marca ⚠. */
export const UMBRAL_EJECUCION = 150;

/** Montos no finitos (NaN, ±Infinity, texto) se tratan como null, es decir, 0 en las sumas. */
const n = (v: number | string | null | undefined) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const fin = (x: number) => (Number.isFinite(x) ? x : null);
const ratio = (num: number, den: number) => (den > 0 ? fin((num / den) * 100) : null);
const perCapita = (num: number, pob: number) => (pob > 0 ? fin(num / pob) : null);

/** Montos base (lempiras) de los que salen todos los indicadores. Sumables entre municipios. */
export interface Insumos {
  ingresosTotales:   number;
  recursosBalance:   number;
  ingresosCorrientes: number;
  ingresosDelAnio:   number;
  transferencias:    number;
  ibi:               number;
  funcionamiento:    number;
  inversion:         number;
  servicioDeuda:     number;
  totalEgresos:      number;
  presupuesto:       number;
  poblacion:         number;
}

export function insumos(m: Municipality): Insumos {
  const ingresosTotales = n(m.ingresos_recaudados);
  const recursosBalance = n(m.recursos_balance);
  return {
    ingresosTotales,
    recursosBalance,
    // G1 ya incluye tasas y derechos: no se vuelven a sumar.
    ingresosCorrientes: n(m.ingresos_tributarios) + n(m.ingresos_no_tributarios),
    ingresosDelAnio:    ingresosTotales - recursosBalance - n(m.prestamos) - n(m.colocacion_bonos),
    transferencias:     n(m.transferencias_art91) + n(m.otras_transferencias),
    ibi:                n(m.impuesto_bi),
    funcionamiento:     n(m.gastos_funcionamiento),
    inversion:          n(m.bienes_capitalizables),
    servicioDeuda:      n(m.servicios_deuda),
    totalEgresos:       n(m.total_egresos),
    // Aprobado: la base no trae presupuesto vigente.
    presupuesto:        n(m.presupuesto_municipal),
    // ponytail: población SEFIN provisional hasta cargar INE (plan §3.1).
    poblacion:          n(m.population),
  };
}

/**
 * Fila sin liquidación reportada: egresos ≤ 0 e ingresos corrientes en cero (docs/ATIPICOS.md §2).
 * Se excluye de totales, medianas y rankings; la UI la muestra como "Sin liquidación".
 */
export const sinLiquidacion = (m: Municipality) =>
  n(m.total_egresos) <= 0 && n(m.ingresos_tributarios) + n(m.ingresos_no_tributarios) === 0;

const rendicionParcial = (m: Municipality) => RENDICION_PARCIAL.has(`${m.department}|${m.code}|${m.year}`);

/**
 * Dato incompleto: tiene liquidación, pero autonomía ≥ 99 % (transferencias ausentes en la fuente)
 * o rendición parcial según el Excel. Se muestra con ⚠ y se excluye de las estadísticas.
 */
export const datoIncompleto = (m: Municipality) =>
  !sinLiquidacion(m) && (rendicionParcial(m) || (indicadoresMunicipio(m).autonomia ?? 0) >= UMBRAL_AUTONOMIA_INCOMPLETA);

/** Texto del ⚠ (tooltip) de una fila incompleta; null si no lo es. */
export const notaDatoIncompleto = (m: Municipality): string | null =>
  !datoIncompleto(m) ? null : rendicionParcial(m) ? NOTA_RENDICION_PARCIAL : NOTA_AUTONOMIA_INCOMPLETA;

/** Criterio único: fuera de totales, agregados, medianas y rankings (sin liquidación o dato incompleto). */
export const excluirDeEstadisticas = (m: Municipality) => sinLiquidacion(m) || datoIncompleto(m);

/** Suma de insumos de un grupo (un año), sin las filas excluidas de estadísticas. */
export function sumarInsumos(rows: Municipality[]): Insumos {
  const acc = insumos({} as Municipality);
  rows.filter((m) => !excluirDeEstadisticas(m)).forEach((m) => {
    const i = insumos(m);
    (Object.keys(acc) as (keyof Insumos)[]).forEach((k) => { acc[k] += i[k]; });
  });
  return acc;
}

/** Porcentajes en 0–100; per cápita en lempiras; montos en lempiras. null = denominador ≤ 0. */
export interface Indicadores {
  ingresosCorrientes:            number;
  ingresosDelAnio:               number;
  autonomia:                     number | null;
  dependenciaTransferencias:     number | null;
  propiosPerCapita:              number | null;
  ibiPerCapita:                  number | null;
  funcionamientoSobreCorrientes: number | null;
  inversionSobreGasto:           number | null;
  inversionPerCapita:            number | null;
  ahorroCorriente:               number;
  servicioDeudaSobreCorrientes:  number | null;
  balanceSobreIngresos:          number | null;
  resultadoConBalance:           number;
  resultadoSinBalance:           number;
  /** Contra presupuesto aprobado (no hay vigente). */
  ejecucion:                     number | null;
}

export function calcular(i: Insumos): Indicadores {
  return {
    ingresosCorrientes:            i.ingresosCorrientes,
    ingresosDelAnio:               i.ingresosDelAnio,
    autonomia:                     ratio(i.ingresosCorrientes, i.ingresosDelAnio),
    dependenciaTransferencias:     ratio(i.transferencias, i.ingresosDelAnio),
    propiosPerCapita:              perCapita(i.ingresosCorrientes, i.poblacion),
    ibiPerCapita:                  perCapita(i.ibi, i.poblacion),
    funcionamientoSobreCorrientes: ratio(i.funcionamiento, i.ingresosCorrientes),
    inversionSobreGasto:           ratio(i.inversion, i.totalEgresos),
    inversionPerCapita:            perCapita(i.inversion, i.poblacion),
    ahorroCorriente:               i.ingresosCorrientes - i.funcionamiento,
    servicioDeudaSobreCorrientes:  ratio(i.servicioDeuda, i.ingresosCorrientes),
    balanceSobreIngresos:          ratio(i.recursosBalance, i.ingresosTotales),
    // Bug 5: la base solo trae superavit_deficit (con balance); SIMHO publica ambos resultados.
    resultadoConBalance:           i.ingresosTotales - i.totalEgresos,
    resultadoSinBalance:           i.ingresosDelAnio - i.totalEgresos,
    ejecucion:                     ratio(i.totalEgresos, i.presupuesto),
  };
}

export const indicadoresMunicipio = (m: Municipality) => calcular(insumos(m));
/** `rows` de un solo año: con varios años la población se suma entre años. */
export const indicadoresAgregados = (rows: Municipality[]) => calcular(sumarInsumos(rows));

/** Mediana municipal de un indicador; ignora null y filas excluidas de estadísticas. */
export function mediana(rows: Municipality[], k: keyof Indicadores): number | null {
  const v = rows.filter((m) => !excluirDeEstadisticas(m)).map((m) => indicadoresMunicipio(m)[k]).filter((x): x is number => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const h = v.length >> 1;
  return v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2;
}

/** Diferencia tolerada entre un subtotal SEFIN y la suma de sus renglones (lempiras). */
const TOL = 1;
const suma = (m: Municipality, ks: (keyof Municipality)[]) => ks.reduce((s, k) => s + n(m[k] as number), 0);

/** Señales de datos sospechosos de una fila (catálogo en docs/ATIPICOS.md). Vacío = sin observaciones. */
export function atipicos(m: Municipality): string[] {
  const i = insumos(m);
  const r = calcular(i);
  const out: string[] = [];
  if (i.ingresosCorrientes < 0) out.push('Ingresos corrientes negativos');
  if (i.ingresosCorrientes === 0 && i.ingresosTotales > 0) out.push('Ingresos corrientes en cero');
  if (i.ingresosTotales > 0 && i.ingresosDelAnio <= 0) out.push('Ingresos del año ≤ 0 (balance y financiamiento ≥ total)');
  if (r.autonomia !== null && r.autonomia > 100) out.push('Autonomía > 100 %');
  if (datoIncompleto(m)) out.push(rendicionParcial(m) ? 'Dato incompleto (rendición parcial)' : 'Autonomía ≥ 99 % (dato incompleto)');
  if (i.poblacion <= 0) out.push('Sin población');
  if (i.totalEgresos <= 0) out.push('Sin egresos reportados');
  if (i.ingresosTotales <= 0) out.push('Sin ingresos reportados');
  // ponytail: umbral fijo 2× el aprobado; ajustar si aparecen ampliaciones presupuestarias legítimas.
  if (r.ejecucion !== null && r.ejecucion > 200) out.push('Egresos > 2 × presupuesto aprobado');
  const g1 = suma(m, ['impuesto_bi', 'impuesto_personal', 'impuesto_industria', 'impuesto_comercio', 'impuesto_servicios',
    'impuesto_pecuario', 'impuesto_extraccion', 'impuesto_telecomunicaciones', 'tasas_servicios', 'derechos']);
  if (Math.abs(g1 - n(m.ingresos_tributarios)) > TOL) out.push('Tributarios ≠ suma de renglones');
  if (Math.abs(i.ingresosCorrientes - n(m.ingresos_corrientes)) > TOL) out.push('Corrientes SEFIN ≠ G1 + G2');
  const func = suma(m, ['servicios_personales', 'servicios_no_personales', 'materiales_suministro', 'transferencias_corrientes', 'otros_gastos']);
  if (Math.abs(func - i.funcionamiento) > TOL) out.push('Funcionamiento ≠ suma de renglones');
  return out;
}
