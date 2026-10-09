import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDepartamento } from '../data/departamentos';
import { MuniDetailContent, toFigures } from '../components/MuniDetailContent';
import { useNavbar } from '../context/NavbarContext';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { deptSlug, autonomia, NO_DATA_MSG } from '../utils/sefin';

const SEFIN_YEARS = [2021, 2022, 2023, 2024, 2025];

export default function DetalleMunicipio() {
  // Ruta /municipio/:deptId/:code — misma clave department|code que Supabase y la geometría.
  const { deptId, code } = useParams<{ deptId: string; code: string }>();
  const navigate = useNavigate();
  const { fiscalYear } = useNavbar();

  const { municipalities, loading } = useMunicipalitiesMultiYear(SEFIN_YEARS);

  // Filas SEFIN del departamento (todos los años) y del municipio.
  const deptRowsAll = useMemo(
    () => municipalities.filter((m) => deptSlug(m.department) === deptId),
    [municipalities, deptId]
  );
  const muniRows = useMemo(
    () => deptRowsAll.filter((m) => String(m.code) === code).sort((a, b) => a.year - b.year),
    [deptRowsAll, code]
  );

  const row    = muniRows.find((m) => m.year === fiscalYear) ?? null;
  const header = row ?? muniRows[muniRows.length - 1] ?? null; // nombre/depto aunque el año no tenga datos

  const deptAvg = useMemo(() => {
    const yearRows = deptRowsAll.filter((m) => m.year === fiscalYear);
    if (!yearRows.length) return null;
    const figs = yearRows.map(toFigures);
    const avg = (k: keyof ReturnType<typeof toFigures>) => figs.reduce((s, f) => s + f[k], 0) / figs.length;
    return { presupuesto: avg('presupuesto'), ingresosPropios: avg('ingresosPropios'), transferencia: avg('transferencia') };
  }, [deptRowsAll, fiscalYear]);

  const evolucion = useMemo(
    () => muniRows.filter((m) => m.year <= fiscalYear).map((m) => ({ year: m.year, presupuesto: m.presupuesto_municipal ?? 0 })),
    [muniRows, fiscalYear]
  );

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace" }}>
        Cargando datos SEFIN…
      </div>
    );
  }

  if (!header) {
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

  // Nombre del departamento con tildes (data/departamentos.ts).
  const deptNombre = (getDepartamento(deptId || '') as any)?.nombre ?? header.department ?? '';
  const af = row ? autonomia(row.ingresos_propios ?? 0, row.ingresos_recaudados ?? 0) : null;

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
          onClick={() => navigate(`/departamento/${deptId}`)}
          style={{
            background: 'rgba(13,21,38,0.9)',
            border: '1px solid rgba(0,212,184,0.35)',
            borderRadius: 7, color: '#00d4b8', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, fontWeight: 600, padding: '6px 14px',
            letterSpacing: '0.06em', flexShrink: 0,
          }}
        >
          ← {deptNombre.toUpperCase()}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#e8eef6', lineHeight: 1, letterSpacing: '0.01em' }}>
              {header.name}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 600, color: '#5eead4',
              background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.3)',
              borderRadius: 4, padding: '2px 7px',
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em',
            }}>
              DEPTO. {deptNombre.toUpperCase()}
            </span>
            {header.code === 1 && (
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
          Autonomía: <strong style={{ color: '#2dd4bf' }}>{af === null ? '—' : `${af.toFixed(1)}%`}</strong>
        </div>
      </div>

      {/* ── KPI + CHARTS (shared) ── */}
      {row ? (
        <MuniDetailContent row={row} deptAvg={deptAvg} evolucion={evolucion} />
      ) : (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#f59e0b', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700,
        }}>
          ⚠ {NO_DATA_MSG} ({fiscalYear})
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 22px',
        borderTop: '1px solid rgba(0,212,184,0.08)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 7, color: '#2d3d54', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          FUENTE: SEFIN
        </span>
        <span style={{ fontSize: 7, color: '#2d3d54', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          SIMHO — SISTEMA DE INFORMACIÓN MUNICIPAL DE HONDURAS
        </span>
      </div>
    </div>
  );
}
