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

const fmt = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 1 });
const fmtFull = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', maximumFractionDigits: 0 });

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

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
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  const { municipalities, loading } = useMunicipalitiesMultiYear([year]);

  // Load TopoJSON once
  useEffect(() => {
    fetch('/data/honduras-topo.json')
      .then(r => r.json())
      .then(setTopoData)
      .catch(console.error);
  }, []);

  // Aggregate data per department
  const deptStats = useMemo(() => {
    const map = new Map<string, {
      name: string;
      budget: number;
      propios: number;
      autonomia: number;
      muniCount: number;
      municipalities: { name: string; budget: number; propios: number; autonomia: number }[];
    }>();

    municipalities.forEach(m => {
      const dept = m.department || 'Sin depto';
      if (!map.has(dept)) {
        map.set(dept, { name: dept, budget: 0, propios: 0, autonomia: 0, muniCount: 0, municipalities: [] });
      }
      const d = map.get(dept)!;
      d.budget += m.presupuesto_municipal || 0;
      d.propios += m.ingresos_propios || 0;
      d.autonomia += m.autonomia_financiera || 0;
      d.muniCount += 1;
      d.municipalities.push({
        name: m.name || '',
        budget: m.presupuesto_municipal || 0,
        propios: m.ingresos_propios || 0,
        autonomia: m.autonomia_financiera || 0,
      });
    });

    // Average autonomia
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

  // Draw map — triggered by topoData, data, indicator, AND container size
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
  }, []);

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
      type: 'FeatureCollection',
      features,
    });
    const path = d3.geoPath().projection(projection);

    // Max value for color scale
    const maxVal = d3.max(features, (f: any) => {
      const name = f.properties?.name || '';
      // find dept by normalized name
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

    // SVG defs — glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'deptGlow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur');
    filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    // Draw departments
    svg.selectAll<SVGPathElement, any>('.dept')
      .data(features)
      .join('path')
      .attr('class', 'dept')
      .attr('d', path as any)
      .attr('fill', (f: any) => {
        let val = 0;
        const topoName = f.properties?.name || '';
        deptStats.forEach((v, k) => {
          if (normalizeName(k) === normalizeName(topoName)) {
            val = getValue(k);
          }
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
        setHoveredDept(deptKey);

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
        setHoveredDept(null);
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
    <div style={{ display: 'flex', height: '100%', gap: 0, overflow: 'hidden' }}>

      {/* MAP AREA */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Top controls */}
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {/* Year selector */}
          <select
            className="simho-select"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ width: 90 }}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Indicator pills */}
          <div style={{ display: 'flex', gap: 4 }}>
            {INDICATORS.map(ind => (
              <button
                key={ind.key}
                onClick={() => setIndicator(ind.key)}
                style={{
                  background: indicator === ind.key ? 'rgba(0,212,184,0.18)' : 'rgba(13,21,38,0.8)',
                  border: `1px solid ${indicator === ind.key ? 'rgba(0,212,184,0.6)' : 'rgba(0,212,184,0.2)'}`,
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

        {/* Back button when in dept view */}
        {view === 'dept' && (
          <button
            onClick={() => { setView('nation'); setSelectedDept(null); }}
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              background: 'rgba(13,21,38,0.9)',
              border: '1px solid rgba(0,212,184,0.35)',
              borderRadius: 8,
              color: '#00d4b8',
              cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              padding: '7px 14px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ← Nacional
          </button>
        )}

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
            position: 'absolute',
            pointerEvents: 'none',
            background: 'rgba(8,12,24,0.95)',
            border: '1px solid rgba(0,212,184,0.3)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            zIndex: 20,
            minWidth: 140,
          }}
        />
      </div>

      {/* RIGHT PANEL — dept detail */}
      {view === 'dept' && selectedDeptStats && (
        <div
          className="simho-scroll simho-view-in"
          style={{
            width: 280,
            flexShrink: 0,
            borderLeft: '1px solid rgba(0,212,184,0.14)',
            background: 'rgba(11,17,32,0.96)',
            padding: '20px 16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em', marginBottom: 4 }}>DEPARTAMENTO</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{selectedDept}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedDeptStats.muniCount} municipios · {year}</div>
          </div>

          {/* KPI chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Presupuesto total', value: fmtFull.format(selectedDeptStats.budget) },
              { label: 'Ingresos propios', value: fmtFull.format(selectedDeptStats.propios) },
              { label: 'Autonomía prom.', value: `${selectedDeptStats.autonomia.toFixed(1)}%` },
            ].map(kpi => (
              <div key={kpi.label} className="simho-card" style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{kpi.label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--teal)', fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Municipalities list */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em', padding: '8px 0 5px' }}>MUNICIPIOS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[...selectedDeptStats.municipalities]
                .sort((a, b) => b.budget - a.budget)
                .map(m => (
                  <div
                    key={m.name}
                    onClick={() => setNav('muniDetail')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.15s',
                      border: '1px solid transparent',
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
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{m.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace" }}>
                      L {fmt.format(m.budget)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* LEGEND */}
      {view === 'nation' && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 10,
          background: 'rgba(8,12,24,0.88)',
          border: '1px solid rgba(0,212,184,0.2)',
          borderRadius: 8,
          padding: '10px 14px',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em', marginBottom: 6 }}>
            {INDICATORS.find(i => i.key === indicator)?.label.toUpperCase()}
          </div>
          <div style={{
            width: 120,
            height: 8,
            borderRadius: 4,
            background: 'linear-gradient(to right, #112035, #00d4b8)',
            marginBottom: 4,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace" }}>
            <span>Menor</span>
            <span>Mayor</span>
          </div>
        </div>
      )}
    </div>
  );
}
