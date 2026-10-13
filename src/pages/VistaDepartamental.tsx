import React, {
  useEffect, useRef, useState, useMemo, useCallback,
} from 'react';
import * as d3 from 'd3';
import {
  ROTULO_CATEGORIA, ROTULO_POBLACION, ROTULO_SIN_LIQUIDACION, sumarInsumos, calcular, sinLiquidacion, notaDatoIncompleto,
  excluirDeEstadisticas, indicadoresMunicipio, clasesQuintil, CLAVE_METRICA, MetricaMapa, Clases,
} from '../lib/indicadores';
import * as topojson from 'topojson-client';
import { useParams, useNavigate } from 'react-router-dom';
import { getDepartamento } from '../data/departamentos';
import { useNavbar } from '../context/NavbarContext';
import { useSefinYear, normName as normalizeName, muniKey, muniPath } from '../utils/sefin';
import { useMunicipiosTopo } from '../hooks/useMunicipiosTopo';
import SelectorAnio from '../components/SelectorAnio';
import { fmtL } from '../lib/formato';
import SelectorMetrica from '../components/SelectorMetrica';
import { LeyendaMetrica } from '../components/panorama/MapaDepartamentos';
import { colorMetrica, textoClase, METRICAS, CATEGORICA, SIN_DATO, ID_TRAMA, ETIQUETA_METRICA } from '../lib/colorMetrica';
import { NOMBRES_OFICIALES } from '../data/nombresOficiales';

// ── Formatters ───────────────────────────────────────────────────────────────

const fmt     = new Intl.NumberFormat('es-HN', { notation: 'compact', maximumFractionDigits: 1 });

// ── Category helpers ─────────────────────────────────────────────────────────

const CAT_COLORS = CATEGORICA;
const NO_DATA_FILL = SIN_DATO;
const BORDER       = '#0a0f1e'; // fondo oscuro: separa municipios sobre cualquier relleno

/** Valor del municipio en la métrica (null en categoría o sin dato). */
const valorMetrica = (m: Parameters<typeof indicadoresMunicipio>[0], metrica: MetricaMapa): number | null =>
  metrica === 'categoria' ? null : (indicadoresMunicipio(m)[CLAVE_METRICA[metrica]] as number | null);
const textoValor = (metrica: MetricaMapa, m: { valor: number | null; category: string; excluida: boolean }) =>
  m.excluida ? 'Sin dato comparable'
    : metrica === 'categoria' ? (m.category ? `Cat. ${m.category}` : '—')
      : m.valor == null ? '—' : METRICAS[metrica].formato(m.valor);

// ── Municipal choropleth map (límites oficiales OCHA COD-AB) ─────────────────

interface MuniStat {
  key:      string;        // "DEPARTAMENTO|code" — misma clave que la geometría
  code:     number;
  name:     string;
  budget:   number;
  valor:    number | null; // métrica seleccionada
  excluida: boolean;       // fuera de estadísticas: trama "Sin dato comparable"
  category: string;
  sinLiq:   boolean;       // docs/ATIPICOS.md §2
  incompleto: string | null; // tooltip del ⚠ (docs/ATIPICOS.md §5–6)
  path:     string;        // ruta del detalle: /municipio/<depto>/<code>
}

interface TooltipState { x: number; y: number; name: string; valor: string; clase: string }

