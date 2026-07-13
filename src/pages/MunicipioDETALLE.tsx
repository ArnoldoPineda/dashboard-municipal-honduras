import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { DEPARTAMENTOS, getMunicipiosByDept, getMunicipio } from '../data/municipios';
import { useNavbar } from '../context/NavbarContext';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';

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

const CATEGORIA_LABEL: Record<string, string> = {
  A: 'Categoría A — Municipio Grande',
  B: 'Categoría B — Municipio Mediano',
  C: 'Categoría C — Municipio Intermedio',
  D: 'Categoría D — Municipio Pequeño',
};

const DEPT_CODES: Record<string, string> = {
  'atlantida': '01', 'choluteca': '02', 'colon': '03', 'comayagua': '04',
  'copan': '05', 'cortes': '06', 'el-paraiso': '07', 'francisco-morazan': '08',
  'gracias-a-dios': '09', 'intibuca': '10', 'islas-de-la-bahia': '11',
  'la-paz': '12', 'lempira': '13', 'ocotepeque': '14', 'olancho': '15',
  'santa-barbara': '16', 'valle': '17', 'yoro': '18',
};

function fmtSigned(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n === 0) return 'L 0';
  const abs = Math.abs(n);
  const label = abs >= 1_000_000_000 ? `L ${(abs / 1_000_000_000).toFixed(1)} mil M`
              : abs >= 1_000_000     ? `L ${(abs / 1_000_000).toFixed(1)} M`
              : `L ${fmtF.format(abs)}`;
  return n < 0 ? `−${label}` : label;
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
  note?: string;
}

