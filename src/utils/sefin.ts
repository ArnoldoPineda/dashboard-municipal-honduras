// Agregados y utilidades sobre las filas SEFIN de Supabase (`municipalities`).
// Fuente única de cifras para todas las páginas: el mock de municipios se eliminó.
import { useMemo } from 'react';
import { Municipality, useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { sumarInsumos, calcular, sinLiquidacion } from '../lib/indicadores';

export const NO_DATA_MSG = 'Sin datos SEFIN para este año';

/** Minúsculas, sin tildes ni espacios sobrantes: "FRANCISCO MORAZAN" ≡ "Francisco Morazán". */
export function normName(name: string | null | undefined): string {
  return (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Clave estable de municipio, igual a la de la geometría OCHA: "DEPARTAMENTO|code". */
export const muniKey = (m: Pick<Municipality, 'department' | 'code'>) => `${m.department}|${m.code}`;

/** "FRANCISCO MORAZAN" → "francisco-morazan" (mismo formato que los id de departamento de la app). */
export const deptSlug = (department: string | null | undefined) => normName(department).replace(/\s+/g, '-');

/** Ruta del detalle municipal: /municipio/<depto>/<code>. */
export const muniPath = (m: Pick<Municipality, 'department' | 'code'>) => `/municipio/${deptSlug(m.department)}/${m.code}`;

export const sumField =(rows: Municipality[], field: keyof Municipality): number =>
  rows.reduce((s, m) => s + (Number(m[field]) || 0), 0);

export interface SefinAgg {
  count:              number;
  presupuesto:        number;
  poblacion:          number;
  ingresosCorrientes: number;
  ingresosDelAnio:    number;
  transferencias:     number;
  autonomia:          number | null;
}

/** Agregado de un grupo de filas (un año), sin filas sin liquidación. Fórmulas en lib/indicadores. */
export function aggregate(rows: Municipality[]): SefinAgg {
  const i = sumarInsumos(rows);
  return {
    count:              rows.filter((m) => !sinLiquidacion(m)).length,
    presupuesto:        i.presupuesto,
    poblacion:          i.poblacion,
    ingresosCorrientes: i.ingresosCorrientes,
    ingresosDelAnio:    i.ingresosDelAnio,
    transferencias:     i.transferencias,
    autonomia:          calcular(i).autonomia,
  };
}

/** Filas agrupadas por departamento normalizado (normName). */
export function groupByDept(rows: Municipality[]): Map<string, Municipality[]> {
  const out = new Map<string, Municipality[]>();
  rows.forEach((m) => {
    const k = normName(m.department);
    const list = out.get(k);
    if (list) list.push(m); else out.set(k, [m]);
  });
  return out;
}

export function aggregateByDept(rows: Municipality[]): Map<string, SefinAgg> {
  const out = new Map<string, SefinAgg>();
  groupByDept(rows).forEach((list, k) => out.set(k, aggregate(list)));
  return out;
}

/** Filas SEFIN de un año + estado de carga. `message` ≠ null ⇒ no hay cifras que mostrar. */
export function useSefinYear(year: number) {
  const { municipalities, loading, error } = useMunicipalitiesMultiYear([year]);
  const rows = useMemo(() => municipalities.filter((m) => m.year === year), [municipalities, year]);
  const noData  = !loading && rows.length === 0;
  const message = noData ? (error ? 'Error al cargar datos SEFIN' : NO_DATA_MSG) : null;
  return { rows, loading, noData, message, error };
}
