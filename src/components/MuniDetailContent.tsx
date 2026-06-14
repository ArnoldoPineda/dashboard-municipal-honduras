import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, LabelList,
} from 'recharts';

// ── Formatters ───────────────────────────────────────────────────────────────

const fmt    = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 1 });
const fmtPop = new Intl.NumberFormat('es-HN');

function L(n: number) { return n > 0 ? `L ${fmt.format(n)}` : '—'; }

// ── Shared styles ────────────────────────────────────────────────────────────

const CHART_STYLE: React.CSSProperties = {
  background: 'rgba(13,21,38,0.74)',
  border: '1px solid rgba(0,212,184,0.12)',
  borderRadius: 10,
  padding: '14px 10px 8px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const TITLE_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 13,
  color: '#4a5a73',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 10,
  flexShrink: 0,
};

// ── Internal helpers ─────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1f2937', border: '1px solid #2dd4bf',
      borderRadius: 6, padding: '10px 14px', fontSize: 11, color: '#f9fafb',
    }}>
      {label && (
        <div style={{ color: '#7c8aa3', marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>
          {label}
        </div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || '#2dd4bf', fontFamily: "'IBM Plex Mono', monospace" }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

function EvoDot(props: any) {
  const { cx, cy, index, dataLength } = props;
  if (!cx || !cy) return null;
  const isLast = index === dataLength - 1;
  return (
    <circle
      key={`dot-${index}`}
      cx={cx} cy={cy}
      r={isLast ? 5.5 : 3}
      fill={isLast ? '#f59e0b' : '#2dd4bf'}
      style={{ filter: isLast ? 'drop-shadow(0 0 5px #f59e0b)' : 'none' }}
    />
  );
}

function KPICard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'rgba(13,21,38,0.74)',
      border: '1px solid rgba(0,212,184,0.12)',
      borderRadius: 10, padding: '18px 20px', minWidth: 0,
    }}>
      <div style={{
        fontSize: 10, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
        letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 700, color,
        fontFamily: "'IBM Plex Mono', monospace",
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value}
      </div>
    </div>
  );
}

