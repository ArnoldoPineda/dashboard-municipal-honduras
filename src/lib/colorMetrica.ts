// Color único de las coropletas (Panorama, Mapa nacional y Vista Departamental).
import { CLAVE_METRICA, SEMAFORO, MetricaMapa, MetricaNumerica, Clases } from './indicadores';
import { fmtL } from './formato';

/** 5 clases secuenciales de turquesa: índice 0 = oscuro (peor) … 4 = claro (mejor). */
export const SECUENCIAL = ['#12302d', '#1d5a52', '#25766b', '#34ad9b', '#3fd6c0']; // el medio, ajustado para contraste AA del rótulo
/** Categorías SGJD 2020 (paleta categórica, distinguible sobre fondo oscuro). */
export const CATEGORICA: Record<string, string> = { A: '#3fd6c0', B: '#6ba6f2', C: '#f0a33a', D: '#b591f2' };
/** "Sin dato comparable" (excluidos de estadísticas): gris con trama (ver PATRON_SIN_DATO). */
export const SIN_DATO = '#2a3442';
export const ID_TRAMA = 'simho-trama-sin-dato';

const TEXTO_CLARO = '#e6edf3';
const TEXTO_OSCURO = '#062621';

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contraste = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** Color de texto con mayor contraste (AA) sobre un fondo dado. */
export const textoSobre = (fondo: string) =>
  contraste(fondo, TEXTO_CLARO) >= contraste(fondo, TEXTO_OSCURO) ? TEXTO_CLARO : TEXTO_OSCURO;

export interface DefMetrica {
  etiqueta: string;
  /** Cómo se calcula el valor de cada departamento (para la nota bajo el título). */
  notaDepto: string;
  formato: (v: number) => string;
  direccion: 'mayor' | 'menor';
}

const pct = (v: number) => `${v.toFixed(1)} %`;

export const METRICAS: Record<MetricaNumerica, DefMetrica> = {
  autonomia:   { etiqueta: 'Autonomía',               notaDepto: 'Mediana municipal de cada departamento',                         formato: pct,  direccion: SEMAFORO[CLAVE_METRICA.autonomia] },
  propiosPc:   { etiqueta: 'Propios por habitante',   notaDepto: 'Agregado departamental: ingresos corrientes ÷ población',      formato: fmtL, direccion: SEMAFORO[CLAVE_METRICA.propiosPc] },
  dependencia: { etiqueta: 'Dependencia',             notaDepto: 'Agregado departamental: transferencias ÷ ingresos del año',    formato: pct,  direccion: SEMAFORO[CLAVE_METRICA.dependencia] },
  inversionPc: { etiqueta: 'Inversión por habitante', notaDepto: 'Agregado departamental: bienes capitalizables ÷ población',     formato: fmtL, direccion: SEMAFORO[CLAVE_METRICA.inversionPc] },
};
export const ETIQUETA_METRICA: Record<MetricaMapa, string> = {
  autonomia: METRICAS.autonomia.etiqueta, propiosPc: METRICAS.propiosPc.etiqueta,
  dependencia: METRICAS.dependencia.etiqueta, inversionPc: METRICAS.inversionPc.etiqueta,
  categoria: 'Categoría SGJD',
};

/** Relleno de una unidad del mapa. `excluida` → trama "Sin dato comparable". */
export function colorMetrica(metrica: MetricaMapa, entrada: { valor?: number | null; categoria?: string | null; excluida?: boolean }, clases?: Clases): string {
  if (entrada.excluida) return `url(#${ID_TRAMA})`;
  if (metrica === 'categoria') return (entrada.categoria && CATEGORICA[entrada.categoria]) || SIN_DATO;
  const c = clases?.clase(entrada.valor);
  return c == null ? SIN_DATO : SECUENCIAL[c];
}

/** Texto de la clase para el tooltip. */
export const textoClase = (clase: number | null) =>
  clase == null ? 'Sin dato comparable' : `Clase ${clase + 1} de 5 (más claro = mejor)`;
