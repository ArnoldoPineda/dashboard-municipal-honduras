import React, { useMemo } from 'react';
import { ROTULO_POBLACION, ROTULO_CATEGORIA, excluirDeEstadisticas } from '../lib/indicadores';
import { useNavbar } from '../context/NavbarContext';
import { useSefinYear, aggregate } from '../utils/sefin';
import SelectorAnio from '../components/SelectorAnio';
import SelectorMetrica from '../components/SelectorMetrica';
import MapaDepartamentos from '../components/panorama/MapaDepartamentos';
import { METRICAS, CATEGORICA } from '../lib/colorMetrica';
import { fmtL } from '../lib/formato';

const MONO = "'IBM Plex Mono', monospace";
const COND = "'Barlow Condensed', sans-serif";
const fmtInt = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 0 });

function Tarjeta({ rotulo, valor, nota, color = '#2dd4bf' }: { rotulo: string; valor: React.ReactNode; nota: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(13,21,38,0.7)', borderRadius: 8, borderLeft: `3px solid ${color}`, padding: '10px 14px', minWidth: 0 }}>
      <div style={{ fontSize: 10, color: '#a9b7c8', fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{rotulo}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#e8eef6', fontFamily: COND, lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: 11, color: '#a9b7c8', fontFamily: MONO, marginTop: 3 }}>{nota}</div>
    </div>
  );
}

export default function MapaInteractivo() {
  const { indicator, setIndicator, fiscalYear } = useNavbar();
  // Fuente única de cifras: Supabase `municipalities` del año seleccionado.
  const { rows, loading, message: noDataMsg } = useSefinYear(fiscalYear);
  const hideFigures = loading || !!noDataMsg; // mientras carga: '—', nunca 0
  const totals = useMemo(() => aggregate(rows), [rows]);
  const catTotals = useMemo(() => {
    const c: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    rows.forEach((m) => { if (!excluirDeEstadisticas(m) && m.category && m.category in c) c[m.category]++; });
    return c;
  }, [rows]);

  return (
    <div className="simho-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px clamp(16px, 3vw, 28px) 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#2dd4bf', fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
            República de Honduras
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, color: '#e8eef6', lineHeight: 1.05, fontFamily: COND }}>
            Atlas Municipal Nacional
          </h1>
          <div style={{ fontSize: 14, color: '#a9b7c8', maxWidth: 620, lineHeight: 1.5, marginTop: 6 }}>
            {indicator === 'categoria'
              ? `${ROTULO_CATEGORIA}: categoría predominante de cada departamento.`
              : `${METRICAS[indicator].notaDepto} · ${fiscalYear}.`}{' '}
            Seleccione un departamento para explorar sus municipios.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SelectorMetrica valor={indicator} onCambio={setIndicator} />
          <SelectorAnio alto />
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', padding: '0 clamp(16px, 3vw, 28px)' }}>
        {noDataMsg ? (
          <div style={{ margin: '40px auto', textAlign: 'center', background: 'rgba(8,12,24,0.9)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, padding: '18px 28px', maxWidth: 360 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', fontFamily: MONO, marginBottom: 6 }}>⚠ {noDataMsg}</div>
            <div style={{ fontSize: 12, color: '#a9b7c8', lineHeight: 1.5 }}>
              No hay datos de SEFIN en el sistema para el año fiscal {fiscalYear}. Seleccioná un año entre 2021 y 2025.
            </div>
          </div>
        ) : !loading && (
          <MapaDepartamentos filasAnio={rows} metrica={indicator} maxAlto="calc(100vh - 440px)" />
        )}
        <div style={{ fontFamily: MONO, fontSize: 10, color: '#8a9bb0', letterSpacing: '0.06em', marginTop: 8 }}>
          Límites: OCHA COD-AB / SINIT (CC BY-IGO) · EJERCICIO FISCAL {fiscalYear}
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, padding: '10px 16px', marginTop: 12,
        borderTop: '1px solid rgba(0,212,184,0.12)', background: 'rgba(8,12,24,0.4)', flexShrink: 0,
      }}>
        {indicator === 'categoria'
          ? (['A', 'B', 'C', 'D'] as const).map((cat) => (
            <Tarjeta key={cat} rotulo={`Cat ${cat}`} valor={hideFigures ? '—' : catTotals[cat]} nota="municipios en estadísticas" color={CATEGORICA[cat]} />
          ))
          : (
            <>
              <Tarjeta rotulo="Municipios" valor={hideFigures ? '—' : totals.count} nota="en estadísticas · 18 departamentos" />
              <Tarjeta rotulo={`${ROTULO_POBLACION} · nacional`} valor={hideFigures ? '—' : fmtInt.format(totals.poblacion)} nota={`habitantes · SEFIN ${fiscalYear}`} />
              <Tarjeta rotulo="Presupuesto agregado" valor={hideFigures ? '—' : fmtL(totals.presupuesto)} nota="suma de presupuestos municipales" color="#f59e0b" />
            </>
          )}
      </div>
    </div>
  );
}
