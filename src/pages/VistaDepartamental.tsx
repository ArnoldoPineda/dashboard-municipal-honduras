import React, {
  useEffect, useRef, useState, useMemo,
} from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useParams, useNavigate } from 'react-router-dom';
import { getDepartamento } from '../data/municipios';
import { useNavbar } from '../context/NavbarContext';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';

// ── Formatters ───────────────────────────────────────────────────────────────

const fmt     = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 1 });
const fmtFull = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', maximumFractionDigits: 0 });

function normalizeName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// ── Category helpers ─────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  A: '#2dd4bf',
  B: '#3a9bd6',
  C: '#f59e0b',
  D: '#64748b',
};

function categoryOf(budget: number): string {
  if (budget > 500_000_000) return 'A';
  if (budget > 150_000_000) return 'B';
  if (budget >  50_000_000) return 'C';
  return 'D';
}

// ── Voronoi choropleth map ────────────────────────────────────────────────────

interface MuniStat {
  id:     string;
  name:   string;
  budget: number;
}

interface TooltipState { x: number; y: number; name: string; budget: number }

function DeptMuniMap({
  topoData, deptName, municipalities, onSelectMuni, indicator,
}: {
  topoData: any;
  deptName: string;
  municipalities: MuniStat[];
  onSelectMuni: (id: string) => void;
  indicator: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef  = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [size, setSize]       = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0) setSize({ w: width, h: height || Math.round(width * 0.65) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!topoData || !svgRef.current || municipalities.length === 0 || size.w === 0) return;

    const W = size.w;
    const H = size.h || Math.round(W * 0.65);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', W).attr('height', H);

    const features = (topojson.feature(topoData, topoData.objects.hnd) as any).features;
    const deptFeature = features.find((f: any) =>
      normalizeName(f.properties?.name || '') === normalizeName(deptName)
    );
    if (!deptFeature) return;

    const PAD = 18;
    const projection = d3.geoMercator().fitExtent([[PAD, PAD], [W - PAD, H - PAD]], {
      type: 'FeatureCollection', features: [deptFeature],
    });
    const geoPath = d3.geoPath().projection(projection);

    const [[bx0, by0], [bx1, by1]] = geoPath.bounds(deptFeature);
    const bW = bx1 - bx0, bH = by1 - by0;

    const n       = municipalities.length;
    const area    = bW * bH;
    const spacing = Math.sqrt(area / n) * 0.9;
    const hH      = spacing * 0.866;

    const allSeeds: [number, number][] = [];
    let row = 0;
    while (by0 + row * hH < by1 + hH) {
      let col = 0;
      while (bx0 + col * spacing + (row % 2) * spacing * 0.5 < bx1 + spacing) {
        allSeeds.push([bx0 + col * spacing + (row % 2) * spacing * 0.5, by0 + row * hH]);
        col++;
      }
      row++;
    }

    const [cx, cy] = geoPath.centroid(deptFeature);
    allSeeds.sort((a, b) =>
      Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy)
    );

    const sorted = [...municipalities].sort((a, b) => b.budget - a.budget);
    const seeds  = sorted.map((m, i) => ({
      ...m,
      x: (allSeeds[i] ?? allSeeds[0])[0],
      y: (allSeeds[i] ?? allSeeds[0])[1],
    }));

    const maxBudget = d3.max(municipalities, (m) => m.budget) || 1;
    const colorScale = d3.scaleSequentialSqrt(d3.interpolate('#0c1830', '#00b89e'))
      .domain([0, maxBudget]);

    const clipId = `muni-clip-${normalizeName(deptName).replace(/\s+/g, '-')}`;
    const defs   = svg.append('defs');
    defs.append('clipPath').attr('id', clipId)
      .append('path').attr('d', geoPath(deptFeature) ?? '');

    svg.append('path').datum(deptFeature)
      .attr('d', geoPath as any).attr('fill', '#0c1830').attr('stroke', 'none');

    const delaunay = d3.Delaunay.from(seeds, (d) => d.x, (d) => d.y);
    const voronoi  = delaunay.voronoi([bx0 - 2, by0 - 2, bx1 + 2, by1 + 2]);

    const cellsG = svg.append('g').attr('clip-path', `url(#${clipId})`);

    seeds.forEach((muni, i) => {
      const cell = voronoi.renderCell(i);
      if (!cell) return;

      let baseFill: string;
      let hoverFill: string;
      if (indicator === 'categorias') {
        const cat  = categoryOf(muni.budget);
        baseFill   = d3.color(CAT_COLORS[cat])!.darker(0.35).formatHex();
        hoverFill  = CAT_COLORS[cat];
      } else {
        baseFill   = colorScale(muni.budget);
        hoverFill  = d3.color(baseFill)?.brighter(0.55)?.formatHex() ?? '#00d4b8';
      }

      cellsG.append('path')
        .attr('d', cell)
        .attr('fill', baseFill)
        .attr('stroke', 'rgba(0,212,184,0.22)')
        .attr('stroke-width', 0.8)
        .style('cursor', 'pointer')
        .on('mouseenter', function (event) {
          d3.select(this).raise()
            .attr('fill', hoverFill)
            .attr('stroke', '#00d4b8')
            .attr('stroke-width', 1.8);
          const [mx, my] = d3.pointer(event, svgRef.current);
          setTooltip({ x: mx, y: my, name: muni.name, budget: muni.budget });
        })
        .on('mousemove', function (event) {
          const [mx, my] = d3.pointer(event, svgRef.current);
          setTooltip((prev) => prev ? { ...prev, x: mx, y: my } : null);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('fill', baseFill).attr('stroke', 'rgba(0,212,184,0.22)').attr('stroke-width', 0.8);
          setTooltip(null);
        })
        .on('click', () => onSelectMuni(muni.id));
    });

    svg.append('path').datum(deptFeature)
      .attr('d', geoPath as any).attr('fill', 'none')
      .attr('stroke', 'rgba(0,212,184,0.75)').attr('stroke-width', 1.6);

    if (indicator !== 'categorias') {
      // Gradient legend
      const lgW = 90, lgH = 8, lgX = W - lgW - 10, lgY = H - 22;
      const lgDef = defs.append('linearGradient').attr('id', `${clipId}-lg`);
      lgDef.append('stop').attr('offset', '0%').attr('stop-color', '#0c1830');
      lgDef.append('stop').attr('offset', '100%').attr('stop-color', '#00b89e');
      svg.append('rect').attr('x', lgX).attr('y', lgY).attr('width', lgW).attr('height', lgH).attr('rx', 3).attr('fill', `url(#${clipId}-lg)`);
      svg.append('text').attr('x', lgX).attr('y', lgY - 4).attr('fill', '#4a5a73').attr('font-size', 8).attr('font-family', "'IBM Plex Mono', monospace").text('PRESUPUESTO');
    }

  }, [topoData, deptName, municipalities, onSelectMuni, indicator, size]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
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
          <div style={{ fontWeight: 600, fontSize: 13, color: '#e8eef6', marginBottom: 4 }}>
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

