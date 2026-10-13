// Identificación de municipios para el buscador y las URL: siempre por código INE (DDMM).
import type { Municipality } from '../hooks/useMunicipalities';
import { codigoINE, nombreDepartamento, DEPARTAMENTOS } from '../data/departamentos';

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

/** Filas de un municipio (todos los años) por código INE. */
export const filasPorINE = (filas: Municipality[], ine: string) =>
  filas.filter((m) => codigoINE(m.department, m.code) === ine);

/** Ruta de la ficha a partir del código INE: "0318" → "/municipio/comayagua/18". */
export function rutaFicha(ine: string): string | null {
  if (!/^\d{4}$/.test(ine)) return null;
  const d = DEPARTAMENTOS.find((x) => x.cod === ine.slice(0, 2));
  const code = Number(ine.slice(2));
  return d && code >= 1 ? `/municipio/${d.id}/${code}` : null;
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Búsqueda sin tildes ni mayúsculas y por coincidencia parcial: cada palabra del texto debe aparecer en
 * "Nombre — Departamento" ("sigua" → Siguatepeque; "santa barbara" → Santa Bárbara). Primero las que
 * empiezan por el texto; luego en orden alfabético.
 */
export function buscarMunicipios(texto: string, opciones: OpcionMunicipio[], max = 8): OpcionMunicipio[] {
  const q = normalizar(texto);
  if (!q) return [];
  const palabras = q.split(/\s+/);
  return opciones
    .map((o) => ({ o, n: normalizar(o.etiqueta) }))
    .filter(({ n }) => palabras.every((p) => n.includes(p)))
    .sort((a, b) => Number(b.n.startsWith(q)) - Number(a.n.startsWith(q)) || a.n.localeCompare(b.n, 'es'))
    .slice(0, max)
    .map(({ o }) => o);
}