function AccordionItem({
  section, expanded, onToggle,
}: {
  section: AccordionSection;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isInfo = section.key === 'general' || section.key === 'notas';
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
          {section.note && (
            <div style={{
              padding: '8px 16px',
              fontSize: 11,
              color: '#7c8aa3',
              fontStyle: 'italic',
              fontFamily: "'IBM Plex Mono', monospace",
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              {section.note}
            </div>
          )}
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
    new Set(['general', 'resumen', 'ing_tributarios', 'ing_no_tributarios',
             'ing_capital', 'gast_funcionamiento', 'gast_capital',
             'resultado', 'notas'])
  );

  const deptMunis = useMemo(() => getDeptMunis(deptCode), [deptCode]);
  const muni: any = useMemo(() => muniId ? getMunicipio(muniId) : null, [muniId]);

  // Supabase data for the selected year
  const { municipalities } = useMunicipalitiesMultiYear([fiscalYear]);
  const sb = useMemo(() => {
    if (!muni) return null;
    const norm = (s: string) =>
      s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    return municipalities.find(
      m => norm(m.name) === norm(muni.nombre) && norm(m.department) === norm(muni.departamento)
    ) ?? null;
  }, [municipalities, muni]);

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

  const yearEvo: any = muni?.evolucion?.find((e: any) => e.year === fiscalYear);
  const yearPresupuesto: number = muni
    ? (yearEvo?.presupuesto ?? muni.presupuesto)
    : 0;
  const yearPoblacion: number = muni
    ? (yearEvo?.poblacion ?? muni.poblacion)
    : 0;
  const scale: number = muni && muni.presupuesto > 0 ? yearPresupuesto / muni.presupuesto : 1;

  // ── Derived values — plain render-body variables, always fresh ───────────

  const _pres   = yearPresupuesto;
  const _ip     = muni ? Math.round(muni.ingresosPropios * scale) : 0;
  const _trans  = muni ? Math.round(muni.transferencia   * scale) : 0;
  const _otros  = muni ? Math.max(0, _pres - _ip - _trans) : 0;
  const _tribut = Math.round(_ip * 0.58);
  const _noTrib = _ip - _tribut;
  const _gFunc  = Math.round(_pres * 0.63);
  const _gCap   = _pres - _gFunc;
  const fm      = (v: number) => formatMoney(Math.round(v));
  const fmZ     = (v: number | null | undefined): string => {
    const n = Math.round(v ?? 0);
    if (n === 0) return 'L 0';
    if (n >= 1_000_000_000) return `L ${(n / 1_000_000_000).toFixed(1)} mil M`;
    if (n >= 1_000_000)     return `L ${(n / 1_000_000).toFixed(1)} M`;
    return `L ${fmtF.format(n)}`;
  };

  const codDep = muni ? (DEPT_CODES[muni.departamentoId] ?? '—') : '—';
  const codMun = muni && muniId
    ? String(deptMunis.findIndex(m => m.id === muniId) + 1).padStart(2, '0')
    : '—';
  // ── Grupos SIMHO — suma directa de columnas individuales (nunca subtotales SEFIN) ──
  const g1 = sb
    ? (sb.impuesto_bi ?? 0) + (sb.impuesto_personal ?? 0)
      + (sb.impuesto_industria ?? 0) + (sb.impuesto_comercio ?? 0)
      + (sb.impuesto_servicios ?? 0) + (sb.impuesto_pecuario ?? 0)
      + (sb.impuesto_extraccion ?? 0) + (sb.impuesto_telecomunicaciones ?? 0)
      + (sb.tasas_servicios ?? 0) + (sb.derechos ?? 0)
    : _tribut;

  // G2: solo multas/mora/recargos. Tasas y derechos ya están en G1.
  const g2 = sb
    ? (sb.ingresos_no_tributarios ?? 0)
    : _noTrib;

  // G4: los 10 campos de "INGRESOS DE CAPITAL" del Excel SEFIN (col. 29 = Σ col. 30-39).
  //     Incluye Transferencias Art.91, Otras Transferencias, Subsidios y Herencias/Legados/
  //     Donaciones — SEFIN no las trata como sección aparte, son sub-renglones de capital.
  const g4 = sb
    ? (sb.venta_activos ?? 0) + (sb.contribuciones ?? 0)
      + (sb.prestamos ?? 0) + (sb.colocacion_bonos ?? 0)
      + (sb.otros_ingresos_capital ?? 0) + (sb.recursos_balance ?? 0)
      + (sb.transferencias_art91 ?? 0) + (sb.otras_transferencias ?? 0)
      + (sb.subsidios ?? 0) + (sb.herencias_legados ?? 0)
    : _otros + _trans;

  // AF SEFIN Oficial: usa campos directos para comparabilidad con reportes del gobierno
  const afSEFIN: number = sb && (sb.ingresos_recaudados ?? 0) > 0
    ? (sb.ingresos_propios ?? 0) / (sb.ingresos_recaudados as number) * 100
    : _pres > 0 ? (_ip / _pres * 100) : 0;

  // ── Accordion sections ────────────────────────────────────────────────────

  const sections: AccordionSection[] = !muni ? [] : [
    {
      key: 'general', title: 'Información General', color: '#2dd4bf', amount: 0,
      rows: [
        { label: 'Cód. Departamento',   value: codDep },
        { label: 'Cód. Municipio',      value: codMun },
        { label: 'Departamento',        value: muni.departamento },
        { label: 'Municipio',           value: muni.nombre },
        { label: 'Categoría Municipal', value: CATEGORIA_LABEL[muni.categoria] ?? `Categoría ${muni.categoria}` },
        { label: 'Población',           value: sb?.population ? fmtP.format(Number(sb.population)) + ' hab.' : fmtP.format(yearPoblacion) + ' hab.' },
        { label: 'Área',                value: muni.area > 0 ? `${muni.area.toFixed(1)} km²` : '—' },
        { label: 'Densidad',            value: muni.area > 0 && yearPoblacion > 0 ? `${(yearPoblacion / muni.area).toFixed(1)} hab/km²` : '—' },
        { label: 'IDH',                 value: muni.idh > 0 ? muni.idh.toFixed(3) : '—' },
      ],
    },
    {
      key: 'resumen', title: 'Datos Presupuestarios', color: '#06b6d4',
      amount: sb?.presupuesto_municipal ?? yearPresupuesto,
      rows: sb ? [
        { label: 'Presupuesto Aprobado',  value: fmZ(sb.presupuesto_municipal) },
        { label: 'Gastos Presupuestados', value: fmZ(sb.gastos_presupuestados) },
        { label: 'Ingresos Propios',      value: fmZ(sb.ingresos_propios)      },
        { label: 'Ingresos Recaudados',   value: fmZ(sb.ingresos_recaudados)   },
        { label: 'Autonomía Financiera',  value: sb.autonomia_financiera != null ? `${Number(sb.autonomia_financiera).toFixed(1)}%` : '0.0%' },
        { label: 'Ingresos Corrientes',   value: fmZ(sb.ingresos_corrientes)   },
      ] : [
        { label: 'Presupuesto Aprobado',  value: fm(yearPresupuesto)           },
        { label: 'Gastos Presupuestados', value: fm(yearPresupuesto)           },
        { label: 'Ingresos Propios',      value: fm(_ip)                       },
        { label: 'Ingresos Recaudados',   value: fm(yearPresupuesto)           },
        { label: 'Autonomía Financiera',  value: `${afSEFIN.toFixed(1)}%`      },
        { label: 'Ingresos Corrientes',   value: fm(_ip + _trans)              },
      ],
    },
    {
      key: 'ing_tributarios',
      title: 'G1 — Ingresos Tributarios',
      color: '#2dd4bf',
      amount: g1,
      rows: sb ? [
        { label: 'Impuesto s/Bienes Inmuebles', value: fmZ(sb.impuesto_bi)                  },
        { label: 'Impuesto Personal (Vecinal)',  value: fmZ(sb.impuesto_personal)            },
        { label: 'Impuesto s/Industria (ICS)',   value: fmZ(sb.impuesto_industria)           },
        { label: 'Impuesto s/Comercio (ICS)',    value: fmZ(sb.impuesto_comercio)            },
        { label: 'Impuesto s/Servicios (ICS)',   value: fmZ(sb.impuesto_servicios)           },
        { label: 'Impuesto Pecuario',            value: fmZ(sb.impuesto_pecuario)            },
        { label: 'Impuesto s/Extracción',        value: fmZ(sb.impuesto_extraccion)          },
        { label: 'Impuesto Telecomunicaciones',  value: fmZ(sb.impuesto_telecomunicaciones)  },
        { label: 'Tasas por Servicios',          value: fmZ(sb.tasas_servicios)              },
        { label: 'Derechos',                     value: fmZ(sb.derechos)                     },
      ] : [
        { label: 'Impuesto sobre Bienes Inmuebles', value: fm(_tribut * 0.35) },
        { label: 'Industria, Comercio y Servicios', value: fm(_tribut * 0.28) },
        { label: 'Impuesto Personal (Vecinal)',     value: fm(_tribut * 0.18) },
        { label: 'Impuesto Pecuario',               value: fm(_tribut * 0.12) },
        { label: 'Extracción de Recursos',          value: fm(_tribut * 0.07) },
      ],
    },
    {
      key: 'ing_no_tributarios',
      title: 'G2 — Ingresos No Tributarios Propios',
      color: '#f59e0b',
      amount: g2,
      note: 'Tasas por Servicios y Derechos se muestran aquí solo como referencia cruzada — ya están contabilizados en G1.',
      rows: sb ? [
        { label: 'Tasas por Servicios (→ G1)',     value: fmZ(sb.tasas_servicios) },
        { label: 'Derechos (→ G1)',                 value: fmZ(sb.derechos)        },
        { label: 'Otros (multas, mora, recargos)', value: fmZ(sb.ingresos_no_tributarios ?? 0) },
      ] : [
        { label: 'Otros (multas, mora, recargos)', value: fm(_noTrib) },
      ],
    },
    {
      key: 'ing_capital',
      title: 'G4 — Recursos de Capital y Financiamiento',
      color: '#a855f7',
      amount: g4,
      rows: sb ? [
        { label: 'Venta de Activos',                  value: fmZ(sb.venta_activos)         },
        { label: 'Contribuciones',                    value: fmZ(sb.contribuciones)         },
        { label: 'Préstamos',                         value: fmZ(sb.prestamos)              },
        { label: 'Colocación en Bonos',                value: fmZ(sb.colocacion_bonos)       },
        { label: 'Transferencias Art. 91',            value: fmZ(sb.transferencias_art91)   },
        { label: 'Otras Transferencias',              value: fmZ(sb.otras_transferencias)   },
        { label: 'Subsidios',                          value: fmZ(sb.subsidios)             },
        { label: 'Herencias, Leg. y Donac.',           value: fmZ(sb.herencias_legados)      },
        { label: 'Otros Ingresos de Capital',          value: fmZ(sb.otros_ingresos_capital) },
        { label: 'Recursos de Balance',              value: fmZ(sb.recursos_balance)       },
      ] : [
        { label: 'Recursos de Capital',   value: fm(_otros * 0.60) },
        { label: 'Préstamos',             value: fm(_otros * 0.25) },
        { label: 'Recursos de Balance', value: fm(_otros * 0.15) },
      ],
    },
    {
      key: 'gast_funcionamiento', title: 'Gastos de Funcionamiento', color: '#f97316',
      amount: sb?.gastos_funcionamiento ?? _gFunc,
      rows: sb ? [
        { label: 'Servicios Personales',      value: fmZ(sb.servicios_personales)      },
        { label: 'Servicios No Personales',   value: fmZ(sb.servicios_no_personales)   },
        { label: 'Materiales, Sumin. y Maq.', value: fmZ(sb.materiales_suministro)     },
        { label: 'Transferencias Corrientes', value: fmZ(sb.transferencias_corrientes) },
        { label: 'Otros',                     value: fmZ(sb.otros_gastos)              },
      ] : [
        { label: 'Servicios Personales',     value: fm(_gFunc * 0.58) },
        { label: 'Servicios No Personales',  value: fm(_gFunc * 0.28) },
        { label: 'Materiales y Suministros', value: fm(_gFunc * 0.14) },
      ],
    },
    {
      key: 'gast_capital', title: 'Gastos de Capital y Deuda Pública', color: '#8b5cf6',
      amount: sb?.gastos_capital_deuda ?? _gCap,
      rows: sb ? [
        { label: 'Bienes Capitalizables', value: fmZ(sb.bienes_capitalizables)  },
        { label: 'Transferencias',        value: fmZ(sb.transferencias_capital) },
        { label: 'Activos Financieros',   value: fmZ(sb.activos_financieros)    },
        { label: 'Servicios de Deuda',    value: fmZ(sb.servicios_deuda)        },
        { label: 'Otros Gastos',          value: fmZ(sb.otros_gastos_capital)   },
        { label: 'Asignaciones Globales', value: fmZ(sb.asignaciones_globales)  },
      ] : [
        { label: 'Inversión en Obras',     value: fm(_gCap * 0.62) },
        { label: 'Amortización de Deuda',  value: fm(_gCap * 0.25) },
        { label: 'Intereses y Comisiones', value: fm(_gCap * 0.13) },
      ],
    },
    {
      key: 'resultado', title: 'Resultado Fiscal', color: '#a78bfa',
      amount: sb?.total_egresos ?? yearPresupuesto,
      rows: sb ? [
        { label: 'Total Egresos',              value: fmZ(sb.total_egresos)              },
        { label: 'Superávit / Déficit',        value: fmtSigned(sb.superavit_deficit)    },
        { label: 'Gasto Corriente',            value: fmZ(sb.gasto_corriente)            },
        { label: 'Ingreso Corriente Ajustado', value: fmZ(sb.ingreso_corriente_ajustado) },
      ] : [
        { label: 'Total Egresos (est.)',              value: fm(yearPresupuesto)                  },
        { label: 'Superávit / Déficit (est.)',        value: fmtSigned(Math.round(_pres * 0.04))  },
        { label: 'Gasto Corriente (est.)',            value: fm(_gFunc)                           },
        { label: 'Ingreso Corriente Ajustado (est.)', value: fm(_ip + _trans)                     },
      ],
    },
  ];

  // ── Donut data ────────────────────────────────────────────────────────────

  const donutData = !muni ? [] : (() => {
    if (sb) {
      const total = g1 + g2 + g4;
      const pct   = (v: number) => total > 0 ? Math.min(100, Math.round(v / total * 100)) : 0;
      return [
        { name: 'G1 Tributarios',             value: g1, fill: '#2dd4bf', pct: pct(g1) },
        { name: 'G2 No Tributarios Propios',  value: g2, fill: '#06b6d4', pct: pct(g2) },
        { name: 'G4 Capital y Financ.',       value: g4, fill: '#a855f7', pct: pct(g4) },
      ].filter(d => d.value > 0);
    }
    const total = _tribut + _noTrib + _trans + _otros;
    const pct   = (v: number) => total > 0 ? Math.min(100, Math.round(v / total * 100)) : 0;
    return [
      { name: 'G1 Tributarios',    value: _tribut, fill: '#2dd4bf', pct: pct(_tribut) },
      { name: 'G2 No Tributarios', value: _noTrib, fill: '#06b6d4', pct: pct(_noTrib) },
      { name: 'G4 Capital',        value: _otros + _trans, fill: '#a855f7', pct: pct(_otros + _trans) },
    ].filter(d => d.value > 0);
  })();

  // ── Top 5 ─────────────────────────────────────────────────────────────────
  // Candidatos = solo campos hoja de Supabase, nunca totales G1/G2/G4 — cada campo
  // es exactamente uno de los sumandos de g1/g2/g4 (líneas 318-336), una sola
  // vez, para evitar doble conteo (ej. Transferencias Art.91 ya es parte de G4).

  const top5 = !muni ? [] : (() => {
    const items = sb ? [
      // G1 — Tributarios
      { label: 'Impuesto s/Bienes Inmuebles',       group: 'G1', value: sb.impuesto_bi ?? 0,                                  color: '#2dd4bf' },
      { label: 'Impuesto Personal (Vecinal)',       group: 'G1', value: sb.impuesto_personal ?? 0,                            color: '#2dd4bf' },
      { label: 'Impuesto s/Industria (ICS)',        group: 'G1', value: sb.impuesto_industria ?? 0,                           color: '#2dd4bf' },
      { label: 'Impuesto s/Comercio (ICS)',         group: 'G1', value: sb.impuesto_comercio ?? 0,                            color: '#2dd4bf' },
      { label: 'Impuesto s/Servicios (ICS)',        group: 'G1', value: sb.impuesto_servicios ?? 0,                           color: '#2dd4bf' },
      { label: 'Impuesto Pecuario',                 group: 'G1', value: sb.impuesto_pecuario ?? 0,                            color: '#2dd4bf' },
      { label: 'Impuesto s/Extracción',             group: 'G1', value: sb.impuesto_extraccion ?? 0,                          color: '#2dd4bf' },
      { label: 'Impuesto Telecomunicaciones',       group: 'G1', value: sb.impuesto_telecomunicaciones ?? 0,                  color: '#2dd4bf' },
      { label: 'Tasas por Servicios',               group: 'G1', value: sb.tasas_servicios ?? 0,                             color: '#2dd4bf' },
      { label: 'Derechos',                          group: 'G1', value: sb.derechos ?? 0,                                    color: '#2dd4bf' },
      // G2 — No Tributarios Propios
      { label: 'Otros (multas, mora, recargos)',    group: 'G2', value: sb.ingresos_no_tributarios ?? 0,                     color: '#06b6d4' },
      // G4 — Recursos de Capital y Financiamiento
      { label: 'Venta de Activos',                  group: 'G4', value: sb.venta_activos ?? 0,                                color: '#a855f7' },
      { label: 'Contribuciones',                    group: 'G4', value: sb.contribuciones ?? 0,                               color: '#a855f7' },
      { label: 'Préstamos',                         group: 'G4', value: sb.prestamos ?? 0,                                    color: '#a855f7' },
      { label: 'Colocación en Bonos',                group: 'G4', value: sb.colocacion_bonos ?? 0,                            color: '#a855f7' },
      { label: 'Transferencias Art. 91',            group: 'G4', value: sb.transferencias_art91 ?? 0,                        color: '#a855f7' },
      { label: 'Otras Transferencias',               group: 'G4', value: sb.otras_transferencias ?? 0,                       color: '#a855f7' },
      { label: 'Subsidios',                         group: 'G4', value: sb.subsidios ?? 0,                                    color: '#a855f7' },
      { label: 'Herencias, Leg. y Donac.',          group: 'G4', value: sb.herencias_legados ?? 0,                            color: '#a855f7' },
      { label: 'Otros Ingresos de Capital',         group: 'G4', value: sb.otros_ingresos_capital ?? 0,                       color: '#a855f7' },
      { label: 'Recursos de Balance',               group: 'G4', value: sb.recursos_balance ?? 0,                             color: '#a855f7' },
    ] : [
      { label: 'G1 Tributarios',    group: 'G1', value: _tribut, color: '#2dd4bf' },
      { label: 'G2 No Tributarios', group: 'G2', value: _noTrib, color: '#06b6d4' },
      { label: 'G4 Capital',        group: 'G4', value: _otros + _trans, color: '#a855f7' },
    ];
    const sorted = [...items].filter(i => i.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
    const max = sorted[0]?.value || 1;
    return sorted.map(i => ({ ...i, pct: Math.round(i.value / max * 100) }));
  })();

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
                    INGRESOS RECAUDADOS
                  </div>
                  <div style={{
                    fontSize: 32, fontWeight: 700, color: '#2dd4bf',
                    fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1,
                  }}>
                    {L(sb?.ingresos_recaudados ?? yearPresupuesto)}
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
                    {fmtP.format(Number(sb?.population ?? yearPoblacion))}
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
                    {L(g1 + g2 + g4)}
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
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: item.color,
                          border: `1px solid ${item.color}`, borderRadius: 3,
                          padding: '1px 4px', letterSpacing: '0.03em', flexShrink: 0,
                        }}>
                          {item.group}
                        </span>
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

