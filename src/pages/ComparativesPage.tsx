import React, { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024];
const PALETTE = ['#2dd4bf', '#f59e0b', '#3a9bd6', '#ec4899'];
const MAX_MUNIS = 3;
const MAX_DEPTS = 4;

type CompMode = 'municipios' | 'departamentos' | 'historica';
type MetricKey = 'presupuesto' | 'ingresos' | 'autonomia' | 'poblacion' | 'transferencias';

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'presupuesto',    label: 'Presupuesto' },
  { key: 'ingresos',      label: 'Ingresos Propios' },
  { key: 'autonomia',     label: 'Autonomía' },
  { key: 'poblacion',     label: 'Población' },
  { key: 'transferencias',label: 'Transferencias' },
];

// ── Style tokens ──────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 8,
  padding: 20,
};

const FLABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  fontFamily: "'IBM Plex Mono', monospace",
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#4a5a73',
  marginBottom: 8,
  fontWeight: 600,
};

const TH: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 9,
  fontFamily: "'IBM Plex Mono', monospace",
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#4a5a73',
  fontWeight: 600,
  borderBottom: '1px solid rgba(0,212,184,0.16)',
  background: '#0d1628',
  whiteSpace: 'nowrap',
  textAlign: 'left',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMetricValue(m: any, metric: MetricKey): number {
  switch (metric) {
    case 'presupuesto':     return m.presupuesto_municipal ? Math.round(m.presupuesto_municipal / 1_000_000) : 0;
    case 'ingresos':        return m.ingresos_propios ? Math.round(m.ingresos_propios / 1_000_000) : 0;
    case 'autonomia':       return m.presupuesto_municipal
      ? Math.round((m.ingresos_propios / m.presupuesto_municipal) * 1000) / 10 : 0;
    case 'poblacion':       return m.population || 0;
    case 'transferencias':  return m.otras_transferencias ? Math.round(m.otras_transferencias / 1_000_000) : 0;
    default:                return 0;
  }
}

function formatValue(metric: MetricKey, value: number): string {
  if (metric === 'autonomia') return `${value.toFixed(1)}%`;
  if (metric === 'poblacion') return new Intl.NumberFormat('es-HN').format(Math.round(value));
  return `L ${value.toFixed(1)}M`;
}

function getMetricLabel(metric: MetricKey): string {
  return METRICS.find(m => m.key === metric)?.label ?? metric;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectedPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(0,212,184,0.14)', color: '#5eead4',
      border: '1px solid rgba(0,212,184,0.4)', borderRadius: 20,
      padding: '4px 10px', fontSize: 11,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', color: '#5eead4', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 13 }}
        aria-label={`Quitar ${label}`}
      >×</button>
    </span>
  );
}

