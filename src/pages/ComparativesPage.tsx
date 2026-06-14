import React, { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { getMunicipio } from '../data/municipios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  LabelList,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const PALETTE = ['#2dd4bf', '#f59e0b', '#3a9bd6', '#ec4899'];
const SECTION_COLORS = ['#2dd4bf', '#f59e0b'];
const MAX_MUNIS = 3;
const MAX_DEPTS = 4;

type CompMode = 'municipios' | 'departamentos' | 'historica';
type MetricKey =
  | 'presupuesto' | 'ingresos' | 'autonomia' | 'poblacion' | 'transferencias'
  | 'ing_tributarios' | 'ing_no_tributarios' | 'ing_capital'
  | 'gasto_funcionamiento' | 'gasto_capital';

const BASE_METRICS: { key: MetricKey; label: string }[] = [
  { key: 'presupuesto',    label: 'Presupuesto' },
  { key: 'ingresos',      label: 'Ingresos Propios' },
  { key: 'autonomia',     label: 'Autonomía' },
  { key: 'poblacion',     label: 'Población' },
  { key: 'transferencias',label: 'Transferencias' },
];

const FIN_METRICS: { key: MetricKey; label: string }[] = [
  { key: 'ing_tributarios',     label: 'Ing. Tributarios' },
  { key: 'ing_no_tributarios',  label: 'Ing. No Tributarios' },
  { key: 'ing_capital',         label: 'Ing. Capital' },
  { key: 'gasto_funcionamiento',label: 'G. Funcionamiento' },
  { key: 'gasto_capital',       label: 'G. Capital y Deuda' },
];

const METRICS = [...BASE_METRICS, ...FIN_METRICS];

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

const CHART_TITLE: React.CSSProperties = {
  fontSize: 10,
  fontFamily: "'IBM Plex Mono', monospace",
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#2dd4bf',
  marginBottom: 16,
};

const AXIS_TICK = {
  fill: '#9ca3af',
  fontSize: 11,
  fontFamily: "'IBM Plex Mono', monospace",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMetricValue(m: any, metric: MetricKey): number {
  switch (metric) {
    case 'presupuesto':
      return m.presupuesto_municipal ? Math.round(m.presupuesto_municipal / 1_000_000) : 0;
    case 'ingresos':
      return m.ingresos_propios ? Math.round(m.ingresos_propios / 1_000_000) : 0;
    case 'autonomia':
      return m.presupuesto_municipal
        ? Math.round((m.ingresos_propios / m.presupuesto_municipal) * 1000) / 10 : 0;
    case 'poblacion':
      return m.population || 0;
    case 'transferencias':
      return m.otras_transferencias ? Math.round(m.otras_transferencias / 1_000_000) : 0;
    case 'ing_tributarios': {
      const v = m.ingresos_tributarios || Math.round((m.ingresos_propios || 0) * 0.58);
      return Math.round(v / 1_000_000);
    }
    case 'ing_no_tributarios': {
      const t = m.ingresos_tributarios || Math.round((m.ingresos_propios || 0) * 0.58);
      const v = m.ingresos_no_tributarios || Math.max(0, (m.ingresos_propios || 0) - t);
      return Math.round(v / 1_000_000);
    }
    case 'ing_capital': {
      const v = m.ingresos_capital || Math.max(0,
        (m.presupuesto_municipal || 0) - (m.ingresos_propios || 0) - (m.otras_transferencias || 0));
      return Math.round(v / 1_000_000);
    }
    case 'gasto_funcionamiento': {
      const v = m.gastos_funcionamiento || Math.round((m.presupuesto_municipal || 0) * 0.63);
      return Math.round(v / 1_000_000);
    }
    case 'gasto_capital': {
      const gastF = m.gastos_funcionamiento || Math.round((m.presupuesto_municipal || 0) * 0.63);
      const v = m.gastos_capital_deuda || Math.max(0, (m.presupuesto_municipal || 0) - gastF);
      return Math.round(v / 1_000_000);
    }
    default:
      return 0;
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

// ── Financial category helpers ────────────────────────────────────────────────

function getRawFinCats(m: any) {
  const pres     = m.presupuesto_municipal || 0;
  const ingProp  = m.ingresos_propios || 0;
  const ingTrans = m.otras_transferencias || 0;
  const tribut   = m.ingresos_tributarios || Math.round(ingProp * 0.58);
  const noTrib   = m.ingresos_no_tributarios || Math.max(0, ingProp - tribut);
  const capital  = m.ingresos_capital || Math.max(0, pres - ingProp - ingTrans);
  const gastF    = m.gastos_funcionamiento || Math.round(pres * 0.63);
  const gastC    = m.gastos_capital_deuda  || Math.max(0, pres - gastF);
  return { pres, ingProp, tribut, noTrib, capital, gastF, gastC };
}

function getFinCats(m: any) {
  const r = getRawFinCats(m);
  const M = 1_000_000;
  return {
    ingTributarios:       Math.round(r.tribut / M),
    ingNoTributarios:     Math.round(r.noTrib / M),
    ingCapital:           Math.round(r.capital / M),
    gastosFuncionamiento: Math.round(r.gastF / M),
    gastosCapital:        Math.round(r.gastC / M),
    autonomiaPct:         r.pres > 0 ? Math.round(r.ingProp / r.pres * 1000) / 10 : 0,
    ingTributarioPct:     r.pres > 0 ? Math.round(r.tribut / r.pres * 1000) / 10 : 0,
    ingCapitalPct:        r.pres > 0 ? Math.round(r.capital / r.pres * 1000) / 10 : 0,
    gastCapitalPct:       r.pres > 0 ? Math.round(r.gastC / r.pres * 1000) / 10 : 0,
  };
}

function getAggFinCats(recs: any[]) {
  const raw      = recs.map(getRawFinCats);
  const totPres  = raw.reduce((s, r) => s + r.pres, 0);
  const totIngP  = raw.reduce((s, r) => s + r.ingProp, 0);
  const totTrib  = raw.reduce((s, r) => s + r.tribut, 0);
  const totNoTr  = raw.reduce((s, r) => s + r.noTrib, 0);
  const totCap   = raw.reduce((s, r) => s + r.capital, 0);
  const totGastF = raw.reduce((s, r) => s + r.gastF, 0);
  const totGastC = raw.reduce((s, r) => s + r.gastC, 0);
  const M = 1_000_000;
  return {
    ingTributarios:       Math.round(totTrib / M),
    ingNoTributarios:     Math.round(totNoTr / M),
    ingCapital:           Math.round(totCap / M),
    gastosFuncionamiento: Math.round(totGastF / M),
    gastosCapital:        Math.round(totGastC / M),
    autonomiaPct:         totPres > 0 ? Math.round(totIngP / totPres * 1000) / 10 : 0,
    ingTributarioPct:     totPres > 0 ? Math.round(totTrib / totPres * 1000) / 10 : 0,
    ingCapitalPct:        totPres > 0 ? Math.round(totCap / totPres * 1000) / 10 : 0,
    gastCapitalPct:       totPres > 0 ? Math.round(totGastC / totPres * 1000) / 10 : 0,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectedPill({ label, onRemove, color = '#2dd4bf' }: { label: string; onRemove: () => void; color?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: color + '22', color,
      border: `1px solid ${color}60`, borderRadius: 20,
      padding: '4px 10px', fontSize: 11,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', color, cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 13 }}
        aria-label={`Quitar ${label}`}
      >×</button>
    </span>
  );
}

function MetricTabs({ value, onChange }: { value: MetricKey; onChange: (m: MetricKey) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="rk-tabbar" style={{ marginTop: 0 }}>
        {BASE_METRICS.map(m => (
          <button
            key={m.key}
            className={value === m.key ? 'rk-tab rk-tab--active' : 'rk-tab'}
            onClick={() => onChange(m.key)}
          >{m.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 8, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          Cat. Fin. →
        </span>
        <div className="rk-tabbar" style={{ marginTop: 0 }}>
          {FIN_METRICS.map(m => (
            <button
              key={m.key}
              className={value === m.key ? 'rk-tab rk-tab--active' : 'rk-tab'}
              onClick={() => onChange(m.key)}
            >{m.label}</button>
          ))}
        </div>
      </div>
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
        >{y}</button>
      ))}
    </div>
  );
}

function ChartCard({ title, data, keys }: { title: string; data: any[]; keys: string[] }) {
  if (data.length === 0) return null;
  return (
    <div style={{ ...CARD, marginTop: 20 }}>
      <div style={CHART_TITLE}>{title}</div>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="year"
            tick={AXIS_TICK}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
          />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={54} />
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

// ── Financial chart panels ────────────────────────────────────────────────────

function IncomeBarCard({ title, data }: { title: string; data: any[] }) {
  if (!data.length) return null;
  return (
    <div style={{ ...CARD, marginTop: 20 }}>
      <div style={CHART_TITLE}>{title}</div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 10 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} />
          <YAxis
            tick={AXIS_TICK} axisLine={false} tickLine={false} width={52}
            tickFormatter={(v: number) => `L${v}M`}
          />
          <Tooltip
            contentStyle={{ background: '#0d1628', border: '1px solid rgba(0,212,184,0.2)', borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            itemStyle={{ fontFamily: "'IBM Plex Mono', monospace" }}
            formatter={(v: number) => [`L ${Number(v).toFixed(1)}M`, '']}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", paddingTop: 12 }}
            verticalAlign="bottom"
            align="center"
          />
          <Bar dataKey="ingTributarios"   name="Ing. Tributarios"    fill="#2dd4bf" radius={[2, 2, 0, 0]} />
          <Bar dataKey="ingNoTributarios" name="Ing. No Tributarios" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          <Bar dataKey="ingCapital"       name="Ing. Capital"        fill="#ec4899" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GastosBarCard({ title, data }: { title: string; data: any[] }) {
  if (!data.length) return null;
  return (
    <div style={{ ...CARD, marginTop: 20 }}>
      <div style={CHART_TITLE}>{title}</div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 10 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} />
          <YAxis
            tick={AXIS_TICK} axisLine={false} tickLine={false} width={52}
            tickFormatter={(v: number) => `L${v}M`}
          />
          <Tooltip
            contentStyle={{ background: '#0d1628', border: '1px solid rgba(0,212,184,0.2)', borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            itemStyle={{ fontFamily: "'IBM Plex Mono', monospace" }}
            formatter={(v: number) => [`L ${Number(v).toFixed(1)}M`, '']}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", paddingTop: 12 }}
            verticalAlign="bottom"
            align="center"
          />
          <Bar dataKey="gastosFuncionamiento" name="Gastos Funcionamiento"  fill="#f97316" radius={[2, 2, 0, 0]} />
          <Bar dataKey="gastosCapital"        name="Gastos Capital y Deuda" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Combined financial composition chart (all 5 categories per municipality) ──

const FIN_BARS = [
  { key: 'ingTributarios',       name: 'Ing. Tributarios',    fill: '#2dd4bf' },
  { key: 'ingNoTributarios',     name: 'Ing. No Tributarios', fill: '#f59e0b' },
  { key: 'ingCapital',           name: 'Ing. Capital',        fill: '#ec4899' },
  { key: 'gastosFuncionamiento', name: 'G. Funcionamiento',   fill: '#f97316' },
  { key: 'gastosCapital',        name: 'G. Capital y Deuda',  fill: '#8b5cf6' },
];

function ComposicionFinancieraCard({ title, data }: { title: string; data: any[] }) {
  if (!data.length) return null;
  return (
    <div style={{ ...CARD, marginTop: 20 }}>
      <div style={CHART_TITLE}>{title}</div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 28, right: 24, left: 0, bottom: 10 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v: number) => `L${v}M`}
          />
          <Tooltip
            contentStyle={{ background: '#0d1628', border: '1px solid rgba(0,212,184,0.2)', borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            itemStyle={{ fontFamily: "'IBM Plex Mono', monospace" }}
            formatter={(v: number) => [`L ${Number(v).toFixed(1)}M`, '']}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", paddingTop: 12 }}
            verticalAlign="bottom"
            align="center"
          />
          {FIN_BARS.map(b => (
            <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.fill} radius={[2, 2, 0, 0]}>
              <LabelList
                dataKey={b.key}
                position="top"
                style={{ fontSize: 7.5, fill: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
                formatter={(v: any) => v > 0 ? `L${Number(v).toFixed(0)}M` : ''}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const RADAR_AXES = ['Autonomía', 'Ing. Tributarios %', 'Ing. Capital %', 'Gasto Capital %', 'IDH'];

function RadarCard({
  title, radarData, names,
}: {
  title: string;
  radarData: any[];
  names: string[];
}) {
  if (names.length < 2 || !radarData.length) return null;
  return (
    <div style={{ ...CARD, marginTop: 20 }}>
      <div style={CHART_TITLE}>{title}</div>
      <ResponsiveContainer width="100%" height={360}>
        <RadarChart data={radarData} margin={{ top: 10, right: 50, left: 50, bottom: 10 }}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#4a5a73', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}
            tickCount={4}
          />
          {names.map((name, i) => (
            <Radar
              key={name}
              name={name}
              dataKey={name}
              stroke={PALETTE[i % PALETTE.length]}
              fill={PALETTE[i % PALETTE.length]}
              fillOpacity={0.12}
              strokeWidth={2}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", paddingTop: 12 }}
            verticalAlign="bottom"
            align="center"
          />
          <Tooltip
            contentStyle={{ background: '#0d1628', border: '1px solid rgba(0,212,184,0.2)', borderRadius: 6, fontSize: 11 }}
            labelStyle={{ color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}
            itemStyle={{ fontFamily: "'IBM Plex Mono', monospace" }}
            formatter={(v: number) => [`${Number(v).toFixed(1)}`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Financial charts section ──────────────────────────────────────────────────

function FinancialChartsSection({
  selected,
  municipalities,
  mode,
}: {
  selected: string[];
  municipalities: any[];
  mode: 'muni' | 'dept';
}) {
  const [finYear, setFinYear] = useState<number>(2024);

  const barData = useMemo(() => {
    if (!selected.length) return [];
    return selected.map(entity => {
      const recs = mode === 'muni'
        ? municipalities.filter(m => m.name === entity && m.year === finYear)
        : municipalities.filter(m => m.department === entity && m.year === finYear);
      if (!recs.length) return null;
      const fc = mode === 'muni' ? getFinCats(recs[0]) : getAggFinCats(recs);
      return { name: entity, ...fc };
    }).filter(Boolean) as any[];
  }, [selected, municipalities, finYear, mode]);

  const radarData = useMemo(() => {
    if (selected.length < 2 || !barData.length) return [];
    return RADAR_AXES.map(subject => {
      const row: any = { subject };
      barData.forEach((d: any) => {
        if (subject === 'Autonomía')           row[d.name] = d.autonomiaPct    || 0;
        if (subject === 'Ing. Tributarios %')  row[d.name] = d.ingTributarioPct || 0;
        if (subject === 'Ing. Capital %')      row[d.name] = d.ingCapitalPct   || 0;
        if (subject === 'Gasto Capital %')     row[d.name] = d.gastCapitalPct  || 0;
        if (subject === 'IDH') {
          if (mode === 'muni') {
            const rec = municipalities.find(m => m.name === d.name && m.year === finYear);
            const staticMuni = rec ? getMunicipio(rec.id) as any : null;
            row[d.name] = staticMuni?.idh ? Math.round(staticMuni.idh * 100) : 0;
          } else {
            row[d.name] = 0;
          }
        }
      });
      return row;
    });
  }, [selected, barData, municipalities, finYear, mode]);

  if (!selected.length) return null;

  return (
    <>
      <div style={{ ...CARD, marginTop: 20 }}>
        <span style={FLABEL}>AÑO PARA ANÁLISIS FINANCIERO</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {YEARS.map(y => (
            <button
              key={y}
              className={finYear === y ? 'rk-pill rk-pill--active' : 'rk-pill'}
              onClick={() => setFinYear(y)}
            >{y}</button>
          ))}
        </div>
      </div>

      <ComposicionFinancieraCard
        title={`COMPOSICIÓN FINANCIERA · ${finYear}`}
        data={barData}
      />
      <IncomeBarCard
        title={`COMPOSICIÓN DE INGRESOS · ${finYear}`}
        data={barData}
      />
      <GastosBarCard
        title={`ESTRUCTURA DE GASTOS · ${finYear}`}
        data={barData}
      />
      <RadarCard
        title="PERFIL FINANCIERO COMPARATIVO"
        radarData={radarData}
        names={selected}
      />
    </>
  );
}

// ── Mode 1: Municipios vs Municipios ──────────────────────────────────────────

function ModeMusVsMus({ municipalities }: { municipalities: any[] }) {
  // deptSections: one entry per group (up to 2), value is the dept name or '' if unselected
  const [deptSections, setDeptSections] = useState<string[]>(['']);
  const [selected, setSelected]         = useState<string[]>([]);
  const [years, setYears]               = useState<number[]>([2021, 2022, 2023, 2024]);
  const [metric, setMetric]             = useState<MetricKey>('presupuesto');

  const departments = useMemo(() =>
    [...new Set(municipalities.map(m => m.department).filter(Boolean))].sort(),
    [municipalities]
  );

  // Per-section muni lists, derived from deptSections
  const muniListsPerSection = useMemo(() =>
    deptSections.map(dept =>
      dept
        ? [...new Set(
            municipalities.filter(m => m.department === dept).map(m => m.name).filter(Boolean)
          )].sort()
        : []
    ),
    [deptSections, municipalities]
  );

  // Helper used in event handlers (no hook)
  const muniListForDept = (dept: string): string[] =>
    dept
      ? [...new Set(municipalities.filter(m => m.department === dept).map(m => m.name).filter(Boolean))]
      : [];

  const handleDeptChange = (sectionIdx: number, newDept: string) => {
    const oldDept = deptSections[sectionIdx];
    if (oldDept) {
      const oldMunis = muniListForDept(oldDept);
      setSelected(prev => prev.filter(n => !oldMunis.includes(n)));
    }
    setDeptSections(prev => prev.map((d, i) => i === sectionIdx ? newDept : d));
  };

  const removeSection = (sectionIdx: number) => {
    const deptToRemove = deptSections[sectionIdx];
    if (deptToRemove) {
      const munis = muniListForDept(deptToRemove);
      setSelected(prev => prev.filter(n => !munis.includes(n)));
    }
    setDeptSections(prev => prev.filter((_, i) => i !== sectionIdx));
  };

  const toggleMuni = (name: string) => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(x => x !== name)
        : prev.length < MAX_MUNIS ? [...prev, name] : prev
    );
  };

  const getMuniDept = (name: string): string =>
    municipalities.find(m => m.name === name)?.department || '';

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

  const hasDeptSelected = deptSections.some(d => d !== '');

  return (
    <>
      <div style={CARD}>

        {/* ── Dept section groups ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          {deptSections.map((dept, sectionIdx) => {
            const color      = SECTION_COLORS[sectionIdx];
            const rgbColor   = sectionIdx === 0 ? '45,212,191' : '245,158,11';
            const usedDepts  = deptSections.filter((_, i) => i !== sectionIdx).filter(Boolean);
            const muniList   = muniListsPerSection[sectionIdx];
            const sectionSel = selected.filter(n => muniList.includes(n));

            return (
              <div
                key={sectionIdx}
                style={{
                  border: `1px solid ${color}30`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 8,
                  padding: '14px 16px',
                  background: `rgba(${rgbColor},0.04)`,
                }}
              >
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color, fontWeight: 600,
                  }}>
                    ● Grupo {sectionIdx + 1}
                  </span>
                  {sectionIdx > 0 && (
                    <button
                      onClick={() => removeSection(sectionIdx)}
                      style={{
                        background: 'none', border: 'none', color: '#4a5a73',
                        cursor: 'pointer', fontSize: 10,
                        fontFamily: "'IBM Plex Mono', monospace", padding: '2px 6px',
                      }}
                    >
                      ✕ Remover
                    </button>
                  )}
                </div>

                {/* Dept dropdown */}
                <div style={{ marginBottom: dept ? 14 : 0 }}>
                  <span style={FLABEL}>DEPARTAMENTO</span>
                  <select
                    className="simho-select"
                    value={dept}
                    onChange={e => handleDeptChange(sectionIdx, e.target.value)}
                  >
                    <option value="">— Selecciona Departamento —</option>
                    {departments
                      .filter(d => !usedDepts.includes(d))
                      .map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Empty state hint */}
                {!dept && (
                  <div style={{ marginTop: 10, color: '#4a5a73', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
                    Selecciona un departamento para ver sus municipios
                  </div>
                )}

                {/* Muni grid */}
                {dept && muniList.length > 0 && (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ ...FLABEL, marginBottom: 0 }}>
                        MUNICIPIOS ({sectionSel.length}/{MAX_MUNIS})
                        {selected.length >= MAX_MUNIS && sectionSel.length === 0 && (
                          <span style={{ color: '#f87171', marginLeft: 8, fontSize: 8, fontWeight: 400 }}>
                            máx. {MAX_MUNIS} total
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 5,
                    }}>
                      {muniList.map(name => {
                        const isSelected = selected.includes(name);
                        const isDisabled = !isSelected && selected.length >= MAX_MUNIS;
                        return (
                          <label
                            key={name}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 10px', borderRadius: 6,
                              border: `1px solid ${isSelected ? color + 'a0' : 'rgba(255,255,255,0.07)'}`,
                              background: isSelected ? color + '18' : 'rgba(255,255,255,0.02)',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              opacity: isDisabled ? 0.35 : 1,
                              fontSize: 11,
                              color: isSelected ? color : '#8493ab',
                              fontFamily: "'IBM Plex Mono', monospace",
                              userSelect: 'none',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => toggleMuni(name)}
                              style={{
                                accentColor: color,
                                width: 12, height: 12,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                flexShrink: 0,
                              }}
                            />
                            {name}
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Add second department */}
          {deptSections.length < 2 && (
            <button
              onClick={() => setDeptSections(prev => [...prev, ''])}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none',
                border: '1px dashed rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '10px 16px',
                color: '#4a5a73', cursor: 'pointer',
                fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: '0.06em',
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1, color: '#f59e0b' }}>+</span>
              Agregar departamento
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: 18 }} />

        {/* Years */}
        <div style={{ marginBottom: 18 }}>
          <span style={FLABEL}>AÑOS</span>
          <YearPills selected={years} onChange={setYears} />
        </div>

        {/* Metric */}
        <div>
          <span style={FLABEL}>MÉTRICA</span>
          <MetricTabs value={metric} onChange={setMetric} />
        </div>
      </div>

      {/* ── Selected pills below card ── */}
      {selected.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ ...FLABEL, marginBottom: 0 }}>
            MUNICIPIOS {selected.length}/{MAX_MUNIS}
          </span>
          {selected.map((name, i) => {
            const deptName = getMuniDept(name);
            const sIdx     = deptSections.indexOf(deptName);
            const color    = sIdx >= 0 ? SECTION_COLORS[sIdx] : PALETTE[i % PALETTE.length];
            return (
              <SelectedPill
                key={name}
                label={deptName ? `${name} · ${deptName}` : name}
                color={color}
                onRemove={() => setSelected(p => p.filter(x => x !== name))}
              />
            );
          })}
        </div>
      )}

      {/* Hint messages */}
      {!hasDeptSelected && (
        <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(0,212,184,0.05)', borderLeft: '3px solid rgba(0,212,184,0.3)', borderRadius: 4 }}>
          <span style={{ color: '#5eead4', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
            Selecciona un departamento para ver sus municipios y comparar hasta {MAX_MUNIS}
          </span>
        </div>
      )}
      {hasDeptSelected && selected.length === 0 && (
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
      <FinancialChartsSection selected={selected} municipalities={municipalities} mode="muni" />
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
              const active   = selectedDepts.includes(d);
              const disabled = !active && selectedDepts.length >= MAX_DEPTS;
              return (
                <button
                  key={d}
                  className={active ? 'rk-pill rk-pill--active' : 'rk-pill'}
                  disabled={disabled}
                  onClick={() => toggleDept(d)}
                  style={{ opacity: disabled ? 0.4 : 1 }}
                >{d}</button>
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

      <FinancialChartsSection selected={selectedDepts} municipalities={municipalities} mode="dept" />
    </>
  );
}

// ── Mode 3: Evolución Histórica ───────────────────────────────────────────────

function ModeHistorica({ municipalities }: { municipalities: any[] }) {
  const [dept, setDept]       = useState('');
  const [muniName, setMuniName] = useState('');
  const [metrics, setMetrics] = useState<MetricKey[]>(['presupuesto']);

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {BASE_METRICS.map(m => (
                <button
                  key={m.key}
                  className={metrics.includes(m.key) ? 'rk-pill rk-pill--active' : 'rk-pill'}
                  onClick={() => toggleMetric(m.key)}
                >{m.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 8, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>Cat. Fin. →</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FIN_METRICS.map(m => (
                  <button
                    key={m.key}
                    className={metrics.includes(m.key) ? 'rk-pill rk-pill--active' : 'rk-pill'}
                    onClick={() => toggleMetric(m.key)}
                  >{m.label}</button>
                ))}
              </div>
            </div>
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
          title={`${muniName.toUpperCase()} — EVOLUCIÓN 2019–2025`}
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
            >{m.label}</button>
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
