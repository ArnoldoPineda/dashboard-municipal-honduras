// Encabezado de la ficha: volver al departamento, nombre, identificación, buscador, año y "Comparar con pares".
import React from 'react';
import { Link } from 'react-router-dom';
import type { Municipality } from '../../hooks/useMunicipalities';
import { codigoINE, nombreDepartamento } from '../../data/departamentos';
import { muniKey, deptSlug } from '../../utils/sefin';
import SelectorAnio from '../SelectorAnio';
import BuscadorMunicipio from './BuscadorMunicipio';
import MiniMapaDepto from './MiniMapaDepto';
import { C, MONO, COND } from './estilo';

export default function EncabezadoFicha({ fila, filas }: { fila: Municipality; filas: Municipality[] }) {
  const depto = nombreDepartamento(fila.department);
  const ine = codigoINE(fila.department, fila.code);
  const identificacion = [
    depto,
    `Cód. ${ine}`,
    fila.category ? `Categoría ${fila.category} (SGJD 2020)` : null,
    fila.population ? `${Number(fila.population).toLocaleString('en-US')} hab.` : null,
  ].filter(Boolean).join(' · ');

  return (
    <header style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', minWidth: 0 }}>
        <MiniMapaDepto department={fila.department} claveMunicipio={muniKey(fila)} nombre={fila.name ?? ''} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <Link to={`/departamento/${deptSlug(fila.department)}`}
            style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 1, color: C.turquesa, textDecoration: 'none', minHeight: 24 }}>
            ← DEPTO. {depto.toUpperCase()}
          </Link>
          <h1 style={{ margin: 0, fontFamily: COND, fontWeight: 700, fontSize: 'clamp(32px, 6vw, 46px)', lineHeight: 1, color: C.texto }}>
            {fila.name}
          </h1>
          <div style={{ fontFamily: MONO, fontSize: 13, color: C.suave }}>{identificacion}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <BuscadorMunicipio filas={filas} />
        <SelectorAnio />
        <Link to={`/comparativos?municipio=${ine}`} style={{
          minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: 10,
          background: C.turquesa, color: '#062621', fontFamily: COND, fontWeight: 700, fontSize: 16,
          letterSpacing: 0.5, textDecoration: 'none',
        }}>
          Comparar con pares
        </Link>
      </div>
    </header>
  );
}
