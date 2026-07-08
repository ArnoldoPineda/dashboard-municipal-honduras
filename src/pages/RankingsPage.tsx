import React, { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { MUNICIPIOS, DEPARTAMENTOS, deptNameToId } from '../data/municipios';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';

// ── Types ─────────────────────────────────────────────────────────────────────

type Metric = 'poblacion' | 'presupuesto' | 'ingresosPropios' | 'autonomia' | 'gastosCapital' | 'superavit';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCategory(budget: number): string {
  if (budget > 3_000_000_000) return 'A';
  if (budget > 1_200_000_000) return 'B';
  if (budget > 400_000_000)   return 'C';
  return 'D';
}

const CAT_COLORS: Record<string, string> = {
  A: '#00d4b8', B: '#3a9bd6', C: '#f59e0b', D: '#7c8aa3',
};

const fmt = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat('es-HN');

function formatValue(metric: Metric, value: number): string {
  if (metric === 'autonomia')  return `${value.toFixed(1)}%`;
  if (metric === 'poblacion')  return fmtInt.format(Math.round(value));
  if (metric === 'superavit') {
    const abs = Math.abs(value);
    return (value >= 0 ? '+' : '−') + `L ${fmt.format(abs)}`;
  }
  return `L ${fmt.format(value)}`;
}

function getMetricValue(m: any, metric: Metric): number {
  switch (metric) {
    case 'poblacion':      return m.poblacion || 0;
    case 'presupuesto':    return m.presupuesto || 0;
    case 'ingresosPropios':return m.ingresosPropios || 0;
    case 'autonomia':
      // Autonomía Financiera = ingresos_propios / ingresos_recaudados × 100 (fórmula estándar, afSEFIN).
      // Fallback a presupuesto solo si la fila viene del mock (sin ingresos_recaudados, ej. Supabase caído).
      return m.ingresosRecaudados > 0
        ? (m.ingresosPropios / m.ingresosRecaudados) * 100
        : (m.presupuesto > 0 ? (m.ingresosPropios / m.presupuesto) * 100 : 0);
    case 'gastosCapital':  return m.otros || 0;
    case 'superavit':      return (m.ingresosPropios + m.transferencia + m.otros) - m.presupuesto;
    default:               return 0;
  }
}

// ── Sorted departments list ───────────────────────────────────────────────────

const SORTED_DEPTS = [...(DEPARTAMENTOS as any[])]
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

const METRICS: { key: Metric; label: string }[] = [
  { key: 'poblacion',       label: 'Población' },
  { key: 'presupuesto',     label: 'Presupuesto Total' },
  { key: 'ingresosPropios', label: 'Ingresos Propios' },
  { key: 'autonomia',       label: 'Autonomía Financiera' },
  { key: 'gastosCapital',   label: 'Gastos de Capital' },
  { key: 'superavit',       label: 'Superávit/Déficit' },
];

const PAGE_SIZE = 25;

// ── Component ─────────────────────────────────────────────────────────────────

export default function RankingsPage() {
  const [year,       setYear]       = useState<number>(2024);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [metric,     setMetric]     = useState<Metric>('presupuesto');
  const [page,       setPage]       = useState<number>(0);

  // Fetch real data from Supabase for the selected year; fall back to mock if empty
  const { municipalities: supabaseMunis } = useMunicipalitiesMultiYear([year]);

  const allMusArr = useMemo(() => {
    const yearRows = supabaseMunis.filter(m => m.year === year);
    if (!yearRows.length) return MUNICIPIOS as any[];
    return yearRows.map(m => {
      const deptId  = (deptNameToId as any)(m.department ?? '') ?? (m.department ?? '').toLowerCase().replace(/\s+/g, '-');
      const dept    = (DEPARTAMENTOS as any[]).find((d: any) => d.id === deptId);
      return {
        id:            m.id,
        nombre:        m.name ?? '',
        departamento:  dept ? dept.nombre : (m.department ?? ''),
        departamentoId: deptId,
        poblacion:     m.population ?? 0,
        presupuesto:   m.presupuesto_municipal ?? 0,
        ingresosPropios: m.ingresos_propios ?? 0,
        ingresosRecaudados: m.ingresos_recaudados ?? 0,
        transferencia: m.otras_transferencias ?? 0,
        otros:         m.gastos_capital_deuda ?? 0,
        isCapital:     false,
        evolucion:     [],
      };
    });
  }, [supabaseMunis, year]);

  // Dept average per departamentoId for the active metric
  const deptAvgMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    allMusArr.forEach(m => {
      const v = getMetricValue(m, metric);
      if (!map[m.departamentoId]) map[m.departamentoId] = { sum: 0, count: 0 };
      map[m.departamentoId].sum   += v;
      map[m.departamentoId].count += 1;
    });
    const result: Record<string, number> = {};
    Object.entries(map).forEach(([k, { sum, count }]) => { result[k] = count ? sum / count : 0; });
    return result;
  }, [metric, allMusArr]);

  // Full ranked list (all munis, active metric)
  const rankedAll = useMemo(() => {
    return [...allMusArr]
      .sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric));
  }, [metric, allMusArr]);

  // Previous-year rank map — uses evolucion from mock data when available; no-op for Supabase rows
  const prevRankMap = useMemo<Record<string, number>>(() => {
    const sorted = [...allMusArr].sort((a, b) => {
      const getEvo = (m: any) => {
        const evo = m.evolucion?.find((e: any) => e.year === year - 1);
        return evo?.presupuesto || 0;
      };
      if (metric === 'presupuesto') return getEvo(b) - getEvo(a);
      return getMetricValue(b, metric) - getMetricValue(a, metric);
    });
    const map: Record<string, number> = {};
    sorted.forEach((m, i) => { map[m.id] = i + 1; });
    return map;
  }, [metric, year, allMusArr]);

  // Filtered + paginated rows
  const filtered = useMemo(() => {
    return deptFilter === 'all'
      ? rankedAll
      : rankedAll.filter((m: any) => m.departamentoId === deptFilter);
  }, [rankedAll, deptFilter]);

  const maxValue = useMemo(() => {
    const vs = filtered.map((m: any) => Math.abs(getMetricValue(m, metric)));
    return vs.length ? Math.max(...vs) : 1;
  }, [filtered, metric]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filter/metric changes
  const handleDept = (v: string) => { setDeptFilter(v); setPage(0); };
  const handleMetric = (m: Metric) => { setMetric(m); setPage(0); };
  const handleYear = (y: number) => { setYear(y); setPage(0); };

  // ── Styles ────────────────────────────────────────────────────────────────

  const TH: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 9,
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#4a5a73',
    fontWeight: 600,
    borderBottom: '1px solid rgba(0,212,184,0.12)',
    whiteSpace: 'nowrap',
  };

  const GRID = '48px 1.5fr 1fr 56px 150px 84px 1.3fr';

  return (
    <DashboardLayout title="Rankings">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── HEADER + FILTERS ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>

          {/* Left — title */}
          <div>
            <div style={{
              fontSize: 10, color: '#2dd4bf', fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4,
            }}>
              CLASIFICACIÓN MUNICIPAL
            </div>
            <div style={{
              fontSize: 36, fontWeight: 700, color: '#e8eef6', lineHeight: 1.1,
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              Rankings
            </div>
            <div style={{ fontSize: 10.5, color: '#7c8aa3', marginTop: 5, fontFamily: "'IBM Plex Mono', monospace" }}>
              {filtered.length} municipios ordenados · variación vs. año anterior
            </div>
          </div>

          {/* Right — year pills + dept select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>AÑO</span>
              <div style={{ display: 'flex', gap: 5 }}>
                {[2021, 2022, 2023, 2024, 2025].map(y => (
                  <button
                    key={y}
                    className={y === year ? 'rk-pill rk-pill--active' : 'rk-pill'}
                    onClick={() => handleYear(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: 220 }}>
              <select
                className="simho-select"
                value={deptFilter}
                onChange={e => handleDept(e.target.value)}
              >
                <option value="all">Todos los Departamentos</option>
                {SORTED_DEPTS.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── METRIC TABS ── */}
        <div className="rk-tabbar">
          {METRICS.map(m => (
            <button
              key={m.key}
              className={metric === m.key ? 'rk-tab rk-tab--active' : 'rk-tab'}
              onClick={() => handleMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* ── TABLE ── */}
        <div style={{
          marginTop: 18,
          background: '#0d1628',
          border: '1px solid rgba(0,212,184,0.16)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>

          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: GRID }}>
            {['#', 'MUNICIPIO', 'DEPARTAMENTO', 'CAT.', 'VALOR', 'vs DEPTO', 'RELATIVO'].map(h => (
              <div key={h} style={{ ...TH, textAlign: h === 'VALOR' || h === 'vs DEPTO' ? 'right' : 'left' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {pageRows.map((muni: any, i: number) => {
            const globalRank = filtered.indexOf(muni) + 1;
            const value      = getMetricValue(muni, metric);
            const avg        = deptAvgMap[muni.departamentoId] || 0;
            const vsPct      = avg !== 0 ? ((value - avg) / Math.abs(avg)) * 100 : 0;
            const barPct     = maxValue > 0 ? (Math.abs(value) / maxValue) * 100 : 0;
            const prevRank   = prevRankMap[muni.id] || globalRank;
            const movement   = prevRank - globalRank;
            const cat        = getCategory(muni.presupuesto);

            const rowBg = globalRank === 1
              ? 'rgba(245,196,81,0.06)'
              : globalRank <= 3
                ? 'rgba(245,196,81,0.04)'
                : globalRank <= 10
                  ? 'rgba(245,158,11,0.03)'
                  : 'transparent';

            const rankBadge = (() => {
              if (globalRank === 1) return { bg: '#f5c451', shadow: '0 0 10px rgba(245,196,81,0.55)' };
              if (globalRank === 2) return { bg: '#c4ccd6', shadow: '0 0 8px rgba(196,204,214,0.4)' };
              if (globalRank === 3) return { bg: '#cd8a4b', shadow: '0 0 8px rgba(205,138,75,0.4)' };
              return null;
            })();

            return (
              <div
                key={muni.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID,
                  alignItems: 'center',
                  background: rowBg,
                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.03)',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,184,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
              >

                {/* Rank */}
                <div style={{ padding: '9px 0 9px 14px', display: 'flex', alignItems: 'center' }}>
                  {rankBadge ? (
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: rankBadge.bg, boxShadow: rankBadge.shadow,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11.5, fontWeight: 700, color: '#04231f',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {globalRank}
                    </div>
                  ) : (
                    <span style={{
                      fontSize: 13,
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: globalRank <= 10 ? '#f59e0b' : '#5d6e89',
                    }}>
                      {globalRank}
                    </span>
                  )}
                </div>

                {/* Municipio */}
                <div style={{ padding: '9px 12px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e8eef6', fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {muni.nombre}
                  </div>
                  {muni.isCapital && (
                    <div style={{ fontSize: 8.5, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em', marginTop: 1 }}>
                      CAPITAL DEPTO.
                    </div>
                  )}
                </div>

                {/* Departamento */}
                <div style={{ padding: '9px 12px', fontSize: 12.5, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {muni.departamento}
                </div>

                {/* Categoría */}
                <div style={{ padding: '9px 8px' }}>
                  <span style={{
                    background: CAT_COLORS[cat] || '#7c8aa3',
                    color: '#04231f',
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: "'IBM Plex Mono', monospace",
                    borderRadius: 5,
                    padding: '2px 7px',
                  }}>
                    {cat}
                  </span>
                </div>

                {/* Valor */}
                <div style={{
                  padding: '9px 12px',
                  fontSize: 12.5,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: metric === 'superavit' && value < 0 ? '#ef5a5a' : '#2dd4bf',
                  textAlign: 'right',
                  fontWeight: 600,
                }}>
                  {formatValue(metric, value)}
                </div>

                {/* vs Depto */}
                <div style={{
                  padding: '9px 12px',
                  fontSize: 11.5,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: vsPct >= 0 ? '#1f9d57' : '#ef5a5a',
                  textAlign: 'right',
                }}>
                  {vsPct >= 0 ? '+' : ''}{vsPct.toFixed(1)}%
                </div>

                {/* Relativo — bar + movement */}
                <div style={{ padding: '9px 16px 9px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Progress bar */}
                  <div style={{
                    flex: 1, height: 7, borderRadius: 4,
                    background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${Math.min(100, Math.max(0, barPct))}%`,
                      background: metric === 'superavit' && value < 0
                        ? 'linear-gradient(90deg,#ef5a5a,#f87171)'
                        : 'linear-gradient(90deg,#00d4b8,#5eead4)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>

                  {/* Movement */}
                  <span style={{
                    fontSize: 10,
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: movement > 0 ? '#1f9d57' : movement < 0 ? '#ef5a5a' : '#4a5a73',
                    whiteSpace: 'nowrap',
                    minWidth: 36,
                    textAlign: 'right',
                  }}>
                    {movement > 0 ? `▲ ${movement}` : movement < 0 ? `▼ ${Math.abs(movement)}` : '— 0'}
                  </span>
                </div>
              </div>
            );
          })}

          {pageRows.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
              Sin datos para la selección actual.
            </div>
          )}
        </div>

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                background: 'rgba(0,212,184,0.08)', border: '1px solid rgba(0,212,184,0.25)',
                color: page === 0 ? '#2d3d54' : '#2dd4bf',
                borderRadius: 7, padding: '8px 18px', cursor: page === 0 ? 'default' : 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              }}
            >
              ← Anterior
            </button>
            <span style={{ fontSize: 11, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace" }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              style={{
                background: 'rgba(0,212,184,0.08)', border: '1px solid rgba(0,212,184,0.25)',
                color: page === totalPages - 1 ? '#2d3d54' : '#2dd4bf',
                borderRadius: 7, padding: '8px 18px', cursor: page === totalPages - 1 ? 'default' : 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              }}
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{
          marginTop: 20,
          paddingTop: 12,
          borderTop: '1px solid rgba(0,212,184,0.08)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 9.5, color: '#2d3d54', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
            FUENTE: AMHON / SEFIN / INE HONDURAS
          </span>
          <span style={{ fontSize: 9.5, color: '#2d3d54', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
            SIMHO — SISTEMA DE INFORMACIÓN MUNICIPAL DE HONDURAS
          </span>
        </div>

      </div>
    </DashboardLayout>
  );
}
