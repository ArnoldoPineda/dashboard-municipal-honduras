// Buscador único (combobox ARIA): sin tildes ni mayúsculas, coincidencia parcial, "Nombre — Departamento"
// (homónimos) y navegación por código INE. Enter abre la ficha si hay una sola coincidencia o una elegida.
import React, { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Municipality } from '../../hooks/useMunicipalities';
import { opcionesMunicipios, buscarMunicipios, rutaFicha, OpcionMunicipio } from '../../lib/municipios';
import { C, SANS } from './estilo';

/** `onElegir`: en lugar de abrir la ficha, entrega el municipio elegido (Análisis). Sin ella, el comportamiento de la Ficha. */
export default function BuscadorMunicipio({ filas, onElegir }: { filas: Municipality[]; onElegir?: (o: OpcionMunicipio) => void }) {
  const navigate = useNavigate();
  const id = useId();
  const [texto, setTexto] = useState('');
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(-1);
  const opciones = useMemo(() => opcionesMunicipios(filas), [filas]);
  const resultados = useMemo(() => buscarMunicipios(texto, opciones), [texto, opciones]);
  const visible = abierta && resultados.length > 0;

  const abrir = (o: OpcionMunicipio) => {
    if (onElegir) { setTexto(''); setAbierta(false); setActiva(-1); onElegir(o); return; }
    const ruta = rutaFicha(o.ine);
    if (!ruta) return;
    setTexto(''); setAbierta(false); setActiva(-1);
    navigate(ruta);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && resultados.length) {
      e.preventDefault(); setAbierta(true); setActiva((a) => (a + 1) % resultados.length);
    } else if (e.key === 'ArrowUp' && resultados.length) {
      e.preventDefault(); setAbierta(true); setActiva((a) => (a <= 0 ? resultados.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      const elegida = activa >= 0 ? resultados[activa] : resultados.length === 1 ? resultados[0] : undefined;
      if (elegida) { e.preventDefault(); abrir(elegida); }
    } else if (e.key === 'Escape') {
      setAbierta(false); setActiva(-1);
    }
  };

  return (
    <div style={{ position: 'relative', minWidth: 0 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8, background: C.panel, border: `1px solid ${C.borde2}`,
        borderRadius: 10, padding: '0 12px', height: 44, minWidth: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gris} strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Buscar municipio</span>
        <input
          type="text" role="combobox" placeholder="Buscar municipio…" value={texto} autoComplete="off"
          aria-autocomplete="list" aria-expanded={visible} aria-controls={`${id}-lista`}
          aria-activedescendant={visible && activa >= 0 ? `${id}-op-${activa}` : undefined}
          onChange={(e) => { setTexto(e.target.value); setAbierta(true); setActiva(-1); }}
          onFocus={() => setAbierta(true)}
          onBlur={() => setAbierta(false)}
          onKeyDown={onKeyDown}
          style={{ background: 'transparent', border: 0, outline: 'none', color: C.texto, fontFamily: SANS, fontSize: 15, width: 200, minWidth: 0 }}
        />
      </label>
      {visible && (
        <ul id={`${id}-lista`} role="listbox" aria-label="Municipios" style={{
          position: 'absolute', zIndex: 30, top: 48, left: 0, right: 0, minWidth: 260, margin: 0, padding: 4,
          listStyle: 'none', background: C.panel2, border: `1px solid ${C.borde2}`, borderRadius: 10, maxHeight: 320, overflowY: 'auto',
        }}>
          {resultados.map((o, i) => (
            <li key={o.ine} id={`${id}-op-${i}`} role="option" aria-selected={i === activa}
              onMouseDown={(e) => { e.preventDefault(); abrir(o); }}
              onMouseEnter={() => setActiva(i)}
              style={{
                minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 8, cursor: 'pointer',
                fontFamily: SANS, fontSize: 15, color: C.texto, background: i === activa ? '#10302d' : 'transparent',
              }}>
              {o.etiqueta}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
