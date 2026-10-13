import React, { useMemo } from 'react';
import { ROTULO_POBLACION, sumarInsumos, calcular, mediana, excluirDeEstadisticas } from '../lib/indicadores';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useNavbar } from '../context/NavbarContext';
import { nombreDepartamento } from '../data/departamentos';
import { fmtL } from '../lib/formato';
import { NO_DATA_MSG } from '../utils/sefin';
import { ANIOS_SEFIN } from '../data/anios';

const YEARS = ANIOS_SEFIN;

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

const fmtNum = (v: number) => Math.round(v).toLocaleString('en-US');

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
    // Sin liquidación o dato incompleto: fuera de totales, promedios y mediana (docs/ATIPICOS.md).
    const excluidos = byYear.filter(excluirDeEstadisticas).length;
    const totalMunis = byYear.length - excluidos;
    // Autonomía: cifra principal = mediana municipal; segunda línea = agregado nacional Σ/Σ.
    const ins = sumarInsumos(byYear);
    const pop = ins.poblacion;
    const presup = ins.presupuesto;
    const propios = ins.ingresosCorrientes;
    const autonomia = calcular(ins).autonomia ?? 0;
    const autonomiaMediana = mediana(byYear, 'autonomia');
    const depts = new Set(byYear.map((m) => normDept(m.department))).size;
    return { totalMunis, excluidos, pop, presup, propios, autonomia, autonomiaMediana, depts };
  }, [byYear]);

  // Department bar chart data
  const deptBars = useMemo(() => {
    const map = new Map<string, { presup: number; propios: number }>();
    byYear.forEach((m: any) => {
      if (!isValidDept(m.department) || excluirDeEstadisticas(m)) return;
      const d: string = nombreDepartamento(m.department);
      const prev = map.get(d) || { presup: 0, propios: 0 };
      map.set(d, {
        presup: prev.presup + (m.presupuesto_municipal || 0),
        propios: prev.propios + sumarInsumos([m]).ingresosCorrientes,
      });
    });
    return [...map.entries()]
      .map(([name, v]) => ({
        name: name.length > 10 ? name.slice(0, 10) + '…' : name,
        Presupuesto: Math.round(v.presup / 1e6),
        'Ing. Corrientes': Math.round(v.propios / 1e6),
      }))
      .sort((a, b) => b.Presupuesto - a.Presupuesto);
  }, [byYear]);

  // Year-over-year trend (national totals, solo años con filas SEFIN)
  const trendYears = useMemo(() => {
    return YEARS.map(y => {
      const ym = municipalities.filter(m => m.year === y && isValidDept(m.department));
      if (ym.length === 0) return null;
      const ins = sumarInsumos(ym);
      return {
        year: y,
        presup:  ins.presupuesto,
        propios: ins.ingresosCorrientes,
        pop:     ins.poblacion,
        // Serie principal: mediana municipal, igual que el KPI.
        autonomia: mediana(ym, 'autonomia'),
      };
    }).filter((t): t is NonNullable<typeof t> => t !== null);
  }, [municipalities]);

  const trendData = trendYears.map(t => ({
    year: t.year,
    Presupuesto: Math.round(t.presup / 1e9 * 100) / 100,
    'Ing. Corrientes': Math.round(t.propios / 1e9 * 100) / 100,
  }));

  // Variación vs año anterior (antes eran porcentajes fijos escritos a mano)
  const prevYear = trendYears.find(t => t.year === selectedYear - 1);

  // Spark data for KPI cards
  const sparkPresup  = trendYears.map(t => t.presup);
  const sparkPropios = trendYears.map(t => t.propios);
  const sparkPop     = trendYears.map(t => t.pop);
  const sparkAut     = trendYears.flatMap(t => (t.autonomia === null ? [] : [t.autonomia]));
  const prevAut      = prevYear?.autonomia ?? null;
  const prom = (v: number) => (kpis && kpis.totalMunis > 0 ? v / kpis.totalMunis : 0);

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
            {loading ? 'Cargando…' : noData ? `${NO_DATA_MSG} (${selectedYear})`
              : `${kpis?.totalMunis ?? 0} municipios en estadísticas · ${kpis?.depts ?? 0} departamentos`
                + (kpis?.excluidos ? ` · ${kpis.excluidos} excluidos (sin liquidación, sin Art. 91 o rendición parcial)` : '')}
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
      {!noData && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {loading || !kpis ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="simho-card" style={{ height: 96, opacity: 0.4 }} />
          ))
        ) : (
          <>
            <KpiCard label={ROTULO_POBLACION} value={fmtNum(kpis.pop)}
              sub={`~${fmtNum(Math.round(prom(kpis.pop)))} prom`}
              {...pctChange(kpis.pop, prevYear?.pop)} sparkData={sparkPop} />
            <KpiCard label="Presupuesto" value={fmtL(kpis.presup)}
              sub={`${fmtL(prom(kpis.presup))} prom`}
              {...pctChange(kpis.presup, prevYear?.presup)} sparkData={sparkPresup} />
            <KpiCard label="Ing. Corrientes" value={fmtL(kpis.propios)}
              sub={kpis.presup > 0 ? `${((kpis.propios / kpis.presup) * 100).toFixed(1)}% del presup` : '—'}
              {...pctChange(kpis.propios, prevYear?.propios)} sparkData={sparkPropios} />
            <KpiCard label="Autonomía (mediana municipal)"
              value={kpis.autonomiaMediana === null ? '—' : `${kpis.autonomiaMediana.toFixed(1)}%`}
              sub={`Agregado nacional: ${kpis.autonomia.toFixed(1)} %`}
              {...(prevAut !== null && kpis.autonomiaMediana !== null ? {
                trend: `${kpis.autonomiaMediana - prevAut >= 0 ? '+' : ''}${(kpis.autonomiaMediana - prevAut).toFixed(1)} pp`,
                trendUp: kpis.autonomiaMediana >= prevAut,
              } : {})} sparkData={sparkAut} />
          </>
        )}
      </div>}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: noData ? '1fr' : '1fr 1fr', gap: 16 }}>

        {/* Bar chart — departments */}
        {!noData && <div className="simho-card" style={{ padding: '16px 12px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', marginBottom: 12 }}>
            PRESUPUESTO POR DEPARTAMENTO · {selectedYear} · (millones de L)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptBars} margin={{ top: 0, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,184,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} />
              <Tooltip content={<DarkTooltip formatter={(v: number) => fmtL(v * 1e6)} />} />
              <Bar dataKey="Presupuesto" fill="#00d4b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Ing. Corrientes" fill="rgba(0,212,184,0.3)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>}

        {/* Area chart — year-over-year trend */}
        <div className="simho-card" style={{ padding: '16px 12px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', marginBottom: 12 }}>
            {`TENDENCIA NACIONAL 2021–${YEARS[YEARS.length - 1]} · (miles de millones de L)`}
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
              <Tooltip content={<DarkTooltip formatter={(v: number) => fmtL(v * 1e9)} />} />
              <Area type="monotone" dataKey="Presupuesto" stroke="#00d4b8" strokeWidth={2}
                fill="url(#presupGrad)" dot={{ fill: '#00d4b8', r: 3 }} />
              <Area type="monotone" dataKey="Ing. Corrientes" stroke="#f59e0b" strokeWidth={1.5}
                fill="url(#propiosGrad)" dot={{ fill: '#f59e0b', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[{ color: '#00d4b8', label: 'Presupuesto' }, { color: '#f59e0b', label: 'Ing. Corrientes' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                <div style={{ width: 18, height: 2, background: l.color, borderRadius: 1 }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
