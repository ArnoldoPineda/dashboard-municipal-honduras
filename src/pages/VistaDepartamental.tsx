import React, {
  useEffect, useRef, useState, useMemo, useCallback,
} from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useParams, useNavigate } from 'react-router-dom';
import { getDepartamento } from '../data/municipios';
import { useNavbar } from '../context/NavbarContext';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useMunicipiosTopo } from '../hooks/useMunicipiosTopo';

// ── Formatters ───────────────────────────────────────────────────────────────

const fmt     = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 1 });
const fmtLegend = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 2 });
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

const NO_DATA_FILL = '#142030';
const BORDER       = '#0a0f1e'; // fondo oscuro: separa municipios sobre cualquier relleno
const QUANT_COLORS = d3.quantize(d3.interpolate('#0f3a44', '#00d4b8'), 5);

// ── Municipal choropleth map (límites oficiales OCHA COD-AB) ─────────────────

interface MuniStat {
  key:      string;        // "DEPARTAMENTO|code" — misma clave que la geometría
  code:     number;
  name:     string;
  budget:   number;
  category: string;
  mockId:   string | null; // solo para navegar a /municipio/:id (página aún basada en mock)
}

interface TooltipState { x: number; y: number; name: string; budget: number | null }

function DeptMuniMap({
  topoData, deptName, municipalities, onSelectMuni, indicator, message,
}: {
  topoData: any;
  deptName: string;
  municipalities: MuniStat[];
  onSelectMuni: (id: string) => void;
  indicator: string;
  message: string | null; // "Sin datos SEFIN…" o error de carga: mapa en gris neutro
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
    if (!topoData || !svgRef.current || size.w === 0) return;
    const noData = message !== null;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    if (!noData && municipalities.length === 0) return; // datos aún cargando

    const W = size.w;
    const H = size.h || Math.round(W * 0.65);
    svg.attr('width', W).attr('height', H);

    const deptKey = normalizeName(deptName);
    const geoms = topoData.objects.municipios.geometries.filter((g: any) =>
      normalizeName(g.properties?.department || '') === deptKey
    );
    if (geoms.length === 0) return;
    const deptCollection: any = { type: 'GeometryCollection', geometries: geoms };
    const features = (topojson.feature(topoData, deptCollection) as any).features;
    const outline  = topojson.mesh(topoData, deptCollection, (a: any, b: any) => a === b);

    const PAD = 18;
    const projection = d3.geoMercator().fitExtent([[PAD, PAD], [W - PAD, H - PAD]], {
      type: 'FeatureCollection', features,
    });
    const geoPath = d3.geoPath().projection(projection);

    const byKey = new Map(municipalities.map((m) => [m.key, m]));

    // `municipalities` ya viene filtrado al departamento: dominio y cuantiles son locales.
    const colorScale = d3.scaleQuantile<string>()
      .domain(municipalities.map((m) => m.budget))
      .range(QUANT_COLORS);

    const cellsG = svg.append('g');

    const moveTooltip = (event: any) => {
      const [mx, my] = d3.pointer(event, svgRef.current);
      setTooltip((prev) => prev ? { ...prev, x: mx, y: my } : null);
    };

    features.forEach((f: any) => {
      const muni = noData ? undefined : byKey.get(f.properties.key);
      const cell = cellsG.append('path')
        .attr('d', geoPath(f) ?? '')
        .attr('stroke', BORDER)
        .attr('stroke-width', 1.2)
        .attr('vector-effect', 'non-scaling-stroke');

      if (!muni) {
        cell.attr('fill', NO_DATA_FILL)
          .on('mouseenter', (event) => {
            const [mx, my] = d3.pointer(event, svgRef.current);
            setTooltip({ x: mx, y: my, name: f.properties.name, budget: null });
          })
          .on('mousemove', moveTooltip)
          .on('mouseleave', () => setTooltip(null));
        return;
      }

      let baseFill: string;
      let hoverFill: string;
      if (indicator === 'categorias') {
        const catColor = CAT_COLORS[muni.category] ?? CAT_COLORS.D;
        baseFill   = d3.color(catColor)!.darker(0.35).formatHex();
        hoverFill  = catColor;
      } else {
        baseFill   = colorScale(muni.budget);
        hoverFill  = d3.color(baseFill)?.brighter(0.55)?.formatHex() ?? '#00d4b8';
      }

      cell
        .attr('fill', baseFill)
        .style('cursor', muni.mockId ? 'pointer' : 'default')
        .on('mouseenter', function (event) {
          d3.select(this).raise()
            .attr('fill', hoverFill)
            .attr('stroke', '#00d4b8')
            .attr('stroke-width', 1.8);
          const [mx, my] = d3.pointer(event, svgRef.current);
          setTooltip({ x: mx, y: my, name: muni.name, budget: muni.budget });
        })
        .on('mousemove', moveTooltip)
        .on('mouseleave', function () {
          d3.select(this).attr('fill', baseFill).attr('stroke', BORDER).attr('stroke-width', 1.2);
          setTooltip(null);
        })
        .on('click', () => { if (muni.mockId) onSelectMuni(muni.mockId); });
    });

    svg.append('path').datum(outline)
      .attr('d', geoPath as any).attr('fill', 'none')
      .attr('stroke', 'rgba(0,212,184,0.75)').attr('stroke-width', 1.6)
      .attr('pointer-events', 'none');

    // Nombres en el centroide; si el municipio mide < 25 px de ancho, solo queda en el tooltip.
    const labelsG = svg.append('g').attr('pointer-events', 'none')
      .attr('font-family', "'IBM Plex Mono', monospace").attr('font-size', 10)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', '#c8d6e5').attr('stroke', BORDER).attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round').style('paint-order', 'stroke');
    features.forEach((f: any) => {
      const [[x0], [x1]] = geoPath.bounds(f);
      const c = projection(d3.geoCentroid(f));
      if (x1 - x0 < 25 || !c) return;
      const t = labelsG.append('text').attr('x', c[0]).attr('y', c[1]).text(f.properties.name);
      const half = (t.node()!.getComputedTextLength() + 3) / 2; // que no se corte en el borde del SVG
      t.attr('x', Math.max(half, Math.min(W - half, c[0])));
    });

    if (indicator !== 'categorias' && !noData) {
      // Leyenda por cuantiles: 5 clases con sus rangos (L)
      const [lo, hi] = d3.extent(municipalities, (m) => m.budget) as [number, number];
      const cuts = [lo, ...colorScale.quantiles(), hi];
      const rowH = 13, lgX = W - 128, lgY = H - 10 - rowH * 5;
      const lg = svg.append('g').attr('pointer-events', 'none')
        .attr('font-family', "'IBM Plex Mono', monospace").attr('font-size', 8);
      lg.append('text').attr('x', lgX).attr('y', lgY - 5).attr('fill', '#4a5a73').text('PRESUPUESTO (L)');
      QUANT_COLORS.forEach((col, i) => {
        const y = lgY + i * rowH;
        lg.append('rect').attr('x', lgX).attr('y', y).attr('width', 12).attr('height', 9).attr('rx', 2)
          .attr('fill', col).attr('stroke', BORDER);
        lg.append('text').attr('x', lgX + 17).attr('y', y + 8).attr('fill', '#7c8aa3')
          .text(`${fmtLegend.format(cuts[i])} – ${fmtLegend.format(cuts[i + 1])}`);
      });
    }

  }, [topoData, deptName, municipalities, onSelectMuni, indicator, size, message]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {message && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 15, textAlign: 'center', pointerEvents: 'none',
          background: 'rgba(8,12,24,0.9)', border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 10, padding: '14px 22px',
          fontSize: 13, fontWeight: 700, color: '#f59e0b', fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {message}
        </div>
      )}
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
              {tooltip.budget === null ? 'sin datos' : fmtFull.format(tooltip.budget)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VistaDepartamental ────────────────────────────────────────────────────────

const sum = (rows: any[], field: string): number => rows.reduce((s, m) => s + (m[field] ?? 0), 0);

export default function VistaDepartamental() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fiscalYear, indicator } = useNavbar();
  const topoData = useMunicipiosTopo();
  const [search,   setSearch]   = useState('');

  // Mock: solo metadatos (nombre, ruta, ids de navegación). Ninguna cifra sale de aquí.
  const dept = useMemo(() => getDepartamento(id || ''), [id]);

  // Fuente única de cifras: Supabase `municipalities` del año seleccionado.
  const { municipalities: sbMunicipalities, loading: sbLoading, error: sbError } = useMunicipalitiesMultiYear([fiscalYear]);

  // El hook arranca con loading=false y conserva las filas del año anterior: solo se da por
  // cargado un año cuando se vio su ciclo loading true → false. Evita mostrar "sin datos"
  // antes de la consulta o cifras de otro año durante el cambio.
  const [settledYear, setSettledYear] = useState<number | null>(null);
  const sawLoading = useRef(false);
  useEffect(() => {
    if (sbLoading) sawLoading.current = true;
    else if (sawLoading.current) { sawLoading.current = false; setSettledYear(fiscalYear); }
  }, [sbLoading, fiscalYear]);
  const loaded = settledYear === fiscalYear && !sbLoading;

  const yearRows = useMemo(
    () => sbMunicipalities.filter((m) => m.year === fiscalYear),
    [sbMunicipalities, fiscalYear]
  );

  const deptRows = useMemo(() => {
    if (!dept) return [];
    const key = normalizeName(dept.topoNombre);
    return yearRows.filter((m) => normalizeName(m.department || '') === key);
  }, [yearRows, dept]);

  const noData = loaded && deptRows.length === 0; // 2019/2020: sin filas SEFIN (o error de carga)
  const mapMessage = !noData ? null
    : sbError ? 'Error al cargar datos SEFIN' : 'Sin datos SEFIN para este año';

  const geoCount: number | null = useMemo(() => {
    if (!topoData || !dept) return null;
    const key = normalizeName(dept.topoNombre);
    return topoData.objects.municipios.geometries
      .filter((g: any) => normalizeName(g.properties?.department || '') === key).length;
  }, [topoData, dept]);

  // ponytail: ids del mock solo para el clic hacia /municipio/:id (DetalleMunicipio sigue en mock).
  // Municipios cuyo nombre no existe en el mock quedan sin clic; se resuelve en la fase 2.
  const mockIdByName = useMemo(() =>
    new Map<string, string>((dept?.municipios || []).map((m: any) => [normalizeName(m.nombre), m.id])),
    [dept]
  );

  const munis: MuniStat[] = useMemo(() =>
    deptRows.map((m) => ({
      key:      `${m.department}|${m.code}`,
      code:     m.code ?? 0,
      name:     m.name ?? '',
      budget:   m.presupuesto_municipal ?? 0,
      category: (m as any).category ?? 'D',
      mockId:   mockIdByName.get(normalizeName(m.name || '')) ?? null,
    })),
    [deptRows, mockIdByName]
  );

  // Department aggregates for selected year (Supabase)
  const deptYear = useMemo(() => ({
    presupuesto:     sum(deptRows, 'presupuesto_municipal'),
    ingresosPropios: sum(deptRows, 'ingresos_propios'),
    transferencia:   sum(deptRows, 'transferencias_art91'),
    poblacion:       sum(deptRows, 'population'),
  }), [deptRows]);

  // Autonomía Financiera = ingresos_propios / ingresos_recaudados × 100 (Supabase).
  // Fórmula estándar del proyecto — misma que afSEFIN en MunicipioDETALLE.tsx.
  const autonomiaSb: number | null = useMemo(() => {
    if (deptRows.length === 0) return null; // sin filas de Supabase para este año (2019/2020)
    const recaudados = sum(deptRows, 'ingresos_recaudados');
    return recaudados > 0 ? (sum(deptRows, 'ingresos_propios') / recaudados) * 100 : 0;
  }, [deptRows]);

  // Capital = municipio con code 1 (cabecera departamental)
  const capital = munis.find((m) => m.code === 1)?.name ?? dept?.capital ?? '';

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...munis]
      .sort((a, b) => b.budget - a.budget)
      .filter((m) => !q || m.name.toLowerCase().includes(q));
  }, [munis, search]);

  // Verificación temporal (solo desarrollo): Supabase ↔ geometría por department|code, todo el país.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !topoData || !loaded || yearRows.length === 0) return;
    const geoKeys = new Set<string>(topoData.objects.municipios.geometries.map((g: any) => g.properties.key));
    const sbKeys  = new Set(yearRows.map((m) => `${m.department}|${m.code}`));
    const sbSinGeo = Array.from(sbKeys).filter((k) => !geoKeys.has(k));
    const geoSinSb = Array.from(geoKeys).filter((k) => !sbKeys.has(k));
    console.warn(`[SIMHO ${fiscalYear}] Supabase sin geometría: ${sbSinGeo.length}`, sbSinGeo,
                 `| Geometrías sin Supabase: ${geoSinSb.length}`, geoSinSb);
  }, [topoData, yearRows, loaded, fiscalYear]);

  const onSelectMuni = useCallback((muniId: string) => navigate(`/municipio/${muniId}`), [navigate]);

  if (!dept) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace" }}>
        Departamento no encontrado.{' '}
        <span style={{ color: '#00d4b8', cursor: 'pointer', marginLeft: 8 }} onClick={() => navigate('/')}>← Volver al mapa</span>
      </div>
    );
  }

  const na = (v: string) => (noData ? '—' : v);
  const kpis = [
    { label: 'MUNICIPIOS',     value: geoCount !== null ? String(geoCount) : '—',      color: '#00d4b8' },
    { label: 'POBLACIÓN',      value: na(fmt.format(deptYear.poblacion) + ' hab.'),    color: '#5eead4' },
    { label: 'PRESUPUESTO',    value: na(`L ${fmt.format(deptYear.presupuesto)}`),     color: '#f59e0b' },
    { label: 'ING. PROPIOS',   value: na(`L ${fmt.format(deptYear.ingresosPropios)}`), color: '#f59e0b' },
    { label: 'AUTONOMÍA PROM.', value: autonomiaSb !== null ? `${autonomiaSb.toFixed(1)}%` : '—', color: '#5eead4' },
    { label: 'TRANSFERENCIAS', value: na(`L ${fmt.format(deptYear.transferencia)}`),   color: '#f59e0b' },
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
            Capital: <span style={{ color: '#5eead4' }}>{capital}</span>
            <span style={{ margin: '0 8px', opacity: 0.35 }}>·</span>
            <span>{geoCount ?? '—'} municipios</span>
          </div>
        </div>
      </div>

      {/* Main: left = choropleth, right = KPIs + list */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT: municipal choropleth */}
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
              municipalities={munis}
              onSelectMuni={onSelectMuni}
              indicator={indicator}
              message={mapMessage}
            />
          </div>
          <div style={{ fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em', flexShrink: 0 }}>
            FUENTE: SEFIN · Límites: OCHA COD-AB / SINIT (CC BY-IGO)
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
            MUNICIPIOS ({geoCount ?? '—'})
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
              const cat = CAT_COLORS[m.category] ? m.category : 'D';
              return (
                <div
                  key={m.key}
                  onClick={() => { if (m.mockId) navigate(`/municipio/${m.mockId}`); }}
                  style={{
                    padding: '10px 10px', borderRadius: 7, cursor: m.mockId ? 'pointer' : 'default',
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
                    <span style={{ fontSize: 15, color: '#e8eef6', fontWeight: 500 }}>{m.name}</span>
                    {m.code === 1 && (
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
                    L {fmt.format(m.budget)}
                  </span>
                </div>
              );
            })}
            {filtered.length === 0 && search && (
              <div style={{ fontSize: 12, color: '#4a5a73', padding: '12px 6px' }}>
                Sin resultados para "{search}"
              </div>
            )}
            {mapMessage && (
              <div style={{ fontSize: 12, color: '#f59e0b', padding: '12px 6px', fontFamily: "'IBM Plex Mono', monospace" }}>
                {mapMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
