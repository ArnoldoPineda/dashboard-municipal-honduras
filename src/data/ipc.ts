// Índice de Precios al Consumidor de Honduras, promedio anual, para expresar montos a precios del último año.
// Fuente local: docs/fuentes/IPC_BCH_serie_mensual_promedio_anual.xlsx (fila "Promedio Anual", hoja "DIC.2025 =100").
import type { SerieIPC } from '../lib/indicadores';

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

/** true si la serie tiene valor en todos los años pedidos. */
export const ipcCompleto = (anios: number[]) => anios.every((y) => (IPC.valores[y] ?? 0) > 0);
