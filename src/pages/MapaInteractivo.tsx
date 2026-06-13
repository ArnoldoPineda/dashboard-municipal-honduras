import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import useMunicipalityDetails from '../hooks/useMunicipalityDetails';

type MapView = 'nation' | 'dept' | 'muni';
type Indicator = 'budget' | 'propios' | 'autonomia';

const INDICATORS: { key: Indicator; label: string }[] = [
  { key: 'budget',    label: 'Presupuesto' },
  { key: 'propios',   label: 'Ing. Propios' },
  { key: 'autonomia', label: 'Autonomía %' },
];

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024];
const DETAIL_YEARS = [2021, 2022, 2023, 2024, 2025];

const DEPT_CAPITALS: Record<string, string> = {
  'Atlántida':         'La Ceiba',
  'Colón':             'Trujillo',
  'Comayagua':         'Comayagua',
  'Copán':             'Santa Rosa de Copán',
  'Cortés':            'San Pedro Sula',
  'Choluteca':         'Choluteca',
  'El Paraíso':        'Yuscarán',
  'Francisco Morazán': 'Tegucigalpa',
  'Gracias a Dios':    'Puerto Lempira',
  'Intibucá':          'La Esperanza',
  'Islas de la Bahía': 'Roatán',
  'La Paz':            'La Paz',
  'Lempira':           'Gracias',
  'Ocotepeque':        'Nueva Ocotepeque',
  'Olancho':           'Juticalpa',
  'Santa Bárbara':     'Santa Bárbara',
  'Valle':             'Nacaome',
  'Yoro':              'Yoro',
};

const fmt = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 1 });
const fmtFull = new Intl.NumberFormat('es-HN', {
  style: 'currency', currency: 'HNL', maximumFractionDigits: 0,
});

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

type MuniStat = {
  name: string;
  budget: number;
  propios: number;
  autonomia: number;
  population: number;
};

type DeptStats = {
  name: string;
  budget: number;
  propios: number;
  autonomia: number;
  muniCount: number;
  population: number;
  transferencias: number;
  municipalities: MuniStat[];
};

// ── Voronoi choropleth map of department municipalities ──────────────────────
//
// The national TopoJSON has department-level geometry only.
// We generate plausible municipality regions via D3 Voronoi clipped to the
// department outline: hex-grid seeds within the bbox, Voronoi polygons,
// clip-path to the actual department boundary, choropleth by presupuesto.

interface TooltipState {
  x: number;
  y: number;
  name: string;
  budget: number;
}

