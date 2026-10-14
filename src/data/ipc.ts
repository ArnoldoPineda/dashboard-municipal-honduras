// Índice de Precios al Consumidor de Honduras, promedio anual, para expresar montos a precios del último año.
// [PENDIENTE] Valores oficiales: cargar desde el BCH. Mientras haya años en null, "Real" queda deshabilitado.
import type { SerieIPC } from '../lib/indicadores';

export const IPC = {
  fuente: 'Banco Central de Honduras (BCH) — IPC, promedio anual',
  base: '[PENDIENTE]',
  valores: {
    2021: null,
    2022: null,
    2023: null,
    2024: null,
    2025: null,
  } as SerieIPC,
};

/** true si la serie tiene valor en todos los años pedidos. */
export const ipcCompleto = (anios: number[]) => anios.every((y) => (IPC.valores[y] ?? 0) > 0);
