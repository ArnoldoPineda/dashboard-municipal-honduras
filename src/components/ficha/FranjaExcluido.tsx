// Aviso de municipio excluido de estadísticas (sin liquidación, sin Art. 91 o rendición parcial).
import React from 'react';
import type { Municipality } from '../../hooks/useMunicipalities';
import { sinLiquidacion, notaDatoIncompleto, ROTULO_SIN_LIQUIDACION } from '../../lib/indicadores';
import { C, MONO } from './estilo';

export function motivoExclusion(fila: Municipality): string | null {
  if (sinLiquidacion(fila)) return `${ROTULO_SIN_LIQUIDACION}: el municipio no reportó egresos ni ingresos corrientes en ${fila.year}.`;
  return notaDatoIncompleto(fila);
}

export default function FranjaExcluido({ fila }: { fila: Municipality }) {
  const motivo = motivoExclusion(fila);
  if (!motivo) return null;
  return (
    <section role="note" aria-label="Municipio excluido de estadísticas" style={{
      background: '#2a1d0c', border: `1px solid ${C.ambar}`, borderRadius: 14, padding: '12px 18px',
      display: 'flex', flexWrap: 'wrap', gap: '6px 14px', alignItems: 'baseline',
    }}>
      <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 1, color: C.ambar }}>⚠ EXCLUIDO DE ESTADÍSTICAS</span>
      <span style={{ fontSize: 15, color: '#f5e3c4' }}>{motivo} Sus cifras se muestran, pero no se comparan con los pares.</span>
    </section>
  );
}