function DeptMuniMap({
  topoData, deptName, municipalities, onSelectMuni, indicator, clases, message,
}: {
  topoData: any;
  deptName: string;
  municipalities: MuniStat[];
  onSelectMuni: (id: string) => void;
  indicator: MetricaMapa;
  clases?: Clases; // quintiles nacionales del año: el color es comparable entre departamentos
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

    // Trama "Sin dato comparable" (municipios fuera de estadísticas).
    const trama = svg.append('defs').append('pattern').attr('id', ID_TRAMA)
      .attr('width', 6).attr('height', 6).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
    trama.append('rect').attr('width', 6).attr('height', 6).attr('fill', SIN_DATO);
    trama.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('stroke', '#8a9bb0').attr('stroke-width', 2);

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
            setTooltip({ x: mx, y: my, name: NOMBRES_OFICIALES[f.properties.key] ?? f.properties.name, valor: 'sin datos', clase: '' });
          })
          .on('mousemove', moveTooltip)
          .on('mouseleave', () => setTooltip(null));
        return;
      }

      const baseFill  = colorMetrica(indicator, { valor: muni.valor, categoria: muni.category, excluida: muni.excluida }, clases);
      const hoverFill = baseFill.startsWith('#') ? d3.color(baseFill)!.brighter(0.5).formatHex() : baseFill;
      const clase = muni.excluida ? 'Fuera de estadísticas (ver la ficha)'
        : indicator === 'categoria' ? ROTULO_CATEGORIA : textoClase(clases?.clase(muni.valor) ?? null);

      cell
        .attr('fill', baseFill)
        .style('cursor', 'pointer')
        .on('mouseenter', function (event) {
          d3.select(this).raise()
            .attr('fill', hoverFill)
            .attr('stroke', '#00d4b8')
            .attr('stroke-width', 1.8);
          const [mx, my] = d3.pointer(event, svgRef.current);
          setTooltip({ x: mx, y: my, name: muni.name, valor: `${ETIQUETA_METRICA[indicator]}: ${textoValor(indicator, muni)}`, clase });
        })
        .on('mousemove', moveTooltip)
        .on('mouseleave', function () {
          d3.select(this).attr('fill', baseFill).attr('stroke', BORDER).attr('stroke-width', 1.2);
          setTooltip(null);
        })
        .on('click', () => onSelectMuni(muni.path));
    });

    svg.append('path').datum(outline)
      .attr('d', geoPath as any).attr('fill', 'none')
      .attr('stroke', 'rgba(0,212,184,0.75)').attr('stroke-width', 1.6)
      .attr('pointer-events', 'none');

    // Nombres en el centroide; si el municipio mide < 25 px de ancho, solo queda en el tooltip.
    const labelsG = svg.append('g').attr('class', 'vista-depto-rotulos').attr('pointer-events', 'none')
      .attr('font-family', "'IBM Plex Mono', monospace").attr('font-size', 10)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', '#c8d6e5').attr('stroke', BORDER).attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round').style('paint-order', 'stroke');
    features.forEach((f: any) => {
      const [[x0], [x1]] = geoPath.bounds(f);
      const c = projection(d3.geoCentroid(f));
      if (x1 - x0 < 25 || !c) return;
      const t = labelsG.append('text').attr('x', c[0]).attr('y', c[1]).text(NOMBRES_OFICIALES[f.properties.key] ?? f.properties.name);
      const half = (t.node()!.getComputedTextLength() + 3) / 2; // que no se corte en el borde del SVG
      t.attr('x', Math.max(half, Math.min(W - half, c[0])));
    });

  }, [topoData, deptName, municipalities, onSelectMuni, indicator, clases, size, message]);

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
          left: Math.max(4, Math.min(tooltip.x + 12, size.w - 230)),
          top: Math.max(tooltip.y - 48, 4),
          pointerEvents: 'none',
          background: 'rgba(8,12,24,0.96)',
          border: '1px solid rgba(0,212,184,0.4)',
          borderRadius: 8, padding: '8px 12px',
          fontSize: 12, zIndex: 20, minWidth: 160, maxWidth: 226,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#e8eef6', marginBottom: 4 }}>
            {tooltip.name}
          </div>
          <div style={{ fontSize: 12, color: '#e8eef6', fontFamily: "'IBM Plex Mono', monospace" }}>{tooltip.valor}</div>
          {tooltip.clase && <div style={{ fontSize: 11, color: '#a9b7c8', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{tooltip.clase}</div>}
        </div>
      )}
    </div>
  );
}

// ── VistaDepartamental ────────────────────────────────────────────────────────

