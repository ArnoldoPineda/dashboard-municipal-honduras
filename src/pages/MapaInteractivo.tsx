import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useSimho } from '../context/SimhoContext';

type MapView = 'nation' | 'dept';
type Indicator = 'budget' | 'propios' | 'autonomia';

const INDICATORS: { key: Indicator; label: string }[] = [
  { key: 'budget',    label: 'Presupuesto' },
  { key: 'propios',   label: 'Ing. Propios' },
  { key: 'autonomia', label: 'Autonomía %' },
];

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024];

const DEPT_CAPITALS: Record<string, string> = {
  'Atlántida':         'La Ceiba',
  'Colón':             'Trujillo',
  'Comayagua':         'Comayagua',
  'Copán':             'Santa Rosa de Copán',
  'Cortés':            'San Pedro Ula',
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

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

type DeptStats = {
  name: string;
  budget: number;
  propios: number;
  autonomia: number;
  muniCount: number;
  population: number;
  transferencias: number;
  municipalities: {
    name: string;
    budget: number;
    propios: number;
    autonomia: number;
    population: number;
  }[];
};

// ── Mini map component ───────────────────────────────────────────────────────

function MiniMap({ topoData, selectedDept }: { topoData: any; selectedDept: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!topoData || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const W = 270, H = 190;
    svg.attr('width', W).attr('height', H);

    const features = (topojson.feature(topoData, topoData.objects.hnd) as any).features;
    const projection = d3.geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], {
      type: 'FeatureCollection', features,
    });
    const path = d3.geoPath().projection(projection);

    svg.selectAll('path')
      .data(features)
      .join('path')
      .attr('d', path as any)
      .attr('fill', (f: any) => {
        const n = f.properties?.name || '';
        return normalizeName(n) === normalizeName(selectedDept)
          ? 'rgba(0,212,184,0.3)'
          : 'rgba(13,21,38,0.85)';
      })
      .attr('stroke', (f: any) => {
        const n = f.properties?.name || '';
        return normalizeName(n) === normalizeName(selectedDept)
          ? '#00d4b8'
          : 'rgba(0,212,184,0.18)';
      })
      .attr('stroke-width', (f: any) => {
        const n = f.properties?.name || '';
        return normalizeName(n) === normalizeName(selectedDept) ? 2 : 0.6;
      });
  }, [topoData, selectedDept]);

  return <svg ref={svgRef} style={{ display: 'block' }} />;
}

// ── Department drill-down panel ──────────────────────────────────────────────

