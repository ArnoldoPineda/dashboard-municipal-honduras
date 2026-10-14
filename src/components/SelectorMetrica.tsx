// Selector de métrica compartido (Panorama, Mapa nacional y Vista Departamental).
// En celular (< 768 px) es un select nativo en una sola línea.
import React from 'react';
import { useEsMovil } from '../hooks/useMediaQuery';
import type { MetricaMapa } from '../lib/indicadores';
import { ETIQUETA_METRICA } from '../lib/colorMetrica';

const ORDEN: MetricaMapa[] = ['autonomia', 'propiosPc', 'dependencia', 'inversionPc', 'categoria'];

export default function SelectorMetrica({ valor, onCambio }: { valor: MetricaMapa; onCambio: (m: MetricaMapa) => void }) {
  const esMovil = useEsMovil();
  if (esMovil) return (
    <select className="simho-select" aria-label="Métrica del mapa" value={valor} onChange={(e) => onCambio(e.target.value as MetricaMapa)}
      style={{ flex: '1 1 200px', minWidth: 0, minHeight: 44, fontSize: 15 }}>
      {ORDEN.map((m) => <option key={m} value={m}>{ETIQUETA_METRICA[m]}</option>)}
    </select>
  );
  return (
    <div role="group" aria-label="Métrica del mapa" style={{
      display: 'flex', flexWrap: 'wrap', gap: 4, background: '#0f1726', border: '1px solid #22334a', borderRadius: 10, padding: 4,
    }}>
      {ORDEN.map((m) => {
        const on = valor === m;
        return (
          <button key={m} type="button" aria-pressed={on} onClick={() => onCambio(m)} style={{
            minHeight: 44, padding: '0 14px', borderRadius: 8, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 600, letterSpacing: 0.3,
            ...(on ? { background: '#3fd6c0', color: '#062621', border: '1px solid #3fd6c0' }
              : { background: 'transparent', color: '#c9d4e0', border: '1px solid transparent' }),
          }}>
            {ETIQUETA_METRICA[m]}
          </button>
        );
      })}
    </div>
  );
}
