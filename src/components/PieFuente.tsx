import React from 'react';
import { ROTULO_POBLACION } from '../lib/indicadores';

// Pie único de todas las páginas. Fecha de corte: [PENDIENTE] (la base no la trae).
export const TEXTO_FUENTE = `Fuente: SEFIN — Liquidación Presupuestaria Municipal · ${ROTULO_POBLACION} · Categoría SGJD 2020`;

export default function PieFuente() {
  return (
    <footer style={{
      flexShrink: 0, padding: '6px 22px',
      borderTop: '1px solid rgba(0,212,184,0.08)',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#a9b7c8', letterSpacing: '0.04em',
    }}>
      {TEXTO_FUENTE}
    </footer>
  );
}
