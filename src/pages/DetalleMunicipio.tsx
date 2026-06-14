import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMunicipio, getDeptAvg } from '../data/municipios';
import { MuniDetailContent } from '../components/MuniDetailContent';

export default function DetalleMunicipio() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const muni    = useMemo(() => getMunicipio(id || ''), [id]);
  const deptAvg = useMemo(() => muni ? getDeptAvg(muni.departamentoId) : null, [muni]);

  if (!muni) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12,
        color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
      }}>
        <div>Municipio no encontrado.</div>
        <button onClick={() => navigate('/')} style={{
          background: 'transparent', border: '1px solid rgba(0,212,184,0.3)',
          borderRadius: 6, color: '#00d4b8', cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: '6px 14px',
        }}>
          ← Volver al mapa
        </button>
      </div>
    );
  }

  const autonomia = muni.presupuesto > 0 ? (muni.ingresosPropios / muni.presupuesto * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '11px 22px',
        borderBottom: '1px solid rgba(0,212,184,0.14)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(`/departamento/${muni.departamentoId}`)}
          style={{
            background: 'rgba(13,21,38,0.9)',
            border: '1px solid rgba(0,212,184,0.35)',
            borderRadius: 7, color: '#00d4b8', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, fontWeight: 600, padding: '6px 14px',
            letterSpacing: '0.06em', flexShrink: 0,
          }}
        >
          ← {muni.departamento.toUpperCase()}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#e8eef6', lineHeight: 1, letterSpacing: '0.01em' }}>
              {muni.nombre}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 600, color: '#5eead4',
              background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.3)',
              borderRadius: 4, padding: '2px 7px',
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em',
            }}>
              DEPTO. {muni.departamento.toUpperCase()}
            </span>
            {muni.isCapital && (
              <span style={{
                fontSize: 9, fontWeight: 600, color: '#f59e0b',
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: 4, padding: '2px 7px',
                fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em',
              }}>
                CAPITAL DEPARTAMENTAL
              </span>
            )}
          </div>
        </div>

        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 600, color: '#5eead4', flexShrink: 0 }}>
          Autonomía: <strong style={{ color: '#2dd4bf' }}>{autonomia.toFixed(1)}%</strong>
        </div>
      </div>

      {/* ── KPI + CHARTS (shared) ── */}
      <MuniDetailContent muni={muni} deptAvg={deptAvg} />

      {/* ── FOOTER ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 22px',
        borderTop: '1px solid rgba(0,212,184,0.08)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 7, color: '#2d3d54', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          FUENTE: AMHON / SEFIN / INE HONDURAS
        </span>
        <span style={{ fontSize: 7, color: '#2d3d54', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          SIMHO — SISTEMA DE INFORMACIÓN MUNICIPAL DE HONDURAS
        </span>
      </div>
    </div>
  );
}
