import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useNavigate } from 'react-router-dom';
import { useNavbar } from '../context/NavbarContext';
import { DEPARTAMENTOS, deptNameToId, getDepartamento } from '../data/departamentos';
import { Municipality } from '../hooks/useMunicipalities';
import { useSefinYear, normName, aggregate, groupByDept, categoryOf, SefinAgg } from '../utils/sefin';
import { useMunicipiosTopo } from '../hooks/useMunicipiosTopo';

// ── Formatters ───────────────────────────────────────────────────────────────

const fmt    = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 0 });
const normalizeName = normName;

// Nombres de departamento (data/departamentos.ts); las cifras salen de Supabase.
const DEPT_NAMES: string[] = (DEPARTAMENTOS as any[]).map((d) => d.nombre);

// ── Category helpers ─────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  A: '#2dd4bf',
  B: '#3a9bd6',
  C: '#f59e0b',
  D: '#64748b',
};

function deptCatData(munis: Municipality[]): { dominant: string; counts: Record<string, number> } {
  const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  munis.forEach((m) => { counts[categoryOf(m.presupuesto_municipal ?? 0)]++; });
  // Use capital city's category as the dept color — freq-dominant always returns D
  // because most municipalities are small towns (< 50M). Capital = code 1 (cabecera).
  const capital = munis.find((m) => m.code === 1);
  const dominant = capital
    ? categoryOf(capital.presupuesto_municipal ?? 0)
    : (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'D');
  return { dominant, counts };
}

// ── Main component ───────────────────────────────────────────────────────────