function DeptMuniMap({
  topoData,
  deptName,
  municipalities,
  onSelectMuni,
}: {
  topoData: any;
  deptName: string;
  municipalities: MuniStat[];
  onSelectMuni: (name: string) => void;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const svgRef   = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [size,    setSize]    = useState({ w: 0, h: 0 });

  // track container width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0) setSize({ w: width, h: height || Math.round(width * 0.62) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!topoData || !svgRef.current || municipalities.length === 0 || size.w === 0) return;

    const W = size.w;
    const H = size.h || Math.round(W * 0.62);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', W).attr('height', H);

    // ── find department feature ──────────────────────────────────────────
    const features = (topojson.feature(topoData, topoData.objects.hnd) as any).features;
    const deptFeature = features.find((f: any) =>
      normalizeName(f.properties?.name || '') === normalizeName(deptName)
    );
    if (!deptFeature) return;

    const PAD = 18;
    const projection = d3.geoMercator().fitExtent(
      [[PAD, PAD], [W - PAD, H - PAD]],
      { type: 'FeatureCollection', features: [deptFeature] }
    );
    const geoPath = d3.geoPath().projection(projection);

    // bounding box in SVG space
    const [[bx0, by0], [bx1, by1]] = geoPath.bounds(deptFeature);
    const bW = bx1 - bx0, bH = by1 - by0;

    // ── hex-grid seeds inside the bbox (deterministic, no randomness) ────
    const n = municipalities.length;
    const area   = bW * bH;
    const spacing = Math.sqrt(area / n) * 0.9;  // hex-grid spacing
    const hH = spacing * 0.866;  // row height = spacing * sin(60°)

    const allSeeds: [number, number][] = [];
    let row = 0;
    while (by0 + row * hH < by1 + hH) {
      let col = 0;
      while (bx0 + col * spacing + (row % 2) * spacing * 0.5 < bx1 + spacing) {
        allSeeds.push([
          bx0 + col * spacing + (row % 2) * spacing * 0.5,
          by0 + row * hH,
        ]);
        col++;
      }
      row++;
    }

    // sort seeds by distance from dept centroid (closest first = most central)
    const [cx, cy] = geoPath.centroid(deptFeature);
    allSeeds.sort((a, b) =>
      Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy)
    );

    // assign sorted municipalities (by presupuesto desc) to closest seeds
    const sorted = [...municipalities].sort((a, b) => b.budget - a.budget);
    const seeds = sorted.map((m, i) => ({
      ...m,
      x: (allSeeds[i] ?? allSeeds[0])[0],
      y: (allSeeds[i] ?? allSeeds[0])[1],
    }));

    // ── color scale ──────────────────────────────────────────────────────
    const maxBudget = d3.max(municipalities, m => m.budget) || 1;
    const colorScale = d3.scaleSequentialSqrt(d3.interpolate('#0c1830', '#00b89e'))
      .domain([0, maxBudget]);

    // ── clip path = department boundary ──────────────────────────────────
    const clipId = `muni-clip-${normalizeName(deptName).replace(/\s+/g, '-')}`;
    const defs = svg.append('defs');
    defs.append('clipPath').attr('id', clipId)
      .append('path').attr('d', geoPath(deptFeature) ?? '');

    // ── dept fill bg (dark) ───────────────────────────────────────────────
    svg.append('path')
      .datum(deptFeature)
      .attr('d', geoPath as any)
      .attr('fill', '#0c1830')
      .attr('stroke', 'none');

    // ── Voronoi cells ─────────────────────────────────────────────────────
    const delaunay = d3.Delaunay.from(seeds, d => d.x, d => d.y);
    const voronoi  = delaunay.voronoi([bx0 - 2, by0 - 2, bx1 + 2, by1 + 2]);

    const cellsG = svg.append('g').attr('clip-path', `url(#${clipId})`);

    seeds.forEach((muni, i) => {
      const cell = voronoi.renderCell(i);
      if (!cell) return;

      const baseFill   = colorScale(muni.budget);
      const hoverFill  = d3.color(baseFill)?.brighter(0.55)?.formatHex() ?? '#00d4b8';

      cellsG.append('path')
        .attr('d', cell)
        .attr('fill', baseFill)
        .attr('stroke', 'rgba(0,212,184,0.22)')
        .attr('stroke-width', 0.8)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event) {
          d3.select(this)
            .raise()
            .attr('fill', hoverFill)
            .attr('stroke', '#00d4b8')
            .attr('stroke-width', 1.8);
          const [mx, my] = d3.pointer(event, svgRef.current);
          setTooltip({ x: mx, y: my, name: muni.name, budget: muni.budget });
        })
        .on('mousemove', function(event) {
          const [mx, my] = d3.pointer(event, svgRef.current);
          setTooltip(prev => prev ? { ...prev, x: mx, y: my } : null);
        })
        .on('mouseleave', function() {
          d3.select(this)
            .attr('fill', baseFill)
            .attr('stroke', 'rgba(0,212,184,0.22)')
            .attr('stroke-width', 0.8);
          setTooltip(null);
        })
        .on('click', () => onSelectMuni(muni.name));
    });

    // ── department outline on top ─────────────────────────────────────────
    svg.append('path')
      .datum(deptFeature)
      .attr('d', geoPath as any)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(0,212,184,0.75)')
      .attr('stroke-width', 1.6);

    // ── color legend ─────────────────────────────────────────────────────
    const lgW = 90, lgH = 8;
    const lgX = W - lgW - 10, lgY = H - 22;
    const lgDef = defs.append('linearGradient').attr('id', `${clipId}-lg`);
    lgDef.append('stop').attr('offset', '0%').attr('stop-color', '#0c1830');
    lgDef.append('stop').attr('offset', '100%').attr('stop-color', '#00b89e');
    svg.append('rect')
      .attr('x', lgX).attr('y', lgY)
      .attr('width', lgW).attr('height', lgH)
      .attr('rx', 3)
      .attr('fill', `url(#${clipId}-lg)`);
    svg.append('text')
      .attr('x', lgX).attr('y', lgY - 4)
      .attr('fill', '#4a5a73')
      .attr('font-size', 8)
      .attr('font-family', "'IBM Plex Mono', monospace")
      .text('PRESUPUESTO');

  }, [topoData, deptName, municipalities, onSelectMuni, size]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.x + 12, size.w - 180),
          top: Math.max(tooltip.y - 48, 4),
          pointerEvents: 'none',
          background: 'rgba(8,12,24,0.96)',
          border: '1px solid rgba(0,212,184,0.4)',
          borderRadius: 8, padding: '8px 12px',
          fontSize: 12, zIndex: 20, minWidth: 160,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            fontWeight: 600, fontSize: 13, color: '#e8eef6', marginBottom: 4,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            {tooltip.name}
          </div>
          <div style={{ fontSize: 11, color: '#7c8aa3' }}>
            Presupuesto:{' '}
            <span style={{ color: '#00d4b8', fontFamily: "'IBM Plex Mono', monospace" }}>
              {fmtFull.format(tooltip.budget)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Municipality fiscal detail view ──────────────────────────────────────────

function MuniDetailView({
  muniName,
  deptName,
  initialYear,
  onBack,
}: {
  muniName: string;
  deptName: string;
  initialYear: number;
  onBack: () => void;
}) {
  const [muniYear, setMuniYear] = useState(initialYear);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    general: true,
    ingresos_tributarios: false,
    ingresos_no_tributarios: false,
    ingresos_capital: false,
    gastos_funcionamiento: false,
    gastos_capital: false,
    total_egresos: false,
  });

  const { data: fiscal, loading, error } = useMunicipalityDetails(muniName, muniYear, deptName);

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const FiscalSection = ({
    title, color, details, sectionKey, total,
  }: {
    title: string; color: string;
    details: Array<{ label: string; amount: number; percentage?: number; color?: string }>;
    sectionKey: string; total: number;
  }) => {
    const open = expanded[sectionKey];
    return (
      <div style={{
        background: 'rgba(13,21,38,0.74)',
        border: '1px solid rgba(0,212,184,0.14)',
        borderRadius: 10, marginBottom: 8, overflow: 'hidden',
      }}>
        <button
          onClick={() => toggle(sectionKey)}
          style={{
            width: '100%', padding: '12px 20px', background: color,
            color: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontWeight: 700, fontSize: 14,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.06em',
          }}
        >
          <div>
            <div>{title}</div>
            <div style={{ fontSize: 12, fontWeight: 400, marginTop: 2, opacity: 0.9 }}>
              {fmtFull.format(total)}
            </div>
          </div>
          <span style={{ fontSize: 16, opacity: 0.85 }}>{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div style={{ padding: '12px 20px' }}>
            {details.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingBottom: 10, marginBottom: 10,
                  borderBottom: i < details.length - 1
                    ? '1px solid rgba(0,212,184,0.1)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: '#e8eef6', fontWeight: 500 }}>{d.label}</div>
                  {d.percentage !== undefined && d.percentage > 0 && (
                    <div style={{ fontSize: 11, color: '#7c8aa3', marginTop: 2 }}>
                      {d.percentage.toFixed(1)}% del total
                    </div>
                  )}
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13, fontWeight: 700,
                  color: d.color || color, minWidth: 130, textAlign: 'right',
                }}>
                  {fmtFull.format(d.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 24px',
        borderBottom: '1px solid rgba(0,212,184,0.14)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(13,21,38,0.9)',
            border: '1px solid rgba(0,212,184,0.35)',
            borderRadius: 8, color: '#00d4b8', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13, fontWeight: 600, padding: '7px 16px',
            letterSpacing: '0.06em', flexShrink: 0,
          }}
        >
          ← {deptName.toUpperCase()}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#e8eef6', lineHeight: 1.1 }}>
            {muniName}
          </div>
          <div style={{ fontSize: 11, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace", marginTop: 3 }}>
            <span style={{ color: '#5eead4' }}>{deptName}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {DETAIL_YEARS.map(y => (
            <button
              key={y}
              onClick={() => setMuniYear(y)}
              style={{
                background: muniYear === y ? 'rgba(0,212,184,0.18)' : 'transparent',
                border: `1px solid ${muniYear === y ? 'rgba(0,212,184,0.6)' : 'rgba(0,212,184,0.2)'}`,
                borderRadius: 6, color: muniYear === y ? '#00d4b8' : '#7c8aa3',
                cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12, fontWeight: muniYear === y ? 600 : 400,
                padding: '5px 10px', transition: '0.15s',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="simho-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid rgba(0,212,184,0.15)', borderTopColor: '#00d4b8',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}
        {error && !loading && (
          <div style={{
            background: 'rgba(239,90,90,0.1)', border: '1px solid rgba(239,90,90,0.3)',
            borderRadius: 10, padding: '12px 16px', color: '#ef5a5a',
          }}>
            {error}
          </div>
        )}
        {!loading && !error && !fiscal && (
          <div style={{
            background: 'rgba(0,212,184,0.06)', border: '1px solid rgba(0,212,184,0.22)',
            borderRadius: 10, padding: '16px 20px',
          }}>
            <p style={{ color: '#5eead4', fontSize: 14, margin: 0 }}>
              No hay datos disponibles para {muniName} en {muniYear}.
            </p>
          </div>
        )}
        {fiscal && !loading && (
          <>
            <FiscalSection title="INFORMACIÓN GENERAL"               color="#1d6fa4" details={fiscal.general.details}                sectionKey="general"               total={fiscal.general.total} />
            <FiscalSection title="INGRESOS TRIBUTARIOS"              color="#0e7c56" details={fiscal.ingresos_tributarios.details}     sectionKey="ingresos_tributarios"  total={fiscal.ingresos_tributarios.total} />
            <FiscalSection title="INGRESOS NO TRIBUTARIOS"           color="#b07005" details={fiscal.ingresos_no_tributarios.details}  sectionKey="ingresos_no_tributarios" total={fiscal.ingresos_no_tributarios.total} />
            <FiscalSection title="INGRESOS DE CAPITAL"               color="#8b3074" details={fiscal.ingresos_capital.details}         sectionKey="ingresos_capital"      total={fiscal.ingresos_capital.total} />
            <FiscalSection title="GASTOS DE FUNCIONAMIENTO"          color="#b03a3a" details={fiscal.gastos_funcionamiento.details}    sectionKey="gastos_funcionamiento" total={fiscal.gastos_funcionamiento.total} />
            <FiscalSection title="GASTOS DE CAPITAL Y DEUDA PÚBLICA" color="#5b3d99" details={fiscal.gastos_capital.details}           sectionKey="gastos_capital"        total={fiscal.gastos_capital.total} />
            <FiscalSection title="TOTAL EGRESOS"                     color="#374776" details={fiscal.total_egresos.details}            sectionKey="total_egresos"         total={fiscal.total_egresos.total} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Department drill-down panel ───────────────────────────────────────────────
// Layout: header | left = choropleth map | right = KPI cards + list

function DeptDetailPanel({
  deptName, stats, year, onBack, onSelectMuni, topoData,
}: {
  deptName: string;
  stats: DeptStats;
  year: number;
  onBack: () => void;
  onSelectMuni: (name: string) => void;
  topoData: any;
}) {
  const [search, setSearch] = useState('');
  const capital = DEPT_CAPITALS[deptName] || '—';

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...stats.municipalities]
      .sort((a, b) => b.budget - a.budget)
      .filter(m => !q || (m.name || '').toLowerCase().includes(q));
  }, [stats.municipalities, search]);

  const kpis = [
    { label: 'Municipios',     value: String(stats.muniCount),                 color: '#00d4b8' },
    { label: 'Población',      value: fmt.format(stats.population),            color: '#5eead4' },
    { label: 'Presupuesto',    value: `L ${fmt.format(stats.budget)}`,         color: '#00d4b8' },
    { label: 'Ing. Propios',   value: `L ${fmt.format(stats.propios)}`,        color: '#f59e0b' },
    { label: 'Autonomía prom.',value: `${stats.autonomia.toFixed(1)}%`,        color: '#5eead4' },
    { label: 'Transferencias', value: `L ${fmt.format(stats.transferencias)}`, color: '#f59e0b' },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '13px 24px',
        borderBottom: '1px solid rgba(0,212,184,0.14)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(13,21,38,0.9)',
            border: '1px solid rgba(0,212,184,0.35)',
            borderRadius: 8, color: '#00d4b8', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13, fontWeight: 600, padding: '7px 16px',
            letterSpacing: '0.06em', flexShrink: 0,
          }}
        >
          ← NACIONAL
        </button>
        <div>
          <div style={{
            fontSize: 22, fontWeight: 600, color: '#e8eef6',
            letterSpacing: '0.02em', lineHeight: 1.1,
          }}>
            {deptName}
          </div>
          <div style={{
            fontSize: 11, color: '#7c8aa3',
            fontFamily: "'IBM Plex Mono', monospace", marginTop: 3,
          }}>
            Capital: <span style={{ color: '#5eead4' }}>{capital}</span>
            <span style={{ margin: '0 8px', opacity: 0.35 }}>·</span>
            <span>{year}</span>
          </div>
        </div>
      </div>

      {/* Main: left = choropleth map, right = KPIs + list */}
      <div style={{
        display: 'flex', flex: 1, overflow: 'hidden',
        gap: 0,
      }}>
        {/* LEFT: choropleth map */}
        <div style={{
          flex: '0 0 55%',
          borderRight: '1px solid rgba(0,212,184,0.10)',
          padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 10,
          overflow: 'hidden',
        }}>
          <div style={{
            fontSize: 9, color: '#4a5a73',
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.1em', flexShrink: 0,
          }}>
            MAPA MUNICIPAL — clic para ver detalle
          </div>
          <DeptMuniMap
            topoData={topoData}
            deptName={deptName}
            municipalities={stats.municipalities}
            onSelectMuni={onSelectMuni}
          />
        </div>

        {/* RIGHT: KPI cards + searchable list */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', padding: '16px',
          gap: 12,
        }}>
          {/* KPI grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7,
            flexShrink: 0,
          }}>
            {kpis.map(k => (
              <div key={k.label} style={{
                background: 'rgba(13,21,38,0.74)',
                border: '1px solid rgba(0,212,184,0.14)',
                borderRadius: 8, padding: '9px 11px',
              }}>
                <div style={{
                  fontSize: 8, color: '#4a5a73',
                  fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4,
                }}>
                  {k.label}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: k.color,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(0,212,184,0.1)', flexShrink: 0 }} />

          {/* Municipality list label */}
          <div style={{
            fontSize: 9, color: '#4a5a73',
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.1em', flexShrink: 0,
          }}>
            MUNICIPIOS ({stats.muniCount})
          </div>

          {/* Search */}
          <input
            type="text"
            className="simho-search"
            placeholder="Buscar municipio…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flexShrink: 0 }}
          />

          {/* List */}
          <div
            className="simho-scroll"
            style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {filtered.map(m => (
              <div
                key={m.name}
                onClick={() => onSelectMuni(m.name)}
                style={{
                  padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  border: '1px solid transparent', transition: 'background 0.12s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,184,0.07)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,184,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                }}
              >
                <span style={{ fontSize: 13, color: '#e8eef6', fontWeight: 500 }}>{m.name}</span>
                <span style={{
                  fontSize: 11, color: '#7c8aa3',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  L {fmt.format(m.budget)}
                </span>
              </div>
            ))}
            {filtered.length === 0 && search && (
              <div style={{ fontSize: 12, color: '#4a5a73', padding: '12px 6px' }}>
                Sin resultados para "{search}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── National choropleth map ──────────────────────────────────────────────────

export default function MapaInteractivo() {
  const svgRef       = useRef<SVGSVGElement>(null);
  const tooltipRef   = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [topoData,     setTopoData]     = useState<any>(null);
  const [view,         setView]         = useState<MapView>('nation');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedMuni, setSelectedMuni] = useState<string | null>(null);
  const [indicator,    setIndicator]    = useState<Indicator>('budget');
  const [year,         setYear]         = useState<number>(2024);

  const { municipalities, loading } = useMunicipalitiesMultiYear([year]);

  useEffect(() => {
    fetch('/data/honduras-topo.json')
      .then(r => r.json())
      .then(setTopoData)
      .catch(console.error);
  }, []);

  const deptStats = useMemo(() => {
    const map = new Map<string, DeptStats>();
    municipalities.forEach(m => {
      const dept = m.department || 'Sin depto';
      if (!map.has(dept)) {
        map.set(dept, {
          name: dept, budget: 0, propios: 0, autonomia: 0,
          muniCount: 0, population: 0, transferencias: 0, municipalities: [],
        });
      }
      const d = map.get(dept)!;
      d.budget       += m.presupuesto_municipal || 0;
      d.propios      += m.ingresos_propios || 0;
      d.autonomia    += m.autonomia_financiera || 0;
      d.population   += m.population || 0;
      d.transferencias += m.transferencias_art91 || 0;
      d.muniCount    += 1;
      d.municipalities.push({
        name:       m.name || '',
        budget:     m.presupuesto_municipal || 0,
        propios:    m.ingresos_propios || 0,
        autonomia:  m.autonomia_financiera || 0,
        population: m.population || 0,
      });
    });
    map.forEach(d => { if (d.muniCount > 0) d.autonomia /= d.muniCount; });
    return map;
  }, [municipalities]);

  const getValue = useCallback((deptName: string) => {
    const stats = deptStats.get(deptName);
    if (!stats) return 0;
    if (indicator === 'budget')    return stats.budget;
    if (indicator === 'propios')   return stats.propios;
    if (indicator === 'autonomia') return stats.autonomia;
    return 0;
  }, [deptStats, indicator]);

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  useEffect(() => {
    if (!topoData || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const W = containerSize.w || containerRef.current?.clientWidth || 600;
    const H = containerSize.h || containerRef.current?.clientHeight || 480;
    if (W < 100 || H < 100) return;

    svg.attr('width', W).attr('height', H);
    svg.selectAll('*').remove();

    const features = (topojson.feature(topoData, topoData.objects.hnd) as any).features;
    const projection = d3.geoMercator().fitExtent([[24, 24], [W - 24, H - 24]], {
      type: 'FeatureCollection', features,
    });
    const path = d3.geoPath().projection(projection);

    const maxVal = d3.max(features, (f: any) => {
      const name = f.properties?.name || '';
      let best = 0;
      deptStats.forEach((v, k) => {
        if (normalizeName(k) === normalizeName(name)) {
          best = indicator === 'budget' ? v.budget
               : indicator === 'propios' ? v.propios
               : v.autonomia;
        }
      });
      return best;
    }) || 1;

    const colorScale = d3.scaleSequentialSqrt(d3.interpolate('#112035', '#00d4b8'))
      .domain([0, maxVal]);

    const tooltip = d3.select(tooltipRef.current!);

    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'deptGlow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur');
    filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    svg.selectAll<SVGPathElement, any>('.dept')
      .data(features)
      .join('path')
      .attr('class', 'dept')
      .attr('d', path as any)
      .attr('fill', (f: any) => {
        let val = 0;
        const topoName = f.properties?.name || '';
        deptStats.forEach((v, k) => {
          if (normalizeName(k) === normalizeName(topoName)) val = getValue(k);
        });
        return val > 0 ? colorScale(val) : '#142030';
      })
      .attr('stroke', 'rgba(0,212,184,0.3)')
      .attr('stroke-width', 0.8)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, f: any) {
        const topoName = f.properties?.name || '';
        let deptKey = '';
        deptStats.forEach((_, k) => {
          if (normalizeName(k) === normalizeName(topoName)) deptKey = k;
        });
        d3.select(this)
          .attr('stroke', 'rgba(0,212,184,0.9)')
          .attr('stroke-width', 1.8)
          .style('filter', 'url(#deptGlow)');

        const stats = deptStats.get(deptKey);
        const indLabel = INDICATORS.find(i => i.key === indicator)?.label || '';
        const val = stats ? getValue(deptKey) : 0;
        const displayVal = indicator === 'autonomia'
          ? `${val.toFixed(1)}%` : `L ${fmt.format(val)}`;

        tooltip
          .style('display', 'block')
          .style('left', `${event.offsetX + 14}px`)
          .style('top', `${event.offsetY - 10}px`)
          .html(`
            <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:#e8eef6">${topoName}</div>
            <div style="font-size:11px;color:#7c8aa3">${indLabel}: <span style="color:#00d4b8;font-family:'IBM Plex Mono',monospace">${displayVal}</span></div>
            ${stats ? `<div style="font-size:11px;color:#7c8aa3;margin-top:2px">${stats.muniCount} municipios</div>` : ''}
          `);
      })
      .on('mousemove', function(event) {
        tooltip.style('left', `${event.offsetX + 14}px`).style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('stroke', 'rgba(0,212,184,0.3)')
          .attr('stroke-width', 0.8)
          .style('filter', 'none');
        tooltip.style('display', 'none');
      })
      .on('click', (_event, f: any) => {
        const topoName = f.properties?.name || '';
        let deptKey = '';
        deptStats.forEach((_, k) => {
          if (normalizeName(k) === normalizeName(topoName)) deptKey = k;
        });
        if (deptKey) { setSelectedDept(deptKey); setView('dept'); }
      });

  }, [topoData, deptStats, indicator, getValue, containerSize]);

  const selectedDeptStats = selectedDept ? deptStats.get(selectedDept) : null;

  const handleSelectMuni = useCallback((name: string) => {
    setSelectedMuni(name);
    setView('muni');
  }, []);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {view === 'muni' && selectedMuni && selectedDept ? (
        <MuniDetailView
          muniName={selectedMuni}
          deptName={selectedDept}
          initialYear={year <= 2024 ? year : 2024}
          onBack={() => { setSelectedMuni(null); setView('dept'); }}
        />
      ) : view === 'dept' && selectedDept && selectedDeptStats ? (
        <DeptDetailPanel
          deptName={selectedDept}
          stats={selectedDeptStats}
          year={year}
          onBack={() => { setSelectedDept(null); setSelectedMuni(null); setView('nation'); }}
          onSelectMuni={handleSelectMuni}
          topoData={topoData}
        />
      ) : (
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Controls */}
          <div style={{
            position: 'absolute', top: 16, left: 16, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <select
              className="simho-select"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{ width: 90 }}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 4 }}>
              {INDICATORS.map(ind => (
                <button
                  key={ind.key}
                  onClick={() => setIndicator(ind.key)}
                  style={{
                    background: indicator === ind.key ? 'rgba(0,212,184,0.18)' : 'rgba(13,21,38,0.8)',
                    border: `1px solid ${indicator === ind.key ? 'rgba(0,212,184,0.6)' : 'rgba(0,212,184,0.2)'}`,
                    borderRadius: 8, color: indicator === ind.key ? '#00d4b8' : '#aab6c9',
                    cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 12, fontWeight: 500, padding: '6px 12px', transition: '0.15s',
                  }}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div style={{
              position: 'absolute', bottom: 16, left: 16, zIndex: 10,
              background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(0,212,184,0.2)',
              borderRadius: 8, padding: '6px 12px',
              fontSize: 12, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace",
            }}>
              cargando datos…
            </div>
          )}

          <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

          <div ref={tooltipRef} style={{
            display: 'none', position: 'absolute', pointerEvents: 'none',
            background: 'rgba(8,12,24,0.95)', border: '1px solid rgba(0,212,184,0.3)',
            borderRadius: 8, padding: '8px 12px', fontSize: 12, zIndex: 20, minWidth: 140,
          }} />

          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: 20, right: 20, zIndex: 10,
            background: 'rgba(8,12,24,0.88)', border: '1px solid rgba(0,212,184,0.2)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            <div style={{
              fontSize: 10, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.1em', marginBottom: 6,
            }}>
              {INDICATORS.find(i => i.key === indicator)?.label.toUpperCase()}
            </div>
            <div style={{
              width: 120, height: 8, borderRadius: 4,
              background: 'linear-gradient(to right, #112035, #00d4b8)', marginBottom: 4,
            }} />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace",
            }}>
              <span>Menor</span><span>Mayor</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
