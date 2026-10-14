// En celular las tablas pasan a tarjetas: el orden por columna se elige aquí (mismo estado que los encabezados).
import React from 'react';
import { C, MONO } from './ficha/estilo';

export type Orden = { clave: string; dir: 1 | -1 } | null;

export default function OrdenMovil({ opciones, orden, onCambio }: {
  opciones: { clave: string; titulo: string }[];
  orden: Orden;
  onCambio: (o: Orden) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <label style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', color: C.suave, marginBottom: 4 }}>Ordenar por</span>
        <select className="simho-select" value={orden?.clave ?? ''} style={{ minHeight: 44, fontSize: 14, width: '100%' }}
          onChange={(e) => onCambio(e.target.value ? { clave: e.target.value, dir: orden?.dir ?? 1 } : null)}>
          <option value="">Predeterminado</option>
          {opciones.map((o) => <option key={o.clave} value={o.clave}>{o.titulo}</option>)}
        </select>
      </label>
      <button type="button" disabled={!orden} onClick={() => orden && onCambio({ ...orden, dir: orden.dir === 1 ? -1 : 1 })}
        aria-label={orden?.dir === -1 ? 'Orden descendente (cambiar a ascendente)' : 'Orden ascendente (cambiar a descendente)'}
        style={{ minWidth: 44, minHeight: 44, borderRadius: 8, border: `1px solid ${C.borde2}`, background: 'transparent', color: C.texto2, fontSize: 16, cursor: orden ? 'pointer' : 'default', opacity: orden ? 1 : 0.5 }}>
        {orden?.dir === -1 ? '▼' : '▲'}
      </button>
    </div>
  );
}