function DeptDetailPanel({
  deptName, stats, year, onBack, onSelectMuni, topoData,
}: {
  deptName: string;
  stats: DeptStats;
  year: number;
  onBack: () => void;
  onSelectMuni: () => void;
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
    { label: 'Municipios',      value: String(stats.muniCount),                    color: '#00d4b8' },
    { label: 'Población',       value: fmt.format(stats.population),               color: '#5eead4' },
    { label: 'Presupuesto',     value: `L ${fmt.format(stats.budget)}`,            color: '#00d4b8' },
    { label: 'Ing. Propios',    value: `L ${fmt.format(stats.propios)}`,           color: '#f59e0b' },
    { label: 'Autonomía prom.', value: `${stats.autonomia.toFixed(1)}%`,           color: '#5eead4' },
    { label: 'Transferencias',  value: `L ${fmt.format(stats.transferencias)}`,    color: '#f59e0b' },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 24px',
        borderBottom: '1px solid rgba(0,212,184,0.14)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(13,21,38,0.9)',
            border: '1px solid rgba(0,212,184,0.35)',
            borderRadius: 8,
            color: '#00d4b8',
            cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            padding: '7px 16px',
            letterSpacing: '0.06em',
            flexShrink: 0,
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

      {/* KPI row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8,
        padding: '12px 24px',
        borderBottom: '1px solid rgba(0,212,184,0.10)',
        flexShrink: 0,
      }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: 'rgba(13,21,38,0.74)',
            border: '1px solid rgba(0,212,184,0.14)',
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{
              fontSize: 9, color: '#4a5a73',
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5,
            }}>
              {k.label}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 600, color: k.color,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Body: mini map + municipality list */}
      <div style={{
        display: 'flex', flex: 1, overflow: 'hidden',
        padding: '18px 24px', gap: 20,
      }}>
        {/* Mini map */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            fontSize: 9, color: '#4a5a73',
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.1em',
          }}>
            LOCALIZACIÓN
          </div>
          <div style={{
            background: 'rgba(13,21,38,0.74)',
            border: '1px solid rgba(0,212,184,0.14)',
            borderRadius: 10, padding: 8, overflow: 'hidden',
          }}>
            <MiniMap topoData={topoData} selectedDept={deptName} />
          </div>
        </div>

        {/* Municipality list */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          gap: 8, overflow: 'hidden', minWidth: 0,
        }}>
          <div style={{
            fontSize: 9, color: '#4a5a73',
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.1em', flexShrink: 0,
          }}>
            MUNICIPIOS ({stats.muniCount})
          </div>
          <input
            type="text"
            className="simho-search"
            placeholder="Buscar municipio…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flexShrink: 0 }}
          />
          <div
            className="simho-scroll"
            style={{
              flex: 1, overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 3,
            }}
          >
            {filtered.map(m => (
              <div
                key={m.name}
                onClick={onSelectMuni}
                style={{
                  padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
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

// ── MapaInteractivo ──────────────────────────────────────────────────────────

export default function MapaInteractivo() {
  const { setNav } = useSimho();
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [topoData, setTopoData] = useState<any>(null);
  const [view, setView] = useState<MapView>('nation');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<Indicator>('budget');
  const [year, setYear] = useState<number>(2024);

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

  // Re-attach ResizeObserver when view changes (container mounts/unmounts)
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
          if (indicator === 'budget')    best = v.budget;
          if (indicator === 'propios')   best = v.propios;
          if (indicator === 'autonomia') best = v.autonomia;
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
      .style('transition', 'filter 0.15s')
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
          ? `${val.toFixed(1)}%`
          : `L ${fmt.format(val)}`;

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
        tooltip
          .style('left', `${event.offsetX + 14}px`)
          .style('top', `${event.offsetY - 10}px`);
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
        if (deptKey) {
          setSelectedDept(deptKey);
          setView('dept');
        }
      });

  }, [topoData, deptStats, indicator, getValue, containerSize]);

  const selectedDeptStats = selectedDept ? deptStats.get(selectedDept) : null;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {view === 'dept' && selectedDept && selectedDeptStats ? (
        <DeptDetailPanel
          deptName={selectedDept}
          stats={selectedDeptStats}
          year={year}
          onBack={() => { setView('nation'); setSelectedDept(null); }}
          onSelectMuni={() => setNav('muniDetail')}
          topoData={topoData}
        />
      ) : (
        <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Top controls */}
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
                    background: indicator === ind.key
                      ? 'rgba(0,212,184,0.18)'
                      : 'rgba(13,21,38,0.8)',
                    border: `1px solid ${indicator === ind.key
                      ? 'rgba(0,212,184,0.6)'
                      : 'rgba(0,212,184,0.2)'}`,
                    borderRadius: 8,
                    color: indicator === ind.key ? '#00d4b8' : '#aab6c9',
                    cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '6px 12px',
                    transition: '0.15s',
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
              background: 'rgba(13,21,38,0.8)',
              border: '1px solid rgba(0,212,184,0.2)',
              borderRadius: 8, padding: '6px 12px',
              fontSize: 12, color: '#7c8aa3',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              cargando datos…
            </div>
          )}

          <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

          {/* Tooltip */}
          <div
            ref={tooltipRef}
            style={{
              display: 'none',
              position: 'absolute', pointerEvents: 'none',
              background: 'rgba(8,12,24,0.95)',
              border: '1px solid rgba(0,212,184,0.3)',
              borderRadius: 8, padding: '8px 12px',
              fontSize: 12, zIndex: 20, minWidth: 140,
            }}
          />

          {/* Legend */}
          <div style={{
            position: 'absolute', bottom: 20, right: 20, zIndex: 10,
            background: 'rgba(8,12,24,0.88)',
            border: '1px solid rgba(0,212,184,0.2)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            <div style={{
              fontSize: 10, color: '#4a5a73',
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.1em', marginBottom: 6,
            }}>
              {INDICATORS.find(i => i.key === indicator)?.label.toUpperCase()}
            </div>
            <div style={{
              width: 120, height: 8, borderRadius: 4,
              background: 'linear-gradient(to right, #112035, #00d4b8)',
              marginBottom: 4,
            }} />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 10, color: '#7c8aa3',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              <span>Menor</span><span>Mayor</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
