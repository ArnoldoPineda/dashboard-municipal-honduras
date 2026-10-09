// Agregados y utilidades sobre las filas SEFIN de Supabase (`municipalities`).
// Fuente única de cifras para todas las páginas: nada numérico sale del mock.
import { useMemo } from 'react';
import { Municipality, useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';

export const NO_DATA_MSG = 'Sin datos SEFIN para este año';

/** Minúsculas, sin tildes ni espacios sobrantes: "FRANCISCO MORAZAN" ≡ "Francisco Morazán". */
export function normName(name: string | null | undefined): string {
  return (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Clave estable de municipio, igual a la de la geometría OCHA: "DEPARTAMENTO|code". */
export const muniKey = (m: Pick<Municipality, 'department' | 'code'>) => `${m.department}|${m.code}`;

export const sumField = (rows: Municipality[], field: keyof Municipality): number =>
  rows.reduce((s, m) => s + (Number(m[field]) || 0), 0);

/** Fórmula validada del proyecto: ingresos_propios / ingresos_recaudados × 100. */
export function autonomia(propios: number, recaudados: number): number | null {
  return recaudados > 0 ? (propios / recaudados) * 100 : null;
}

/** Categoría por presupuesto (regla de la app, no la categoría oficial de la SGJD). */
export function categoryOf(budget: number): 'A' | 'B' | 'C' | 'D' {
  if (budget > 500_000_000) return 'A';
  if (budget > 150_000_000) return 'B';
  if (budget >  50_000_000) return 'C';
  return 'D';
}

export interface SefinAgg {
  count:              number;
  presupuesto:        number;
  poblacion:          number;
  ingresosPropios:    number;
  ingresosRecaudados: number;
  transferencias:     number;
  autonomia:          number | null;
}

export function aggregate(rows: Municipality[]): SefinAgg {
  const ingresosPropios    = sumField(rows, 'ingresos_propios');
  const ingresosRecaudados = sumField(rows, 'ingresos_recaudados');
  return {
    count:          rows.length,
    presupuesto:    sumField(rows, 'presupuesto_municipal'),
    poblacion:      sumField(rows, 'population'),
    ingresosPropios,
    ingresosRecaudados,
    transferencias: sumField(rows, 'transferencias_art91'),
    autonomia:      autonomia(ingresosPropios, ingresosRecaudados),
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
