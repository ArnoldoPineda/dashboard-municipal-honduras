import React from 'react';
import { useNavbar, IndicatorKey } from '../context/NavbarContext';
import { ROTULO_POBLACION } from '../lib/indicadores';

// Botones de indicador del Mapa y la Vista Departamental (antes en el encabezado).
// ponytail: provisional hasta el selector de métrica del mapa (Fase 3).
const INDICATORS: { key: IndicatorKey; label: string }[] = [
  { key: 'presupuesto', label: 'PRESUPUESTO' },
  { key: 'poblacion',   label: ROTULO_POBLACION.toUpperCase() },
  { key: 'autonomia',   label: 'AUTONOMÍA'   },
  { key: 'categorias',  label: 'CATEGORÍAS'  },
];

export default function SelectorIndicador() {
  const { indicator, setIndicator } = useNavbar();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {INDICATORS.map((ind) => (
        <button
          key={ind.key}
          onClick={() => setIndicator(ind.key)}
          style={{
            background: indicator === ind.key ? 'rgba(0,212,184,0.18)' : 'transparent',
            border: `1px solid ${indicator === ind.key ? 'rgba(0,212,184,0.6)' : 'rgba(0,212,184,0.2)'}`,
            borderRadius: 7,
            color: indicator === ind.key ? '#00d4b8' : '#7c8aa3',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            fontWeight: indicator === ind.key ? 700 : 400,
            padding: '5px 12px',
            letterSpacing: '0.08em',
            transition: 'all 0.14s',
          }}
        >
          {ind.label}
        </button>
      ))}
    </div>
  );
}
