import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell,
} from 'recharts';
import { DEPARTAMENTOS, getMunicipiosByDept } from '../data/municipios';
import { useMunicipalitiesMultiYear, Municipality } from '../hooks/useMunicipalities';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

const ALL_DEPTS: { code: string; name: string }[] = (DEPARTAMENTOS as any[])
  .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es'))
  .map((d: any) => ({ code: d.id, name: d.nombre }));

function getDeptMunis(code: string): { id: string; name: string }[] {
  if (!code) return [];
  return (getMunicipiosByDept(code) as any[])
    .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((m: any) => ({ id: m.id, name: m.nombre }));
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtInt = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 0 });

function fmtM(n: number | null | undefined): string {
  if (n == null || n === 0) return '—';
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1_000_000_000) s = `${(abs / 1_000_000_000).toFixed(1)} mil M`;
  else if (abs >= 1_000_000)  s = `${(abs / 1_000_000).toFixed(1)} M`;
  else                         s = fmtInt.format(abs);
  return n < 0 ? `−L ${s}` : `L ${s}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || n === 0) return '—';
  return `${n.toFixed(1)}%`;
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

// ── Data aggregation ──────────────────────────────────────────────────────────

function sumField(rows: Municipality[], key: keyof Municipality): number {
  return rows.reduce((acc, r) => acc + ((r[key] as number) ?? 0), 0);
}

interface YearData {
  presupuesto_municipal:    number;
  ingresos_propios:         number;
  ingresos_recaudados:      number;
  autonomia_financiera:     number;
  ingresos_corrientes:      number;
  ingresos_tributarios:     number;
  tasas_servicios:          number;
  derechos:                 number;
  ingresos_no_tributarios:  number;
  ingresos_capital:         number;
  transferencias_art91:     number;
  otras_transferencias:     number;
  gastos_funcionamiento:    number;
  servicios_personales:     number;
  servicios_no_personales:  number;
  materiales_suministro:    number;
  transferencias_corrientes: number;
  otros_gastos:             number;
  gastos_capital_deuda:     number;
  bienes_capitalizables:    number;
  transferencias_capital:   number;
  activos_financieros:      number;
  servicios_deuda:          number;
  otros_gastos_capital:     number;
  asignaciones_globales:    number;
  total_egresos:            number;
  superavit_deficit:        number;
}

function aggregate(rows: Municipality[]): YearData {
  const s = (k: keyof Municipality) => sumField(rows, k);
  const ip = s('ingresos_propios');
  const ir = s('ingresos_recaudados');
  return {
    presupuesto_municipal:     s('presupuesto_municipal'),
    ingresos_propios:          ip,
    ingresos_recaudados:       ir,
    autonomia_financiera:      ir > 0 ? (ip / ir) * 100 : 0,
    ingresos_corrientes:       s('ingresos_corrientes'),
    ingresos_tributarios:      s('ingresos_tributarios'),
    tasas_servicios:           s('tasas_servicios'),
    derechos:                  s('derechos'),
    ingresos_no_tributarios:   s('ingresos_no_tributarios'),
    ingresos_capital:          s('ingresos_capital'),
    transferencias_art91:      s('transferencias_art91'),
    otras_transferencias:      s('otras_transferencias'),
    gastos_funcionamiento:     s('gastos_funcionamiento'),
    servicios_personales:      s('servicios_personales'),
    servicios_no_personales:   s('servicios_no_personales'),
    materiales_suministro:     s('materiales_suministro'),
    transferencias_corrientes: s('transferencias_corrientes'),
    otros_gastos:              s('otros_gastos'),
    gastos_capital_deuda:      s('gastos_capital_deuda'),
    bienes_capitalizables:     s('bienes_capitalizables'),
    transferencias_capital:    s('transferencias_capital'),
    activos_financieros:       s('activos_financieros'),
    servicios_deuda:           s('servicios_deuda'),
    otros_gastos_capital:      s('otros_gastos_capital'),
    asignaciones_globales:     s('asignaciones_globales'),
    total_egresos:             s('total_egresos'),
    superavit_deficit:         s('superavit_deficit'),
  };
}

const EMPTY_YEAR: YearData = aggregate([]);

// ── Table row definitions ─────────────────────────────────────────────────────

type RowVariant = 'group' | 'main' | 'sub' | 'highlight' | 'signed';

interface TRow {
  key:      string;
  label:    string;
  variant:  RowVariant;
  field?:   keyof YearData;
  pct?:     boolean;
}

const TABLE_ROWS: TRow[] = [
  { key: 'g_pres',  label: 'PRESUPUESTO',                   variant: 'group' },
  { key: 'pres',    label: 'Presupuesto Municipal',          variant: 'main',      field: 'presupuesto_municipal' },

  { key: 'g_ing',   label: 'INGRESOS',                       variant: 'group' },
  { key: 'ing_p',   label: 'Ingresos Propios',               variant: 'main',      field: 'ingresos_propios' },
  { key: 'ing_r',   label: 'Ingresos Recaudados (total)',    variant: 'main',      field: 'ingresos_recaudados' },
  { key: 'af',      label: 'Autonomía Financiera',           variant: 'main',      field: 'autonomia_financiera', pct: true },
  { key: 'ing_c',   label: 'Ingresos Corrientes',            variant: 'main',      field: 'ingresos_corrientes' },
  { key: 'ing_t',   label: '↳ Ingresos Tributarios',         variant: 'sub',       field: 'ingresos_tributarios' },
  { key: 'tasas',   label: '↳ Tasas por Servicios',          variant: 'sub',       field: 'tasas_servicios' },
  { key: 'derech',  label: '↳ Derechos',                     variant: 'sub',       field: 'derechos' },
  { key: 'ing_nt',  label: 'Ingresos No Tributarios',        variant: 'main',      field: 'ingresos_no_tributarios' },
  { key: 'ing_cap', label: 'Ingresos de Capital',            variant: 'main',      field: 'ingresos_capital' },

  { key: 'g_trans', label: 'TRANSFERENCIAS RECIBIDAS',       variant: 'group' },
  { key: 'tr91',    label: 'Transferencias Art. 91',         variant: 'main',      field: 'transferencias_art91' },
  { key: 'tr_ot',   label: 'Otras Transferencias',           variant: 'main',      field: 'otras_transferencias' },

  { key: 'g_egr',   label: 'EGRESOS',                        variant: 'group' },
  { key: 'gf',      label: 'Gastos de Funcionamiento',       variant: 'main',      field: 'gastos_funcionamiento' },
  { key: 'sp',      label: '↳ Servicios Personales',         variant: 'sub',       field: 'servicios_personales' },
  { key: 'snp',     label: '↳ Servicios No Personales',      variant: 'sub',       field: 'servicios_no_personales' },
  { key: 'mat',     label: '↳ Materiales y Suministros',     variant: 'sub',       field: 'materiales_suministro' },
  { key: 'tcte',    label: '↳ Transferencias Corrientes',    variant: 'sub',       field: 'transferencias_corrientes' },
  { key: 'otf',     label: '↳ Otros',                        variant: 'sub',       field: 'otros_gastos' },
  { key: 'gc',      label: 'Gastos de Capital y Deuda',      variant: 'main',      field: 'gastos_capital_deuda' },
  { key: 'bc',      label: '↳ Bienes Capitalizables',        variant: 'sub',       field: 'bienes_capitalizables' },
  { key: 'tce',     label: '↳ Transferencias ejecutadas',    variant: 'sub',       field: 'transferencias_capital' },
  { key: 'aff',     label: '↳ Activos Financieros',          variant: 'sub',       field: 'activos_financieros' },
  { key: 'sd',      label: '↳ Servicios de Deuda',           variant: 'sub',       field: 'servicios_deuda' },
  { key: 'ogc',     label: '↳ Otros Gastos',                 variant: 'sub',       field: 'otros_gastos_capital' },
  { key: 'ag',      label: '↳ Asignaciones Globales',        variant: 'sub',       field: 'asignaciones_globales' },
  { key: 'te',      label: 'Total Egresos',                  variant: 'highlight', field: 'total_egresos' },

  { key: 'g_res',   label: 'RESULTADO',                      variant: 'group' },
  { key: 'sdef',    label: 'Superávit / Déficit',            variant: 'signed',    field: 'superavit_deficit' },
];

// ── Shared styles ─────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const COND: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif" };

const LABEL_ST: React.CSSProperties = {
  ...MONO, display: 'block', fontSize: 8.5, color: '#7c8aa3',
  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5,
};

const CHART_COLORS = {
  teal:   '#2dd4bf',
  amber:  '#f59e0b',
  violet: '#a855f7',
  pink:   '#ec4899',
  blue:   '#06b6d4',
  green:  '#22c55e',
  red:    '#ef4444',
};

// ── Tooltip ───────────────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label, fmtVal }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(8,12,24,0.96)',
      border: '1px solid rgba(0,212,184,0.35)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
    }}>
      {label && <div style={{ color: '#7c8aa3', ...MONO, marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || '#2dd4bf', ...MONO }}>
          {p.name}: {fmtVal ? fmtVal(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [scope, setScope]               = useState<'pais' | 'departamento' | 'municipio'>('pais');
  const [deptCode, setDeptCode]         = useState<string>('');
  const [muniId, setMuniId]             = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([...ALL_YEARS]);

  const activeYears = selectedYears.length > 0 ? selectedYears : ALL_YEARS;
  const { municipalities, loading } = useMunicipalitiesMultiYear(activeYears);

  const deptMunis = useMemo(() => getDeptMunis(deptCode), [deptCode]);
  const deptName  = useMemo(() => ALL_DEPTS.find(d => d.code === deptCode)?.name ?? '', [deptCode]);
  const muniName  = useMemo(() => deptMunis.find(m => m.id === muniId)?.name ?? '', [deptMunis, muniId]);

  const yearDataMap = useMemo(() => {
    const map: Record<number, YearData> = {};
    for (const year of activeYears) {
      let rows = municipalities.filter(m => Number(m.year) === Number(year));

      if (scope === 'departamento' && deptName) {
        rows = rows.filter(m => m.department && norm(m.department) === norm(deptName));
      } else if (scope === 'municipio') {
        if (!muniName || !deptName) { map[year] = EMPTY_YEAR; continue; }
        rows = rows.filter(m =>
          m.department && m.name &&
          norm(m.department) === norm(deptName) &&
          norm(m.name) === norm(muniName)
        );
      }

      map[year] = aggregate(rows);
    }
    return map;
  }, [municipalities, scope, deptName, muniName, activeYears]);

  const scopeLabel = useMemo(() => {
    if (scope === 'municipio' && muniName) return `${muniName} — ${deptName}`;
    if (scope === 'departamento' && deptName) return `Departamento de ${deptName}`;
    if (scope === 'departamento') return 'Departamento (selecciona)';
    if (scope === 'municipio') return 'Municipio (selecciona)';
    return 'Honduras (País)';
  }, [scope, deptName, muniName]);

  const sortedYears = [...activeYears].sort((a, b) => a - b);

  function toggleYear(y: number) {
    setSelectedYears(prev =>
      prev.includes(y)
        ? prev.length > 1 ? prev.filter(p => p !== y) : prev
        : [...prev, y]
    );
  }

  function handleScopeChange(s: 'pais' | 'departamento' | 'municipio') {
    setScope(s);
    setDeptCode('');
    setMuniId('');
  }

  function getCellValue(row: TRow, year: number): string {
    if (!row.field) return '';
    const d = yearDataMap[year] ?? EMPTY_YEAR;
    const v = d[row.field];
    if (row.pct) return fmtPct(v);
    return fmtM(v);
  }

  function getCellColor(row: TRow, year: number): string {
    if (row.variant === 'signed' && row.field) {
      const v = (yearDataMap[year] ?? EMPTY_YEAR)[row.field];
      if (v > 0) return '#22c55e';
      if (v < 0) return '#ef4444';
      return '#4a5a73';
    }
    if (row.pct) return '#f59e0b';
    if (row.variant === 'highlight') return '#f9fafb';
    if (row.variant === 'sub') return '#5a6a83';
    return '#c4cfd9';
  }

  // Chart data
  const toM = (v: number) => Math.round(v / 1e6 * 10) / 10;

  const chart1 = sortedYears.map(y => ({
    year: String(y),
    'Ing. Propios':       toM(yearDataMap[y]?.ingresos_propios ?? 0),
    'Transferencias 91':  toM(yearDataMap[y]?.transferencias_art91 ?? 0),
    'Cap. y Financ.':     toM(yearDataMap[y]?.ingresos_capital ?? 0),
  }));

  const chart2 = sortedYears.map(y => ({
    year: String(y),
    'Autonomía %': Math.round((yearDataMap[y]?.autonomia_financiera ?? 0) * 10) / 10,
  }));

  const chart3 = sortedYears.map(y => ({
    year: String(y),
    'Funcionamiento':  toM(yearDataMap[y]?.gastos_funcionamiento ?? 0),
    'Capital y Deuda': toM(yearDataMap[y]?.gastos_capital_deuda ?? 0),
  }));

  const chart4 = sortedYears.map(y => ({
    year: String(y),
    value: toM(yearDataMap[y]?.superavit_deficit ?? 0),
  }));

  const TICK_STYLE = { fill: '#4a5a73', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" };
  const TICK_SM    = { fill: '#4a5a73', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" };
  const GRID_PROPS = { stroke: 'rgba(0,212,184,0.07)', strokeDasharray: '3 4' as string, vertical: false };
  const TT_WRAP    = { background: 'transparent', border: 'none', boxShadow: 'none' };
  const LEG_FMT    = (v: string) => (
    <span style={{ color: '#9ca3af', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>{v}</span>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px 6px', flexShrink: 0 }}>
        <div style={{ fontSize: 9, color: '#2dd4bf', ...MONO, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 3 }}>
          SIMHO — ANÁLISIS PRESUPUESTARIO
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#e8eef6', lineHeight: 1.1, ...COND }}>
          Análisis
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }} className="simho-scroll">

        {/* ════ SECCIÓN 1: CONTROLES ════ */}
        <div style={{
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 14,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          alignItems: 'flex-end',
        }}>

          {/* Alcance */}
          <div>
            <span style={LABEL_ST}>ALCANCE</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {(['pais', 'departamento', 'municipio'] as const).map(s => (
                <button key={s} onClick={() => handleScopeChange(s)} style={{
                  padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${scope === s ? 'rgba(0,212,184,0.6)' : 'rgba(0,212,184,0.18)'}`,
                  background: scope === s ? 'rgba(0,212,184,0.14)' : 'transparent',
                  color: scope === s ? '#2dd4bf' : '#7c8aa3',
                  ...MONO, fontSize: 11, fontWeight: scope === s ? 700 : 400,
                  letterSpacing: '0.06em', transition: 'all 0.13s',
                }}>
                  {s === 'pais' ? 'País' : s === 'departamento' ? 'Departamento' : 'Municipio'}
                </button>
              ))}
            </div>
          </div>

          {/* Departamento */}
          {(scope === 'departamento' || scope === 'municipio') && (
            <div>
              <span style={LABEL_ST}>DEPARTAMENTO</span>
              <select className="simho-select" value={deptCode}
                onChange={e => { setDeptCode(e.target.value); setMuniId(''); }}>
                <option value="">— Selecciona —</option>
                {ALL_DEPTS.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
              </select>
            </div>
          )}

          {/* Municipio */}
          {scope === 'municipio' && (
            <div>
              <span style={LABEL_ST}>MUNICIPIO</span>
              <select className="simho-select" value={muniId}
                onChange={e => setMuniId(e.target.value)}
                disabled={!deptCode || deptMunis.length === 0}>
                <option value="">— Selecciona —</option>
                {deptMunis.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          {/* Años */}
          <div>
            <span style={LABEL_ST}>AÑOS</span>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {ALL_YEARS.map(y => {
                const on = selectedYears.includes(y);
                return (
                  <button key={y} onClick={() => toggleYear(y)} style={{
                    padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                    border: `1px solid ${on ? 'rgba(0,212,184,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    background: on ? 'rgba(0,212,184,0.11)' : 'transparent',
                    color: on ? '#2dd4bf' : '#4a5a73',
                    ...MONO, fontSize: 11, fontWeight: on ? 700 : 400, transition: 'all 0.12s',
                  }}>
                    {y}
                  </button>
                );
              })}
            </div>
          </div>

          {loading && (
            <div style={{ color: '#2dd4bf', ...MONO, fontSize: 10, opacity: 0.7 }}>
              Cargando…
            </div>
          )}
        </div>

        {/* ════ SECCIÓN 2: TABLA ════ */}
        <div style={{
          background: 'rgba(13,21,38,0.74)',
          border: '1px solid rgba(0,212,184,0.12)',
          borderRadius: 10,
          marginBottom: 14,
          overflow: 'hidden',
        }}>
          {/* Tabla header */}
          <div style={{ padding: '13px 18px 9px', borderBottom: '1px solid rgba(0,212,184,0.10)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e8eef6', ...MONO, letterSpacing: '0.05em' }}>
              Ejecución Presupuestaria Municipal — {scopeLabel}
            </div>
            <div style={{ fontSize: 10, color: '#7c8aa3', ...MONO, marginTop: 3 }}>
              Cifras en millones de lempiras (L. M)
            </div>
          </div>

          {/* Tabla con scroll horizontal */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '8px 18px', textAlign: 'left',
                    color: '#4a5a73', ...MONO, fontSize: 10, letterSpacing: '0.1em',
                    fontWeight: 600, background: 'rgba(0,0,0,0.28)',
                    borderBottom: '1px solid rgba(0,212,184,0.15)',
                    position: 'sticky', left: 0, zIndex: 2, minWidth: 230,
                  }}>
                    CONCEPTO
                  </th>
                  {sortedYears.map(y => (
                    <th key={y} style={{
                      padding: '8px 14px', textAlign: 'right',
                      color: '#2dd4bf', ...MONO, fontSize: 11, fontWeight: 700,
                      background: 'rgba(0,0,0,0.28)',
                      borderBottom: '1px solid rgba(0,212,184,0.15)',
                      minWidth: 108,
                    }}>
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row, idx) => {
                  const isGroup     = row.variant === 'group';
                  const isSub       = row.variant === 'sub';
                  const isHighlight = row.variant === 'highlight';

                  const bg = isGroup
                    ? 'rgba(0,0,0,0.32)'
                    : isHighlight
                    ? 'rgba(0,212,184,0.055)'
                    : idx % 2 === 0 ? 'rgba(255,255,255,0.013)' : 'transparent';

                  const labelColor = isGroup
                    ? '#6b7a94'
                    : isSub
                    ? '#4a5a6e'
                    : isHighlight
                    ? '#f9fafb'
                    : '#b8c4d4';

                  return (
                    <tr key={row.key} style={{ background: bg }}>
                      <td style={{
                        padding: isGroup ? '7px 18px' : isSub ? '6px 18px 6px 30px' : '7px 18px',
                        color: labelColor,
                        ...MONO,
                        fontSize:    isGroup ? 9 : isSub ? 12 : 13,
                        fontWeight:  isGroup ? 700 : isHighlight ? 700 : isSub ? 400 : 500,
                        letterSpacing: isGroup ? '0.15em' : '0.02em',
                        textTransform: (isGroup ? 'uppercase' : 'none') as 'uppercase' | 'none',
                        borderTop:    isGroup ? '1px solid rgba(0,212,184,0.10)' : 'none',
                        borderBottom: isGroup ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        position: 'sticky', left: 0, zIndex: 1,
                        background: bg,
                      }}>
                        {row.label}
                      </td>
                      {sortedYears.map(y => (
                        <td key={y} style={{
                          padding: isGroup ? '7px 14px' : '7px 14px',
                          textAlign: 'right',
                          color: isGroup ? 'transparent' : getCellColor(row, y),
                          ...MONO,
                          fontSize:   isSub ? 12 : 13,
                          fontWeight: isHighlight ? 700 : 400,
                          borderTop:    isGroup ? '1px solid rgba(0,212,184,0.10)' : 'none',
                          borderBottom: isGroup ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        }}>
                          {isGroup ? '' : getCellValue(row, y)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{
            padding: '7px 18px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4,
          }}>
            <span style={{ ...MONO, fontSize: 9, color: '#3d4d63', letterSpacing: '0.05em' }}>
              FUENTE: SEFIN — Liquidación Presupuestaria Municipal. Elaboración SIMHO.
            </span>
            <span style={{ ...MONO, fontSize: 9, color: '#3d4d63' }}>
              {loading ? 'Cargando…' : `${municipalities.length.toLocaleString()} registros`}
            </span>
          </div>
        </div>

        {/* ════ SECCIÓN 3: GRÁFICOS 2×2 ════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Gráfico 1 — Evolución de Ingresos */}
          <div style={{
            background: 'rgba(13,21,38,0.74)',
            border: '1px solid rgba(0,212,184,0.12)',
            borderRadius: 10, padding: '14px 10px 10px',
          }}>
            <div style={{ ...MONO, fontSize: 9.5, color: '#4a5a73', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 6 }}>
              Evolución de Ingresos (L. M)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart1} margin={{ top: 4, right: 14, left: 2, bottom: 4 }} barGap={2} barCategoryGap="28%">
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={TICK_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={TICK_SM} tickLine={false} axisLine={false} width={42} tickFormatter={v => `${v}M`} />
                <RTooltip content={<DarkTooltip fmtVal={(v: number) => `L ${v.toFixed(1)} M`} />} wrapperStyle={TT_WRAP} />
                <Legend formatter={LEG_FMT} iconSize={7} />
                <Bar dataKey="Ing. Propios"      fill={CHART_COLORS.teal}   radius={[3,3,0,0]} maxBarSize={18} />
                <Bar dataKey="Transferencias 91" fill={CHART_COLORS.amber}  radius={[3,3,0,0]} maxBarSize={18} />
                <Bar dataKey="Cap. y Financ."    fill={CHART_COLORS.violet} radius={[3,3,0,0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 2 — Autonomía Financiera */}
          <div style={{
            background: 'rgba(13,21,38,0.74)',
            border: '1px solid rgba(0,212,184,0.12)',
            borderRadius: 10, padding: '14px 10px 10px',
          }}>
            <div style={{ ...MONO, fontSize: 9.5, color: '#4a5a73', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 6 }}>
              Autonomía Financiera (%)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chart2} margin={{ top: 4, right: 14, left: 2, bottom: 4 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={TICK_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={TICK_SM} tickLine={false} axisLine={false} width={38} tickFormatter={v => `${v}%`} />
                <RTooltip content={<DarkTooltip fmtVal={(v: number) => `${v.toFixed(1)}%`} />} wrapperStyle={TT_WRAP} />
                <ReferenceLine y={25} stroke="rgba(245,158,11,0.45)" strokeDasharray="4 3"
                  label={{ value: '25% meta', fill: '#f59e0b', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="Autonomía %"
                  stroke={CHART_COLORS.teal} strokeWidth={2}
                  dot={{ r: 4, fill: CHART_COLORS.teal, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: CHART_COLORS.amber, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 3 — Estructura de Egresos */}
          <div style={{
            background: 'rgba(13,21,38,0.74)',
            border: '1px solid rgba(0,212,184,0.12)',
            borderRadius: 10, padding: '14px 10px 10px',
          }}>
            <div style={{ ...MONO, fontSize: 9.5, color: '#4a5a73', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 6 }}>
              Estructura de Egresos (L. M)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart3} margin={{ top: 4, right: 14, left: 2, bottom: 4 }} barCategoryGap="38%">
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={TICK_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={TICK_SM} tickLine={false} axisLine={false} width={42} tickFormatter={v => `${v}M`} />
                <RTooltip content={<DarkTooltip fmtVal={(v: number) => `L ${v.toFixed(1)} M`} />} wrapperStyle={TT_WRAP} />
                <Legend formatter={LEG_FMT} iconSize={7} />
                <Bar dataKey="Funcionamiento"  stackId="egr" fill={CHART_COLORS.pink}   radius={[0,0,0,0]} maxBarSize={36} />
                <Bar dataKey="Capital y Deuda" stackId="egr" fill={CHART_COLORS.violet} radius={[3,3,0,0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 4 — Superávit / Déficit */}
          <div style={{
            background: 'rgba(13,21,38,0.74)',
            border: '1px solid rgba(0,212,184,0.12)',
            borderRadius: 10, padding: '14px 10px 10px',
          }}>
            <div style={{ ...MONO, fontSize: 9.5, color: '#4a5a73', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 6 }}>
              Superávit / Déficit (L. M)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart4} margin={{ top: 4, right: 14, left: 2, bottom: 4 }} barCategoryGap="42%">
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="year" tick={TICK_STYLE} tickLine={false} axisLine={false} />
                <YAxis tick={TICK_SM} tickLine={false} axisLine={false} width={44} tickFormatter={v => `${v}M`} />
                <RTooltip content={<DarkTooltip fmtVal={(v: number) => `L ${v.toFixed(1)} M`} />} wrapperStyle={TT_WRAP} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
                <Bar dataKey="value" name="Superávit/Déficit" radius={[3,3,0,0]} maxBarSize={38}>
                  {chart4.map((entry, i) => (
                    <Cell key={i} fill={entry.value >= 0 ? CHART_COLORS.green : CHART_COLORS.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  );
}