// ── VistaDepartamental ────────────────────────────────────────────────────────

function muniYearBudget(m: any, year: number): number {
  const evo = (m.evolucion || []).find((e: any) => e.year === year);
  return evo?.presupuesto ?? m.presupuesto;
}

export default function VistaDepartamental() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fiscalYear, indicator } = useNavbar();
  const [topoData, setTopoData] = useState<any>(null);
  const [search,   setSearch]   = useState('');

  const dept  = useMemo(() => getDepartamento(id || ''), [id]);
  const munis = useMemo(() => dept?.municipios || [], [dept]);

  // Year-specific budget per municipality
  const munisWithYearBudget = useMemo(() =>
    munis.map((m: any) => {
      const yp    = muniYearBudget(m, fiscalYear);
      const ratio = m.presupuesto > 0 ? yp / m.presupuesto : 1;
      return { ...m, yearPresupuesto: yp, yearIngresosPropios: Math.round(m.ingresosPropios * ratio), yearTransferencia: Math.round(m.transferencia * ratio) };
    }),
    [munis, fiscalYear]
  );

  // Department aggregates for selected year
  const deptYear = useMemo(() => {
    const pres  = munisWithYearBudget.reduce((s: number, m: any) => s + m.yearPresupuesto, 0);
    const ing   = munisWithYearBudget.reduce((s: number, m: any) => s + m.yearIngresosPropios, 0);
    const trans = munisWithYearBudget.reduce((s: number, m: any) => s + m.yearTransferencia, 0);
    return { presupuesto: pres, ingresosPropios: ing, transferencia: trans };
  }, [munisWithYearBudget]);

  // Autonomía Financiera = ingresos_propios / ingresos_recaudados × 100 (Supabase).
  // Fórmula estándar del proyecto — misma que afSEFIN en MunicipioDETALLE.tsx.
  const { municipalities: sbMunicipalities } = useMunicipalitiesMultiYear([fiscalYear]);
  const autonomiaSb: number | null = useMemo(() => {
    if (!dept) return null;
    const key = normalizeName(dept.nombre);
    let propios = 0, recaudados = 0, found = false;
    sbMunicipalities.forEach((m) => {
      if (normalizeName(m.department || '') === key) {
        propios    += m.ingresos_propios    ?? 0;
        recaudados += m.ingresos_recaudados ?? 0;
        found = true;
      }
    });
    if (!found) return null; // sin filas de Supabase para este año (2019/2020)
    return recaudados > 0 ? (propios / recaudados) * 100 : 0;
  }, [sbMunicipalities, dept]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...munisWithYearBudget]
      .sort((a: any, b: any) => b.yearPresupuesto - a.yearPresupuesto)
      .filter((m: any) => !q || m.nombre.toLowerCase().includes(q));
  }, [munisWithYearBudget, search]);

  const mapMunis: MuniStat[] = useMemo(() =>
    munisWithYearBudget.map((m: any) => ({ id: m.id, name: m.nombre, budget: m.yearPresupuesto })),
    [munisWithYearBudget]
  );

  useEffect(() => {
    fetch('/data/honduras-topo.json').then((r) => r.json()).then(setTopoData).catch(console.error);
  }, []);

  if (!dept) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace" }}>
        Departamento no encontrado.{' '}
        <span style={{ color: '#00d4b8', cursor: 'pointer', marginLeft: 8 }} onClick={() => navigate('/')}>← Volver al mapa</span>
      </div>
    );
  }

  const kpis = [
    { label: 'MUNICIPIOS',     value: String(dept.muniCount),                         color: '#00d4b8' },
    { label: 'POBLACIÓN',      value: fmt.format(dept.poblacion) + ' hab.',           color: '#5eead4' },
    { label: 'PRESUPUESTO',    value: `L ${fmt.format(deptYear.presupuesto)}`,        color: '#f59e0b' },
    { label: 'ING. PROPIOS',   value: `L ${fmt.format(deptYear.ingresosPropios)}`,    color: '#f59e0b' },
    { label: 'AUTONOMÍA PROM.', value: autonomiaSb !== null ? `${autonomiaSb.toFixed(1)}%` : '—', color: '#5eead4' },
    { label: 'TRANSFERENCIAS', value: `L ${fmt.format(deptYear.transferencia)}`,      color: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '13px 24px',
        borderBottom: '1px solid rgba(0,212,184,0.14)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate('/')}
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
          <div style={{ fontSize: 22, fontWeight: 600, color: '#e8eef6', letterSpacing: '0.02em', lineHeight: 1.1 }}>
            {dept.nombre}
          </div>
          <div style={{ fontSize: 11, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace", marginTop: 3 }}>
            Capital: <span style={{ color: '#5eead4' }}>{dept.capital}</span>
            <span style={{ margin: '0 8px', opacity: 0.35 }}>·</span>
            <span>{dept.muniCount} municipios</span>
          </div>
        </div>
      </div>

      {/* Main: left = choropleth, right = KPIs + list */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT: Voronoi choropleth */}
        <div style={{
          flex: '0 0 60%', borderRight: '1px solid rgba(0,212,184,0.10)',
          padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden',
        }}>
          <div style={{ fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em', flexShrink: 0 }}>
            MAPA MUNICIPAL — clic para ver detalle
          </div>
          <div style={{ flex: 1, minHeight: 500, width: '100%', height: '100%', position: 'relative' }}>
            <DeptMuniMap
              topoData={topoData}
              deptName={dept.topoNombre}
              municipalities={mapMunis}
              onSelectMuni={(muniId) => navigate(`/municipio/${muniId}`)}
              indicator={indicator}
            />
          </div>
        </div>

        {/* RIGHT: KPI cards + searchable list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16, gap: 12 }}>
          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
            {kpis.map((k) => (
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
                <div style={{ fontSize: 13, fontWeight: 600, color: k.color, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: 'rgba(0,212,184,0.1)', flexShrink: 0 }} />

          <div style={{ fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em', flexShrink: 0 }}>
            MUNICIPIOS ({dept.muniCount})
          </div>

          <input
            type="text"
            className="simho-search"
            placeholder="Buscar municipio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flexShrink: 0 }}
          />

          <div className="simho-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map((m) => {
              const cat = categoryOf(m.yearPresupuesto ?? m.presupuesto ?? 0);
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/municipio/${m.id}`)}
                  style={{
                    padding: '10px 10px', borderRadius: 7, cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: '1px solid transparent', transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,184,0.07)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,184,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, color: '#e8eef6', fontWeight: 500 }}>{m.nombre}</span>
                    {m.isCapital && (
                      <span style={{
                        fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em',
                        color: '#f59e0b', background: 'rgba(245,158,11,0.12)',
                        border: '1px solid rgba(245,158,11,0.3)', borderRadius: 3, padding: '1px 5px',
                      }}>
                        CAPITAL
                      </span>
                    )}
                    {indicator === 'categorias' && (
                      <span style={{
                        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                        color: CAT_COLORS[cat], background: CAT_COLORS[cat] + '18',
                        border: `1px solid ${CAT_COLORS[cat]}30`, borderRadius: 3, padding: '1px 5px',
                      }}>
                        CAT {cat}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 15, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace" }}>
                    L {fmt.format(m.yearPresupuesto ?? m.presupuesto)}
                  </span>
                </div>
              );
            })}
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
