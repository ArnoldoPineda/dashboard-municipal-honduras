import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { DEPARTAMENTOS, getMunicipiosByDept, getMunicipio } from '../data/municipios';
import { useNavbar } from '../context/NavbarContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_DEPTS: { code: string; name: string }[] = (DEPARTAMENTOS as any[])
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  .map((d: any) => ({ code: d.id, name: d.nombre }));

const fmtC = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 1 });
const fmtF = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 0 });
const fmtP = new Intl.NumberFormat('es-HN');

function L(n: number)  { return n > 0 ? `L ${fmtC.format(n)}` : '—'; }
function LF(n: number) { return n > 0 ? `L ${fmtF.format(n)}` : 'L 0'; }

function formatMoney(n: number): string {
  if (n <= 0) return '—';
  if (n >= 1_000_000_000) return `L ${(n / 1_000_000_000).toFixed(1)} mil M`;
  if (n >= 1_000_000)     return `L ${(n / 1_000_000).toFixed(1)} M`;
  return `L ${fmtF.format(n)}`;
}

function muniCategory(pop: number): string {
  if (pop >= 80000) return 'Categoría A — Municipio Grande';
  if (pop >= 40000) return 'Categoría B — Municipio Mediano';
  if (pop >= 15000) return 'Categoría C — Municipio Intermedio';
  if (pop >= 5000)  return 'Categoría D — Municipio Pequeño';
  return 'Categoría E — Municipio Rural';
}

function getDeptMunis(code: string): { id: string; name: string }[] {
  if (!code) return [];
  return (getMunicipiosByDept(code) as any[])
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .map((m: any) => ({ id: m.id, name: m.nombre }));
}

// ── Label span style ──────────────────────────────────────────────────────────

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 8.5,
  color: '#7c8aa3',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontFamily: "'IBM Plex Mono', monospace",
  marginBottom: 5,
};

// ── Chevron icons ─────────────────────────────────────────────────────────────

function ChevDown() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function ChevUp() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

// ── Accordion ─────────────────────────────────────────────────────────────────

interface AccordionSection {
  key: string;
  title: string;
  color: string;
  amount: number;
  rows: { label: string; value: string }[];
}