function MetricTabs({ value, onChange }: { value: MetricKey; onChange: (m: MetricKey) => void }) {
  return (
    <div className="rk-tabbar" style={{ marginTop: 0 }}>
      {METRICS.map(m => (
        <button
          key={m.key}
          className={value === m.key ? 'rk-tab rk-tab--active' : 'rk-tab'}
          onClick={() => onChange(m.key)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function YearPills({ selected, onChange }: { selected: number[]; onChange: (y: number[]) => void }) {
  const toggle = (y: number) =>
    onChange(selected.includes(y) ? selected.filter(x => x !== y) : [...selected, y].sort((a, b) => a - b));
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {YEARS.map(y => (
        <button
          key={y}
          className={selected.includes(y) ? 'rk-pill rk-pill--active' : 'rk-pill'}
          onClick={() => toggle(y)}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

function ChartCard({ title, data, keys }: { title: string; data: any[]; keys: string[] }) {
  if (data.length === 0) return null;
  return (
    <div style={{ ...CARD, marginTop: 20 }}>
      <div style={{
        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: '#2dd4bf', marginBottom: 16,
      }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip
            contentStyle={{ background: '#0d1628', border: '1px solid rgba(0,212,184,0.2)', borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            itemStyle={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", paddingTop: 12 }}
            verticalAlign="bottom"
            align="center"
          />
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: PALETTE[i % PALETTE.length] }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparisonTable({ rows, years, metric }: { rows: any[]; years: number[]; metric: MetricKey }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ ...CARD, marginTop: 20, padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 20px 10px',
        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: '#2dd4bf',
      }}>
        TABLA COMPARATIVA — {getMetricLabel(metric).toUpperCase()}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={TH}>Municipio</th>
              {years.map(y => <th key={y} style={{ ...TH, textAlign: 'right' }}>{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '10px 14px', color: '#e8eef6', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {row.label}
                </td>
                {years.map(y => (
                  <td key={y} style={{
                    padding: '10px 14px', textAlign: 'right',
                    color: '#2dd4bf', fontSize: 12,
                    fontFamily: "'IBM Plex Mono', monospace",
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    {row[`y_${y}`] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Mode 1: Municipios vs Municipios ──────────────────────────────────────────

function ModeMusVsMus({ municipalities }: { municipalities: any[] }) {
  const [dept, setDept]        = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [years, setYears]       = useState<number[]>([2021, 2022, 2023, 2024]);
  const [metric, setMetric]     = useState<MetricKey>('presupuesto');

  const departments = useMemo(() =>
    [...new Set(municipalities.map(m => m.department).filter(Boolean))].sort(),
    [municipalities]
  );

  const muniList = useMemo(() =>
    [...new Map(municipalities
      .filter(m => !dept || m.department === dept)
      .map(m => [m.name, m.name])
    ).values()].sort(),
    [municipalities, dept]
  );

  const toggleMuni = (name: string) => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(x => x !== name)
        : prev.length < MAX_MUNIS ? [...prev, name] : prev
    );
  };

  const chartData = useMemo(() => {
    if (!selected.length || !years.length) return [];
    const grouped: Record<number, any> = {};
    municipalities.forEach(m => {
      if (!selected.includes(m.name) || !years.includes(m.year)) return;
      if (!grouped[m.year]) grouped[m.year] = { year: m.year };
      grouped[m.year][m.name] = getMetricValue(m, metric);
    });
    return Object.values(grouped).sort((a: any, b: any) => a.year - b.year);
  }, [municipalities, selected, years, metric]);

  const tableRows = useMemo(() => {
    return selected.map(name => {
      const row: any = { label: name };
      years.forEach(y => {
        const rec = municipalities.find(m => m.name === name && m.year === y);
        row[`y_${y}`] = rec ? formatValue(metric, getMetricValue(rec, metric)) : null;
      });
      return row;
    });
  }, [municipalities, selected, years, metric]);

  return (
    <>
      <div style={CARD}>
        {/* Row 1 */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ flex: '0 0 220px' }}>
            <span style={FLABEL}>DEPARTAMENTO</span>
            <select
              className="simho-select"
              value={dept}
              onChange={e => { setDept(e.target.value); setSelected([]); }}
            >
              <option value="">Todos los departamentos</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <span style={FLABEL}>
              MUNICIPIOS
              <span style={{ color: '#2dd4bf', marginLeft: 6 }}>
                {selected.length > 0 && `${selected.length}/${MAX_MUNIS}`}
              </span>
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {muniList.map(name => {
                const isSelected = selected.includes(name);
                const isDisabled = !isSelected && selected.length >= MAX_MUNIS;
                return (
                  <label
                    key={name}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 6,
                      border: `1px solid ${isSelected ? 'rgba(0,212,184,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      background: isSelected ? 'rgba(0,212,184,0.12)' : 'rgba(255,255,255,0.02)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.4 : 1,
                      fontSize: 11, color: isSelected ? '#5eead4' : '#8493ab',
                      fontFamily: "'IBM Plex Mono', monospace",
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleMuni(name)}
                      style={{ accentColor: '#2dd4bf', width: 12, height: 12, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                    />
                    {name}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ marginBottom: 18 }}>
          <span style={FLABEL}>AÑOS</span>
          <YearPills selected={years} onChange={setYears} />
        </div>

        {/* Row 3 */}
        <div>
          <span style={FLABEL}>MÉTRICA</span>
          <MetricTabs value={metric} onChange={setMetric} />
        </div>

        {/* Selected pills */}
        {selected.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {selected.map(name => (
              <SelectedPill key={name} label={name} onRemove={() => setSelected(p => p.filter(x => x !== name))} />
            ))}
          </div>
        )}
      </div>

      {selected.length === 0 && (
        <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(0,212,184,0.05)', borderLeft: '3px solid rgba(0,212,184,0.3)', borderRadius: 4 }}>
          <span style={{ color: '#5eead4', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
            Selecciona hasta {MAX_MUNIS} municipios para ver la comparativa
          </span>
        </div>
      )}

      <ChartCard
        title={`COMPARATIVA — ${getMetricLabel(metric).toUpperCase()}`}
        data={chartData}
        keys={selected}
      />
      <ComparisonTable rows={tableRows} years={years} metric={metric} />
    </>
  );
}

// ── Mode 2: Departamentos ─────────────────────────────────────────────────────

function ModeDepartamentos({ municipalities }: { municipalities: any[] }) {
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [years, setYears]                 = useState<number[]>([2021, 2022, 2023, 2024]);
  const [metric, setMetric]               = useState<MetricKey>('presupuesto');

  const departments = useMemo(() =>
    [...new Set(municipalities.map(m => m.department).filter(Boolean))].sort(),
    [municipalities]
  );

  const toggleDept = (d: string) => {
    setSelectedDepts(prev =>
      prev.includes(d) ? prev.filter(x => x !== d)
        : prev.length < MAX_DEPTS ? [...prev, d] : prev
    );
  };

  const chartData = useMemo(() => {
    if (!selectedDepts.length || !years.length) return [];
    const grouped: Record<number, any> = {};
    municipalities.forEach(m => {
      if (!selectedDepts.includes(m.department) || !years.includes(m.year)) return;
      if (!grouped[m.year]) grouped[m.year] = { year: m.year };
      if (grouped[m.year][m.department] === undefined) grouped[m.year][m.department] = 0;
      grouped[m.year][m.department] += getMetricValue(m, metric);
    });
    return Object.values(grouped).sort((a: any, b: any) => a.year - b.year);
  }, [municipalities, selectedDepts, years, metric]);

  const tableRows = useMemo(() => {
    return selectedDepts.map(dept => {
      const row: any = { label: dept };
      years.forEach(y => {
        const recs = municipalities.filter(m => m.department === dept && m.year === y);
        if (!recs.length) return;
        const sum = recs.reduce((acc, m) => acc + getMetricValue(m, metric), 0);
        row[`y_${y}`] = formatValue(metric, sum);
      });
      return row;
    });
  }, [municipalities, selectedDepts, years, metric]);

  return (
    <>
      <div style={CARD}>
        {/* Row 1 */}
        <div style={{ marginBottom: 18 }}>
          <span style={FLABEL}>
            DEPARTAMENTOS
            <span style={{ color: '#2dd4bf', marginLeft: 6 }}>
              {selectedDepts.length > 0 && `${selectedDepts.length}/${MAX_DEPTS}`}
            </span>
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {departments.map(d => {
              const active = selectedDepts.includes(d);
              const disabled = !active && selectedDepts.length >= MAX_DEPTS;
              return (
                <button
                  key={d}
                  className={active ? 'rk-pill rk-pill--active' : 'rk-pill'}
                  disabled={disabled}
                  onClick={() => toggleDept(d)}
                  style={{ opacity: disabled ? 0.4 : 1 }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ marginBottom: 18 }}>
          <span style={FLABEL}>AÑOS</span>
          <YearPills selected={years} onChange={setYears} />
        </div>

        {/* Row 3 */}
        <div>
          <span style={FLABEL}>MÉTRICA</span>
          <MetricTabs value={metric} onChange={setMetric} />
        </div>

        {/* Selected pills */}
        {selectedDepts.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {selectedDepts.map(d => (
              <SelectedPill key={d} label={d} onRemove={() => setSelectedDepts(p => p.filter(x => x !== d))} />
            ))}
          </div>
        )}
      </div>

      {selectedDepts.length === 0 && (
        <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(0,212,184,0.05)', borderLeft: '3px solid rgba(0,212,184,0.3)', borderRadius: 4 }}>
          <span style={{ color: '#5eead4', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
            Selecciona hasta {MAX_DEPTS} departamentos para comparar
          </span>
        </div>
      )}

      <ChartCard
        title={`DEPARTAMENTOS — ${getMetricLabel(metric).toUpperCase()} TOTAL`}
        data={chartData}
        keys={selectedDepts}
      />
      <ComparisonTable rows={tableRows} years={years} metric={metric} />
    </>
  );
}

// ── Mode 3: Evolución Histórica ───────────────────────────────────────────────

function ModeHistorica({ municipalities }: { municipalities: any[] }) {
  const [dept, setDept]             = useState('');
  const [muniName, setMuniName]     = useState('');
  const [metrics, setMetrics]       = useState<MetricKey[]>(['presupuesto']);

  const departments = useMemo(() =>
    [...new Set(municipalities.map(m => m.department).filter(Boolean))].sort(),
    [municipalities]
  );

  const muniList = useMemo(() =>
    [...new Set(municipalities.filter(m => m.department === dept).map(m => m.name).filter(Boolean))].sort(),
    [municipalities, dept]
  );

  const toggleMetric = (k: MetricKey) => {
    setMetrics(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

  const chartData = useMemo(() => {
    if (!muniName) return [];
    const recs = municipalities.filter(m => m.name === muniName && YEARS.includes(m.year));
    return YEARS.map(y => {
      const rec = recs.find(m => m.year === y);
      const row: any = { year: y };
      if (rec) metrics.forEach(k => { row[k] = getMetricValue(rec, k); });
      return row;
    });
  }, [municipalities, muniName, metrics]);

  return (
    <>
      <div style={CARD}>
        {/* Row 1 */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ flex: '0 0 220px' }}>
            <span style={FLABEL}>DEPARTAMENTO</span>
            <select
              className="simho-select"
              value={dept}
              onChange={e => { setDept(e.target.value); setMuniName(''); }}
            >
              <option value="">— Selecciona —</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 220px' }}>
            <span style={FLABEL}>MUNICIPIO</span>
            <select
              className="simho-select"
              value={muniName}
              onChange={e => setMuniName(e.target.value)}
              disabled={!dept || !muniList.length}
            >
              <option value="">— Selecciona —</option>
              {muniList.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div>
          <span style={FLABEL}>MÉTRICAS (superponer en el mismo gráfico)</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {METRICS.map(m => (
              <button
                key={m.key}
                className={metrics.includes(m.key) ? 'rk-pill rk-pill--active' : 'rk-pill'}
                onClick={() => toggleMetric(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected pills */}
        {(muniName || metrics.length > 0) && (
          <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {muniName && <SelectedPill label={muniName} onRemove={() => setMuniName('')} />}
            {metrics.map(k => (
              <SelectedPill key={k} label={getMetricLabel(k)} onRemove={() => toggleMetric(k)} />
            ))}
          </div>
        )}
      </div>

      {!muniName && (
        <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(0,212,184,0.05)', borderLeft: '3px solid rgba(0,212,184,0.3)', borderRadius: 4 }}>
          <span style={{ color: '#5eead4', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
            Selecciona un municipio para ver su evolución histórica
          </span>
        </div>
      )}

      {muniName && metrics.length > 0 && (
        <ChartCard
          title={`${muniName.toUpperCase()} — EVOLUCIÓN 2021–2024`}
          data={chartData}
          keys={metrics}
        />
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ComparativosPage() {
  const { municipalities, loading, error } = useMunicipalitiesMultiYear(YEARS);
  const [mode, setMode] = useState<CompMode>('municipios');

  const MODES: { key: CompMode; label: string }[] = [
    { key: 'municipios',    label: 'Municipios vs Municipios' },
    { key: 'departamentos', label: 'Departamentos' },
    { key: 'historica',     label: 'Evolución Histórica' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Comparativos">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '3px solid rgba(0,212,184,0.15)',
            borderTopColor: '#2dd4bf',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Comparativos">
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 16, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
          Error: {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Comparativos">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, color: '#2dd4bf', fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4,
          }}>
            ANÁLISIS COMPARATIVO
          </div>
          <div style={{
            fontSize: 36, fontWeight: 700, color: '#e8eef6', lineHeight: 1.1,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            Comparativos
          </div>
          <div style={{ fontSize: 10.5, color: '#7c8aa3', marginTop: 5, fontFamily: "'IBM Plex Mono', monospace" }}>
            Compara municipios, departamentos y tendencias históricas
          </div>
        </div>

        {/* ── MODE SELECTOR ── */}
        <div className="rk-tabbar" style={{ marginBottom: 20, marginTop: 0 }}>
          {MODES.map(m => (
            <button
              key={m.key}
              className={mode === m.key ? 'rk-tab rk-tab--active' : 'rk-tab'}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* ── ACTIVE MODE ── */}
        {mode === 'municipios'    && <ModeMusVsMus municipalities={municipalities} />}
        {mode === 'departamentos' && <ModeDepartamentos municipalities={municipalities} />}
        {mode === 'historica'     && <ModeHistorica municipalities={municipalities} />}

      </div>
    </DashboardLayout>
  );
}