export default function MapaInteractivo() {
  const svgRef       = useRef<SVGSVGElement>(null);
  const tooltipRef   = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate     = useNavigate();

  const { indicator, fiscalYear } = useNavbar();

  const topoData = useMunicipiosTopo();
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Fuente única de cifras: Supabase `municipalities` del año seleccionado.
  // Autonomía Financiera = ingresos_propios / ingresos_recaudados × 100 (agregado por depto).
  const { rows, loading, message: noDataMsg } = useSefinYear(fiscalYear);
  const hideFigures = loading || !!noDataMsg; // mientras carga: '—', nunca 0

  // Agregados por departamento, con clave = nombre de la app (como antes deptStats).
  const { deptStats, deptRows } = useMemo(() => {
    const byNorm = groupByDept(rows);
    const stats = new Map<string, SefinAgg>();
    const deptRowsMap = new Map<string, Municipality[]>();
    DEPT_NAMES.forEach((name) => {
      const list = byNorm.get(normalizeName(name)) ?? [];
      stats.set(name, aggregate(list));
      deptRowsMap.set(name, list);
    });
    return { deptStats: stats, deptRows: deptRowsMap };
  }, [rows]);

  // Nº de municipios por departamento desde la geometría (existe aunque el año no tenga datos).
  const geoCountByDept = useMemo(() => {
    const out = new Map<string, number>();
    (topoData?.objects.municipios.geometries ?? []).forEach((g: any) => {
      const k = normalizeName(g.properties?.department);
      out.set(k, (out.get(k) ?? 0) + 1);
    });
    return out;
  }, [topoData]);
  const geoTotal = Array.from(geoCountByDept.values()).reduce((a, b) => a + b, 0);

  const totals = useMemo(() => aggregate(rows), [rows]);

  const catTotals = useMemo(() => deptCatData(rows).counts, [rows]);


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
    if (indicator === 'autonomia')   return stats.autonomia ?? 0;
    if (indicator === 'presupuesto') return stats.presupuesto;
    if (indicator === 'poblacion')   return stats.poblacion;
    return 0;
  }, [deptStats, indicator]);

  // Rango real de la coropleta (para la leyenda): mínimo y máximo por departamento.
  const [minVal, maxVal] = useMemo(() => {
    const vals = DEPT_NAMES.map(getValue).filter((v) => v > 0);
    return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 0];
  }, [getValue]);

  const fmtIndicator = useCallback((v: number) => {
    if (indicator === 'autonomia') return `${v.toFixed(1)}%`;
    if (indicator === 'poblacion') return `${fmt.format(v)} hab.`;
    return `L ${fmt.format(v)}`;
  }, [indicator]);

  useEffect(() => {
    if (!topoData || !svgRef.current) return;
    const W = containerSize.w || containerRef.current?.clientWidth || 600;
    const H = containerSize.h || containerRef.current?.clientHeight || 480;
    if (W < 100 || H < 100) return;

    const svg = d3.select(svgRef.current);
    svg.attr('width', W).attr('height', H);
    svg.selectAll('*').remove();

    // Solo la capa `departamentos` (18). La capa `municipios` nunca se pinta en la vista nacional.
    // `department` viene en MAYÚSCULAS sin tildes → se expone como `name` con el nombre de la app.
    const deptNames = Array.from(deptStats.keys()) as string[];
    const features = (topojson.feature(topoData, topoData.objects.departamentos) as any).features
      .map((f: any) => {
        const dep = f.properties?.department || '';
        const name = deptNames.find((k) => normalizeName(k) === normalizeName(dep)) ?? dep;
        return { ...f, properties: { ...f.properties, name } };
      });
    const projection = d3.geoMercator().fitExtent([[24, 24], [W - 24, H - 24]], {
      type: 'FeatureCollection', features,
    });
    const path = d3.geoPath().projection(projection);

    const colorScale = d3.scaleSequentialSqrt(d3.interpolate('#112035', '#00d4b8'))
      .domain([0, maxVal || 1]);

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
        if (hideFigures) return '#142030';
        if (indicator === 'categorias') {
          const { dominant } = deptCatData(deptRows.get(topoName) ?? []);
          return d3.color(CAT_COLORS[dominant])!.darker(0.4).formatHex();
        }
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

        const deptId    = deptNameToId(topoName);
        const deptData  = deptId ? getDepartamento(deptId) : null;
        const capital   = deptData?.capital || '';
        const muniCount = geoCountByDept.get(normalizeName(topoName)) ?? 0;

        let html = '';
        if (hideFigures) {
          html = `
            <div style="font-weight:700;font-size:16px;color:#e8eef6;margin-bottom:6px;
                        font-family:'Barlow Condensed',sans-serif;letter-spacing:0.01em">
              ${topoName}
            </div>
            <div style="font-size:12px;color:#f59e0b;font-family:'IBM Plex Mono',monospace">
              ${noDataMsg ?? 'Cargando datos SEFIN…'}
            </div>
          `;
        } else if (indicator === 'categorias') {
          const { dominant, counts } = deptCatData(deptRows.get(deptKey) ?? []);
          html = `
            <div style="font-weight:700;font-size:16px;color:#e8eef6;margin-bottom:6px;
                        font-family:'Barlow Condensed',sans-serif;letter-spacing:0.01em">
              ${topoName}
            </div>
            <div style="font-size:12px;color:#9ca3af;font-family:'IBM Plex Mono',monospace;margin-bottom:6px">
              Capital municipal: <span style="color:${CAT_COLORS[dominant]};font-weight:700">Cat ${dominant}</span>
            </div>
            <div style="font-size:11px;color:#9ca3af;font-family:'IBM Plex Mono',monospace">
              <span style="color:${CAT_COLORS.A}">A:${counts.A}</span> ·
              <span style="color:${CAT_COLORS.B}">B:${counts.B}</span> ·
              <span style="color:${CAT_COLORS.C}">C:${counts.C}</span> ·
              <span style="color:${CAT_COLORS.D}">D:${counts.D}</span>
            </div>
          `;
        } else {
          const stats = deptStats.get(deptKey);
          const displayVal = indicator === 'autonomia' && stats?.autonomia == null
            ? 'sin datos'
            : fmtIndicator(getValue(deptKey));
          html = `
            <div style="font-weight:700;font-size:16px;color:#e8eef6;margin-bottom:6px;
                        font-family:'Barlow Condensed',sans-serif;letter-spacing:0.01em">
              ${topoName}
            </div>
            <div style="font-size:14px;color:#2dd4bf;font-family:'IBM Plex Mono',monospace;margin-bottom:4px">
              ${displayVal}
            </div>
            <div style="font-size:12px;color:#7c8aa3;font-family:'IBM Plex Mono',monospace">
              ${muniCount} municipios${capital ? ` · cap. ${capital}` : ''}
            </div>
          `;
        }
        tooltip
          .style('display', 'block')
          .style('left', `${event.offsetX + 14}px`)
          .style('top',  `${event.offsetY - 10}px`)
          .html(html);
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

  }, [topoData, deptStats, deptRows, geoCountByDept, indicator, getValue, maxVal, fmtIndicator, noDataMsg, hideFigures, containerSize, navigate]);

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
            {indicator === 'categorias'
              ? 'Categorías municipales por presupuesto. Seleccione un departamento para ver el detalle.'
              : `Coropleta por presupuesto ${fiscalYear}. Seleccione un departamento para explorar sus municipios.`}
          </div>
        </div>

        {/* Legend — top-right (presupuesto / poblacion / autonomia) */}
        {indicator !== 'categorias' && !hideFigures && (
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
              {`${indicator === 'autonomia' ? 'autonomía' : indicator === 'poblacion' ? 'población' : 'presupuesto'} ${fiscalYear}`}
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
              <span>{fmtIndicator(minVal)}</span>
              <span>{fmtIndicator(maxVal)}</span>
            </div>
          </div>
        )}

        {/* Sin datos — 2019/2020 no tienen filas SEFIN en Supabase (ningún indicador) */}
        {noDataMsg && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 15, textAlign: 'center', pointerEvents: 'none',
            background: 'rgba(8,12,24,0.9)', border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 10, padding: '18px 28px', maxWidth: 320,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#f59e0b',
              fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6,
            }}>
              ⚠ {noDataMsg}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
              No hay datos de SEFIN en el sistema para el año fiscal {fiscalYear}.
              Seleccioná un año entre 2021 y 2025.
            </div>
          </div>
        )}

        {/* Category legend — bottom-right (categorias) */}
        {indicator === 'categorias' && (
          <div style={{
            position: 'absolute', bottom: 20, right: 24, zIndex: 10,
            background: 'rgba(8,12,24,0.85)', border: '1px solid rgba(0,212,184,0.18)',
            borderRadius: 8, padding: '12px 16px', minWidth: 200,
          }}>
            <div style={{
              fontSize: 10, color: '#7c8aa3',
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
            }}>
              Categoría Municipal
            </div>
            {([
              { cat: 'A', label: 'Cat. A — Grandes',      color: CAT_COLORS.A },
              { cat: 'B', label: 'Cat. B — Medianos',     color: CAT_COLORS.B },
              { cat: 'C', label: 'Cat. C — Pequeños',     color: CAT_COLORS.C },
              { cat: 'D', label: 'Cat. D — Muy pequeños', color: CAT_COLORS.D },
            ] as const).map(({ cat, label, color }) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: color, flexShrink: 0, display: 'inline-block',
                }} />
                <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

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
            FUENTE: AMHON / SEFIN / INE · Límites: OCHA COD-AB / SINIT (CC BY-IGO)
          </div>
          <div style={{ fontSize: 10, color: '#4a5a73', letterSpacing: '0.06em', marginTop: 2 }}>
            EJERCICIO FISCAL {fiscalYear}
          </div>
        </div>
      </div>

      {/* ── Bottom KPI strip ── */}
      {indicator === 'categorias' ? (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8,
          padding: '10px 16px',
          borderTop: '1px solid rgba(0,212,184,0.12)',
          background: 'rgba(8,12,24,0.4)',
          flexShrink: 0,
        }}>
          {(['A', 'B', 'C', 'D'] as const).map((cat) => (
            <div key={cat} style={{
              background: 'rgba(13,21,38,0.7)', borderRadius: 8,
              borderLeft: `3px solid ${CAT_COLORS[cat]}`, padding: '10px 14px',
            }}>
              <div style={{
                fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4,
              }}>Cat {cat}</div>
              <div style={{
                fontSize: 22, fontWeight: 700, color: CAT_COLORS[cat],
                fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1,
              }}>{hideFigures ? '—' : catTotals[cat]}</div>
              <div style={{
                fontSize: 10, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace", marginTop: 3,
              }}>municipios</div>
            </div>
          ))}
        </div>
      ) : (
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
            }}>{geoTotal || '—'}</div>
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
            }}>{hideFigures ? '—' : fmtInt.format(totals.poblacion)}</div>
            <div style={{
              fontSize: 10, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace", marginTop: 3,
            }}>{`habitantes · SEFIN ${fiscalYear}`}</div>
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
            }}>{hideFigures ? '—' : `L ${fmt.format(totals.presupuesto)}`}</div>
            <div style={{
              fontSize: 10, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace", marginTop: 3,
            }}>suma de presupuestos municipales</div>
          </div>
        </div>
      )}
    </div>
  );
}