function AccordionItem({
  section, expanded, onToggle,
}: {
  section: AccordionSection;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isInfo = section.key === 'general';
  return (
    <div style={{
      background: 'rgba(13,21,38,0.74)',
      border: '1px solid rgba(0,212,184,0.10)',
      borderLeft: `3px solid ${section.color}`,
      borderRadius: 8,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#e8eef6',
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {section.title}
          </div>
          {!isInfo && (
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: section.color,
              fontFamily: "'Barlow Condensed', sans-serif",
              marginTop: 3,
            }}>
              {formatMoney(section.amount)}
            </div>
          )}
        </div>
        <span style={{ color: '#4a5a73', flexShrink: 0, marginLeft: 12 }}>
          {expanded ? <ChevUp /> : <ChevDown />}
        </span>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {section.rows.map((row, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: i < section.rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <span style={{
                fontSize: 14,
                color: '#7c8aa3',
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {row.label}
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#2dd4bf',
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Donut tooltip ─────────────────────────────────────────────────────────────

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'rgba(8,12,24,0.96)', border: '1px solid rgba(0,212,184,0.35)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
    }}>
      <div style={{ color: '#e8eef6', marginBottom: 3, fontFamily: "'IBM Plex Mono', monospace" }}>{d.name}</div>
      <div style={{ color: d.fill, fontFamily: "'IBM Plex Mono', monospace" }}>
        {d.pct}% · {LF(d.value)}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MunicipioDETALLE() {
  const { fiscalYear, setFiscalYear } = useNavbar();
  const [deptCode, setDeptCode] = useState<string>('');
  const [muniId,   setMuniId]   = useState<string>('');
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['general', 'ing_tributarios', 'ing_no_tributarios',
             'ing_capital', 'gast_funcionamiento', 'gast_capital'])
  );

  const deptMunis = useMemo(() => getDeptMunis(deptCode), [deptCode]);
  const muni: any = useMemo(() => muniId ? getMunicipio(muniId) : null, [muniId]);

  function handleDeptChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setDeptCode(e.target.value);
    setMuniId('');
  }

  function toggle(key: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ── Year snapshot — computed every render so memos always get fresh primitives ─

  const yearPresupuesto: number = muni
    ? (muni.evolucion?.find((e: any) => e.year === fiscalYear)?.presupuesto ?? muni.presupuesto)
    : 0;
  const scale: number = muni && muni.presupuesto > 0 ? yearPresupuesto / muni.presupuesto : 1;

  // ── Derived accordion sections ────────────────────────────────────────────

  const sections: AccordionSection[] = useMemo(() => {
    if (!muni || !yearPresupuesto) return [];
    const presupuesto = yearPresupuesto;
    const ingresosPropios = Math.round(muni.ingresosPropios * scale);
    const transferencia   = Math.round(muni.transferencia   * scale);
    const otros           = Math.max(0, presupuesto - ingresosPropios - transferencia);
    const { poblacion, area, idh, departamento } = muni;
    const tribut   = Math.round(ingresosPropios * 0.58);
    const noTribut = ingresosPropios - tribut;
    const capital  = otros;
    const gastFunc = Math.round(presupuesto * 0.63);
    const gastCap  = presupuesto - gastFunc;
    const densidad = area > 0 ? (poblacion / area).toFixed(1) : '—';

    const fm = (v: number) => formatMoney(Math.round(v));

    return [
      {
        key: 'general', title: 'Información General', color: '#2dd4bf', amount: 0,
        rows: [
          { label: 'Departamento',        value: departamento },
          { label: 'Categoría Municipal', value: muniCategory(poblacion) },
          { label: 'Población',           value: fmtP.format(poblacion) + ' hab.' },
          { label: 'Área',                value: area > 0 ? `${area.toFixed(1)} km²` : '—' },
          { label: 'Densidad',            value: area > 0 ? `${densidad} hab/km²` : '—' },
          { label: 'IDH',                 value: idh > 0 ? idh.toFixed(3) : '—' },
        ],
      },
      {
        key: 'ing_tributarios', title: 'Ingresos Tributarios', color: '#2dd4bf', amount: tribut,
        rows: [
          { label: 'Impuesto sobre Bienes Inmuebles', value: fm(tribut * 0.35) },
          { label: 'Industria, Comercio y Servicios', value: fm(tribut * 0.28) },
          { label: 'Impuesto Personal (Vecinal)',     value: fm(tribut * 0.18) },
          { label: 'Impuesto Pecuario',               value: fm(tribut * 0.12) },
          { label: 'Extracción de Recursos',          value: fm(tribut * 0.07) },
        ],
      },
      {
        key: 'ing_no_tributarios', title: 'Ingresos No Tributarios', color: '#f59e0b', amount: noTribut,
        rows: [
          { label: 'Tasas por Servicios',         value: fm(noTribut * 0.40) },
          { label: 'Derechos Administrativos',    value: fm(noTribut * 0.22) },
          { label: 'Multas y Recargos',           value: fm(noTribut * 0.18) },
          { label: 'Venta de Bienes y Servicios', value: fm(noTribut * 0.12) },
          { label: 'Rentas de la Propiedad',      value: fm(noTribut * 0.08) },
        ],
      },
      {
        key: 'ing_capital', title: 'Ingresos de Capital', color: '#ec4899', amount: capital,
        rows: [
          { label: 'Transferencias de Capital', value: fm(capital * 0.55) },
          { label: 'Donaciones Externas',        value: fm(capital * 0.30) },
          { label: 'Venta de Activos',           value: fm(capital * 0.15) },
        ],
      },
      {
        key: 'gast_funcionamiento', title: 'Gastos de Funcionamiento', color: '#f97316', amount: gastFunc,
        rows: [
          { label: 'Servicios Personales',     value: fm(gastFunc * 0.58) },
          { label: 'Servicios No Personales',  value: fm(gastFunc * 0.28) },
          { label: 'Materiales y Suministros', value: fm(gastFunc * 0.14) },
        ],
      },
      {
        key: 'gast_capital', title: 'Gastos de Capital y Deuda Pública', color: '#8b5cf6', amount: gastCap,
        rows: [
          { label: 'Inversión en Obras',      value: fm(gastCap * 0.62) },
          { label: 'Amortización de Deuda',   value: fm(gastCap * 0.25) },
          { label: 'Intereses y Comisiones',  value: fm(gastCap * 0.13) },
        ],
      },
    ];
  }, [muni, yearPresupuesto, scale]);

  // ── Donut data ────────────────────────────────────────────────────────────

  const donutData = useMemo(() => {
    if (!muni || !yearPresupuesto) return [];
    const presupuesto     = yearPresupuesto;
    const ingresosPropios = Math.round(muni.ingresosPropios * scale);
    const transferencia   = Math.round(muni.transferencia   * scale);
    const otros           = Math.max(0, presupuesto - ingresosPropios - transferencia);
    const total = ingresosPropios + transferencia + otros;
    const pct = (v: number) => total > 0 ? Math.min(100, Math.round(v / total * 100)) : 0;
    return [
      { name: 'Ingresos Propios',    value: ingresosPropios, fill: '#2dd4bf', pct: pct(ingresosPropios) },
      { name: 'Transferencias',      value: transferencia,   fill: '#f59e0b', pct: pct(transferencia)   },
      { name: 'Ingresos de Capital', value: otros,           fill: '#ec4899', pct: pct(otros)           },
    ].filter(d => d.value > 0);
  }, [muni, yearPresupuesto, scale]);

  // ── Top 5 ─────────────────────────────────────────────────────────────────

  const top5 = useMemo(() => {
    if (!muni || !yearPresupuesto) return [];
    const presupuesto     = yearPresupuesto;
    const ingresosPropios = Math.round(muni.ingresosPropios * scale);
    const transferencia   = Math.round(muni.transferencia   * scale);
    const otros           = Math.max(0, presupuesto - ingresosPropios - transferencia);
    const tribut   = Math.round(ingresosPropios * 0.58);
    const noTribut = ingresosPropios - tribut;
    const items = [
      { label: 'Transferencias Gobierno Central', value: transferencia,               color: '#f59e0b' },
      { label: 'Ingresos Tributarios',            value: tribut,                      color: '#2dd4bf' },
      { label: 'Ingresos No Tributarios',         value: noTribut,                    color: '#2dd4bf' },
      { label: 'Ingresos de Capital',             value: otros,                       color: '#ec4899' },
      { label: 'Tasas por Servicios',             value: Math.round(noTribut * 0.40), color: '#2dd4bf' },
    ].sort((a, b) => b.value - a.value).slice(0, 5);
    const max = items[0]?.value || 1;
    return items.map(i => ({ ...i, pct: Math.round(i.value / max * 100) }));
  }, [muni, yearPresupuesto, scale]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ════════════════ LEFT PANEL 60% ════════════════ */}
      <div style={{
        flex: '0 0 60%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(0,212,184,0.10)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 10px', flexShrink: 0 }}>
          <div style={{
            fontSize: 9, color: '#2dd4bf',
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4,
          }}>
            FICHA FINANCIERA MUNICIPAL
          </div>
          <div style={{
            fontSize: 34, fontWeight: 700, color: '#e8eef6', lineHeight: 1.1,
            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.01em',
          }}>
            Detalle Municipio
          </div>
        </div>

        {/* Filter card */}
        <div style={{ padding: '0 24px 14px', flexShrink: 0 }}>
          <div style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: 10,
            padding: '14px 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}>
            <label>
              <span style={LABEL}>AÑO</span>
              <select className="simho-select" value={fiscalYear}
                onChange={e => setFiscalYear(Number(e.target.value))}>
                {[2019, 2020, 2021, 2022, 2023, 2024, 2025].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>

            <label>
              <span style={LABEL}>DEPARTAMENTO</span>
              <select className="simho-select" value={deptCode} onChange={handleDeptChange}>
                <option value="">— Selecciona —</option>
                {ALL_DEPTS.map(d => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>
            </label>

            <label>
              <span style={LABEL}>MUNICIPIO</span>
              <select className="simho-select" value={muniId}
                onChange={e => setMuniId(e.target.value)}
                disabled={!deptCode || deptMunis.length === 0}>
                <option value="">— Selecciona —</option>
                {deptMunis.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Accordion */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0 24px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
          className="simho-scroll"
        >
          {!muni ? (
            <div style={{
              border: '1px solid rgba(0,212,184,0.15)',
              borderRadius: 8, padding: '20px 16px',
              background: 'rgba(0,212,184,0.04)',
            }}>
              <p style={{ color: '#5eead4', fontSize: 13, margin: 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                Selecciona un municipio para ver los detalles fiscales
              </p>
            </div>
          ) : (
            sections.map(section => (
              <AccordionItem
                key={section.key}
                section={section}
                expanded={openSections.has(section.key)}
                onToggle={() => toggle(section.key)}
              />
            ))
          )}
        </div>
      </div>

      {/* ════════════════ RIGHT PANEL 40% ════════════════ */}
      <div style={{
        flex: '0 0 40%',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 120px)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
        className="simho-scroll"
      >
        {!muni ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, padding: '48px 16px',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="#2dd4bf" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-6h6v6" />
              <path d="M9 10h.01M12 10h.01M15 10h.01" />
            </svg>
            <div style={{
              fontSize: 16, fontWeight: 600, color: '#e8eef6',
              fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.02em',
            }}>
              Ningún municipio seleccionado
            </div>
            <div style={{
              fontSize: 11, color: '#7c8aa3', textAlign: 'center', maxWidth: 240,
              fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6,
            }}>
              Elija departamento y municipio en el panel izquierdo.
            </div>
          </div>
        ) : (
          <>
            {/* ── Muni summary card ── */}
            <div style={{
              background: 'rgba(13,21,38,0.74)',
              border: '1px solid rgba(0,212,184,0.12)',
              borderRadius: 10, padding: '16px 18px',
            }}>
              <div style={{
                fontSize: 36, fontWeight: 700, color: '#e8eef6', lineHeight: 1.1,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                {muni.nombre}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#5eead4',
                  background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.3)',
                  borderRadius: 4, padding: '2px 7px',
                  fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em',
                }}>
                  DEPTO. {muni.departamento.toUpperCase()}
                </span>
                {muni.isCapital && (
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: '#f59e0b',
                    background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
                    borderRadius: 4, padding: '2px 7px',
                    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em',
                  }}>
                    CAPITAL
                  </span>
                )}
              </div>

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{
                    fontSize: 11, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
                    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3,
                  }}>
                    PRESUPUESTO
                  </div>
                  <div style={{
                    fontSize: 32, fontWeight: 700, color: '#2dd4bf',
                    fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1,
                  }}>
                    {L(yearPresupuesto)}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: 11, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
                    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3,
                  }}>
                    POBLACIÓN
                  </div>
                  <div style={{
                    fontSize: 26, fontWeight: 700, color: '#f9fafb',
                    fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1,
                  }}>
                    {fmtP.format(muni.poblacion)}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Donut chart ── */}
            <div style={{
              background: 'rgba(13,21,38,0.74)',
              border: '1px solid rgba(0,212,184,0.12)',
              borderRadius: 10, padding: '14px 10px 10px',
            }}>
              <div style={{
                fontSize: 9, color: '#4a5a73',
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: '0.12em', textTransform: 'uppercase',
                marginBottom: 10, paddingLeft: 4,
              }}>
                COMPOSICIÓN DE INGRESOS
              </div>

              <div style={{ position: 'relative', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData} cx="50%" cy="44%"
                      innerRadius={65} outerRadius={100}
                      paddingAngle={3} dataKey="value" strokeWidth={0}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} stroke="#070c1a" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RTooltip
                      content={<DonutTooltip />}
                      wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value: any, entry: any) => (
                        <span style={{ color: '#9ca3af', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {value} {entry?.payload?.pct ?? 0}%
                        </span>
                      )}
                      iconSize={7}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center label */}
                <div style={{
                  position: 'absolute', top: '44%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center', pointerEvents: 'none', lineHeight: 1.3,
                }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: '#ffffff',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {L(Math.round((muni.ingresosPropios + muni.transferencia + muni.otros) * scale))}
                  </div>
                  <div style={{
                    fontSize: 9, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace",
                    letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3,
                  }}>
                    INGRESOS TOTALES
                  </div>
                </div>
              </div>
            </div>

            {/* ── Top 5 fuentes ── */}
            <div style={{
              background: 'rgba(13,21,38,0.74)',
              border: '1px solid rgba(0,212,184,0.12)',
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{
                fontSize: 11, color: '#4a5a73',
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14,
              }}>
                TOP 5 FUENTES DE INGRESO
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {top5.map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{
                        fontSize: 13, color: '#9ca3af',
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>
                        {item.label}
                      </span>
                      <span style={{
                        fontSize: 13, color: '#2dd4bf',
                        fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
                      }}>
                        {L(item.value)}
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%',
                        width: `${item.pct}%`,
                        background: item.color,
                        borderRadius: 2,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
