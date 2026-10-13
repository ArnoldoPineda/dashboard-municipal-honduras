// Identificación de municipios para el buscador y las URL: siempre por código INE (DDMM).
import type { Municipality } from '../hooks/useMunicipalities';
import { codigoINE, nombreDepartamento } from '../data/departamentos';

export interface OpcionMunicipio {
  ine:      string;   // "0318"
  etiqueta: string;   // "Siguatepeque — Comayagua" (distingue homónimos)
}

/** Una opción por municipio (sin repetir años), ordenadas por etiqueta. */
export function opcionesMunicipios(filas: Municipality[]): OpcionMunicipio[] {
  const porIne = new Map<string, OpcionMunicipio>();
  filas.forEach((m) => {
    const ine = codigoINE(m.department, m.code);
    if (ine !== '—' && !porIne.has(ine)) porIne.set(ine, { ine, etiqueta: `${m.name ?? ''} — ${nombreDepartamento(m.department)}` });
  });
  return Array.from(porIne.values()).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
}

/** Texto elegido en el datalist → código INE (null si no coincide exactamente con una opción). */
export const ineDeEtiqueta = (texto: string, opciones: OpcionMunicipio[]) =>
  opciones.find((o) => o.etiqueta === texto.trim())?.ine ?? null;

/** Filas de un municipio (todos los años) por código INE. */
export const filasPorINE = (filas: Municipality[], ine: string) =>
  filas.filter((m) => codigoINE(m.department, m.code) === ine);
