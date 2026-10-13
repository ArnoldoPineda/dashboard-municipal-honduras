// Buscador único: datalist nativo con "Nombre — Departamento" (homónimos) y navegación por código INE.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Municipality } from '../../hooks/useMunicipalities';
import { opcionesMunicipios, ineDeEtiqueta, rutaFicha } from '../../lib/municipios';
import { C, SANS } from './estilo';

export default function BuscadorMunicipio({ filas }: { filas: Municipality[] }) {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const opciones = useMemo(() => opcionesMunicipios(filas), [filas]);

  const elegir = (valor: string) => {
    setTexto(valor);
    const ine = ineDeEtiqueta(valor, opciones);
    const ruta = ine ? rutaFicha(ine) : null;
    if (ruta) { setTexto(''); navigate(ruta); }
  };

  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8, background: C.panel, border: `1px solid ${C.borde2}`,
      borderRadius: 10, padding: '0 12px', height: 44, minWidth: 0,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gris} strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
      </svg>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Buscar municipio</span>
      <input
        type="text" list="simho-municipios" placeholder="Buscar municipio…" value={texto}
        onChange={(e) => elegir(e.target.value)}
        style={{ background: 'transparent', border: 0, outline: 'none', color: C.texto, fontFamily: SANS, fontSize: 15, width: 200, minWidth: 0 }}
      />
      <datalist id="simho-municipios">
        {opciones.map((o) => <option key={o.ine} value={o.etiqueta} />)}
      </datalist>
    </label>
  );
}
