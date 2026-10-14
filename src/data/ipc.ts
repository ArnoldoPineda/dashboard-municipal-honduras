// Índice de Precios al Consumidor de Honduras, promedio anual, para expresar montos a precios constantes de 2025.
// Fuente local: docs/fuentes/IPC_BCH_serie_mensual_promedio_anual.xlsx (fila "Promedio Anual", hoja "DIC.2025 =100").
import type { SerieIPC } from '../lib/indicadores';

/** Año base de los precios constantes ("Real"): monto × IPC[ANIO_BASE_REAL] ÷ IPC[año]. Fijo: no sigue al último año de datos. */
export const ANIO_BASE_REAL = 2025;
/** Pie de fuente con "Real" activo. */
export const ROTULO_PRECIOS_REALES = `Precios constantes de ${ANIO_BASE_REAL} — IPC promedio anual BCH (dic-2025 = 100)`;

export const IPC = {
  fuente: 'Banco Central de Honduras (BCH) — IPC, promedio anual',
  base: 'Diciembre de 2025 = 100',
  valores: {
    2021: 77.12,
    2022: 84.13,
    2023: 89.74,
    2024: 93.87,
    2025: 98.18,
  } as SerieIPC,
};

/**
 * Título de un gráfico de Análisis: los de montos agregan la unidad y, en "Real", "(precios constantes 2025)".
 * Los de porcentajes (terminan en "(%)") no cambian.
 */
export const tituloGrafico = (titulo: string, perCapita: boolean, real: boolean) =>
  titulo.endsWith('(%)') ? titulo : `${titulo} · ${perCapita ? 'L/hab.' : 'L'}${real ? ` (precios constantes ${ANIO_BASE_REAL})` : ''}`;

/** true si la serie tiene valor en todos los años pedidos. */
export const ipcCompleto = (anios: number[]) => anios.every((y) => (IPC.valores[y] ?? 0) > 0);
