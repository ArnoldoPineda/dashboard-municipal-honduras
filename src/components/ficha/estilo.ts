// Paleta y tipografías de la Ficha Municipal (mockup aprobado, docs/mockups/ficha-municipal.mockup.html).
import type React from 'react';
import type { Tono } from '../../lib/indicadores';

export const C = {
  fondo:    '#0a0f1a',
  panel:    '#0f1726',
  panel2:   '#0c1320',
  borde:    '#1c2a3d',
  borde2:   '#22334a',
  texto:    '#e6edf3',
  texto2:   '#c9d4e0',
  suave:    '#a9b7c8',   // contraste AA sobre los paneles
  gris:     '#8a9bb0',
  turquesa: '#3fd6c0',
  ambar:    '#f0a33a',
  coral:    '#ff7a6b',
  pista:    '#1c2a3d',
};

export const MONO = "'IBM Plex Mono', monospace";
export const COND = "'Barlow Condensed', sans-serif";
export const SANS = "'Barlow', system-ui, sans-serif";

export const TONO_COLOR: Record<Tono, string> = { turquesa: C.turquesa, gris: C.gris, naranja: C.ambar };

export const panel: React.CSSProperties = {
  background: C.panel, border: `1px solid ${C.borde}`, borderRadius: 14, padding: '16px 18px',
};
export const rotulo: React.CSSProperties = {
  fontFamily: MONO, fontSize: 11, letterSpacing: '1.2px', color: C.suave, textTransform: 'uppercase',
};
export const cifra = (size = 30, color: string = C.texto): React.CSSProperties => ({
  fontFamily: COND, fontWeight: 700, fontSize: size, lineHeight: 1.05, color,
});
/** Grilla que pasa a 1 columna en pantallas angostas sin desbordar. */
export const grilla = (min: number, gap = 14): React.CSSProperties => ({
  display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap,
});
export const h2: React.CSSProperties = { margin: 0, fontFamily: COND, fontSize: 24, fontWeight: 600, color: C.texto };
export const nota: React.CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.5, color: C.texto2 };
