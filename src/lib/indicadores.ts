// Fuente única de indicadores financieros municipales (docs/PLAN_REDISENO.md §1).
// Por municipio y año. Agregados (departamento, nación): suma de numeradores y denominadores.
import type { Municipality } from '../hooks/useMunicipalities';

/** Montos no finitos (NaN, ±Infinity, texto) se tratan como null, es decir, 0 en las sumas. */
/** Rótulo único de la población mostrada (SEFIN "ajustada" hasta cargar INE). */
export const ROTULO_POBLACION = 'Población: proyección (provisional)';
/** Rótulo único de la categoría A–D: columna SEFIN `category`, criterio oficial no documentado. */
export const ROTULO_CATEGORIA = 'Categoría según base SEFIN — criterio por confirmar';

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

export function sumarInsumos(rows: Municipality[]): Insumos {
  const acc = insumos({} as Municipality);
  rows.forEach((m) => {
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
    resultadoConBalance:           i.ingresosTotales - i.totalEgresos,
    resultadoSinBalance:           i.ingresosDelAnio - i.totalEgresos,
    ejecucion:                     ratio(i.totalEgresos, i.presupuesto),
  };
}

export const indicadoresMunicipio = (m: Municipality) => calcular(insumos(m));
/** `rows` de un solo año: con varios años la población se suma entre años. */
export const indicadoresAgregados = (rows: Municipality[]) => calcular(sumarInsumos(rows));

/** Mediana municipal de un indicador; ignora null. */
export function mediana(rows: Municipality[], k: keyof Indicadores): number | null {
  const v = rows.map((m) => indicadoresMunicipio(m)[k]).filter((x): x is number => x != null).sort((a, b) => a - b);
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
