// Barras simples (div): percentil con marca de mediana y barra horizontal proporcional.
import React from 'react';
import { C, MONO } from './estilo';

/** Pista 0–100 con la mediana en el 50 % (línea gris) y un punto en el percentil. */
export function BarraPercentil({ percentil, color, n }: { percentil: number | null; color: string; n?: number }) {
  if (percentil == null) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div role="img" aria-label={`Percentil ${percentil}${n ? ` de ${n}` : ''}; la línea marca la mediana`}
        style={{ position: 'relative', height: 8, borderRadius: 4, background: C.pista }}>
        <div style={{ position: 'absolute', left: '50%', top: -3, width: 2, height: 14, background: C.gris }} />
        <div style={{
          position: 'absolute', top: -4, left: `calc(${percentil}% - 8px)`, width: 16, height: 16,
          borderRadius: '50%', background: color, border: `2px solid ${C.fondo}`, boxSizing: 'border-box',
        }} />
      </div>
      {n != null && (
        <div className="barras-escala" style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 10, color: C.gris }}>
          <span>P0</span><span>Percentil {percentil} de {n}</span><span>P100</span>
        </div>
      )}
    </div>
  );
}

/** Fila con rótulo, monto ya formateado y barra proporcional a `max`. */
export function BarraValor({ label, texto, valor, max, color }: {
  label: string; texto: string; valor: number; max: number; color: string;
}) {
  const ancho = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, color: C.texto }}>
        <span>{label}</span><span style={{ fontFamily: MONO, whiteSpace: 'nowrap' }}>{texto}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: C.pista }}>
        <div style={{ height: 6, borderRadius: 3, width: `${ancho}%`, background: color }} />
      </div>
    </div>
  );
}