function DonutChart({ muni }: { muni: any }) {
  const total = muni.ingresosPropios + muni.transferencia + muni.otros;
  const pct   = (v: number) => total > 0 ? Math.min(100, Math.round(v / total * 100)) : 0;

  const data = [
    { name: 'Transferencias', value: muni.transferencia,   fill: '#f59e0b', pct: pct(muni.transferencia)   },
    { name: 'Ing. Propios',   value: muni.ingresosPropios, fill: '#2dd4bf', pct: pct(muni.ingresosPropios) },
    { name: 'Otros',          value: muni.otros,           fill: '#1a2d48', pct: pct(muni.otros)           },
  ].filter((d) => d.value > 0);

  const dominant = data.reduce((a, b) => a.value > b.value ? a : b, data[0]) || data[0];

  return (
    <div style={CHART_STYLE}>
      <div style={TITLE_STYLE}>Composición Presupuestaria</div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data} cx="50%" cy="46%"
              innerRadius="50%" outerRadius="72%"
              paddingAngle={3} dataKey="value" strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="#070c1a" strokeWidth={1.5} />
              ))}
            </Pie>
            <RTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{
                    background: 'rgba(8,12,24,0.96)', border: '1px solid rgba(0,212,184,0.35)',
                    borderRadius: 8, padding: '8px 12px', fontSize: 11,
                  }}>
                    <div style={{ color: '#e8eef6', marginBottom: 3 }}>{d.name}</div>
                    <div style={{ color: d.fill, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {d.pct}% · {L(d.value)}
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              formatter={(value: any, entry: any) => (
                <span style={{ color: '#9ca3af', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {value} {entry?.payload?.pct ?? 0}%
                </span>
              )}
              iconSize={7}
            />
          </PieChart>
        </ResponsiveContainer>

        {dominant && (
          <div style={{
            position: 'absolute', top: '46%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none', lineHeight: 1.2,
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e8eef6', fontFamily: "'IBM Plex Mono', monospace" }}>
              {dominant.pct}%
            </div>
            <div style={{ fontSize: 7.5, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', marginTop: 2 }}>
              {dominant.name.toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EvoLineChart({ evolucion }: { evolucion: any[] }) {
  const data       = evolucion.map((e) => ({ year: String(e.year), presupuesto: e.presupuesto }));
  const dataLength = data.length;
  const startYear  = data[0]?.year || '';
  const endYear    = data[data.length - 1]?.year || '';
  const first      = data[0]?.presupuesto || 0;
  const last       = data[data.length - 1]?.presupuesto || 0;
  const pctChg     = first > 0 ? ((last - first) / first * 100) : 0;
  const pctSign    = pctChg >= 0 ? '+' : '';
  const pctCol     = pctChg >= 0 ? '#2dd4bf' : '#ef5a5a';

  return (
    <div style={CHART_STYLE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0 }}>
        <div style={TITLE_STYLE}>Evolución {startYear}–{endYear}</div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, color: pctCol,
          background: pctChg >= 0 ? 'rgba(45,212,191,0.1)' : 'rgba(239,90,90,0.1)',
          border: `1px solid ${pctChg >= 0 ? 'rgba(45,212,191,0.3)' : 'rgba(239,90,90,0.3)'}`,
          borderRadius: 4, padding: '2px 8px', flexShrink: 0,
        }}>
          {pctSign}{pctChg.toFixed(0)}% acum.
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 14, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="rgba(0,212,184,0.07)" strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: '#4a5a73', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}
              tickLine={false} axisLine={false}
            />
            <YAxis
              tickFormatter={(v) => `L${fmt.format(v)}`}
              tick={{ fill: '#4a5a73', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}
              tickLine={false} axisLine={false} width={52}
            />
            <RTooltip content={<DarkTooltip formatter={(v: number) => `L ${fmt.format(v)}`} />} />
            <Line
              type="monotone" dataKey="presupuesto" name="Presupuesto"
              stroke="#2dd4bf" strokeWidth={2}
              dot={(props: any) => <EvoDot {...props} dataLength={dataLength} />}
              activeDot={{ r: 6, fill: '#2dd4bf', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CompBarChart({ muni, deptAvg }: { muni: any; deptAvg: any }) {
  const data = [
    { name: 'PRESUPUESTO',   municipio: muni.presupuesto,     promedio: deptAvg.presupuesto    },
    { name: 'ING. PROPIOS',  municipio: muni.ingresosPropios, promedio: deptAvg.ingresosPropios },
    { name: 'TRANSFERENCIA', municipio: muni.transferencia,   promedio: deptAvg.transferencia   },
  ];

  return (
    <div style={CHART_STYLE}>
      <div style={TITLE_STYLE}>Municipio vs Promedio Departamental</div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data} layout="vertical"
            margin={{ top: 4, right: 52, bottom: 4, left: 88 }}
            barCategoryGap="30%" barGap={3}
          >
            <CartesianGrid stroke="rgba(0,212,184,0.07)" strokeDasharray="3 4" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => `L${fmt.format(v)}`}
              tick={{ fill: '#4a5a73', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}
              tickLine={false} axisLine={false}
            />
            <YAxis
              type="category" dataKey="name"
              tick={{ fill: '#7c8aa3', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.03em' }}
              tickLine={false} axisLine={false} width={86}
            />
            <RTooltip
              content={<DarkTooltip formatter={(v: number) => `L ${fmt.format(v)}`} />}
              wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
            />
            <Legend
              formatter={(value: string) => (
                <span style={{ color: '#9ca3af', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
              )}
              iconSize={8} wrapperStyle={{ paddingTop: 6 }}
            />
            <Bar dataKey="municipio" name="Municipio" fill="#2dd4bf" radius={[0, 3, 3, 0]} maxBarSize={9}>
              <LabelList
                dataKey="municipio" position="right"
                formatter={(v: number) => `L${fmt.format(v)}`}
                style={{ fill: '#f9fafb', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}
              />
            </Bar>
            <Bar dataKey="promedio" name="Prom. Depto." fill="#f59e0b" opacity={0.7} radius={[0, 3, 3, 0]} maxBarSize={9} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Year-specific data helper ─────────────────────────────────────────────────

function getYearSnapshot(muni: any, year: number) {
  const evo  = (muni.evolucion || []).find((e: any) => e.year === year);
  const pres = evo?.presupuesto ?? muni.presupuesto;
  const ratio = muni.presupuesto > 0 ? pres / muni.presupuesto : 1;
  return {
    presupuesto:     pres,
    ingresosPropios: Math.round(muni.ingresosPropios * ratio),
    transferencia:   Math.round(muni.transferencia   * ratio),
    otros:           Math.max(0, pres - Math.round(muni.ingresosPropios * ratio) - Math.round(muni.transferencia * ratio)),
    ratio,
  };
}

// ── Exported shared content component ────────────────────────────────────────

export function MuniDetailContent({ muni, deptAvg, year = 2024 }: { muni: any; deptAvg: any | null; year?: number }) {
  // Year-specific snapshot
  const snap  = getYearSnapshot(muni, year);
  const muniY = { ...muni, presupuesto: snap.presupuesto, ingresosPropios: snap.ingresosPropios, transferencia: snap.transferencia, otros: snap.otros };

  // Scale dept avg by same ratio (approximation for mock data)
  const deptAvgY = deptAvg ? {
    presupuesto:     Math.round(deptAvg.presupuesto     * snap.ratio),
    ingresosPropios: Math.round(deptAvg.ingresosPropios * snap.ratio),
    transferencia:   Math.round(deptAvg.transferencia   * snap.ratio),
  } : null;

  // Evolution filtered up to selected year
  const evoFiltered = (muni.evolucion || []).filter((e: any) => e.year <= year);

  const kpis = [
    { label: 'POBLACIÓN',        value: fmtPop.format(muni.poblacion) + ' hab.',             color: '#e8eef6' },
    { label: 'ÁREA',             value: muni.area > 0 ? `${muni.area.toFixed(1)} km²` : '—', color: '#e8eef6' },
    { label: 'PRESUPUESTO',      value: L(snap.presupuesto),                                  color: '#2dd4bf' },
    { label: 'INGRESOS PROPIOS', value: L(snap.ingresosPropios),                              color: '#2dd4bf' },
    { label: 'TRANSFERENCIA',    value: L(snap.transferencia),                                color: '#2dd4bf' },
    { label: 'IDH',              value: muni.idh > 0 ? muni.idh.toFixed(3) : '—',            color: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* KPI row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6,
        padding: '10px 22px',
        borderBottom: '1px solid rgba(0,212,184,0.10)',
        flexShrink: 0,
      }}>
        {kpis.map((k) => <KPICard key={k.label} {...k} />)}
      </div>

      {/* 3 chart panels */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
        padding: '10px 22px 12px',
      }}>
        {deptAvgY
          ? <CompBarChart muni={muniY} deptAvg={deptAvgY} />
          : <div style={CHART_STYLE}><div style={TITLE_STYLE}>Sin datos departamentales</div></div>
        }

        <DonutChart muni={muniY} />

        {evoFiltered.length >= 2
          ? <EvoLineChart evolucion={evoFiltered} />
          : <div style={CHART_STYLE}><div style={TITLE_STYLE}>Sin datos de evolución</div></div>
        }
      </div>
    </div>
  );
}
