import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useNavigate } from 'react-router-dom';
import { useNavbar } from '../context/NavbarContext';
import { getDeptStatsMap, deptNameToId, getDepartamento } from '../data/municipios';

// ── Formatters ───────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 1 });

function normalizeName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// ── Main component ───────────────────────────────────────────────────────────

export default function MapaInteractivo() {
  const svgRef       = useRef<SVGSVGElement>(null);
  const tooltipRef   = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate     = useNavigate();

  const { indicator, fiscalYear } = useNavbar();

  const [topoData,      setTopoData]      = useState<any>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const deptStats = useMemo(() => getDeptStatsMap(), []);

  const totals = { munis: 298, pop: 9145000, budget: 65600000000 };

  useEffect(() => {
    fetch('/data/honduras-topo.json')
      .then((r) => r.json())
      .then(setTopoData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getValue = useCallback((deptName: string) => {
    const stats = deptStats.get(deptName);
    if (!stats) return 0;
    if (indicator === 'presupuesto') return stats.budget;
    if (indicator === 'poblacion')   return stats.population;
    if (indicator === 'autonomia')   return stats.autonomia;
    return 0;
  }, [deptStats, indicator]);

  useEffect(() => {
    if (!topoData || !svgRef.current) return;
    const W = containerSize.w || containerRef.current?.clientWidth || 600;
    const H = containerSize.h || containerRef.current?.clientHeight || 480;
    if (W < 100 || H < 100) return;

    const svg = d3.select(svgRef.current);
    svg.attr('width', W).attr('height', H);
    svg.selectAll('*').remove();

    const features = (topojson.feature(topoData, topoData.objects.hnd) as any).features;
    const projection = d3.geoMercator().fitExtent([[24, 24], [W - 24, H - 24]], {
      type: 'FeatureCollection', features,
    });
    const path = d3.geoPath().projection(projection);

    const maxVal = d3.max(features, (f: any) => {
      const topoName = f.properties?.name || '';
      let best = 0;
      deptStats.forEach((v: any, k: string) => {
        if (normalizeName(k) === normalizeName(topoName)) {
          best = indicator === 'presupuesto' ? v.budget
               : indicator === 'poblacion'   ? v.population
               : v.autonomia;
        }
      });
      return best;
    }) || 1;

    const colorScale = d3.scaleSequentialSqrt(d3.interpolate('#112035', '#00d4b8'))
      .domain([0, maxVal]);

    const defs = svg.append('defs');
    const glowFilter = defs.append('filter').attr('id', 'deptGlow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur');
    glowFilter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    const tooltip = d3.select(tooltipRef.current!);

    svg.selectAll<SVGPathElement, any>('.dept')
      .data(features)
      .join('path')
      .attr('class', 'dept')
      .attr('d', path as any)
      .attr('fill', (f: any) => {
        const topoName = f.properties?.name || '';
        let val = 0;
        deptStats.forEach((v: any, k: string) => {
          if (normalizeName(k) === normalizeName(topoName)) val = getValue(k);
        });
        return val > 0 ? colorScale(val) : '#142030';
      })
      .attr('stroke', 'rgba(0,212,184,0.3)')
      .attr('stroke-width', 0.8)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, f: any) {
        const topoName = f.properties?.name || '';
        let deptKey = '';
        deptStats.forEach((_: any, k: string) => {
          if (normalizeName(k) === normalizeName(topoName)) deptKey = k;
        });
        d3.select(this)
          .attr('stroke', 'rgba(0,212,184,0.9)')
          .attr('stroke-width', 1.8)
          .style('filter', 'url(#deptGlow)');

        const stats    = deptStats.get(deptKey);
        const deptId   = deptNameToId(topoName);
        const deptData = deptId ? getDepartamento(deptId) : null;
        const capital  = deptData?.capital || '';
        const budget   = stats?.budget || 0;

        tooltip
          .style('display', 'block')
          .style('left', `${event.offsetX + 14}px`)
          .style('top',  `${event.offsetY - 10}px`)
          .html(`
            <div style="font-weight:700;font-size:16px;color:#e8eef6;margin-bottom:6px;
                        font-family:'Barlow Condensed',sans-serif;letter-spacing:0.01em">
              ${topoName}
            </div>
            <div style="font-size:14px;color:#2dd4bf;font-family:'IBM Plex Mono',monospace;margin-bottom:4px">
              L ${fmt.format(budget)}
            </div>
            <div style="font-size:12px;color:#7c8aa3;font-family:'IBM Plex Mono',monospace">
              ${stats?.muniCount ?? 0} municipios${capital ? ` · cap. ${capital}` : ''}
            </div>
          `);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.offsetX + 14}px`)
          .style('top',  `${event.offsetY - 10}px`);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .attr('stroke', 'rgba(0,212,184,0.3)')
          .attr('stroke-width', 0.8)
          .style('filter', 'none');
        tooltip.style('display', 'none');
      })
      .on('click', (_event, f: any) => {
        const topoName = f.properties?.name || '';
        const deptId   = deptNameToId(topoName);
        if (deptId) navigate(`/departamento/${deptId}`);
      });

    // Department name labels (rendered on top of paths)
    svg.selectAll<SVGTextElement, any>('.dept-label')
      .data(features)
      .join('text')
      .attr('class', 'dept-label')
      .attr('transform', (f: any) => {
        const [cx, cy] = path.centroid(f);
        return `translate(${cx},${cy})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '9')
      .attr('font-family', "'IBM Plex Mono', monospace")
      .attr('letter-spacing', '0.06em')
      .attr('pointer-events', 'none')
      .text((f: any) => (f.properties?.name || '').toUpperCase());

  }, [topoData, deptStats, indicator, getValue, containerSize, navigate]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Map area ── */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Header — top-left overlay */}
        <div style={{
          position: 'absolute', top: 20, left: 24, zIndex: 10, pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 10, color: '#2dd4bf',
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6,
          }}>
            República de Honduras
          </div>
          <div style={{
            fontSize: 48, fontWeight: 700, color: '#e8eef6', lineHeight: 1.05,
            fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.01em',
            marginBottom: 8,
          }}>
            Atlas Municipal Nacional
          </div>
          <div style={{
            fontSize: 14, color: '#7c8aa3', maxWidth: 460, lineHeight: 1.5,
          }}>
            Coropleta por presupuesto 2024. Seleccione un departamento para explorar sus municipios.
          </div>
        </div>

        {/* Legend — top-right */}
        <div style={{
          position: 'absolute', top: 20, right: 24, zIndex: 10,
          background: 'rgba(8,12,24,0.85)', border: '1px solid rgba(0,212,184,0.18)',
          borderRadius: 8, padding: '12px 16px', minWidth: 190,
        }}>
          <div style={{
            fontSize: 10, color: '#7c8aa3',
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            presupuesto {fiscalYear}
          </div>
          <div style={{
            height: 8, borderRadius: 4,
            background: 'linear-gradient(to right, #5eead4, #134e4a)',
            marginBottom: 6,
          }} />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10, color: '#9ca3af',
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            <span>L 575 M</span>
            <span>L 12.7 mil M</span>
          </div>
        </div>

        <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

        {/* Tooltip */}
        <div ref={tooltipRef} style={{
          display: 'none', position: 'absolute', pointerEvents: 'none',
          background: 'rgba(8,12,24,0.96)', border: '1px solid rgba(0,212,184,0.35)',
          borderRadius: 10, padding: '12px 16px', zIndex: 20, minWidth: 200,
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }} />

        {/* Footer — bottom-left */}
        <div style={{
          position: 'absolute', bottom: 12, left: 16, zIndex: 10,
          fontFamily: "'IBM Plex Mono', monospace", pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 10, color: '#4a5a73', letterSpacing: '0.06em' }}>
            FUENTE: AMHON / SEFIN / INE
          </div>
          <div style={{ fontSize: 10, color: '#4a5a73', letterSpacing: '0.06em', marginTop: 2 }}>
            EJERCICIO FISCAL {fiscalYear}
          </div>
        </div>
      </div>

      {/* ── Bottom KPI strip ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        padding: '10px 16px',
        borderTop: '1px solid rgba(0,212,184,0.12)',
        background: 'rgba(8,12,24,0.4)',
        flexShrink: 0,
      }}>
        <div style={{
          background: 'rgba(13,21,38,0.7)', borderRadius: 8,
          borderLeft: '3px solid #2dd4bf', padding: '10px 14px',
        }}>
          <div style={{
            fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4,
          }}>Municipios</div>
          <div style={{
            fontSize: 22, fontWeight: 700, color: '#e8eef6',
            fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1,
          }}>{totals.munis}</div>
          <div style={{
            fontSize: 10, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace", marginTop: 3,
          }}>en 18 departamentos</div>
        </div>

        <div style={{
          background: 'rgba(13,21,38,0.7)', borderRadius: 8,
          borderLeft: '3px solid #2dd4bf', padding: '10px 14px',
        }}>
          <div style={{
            fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4,
          }}>Población Nacional</div>
          <div style={{
            fontSize: 22, fontWeight: 700, color: '#e8eef6',
            fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1,
          }}>9,145,000</div>
          <div style={{
            fontSize: 10, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace", marginTop: 3,
          }}>habitantes · proyección 2024</div>
        </div>

        <div style={{
          background: 'rgba(13,21,38,0.7)', borderRadius: 8,
          borderLeft: '3px solid #f59e0b', padding: '10px 14px',
        }}>
          <div style={{
            fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4,
          }}>Presupuesto Agregado</div>
          <div style={{
            fontSize: 22, fontWeight: 700, color: '#f59e0b',
            fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1,
          }}>L 65.6 mil M</div>
          <div style={{
            fontSize: 10, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace", marginTop: 3,
          }}>transferencias + ingresos propios</div>
        </div>
      </div>
    </div>
  );
}