export default function VistaDepartamental() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fiscalYear, indicator, setIndicator } = useNavbar();
  const topoData = useMunicipiosTopo();
  const [search,   setSearch]   = useState('');

  // Metadatos del departamento (data/departamentos.ts): nombre, ruta, capital.
  const dept = useMemo(() => getDepartamento(id || ''), [id]);

  // Fuente única de cifras: Supabase `municipalities` del año seleccionado.
  const { rows: yearRows, loading: sbLoading, message: yearMessage } = useSefinYear(fiscalYear);
  const loaded = !sbLoading;

  const deptRows = useMemo(() => {
    if (!dept) return [];
    const key = normalizeName(dept.nombre);
    return yearRows.filter((m) => normalizeName(m.department || '') === key);
  }, [yearRows, dept]);

  const noData = loaded && deptRows.length === 0; // 2019/2020: sin filas SEFIN (o error de carga)
  const mapMessage = !noData ? null : (yearMessage ?? 'Sin datos SEFIN para este año');

  const geoCount: number | null = useMemo(() => {
    if (!topoData || !dept) return null;
    const key = normalizeName(dept.nombre);
    return topoData.objects.municipios.geometries
      .filter((g: any) => normalizeName(g.properties?.department || '') === key).length;
  }, [topoData, dept]);

  const munis: MuniStat[] = useMemo(() =>
    deptRows.map((m) => ({
      key:      muniKey(m),
      code:     m.code ?? 0,
      name:     m.name ?? '',
      budget:   m.presupuesto_municipal ?? 0,
      valor:    valorMetrica(m, indicator),
      excluida: excluirDeEstadisticas(m),
      category: m.category ?? '',
      sinLiq:   sinLiquidacion(m),
      incompleto: notaDatoIncompleto(m),
      path:     muniPath(m),
    })),
    [deptRows, indicator]
  );

  // Cortes por quintiles de TODOS los municipios del año (sin excluidos), no solo del departamento.
  const clases = useMemo(() => indicator === 'categoria' ? undefined
    : clasesQuintil(yearRows.filter((m) => !excluirDeEstadisticas(m)).map((m) => valorMetrica(m, indicator)), METRICAS[indicator].direccion),
  [yearRows, indicator]);

  // Agregados del departamento (lib/indicadores: Σ numeradores ÷ Σ denominadores).
  const deptYear = useMemo(() => sumarInsumos(deptRows), [deptRows]);
  const autonomiaSb: number | null = useMemo(
    () => (deptRows.length === 0 ? null : calcular(deptYear).autonomia),
    [deptRows, deptYear]
  );

  // Capital = municipio con code 1 (cabecera departamental)
  const capital = dept?.capital ?? '';

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    // Mejor primero según la métrica; excluidos y sin dato al final. En categoría: A, B, C, D.
    const signo = indicator !== 'categoria' && METRICAS[indicator].direccion === 'menor' ? 1 : -1;
    const v = (m: MuniStat) => (m.excluida ? null : m.valor);
    return [...munis]
      .sort((a, b) => indicator === 'categoria' ? ((a.excluida ? 'Z' : a.category || 'Y').localeCompare(b.excluida ? 'Z' : b.category || 'Y') || a.name.localeCompare(b.name))
        : v(a) == null ? 1 : v(b) == null ? -1 : signo * (v(a)! - v(b)!))
      .filter((m) => !q || m.name.toLowerCase().includes(q));
  }, [munis, search, indicator]);

  // Verificación temporal (solo desarrollo): Supabase ↔ geometría por department|code, todo el país.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !topoData || !loaded || yearRows.length === 0) return;
    const geoKeys = new Set<string>(topoData.objects.municipios.geometries.map((g: any) => g.properties.key));
    const sbKeys  = new Set(yearRows.map(muniKey));
    const sbSinGeo = Array.from(sbKeys).filter((k) => !geoKeys.has(k));
    const geoSinSb = Array.from(geoKeys).filter((k) => !sbKeys.has(k));
    console.warn(`[SIMHO ${fiscalYear}] Supabase sin geometría: ${sbSinGeo.length}`, sbSinGeo,
                 `| Geometrías sin Supabase: ${geoSinSb.length}`, geoSinSb);
  }, [topoData, yearRows, loaded, fiscalYear]);

  const onSelectMuni = useCallback((path: string) => navigate(path), [navigate]);

  if (!dept) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace" }}>
        Departamento no encontrado.{' '}
        <span style={{ color: '#00d4b8', cursor: 'pointer', marginLeft: 8 }} onClick={() => navigate('/')}>← Volver al mapa</span>
      </div>
    );
  }

  const na = (v: string) => (noData || !loaded ? '—' : v); // mientras carga: '—', nunca 0
  const kpis = [
    { label: 'MUNICIPIOS',     value: geoCount !== null ? String(geoCount) : '—',      color: '#00d4b8' },
    { label: ROTULO_POBLACION.toUpperCase(), value: na(fmt.format(deptYear.poblacion) + ' hab.'),    color: '#5eead4' },
    { label: 'PRESUPUESTO',    value: na(fmtL(deptYear.presupuesto)),     color: '#f59e0b' },
    { label: 'ING. CORRIENTES', value: na(fmtL(deptYear.ingresosCorrientes)), color: '#f59e0b' },
    { label: 'AUTONOMÍA',      value: autonomiaSb !== null ? `${autonomiaSb.toFixed(1)}%` : '—', color: '#5eead4' },
    { label: 'TRANSFERENCIAS', value: na(fmtL(deptYear.transferencias)),   color: '#f59e0b' },
  ];

  return (
    <div className="vista-depto" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="vista-depto-cab" style={{
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SelectorMetrica valor={indicator} onCambio={setIndicator} />
          <SelectorAnio />
        </div>
      </div>

      {/* Main: left = choropleth, right = KPIs + list */}
      <div className="vista-depto-cuerpo" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT: municipal choropleth */}
        <div className="vista-depto-mapa" style={{
          flex: '0 0 60%', borderRight: '1px solid rgba(0,212,184,0.10)',
          padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden',
        }}>
          <div style={{ fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.1em', flexShrink: 0 }}>
            MAPA MUNICIPAL — clic para ver detalle
          </div>
          <div className="vista-depto-lienzo" style={{ flex: 1, minHeight: 500, width: '100%', height: '100%', position: 'relative' }}>
            <DeptMuniMap
              topoData={topoData}
              deptName={dept.nombre}
              municipalities={munis}
              onSelectMuni={onSelectMuni}
              indicator={indicator}
              clases={clases}
              message={mapMessage}
            />
          </div>
          {!mapMessage && <LeyendaMetrica metrica={indicator} clases={clases} sinDato={munis.some((m) => m.excluida)} />}
          <div style={{ fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em', flexShrink: 0 }}>
            Límites: OCHA COD-AB / SINIT (CC BY-IGO)
          </div>
        </div>

        {/* RIGHT: KPI cards + searchable list */}
        <div className="vista-depto-lista" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16, gap: 12 }}>
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
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(m.path)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(m.path); }}
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
                    {m.incompleto && (
                      <span title={m.incompleto} style={{ color: '#f59e0b', fontSize: 12, cursor: 'help' }}>⚠</span>
                    )}
                    {m.sinLiq && (
                      <span style={{
                        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#f59e0b',
                        border: '1px solid #f59e0b55', borderRadius: 3, padding: '1px 5px',
                      }}>
                        {ROTULO_SIN_LIQUIDACION.toUpperCase()}
                      </span>
                    )}
                    {indicator === 'categoria' && (
                      <span title={ROTULO_CATEGORIA} style={{
                        fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                        color: CAT_COLORS[cat], background: CAT_COLORS[cat] + '18',
                        border: `1px solid ${CAT_COLORS[cat]}30`, borderRadius: 3, padding: '1px 5px',
                      }}>
                        CAT {cat}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 15, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {textoValor(indicator, m)}
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
