import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useNavbar } from '../context/NavbarContext';
import { NO_DATA_MSG } from '../utils/sefin';

const YEARS = [2021, 2022, 2023, 2024, 2025];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normDept(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function isValidDept(dept: any): boolean {
  if (!dept) return false;
  const t = String(dept).trim().toUpperCase();
  return t !== '' && t !== 'N/A' && t !== 'NULL';
}

/** Variación % respecto del año anterior; undefined si no hay año anterior con datos. */
function pctChange(cur: number, prev: number | undefined): { trend?: string; trendUp?: boolean } {
  if (!prev) return {};
  const pct = ((cur - prev) / prev) * 100;
  return { trend: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, trendUp: pct >= 0 };
}

const fmtB = (v: number) => `L ${(v / 1e9).toFixed(2)}B`;
const fmtM = (v: number) => `L ${(v / 1e6).toFixed(0)}M`;
const fmtNum = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`;

// ─── Dark tooltip ────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(8,12,24,0.96)',
      border: '1px solid rgba(0,212,184,0.3)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      fontFamily: "'Barlow Condensed', sans-serif",
    }}>
      <div style={{ color: '#7c8aa3', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || '#00d4b8' }}>
          {p.name}: <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  sparkData?: number[];
}

function KpiCard({ label, value, sub, trend, trendUp, sparkData }: KpiProps) {
  const spark = sparkData?.map((v, i) => ({ i, v })) || [];
  return (
    <div className="simho-card" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--teal)', fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{sub}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        {trend && (
          <span style={{ fontSize: 11, color: trendUp ? '#1f9d57' : trendUp === false ? '#ef5a5a' : '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace" }}>
            {trendUp === true ? '↑' : trendUp === false ? '↓' : '—'} {trend}
          </span>
        )}
        {spark.length > 0 && (
          <div style={{ width: 60, height: 24 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <Line type="monotone" dataKey="v" stroke="#00d4b8" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function DashboardNacional() {
  const { fiscalYear, setFiscalYear } = useNavbar();
  const { municipalities, loading } = useMunicipalitiesMultiYear(YEARS);

  // 2019/2020 no tienen filas SEFIN: se muestra "Sin datos SEFIN", nunca el mock.
  const selectedYear = fiscalYear;

  const byYear = useMemo(() => {
    // Filter: skip rows with null/empty/N/A department. Sin estimar ingresos_propios nulos.
    return municipalities.filter(m => m.year === selectedYear && isValidDept(m.department));
  }, [municipalities, selectedYear]);

  const noData = !loading && byYear.length === 0;

  // Aggregate KPIs for selected year
  const kpis = useMemo(() => {
    if (byYear.length === 0) return null;
    const totalMunis = byYear.length;
    const pop = byYear.reduce((s, m) => s + (m.population || 0), 0);
    const presup = byYear.reduce((s, m) => s + (m.presupuesto_municipal || 0), 0);
    const propios = byYear.reduce((s, m) => s + (m.ingresos_propios || 0), 0);
    const autonomia = totalMunis > 0
      ? byYear.reduce((s, m) => s + (m.autonomia_financiera || 0), 0) / totalMunis
      : 0;
    const topMuni = [...byYear].sort((a, b) => (b.presupuesto_municipal || 0) - (a.presupuesto_municipal || 0))[0];
    const depts = new Set(byYear.map((m) => normDept(m.department))).size;
    return { totalMunis, pop, presup, propios, autonomia, depts, topMuni };
  }, [byYear]);

  // Department bar chart data
  const deptBars = useMemo(() => {
    const map = new Map<string, { presup: number; propios: number }>();
    byYear.forEach((m: any) => {
      if (!isValidDept(m.department)) return;
      const d: string = m.department;
      const prev = map.get(d) || { presup: 0, propios: 0 };
      map.set(d, {
        presup: prev.presup + (m.presupuesto_municipal || 0),
        propios: prev.propios + (m.ingresos_propios || 0),
      });
    });
    return [...map.entries()]
      .map(([name, v]) => ({
        name: name.length > 10 ? name.slice(0, 10) + '…' : name,
        Presupuesto: Math.round(v.presup / 1e6),
        'Ing. Propios': Math.round(v.propios / 1e6),
      }))
      .sort((a, b) => b.Presupuesto - a.Presupuesto);
  }, [byYear]);

  // Year-over-year trend (national totals, solo años con filas SEFIN)
  const trendYears = useMemo(() => {
    return YEARS.map(y => {
      const ym = municipalities.filter(m => m.year === y && isValidDept(m.department));
      if (ym.length === 0) return null;
      const sum = (f: string) => ym.reduce((s: number, m: any) => s + (m[f] || 0), 0);
      return {
        year: y,
        presup:  sum('presupuesto_municipal'),
        propios: sum('ingresos_propios'),
        pop:     sum('population'),
        // Misma métrica que el KPI: promedio simple de autonomia_financiera por municipio.
        autonomia: sum('autonomia_financiera') / ym.length,
        munis:   ym.length,
      };
    }).filter((t): t is NonNullable<typeof t> => t !== null);
  }, [municipalities]);

  const trendData = trendYears.map(t => ({
    year: t.year,
    Presupuesto: Math.round(t.presup / 1e9 * 100) / 100,
    'Ing. Propios': Math.round(t.propios / 1e9 * 100) / 100,
  }));

  // Variación vs año anterior (antes eran porcentajes fijos escritos a mano)
  const prevYear = trendYears.find(t => t.year === selectedYear - 1);

  // Spark data for KPI cards
  const sparkPresup  = trendYears.map(t => t.presup);
  const sparkPropios = trendYears.map(t => t.propios);
  const sparkPop     = trendYears.map(t => t.pop);

  const tickStyle = { fill: '#7c8aa3', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif" };

  return (
    <div
      className="simho-scroll simho-view-in"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Header + year selector */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em', marginBottom: 4 }}>
            DASHBOARD NACIONAL
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>
            Finanzas Municipales Honduras
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {loading ? 'Cargando…' : noData ? `${NO_DATA_MSG} (${selectedYear})` : `${kpis?.totalMunis ?? 0} municipios · ${kpis?.depts ?? 0} departamentos`}
          </div>
        </div>

        {/* Year tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => setFiscalYear(y)}
              style={{
                background: selectedYear === y ? 'rgba(0,212,184,0.18)' : 'rgba(13,21,38,0.7)',
                border: `1px solid ${selectedYear === y ? 'rgba(0,212,184,0.6)' : 'rgba(0,212,184,0.18)'}`,
                borderRadius: 8,
                color: selectedYear === y ? '#00d4b8' : '#aab6c9',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                padding: '7px 16px',
                transition: '0.15s',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {noData && (
        <div className="simho-card" style={{
          textAlign: 'center', padding: '18px 22px', color: '#f59e0b',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700,
          border: '1px solid rgba(245,158,11,0.4)',
        }}>
          ⚠ {NO_DATA_MSG} ({selectedYear}). Seleccioná un año entre {YEARS[0]} y {YEARS[YEARS.length - 1]}.
        </div>
      )}

      {/* KPI row */}
      {!noData && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {loading || !kpis ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="simho-card" style={{ height: 96, opacity: 0.4 }} />
          ))
        ) : (
          <>
            <KpiCard label="Municipios" value={`${kpis.totalMunis}`}
              sub="registrados" />
            <KpiCard label="Población" value={fmtNum(kpis.pop)}
              sub={`~${fmtNum(Math.round(kpis.pop / kpis.totalMunis))} prom`}
              {...pctChange(kpis.pop, prevYear?.pop)} sparkData={sparkPop} />
            <KpiCard label="Presupuesto" value={fmtB(kpis.presup)}
              sub={`${fmtM(kpis.presup / kpis.totalMunis)} prom`}
              {...pctChange(kpis.presup, prevYear?.presup)} sparkData={sparkPresup} />
            <KpiCard label="Ing. Propios" value={fmtB(kpis.propios)}
              sub={`${((kpis.propios / kpis.presup) * 100).toFixed(1)}% del presup`}
              {...pctChange(kpis.propios, prevYear?.propios)} sparkData={sparkPropios} />
            <KpiCard label="Autonomía" value={`${kpis.autonomia.toFixed(1)}%`}
              sub="promedio nacional"
              {...(prevYear ? {
                trend: `${kpis.autonomia - prevYear.autonomia >= 0 ? '+' : ''}${(kpis.autonomia - prevYear.autonomia).toFixed(1)} pp`,
                trendUp: kpis.autonomia >= prevYear.autonomia,
              } : {})} />
            <KpiCard label="Departamentos" value={`${kpis.depts}`}
              sub="con datos SEFIN" />
          </>
        )}
      </div>}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: noData ? '1fr' : '1fr 1fr', gap: 16 }}>

        {/* Bar chart — departments */}
        {!noData && <div className="simho-card" style={{ padding: '16px 12px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', marginBottom: 12 }}>
            PRESUPUESTO POR DEPARTAMENTO · {selectedYear} · (M HNL)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptBars} margin={{ top: 0, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,184,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} />
              <Tooltip content={<DarkTooltip formatter={(v: number) => `L ${v}M`} />} />
              <Bar dataKey="Presupuesto" fill="#00d4b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Ing. Propios" fill="rgba(0,212,184,0.3)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>}

        {/* Area chart — year-over-year trend */}
        <div className="simho-card" style={{ padding: '16px 12px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', marginBottom: 12 }}>
            {`TENDENCIA NACIONAL 2021–${YEARS[YEARS.length - 1]} · (B HNL)`}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 0, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="presupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4b8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00d4b8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="propiosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,184,0.08)" vertical={false} />
              <XAxis dataKey="year" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip formatter={(v: number) => `L ${v}B`} />} />
              <Area type="monotone" dataKey="Presupuesto" stroke="#00d4b8" strokeWidth={2}
                fill="url(#presupGrad)" dot={{ fill: '#00d4b8', r: 3 }} />
              <Area type="monotone" dataKey="Ing. Propios" stroke="#f59e0b" strokeWidth={1.5}
                fill="url(#propiosGrad)" dot={{ fill: '#f59e0b', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[{ color: '#00d4b8', label: 'Presupuesto' }, { color: '#f59e0b', label: 'Ing. Propios' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                <div style={{ width: 18, height: 2, background: l.color, borderRadius: 1 }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top municipalities table */}
      {!noData && <div className="simho-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,212,184,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em' }}>
            TOP MUNICIPIOS POR PRESUPUESTO · {selectedYear}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {kpis?.totalMunis ?? 0} registros
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,212,184,0.1)' }}>
                {['#', 'Municipio', 'Departamento', 'Presupuesto', 'Ing. Propios', 'Autonomía'].map(h => (
                  <th key={h} style={{
                    padding: '8px 14px',
                    textAlign: h === '#' ? 'center' : 'left',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} style={{ padding: '10px 14px' }}>
                        <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                [...byYear]
                  .sort((a, b) => (b.presupuesto_municipal || 0) - (a.presupuesto_municipal || 0))
                  .slice(0, 12)
                  .map((m, i) => (
                    <tr key={m.id}
                      style={{ borderBottom: '1px solid rgba(0,212,184,0.06)', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,184,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 500 }}>{m.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{m.department}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--teal)', fontFamily: "'IBM Plex Mono', monospace" }}>
                        {fmtM(m.presupuesto_municipal || 0)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#f59e0b', fontFamily: "'IBM Plex Mono', monospace" }}>
                        {fmtM(m.ingresos_propios || 0)}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace" }}>
                        <span style={{
                          color: (m.autonomia_financiera || 0) >= 30 ? '#1f9d57' : (m.autonomia_financiera || 0) >= 15 ? '#f59e0b' : '#ef5a5a',
                          fontSize: 12,
                        }}>
                          {(m.autonomia_financiera || 0).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}
