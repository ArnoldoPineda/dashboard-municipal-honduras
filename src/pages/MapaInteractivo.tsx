import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { supabase } from '../services/supabaseClient';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';

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
const fmtPop = new Intl.NumberFormat('es-HN');

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

// ── Municipality detail view — KPIs + 3 charts ───────────────────────────────

type DeptAvg = { budget: number; propios: number; transferencias: number; population: number };
type EvoPoint = { year: number; budget: number };

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
  const [muniYear,  setMuniYear]  = useState(initialYear);
  const [rawData,   setRawData]   = useState<any>(null);
  const [rawLoad,   setRawLoad]   = useState(false);
  const [deptAvg,   setDeptAvg]   = useState<DeptAvg | null>(null);
  const [evolution, setEvolution] = useState<EvoPoint[]>([]);

  const isCapital = DEPT_CAPITALS[deptName] === muniName;

  // Fetch evolution once (all years for this municipality)
  useEffect(() => {
    if (!muniName || !deptName) return;
    supabase
      .from('municipalities')
      .select('year, presupuesto_municipal')
      .eq('name', muniName)
      .eq('department', deptName)
      .order('year', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setEvolution(
            data
              .filter((d: any) => d.presupuesto_municipal > 0)
              .map((d: any) => ({ year: d.year, budget: d.presupuesto_municipal as number }))
          );
        }
      });
  }, [muniName, deptName]);

  // Fetch raw row + dept averages when year changes
  useEffect(() => {
    if (!muniName || !deptName || !muniYear) return;
    setRawLoad(true);
    setRawData(null);

    supabase
      .from('municipalities')
      .select('*')
      .eq('name', muniName)
      .eq('department', deptName)
      .eq('year', muniYear)
      .single()
      .then(({ data }) => { setRawData(data ?? null); setRawLoad(false); });

    supabase
      .from('municipalities')
      .select('presupuesto_municipal, ingresos_propios, transferencias_art91, population')
      .eq('department', deptName)
      .eq('year', muniYear)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const n = data.length;
          setDeptAvg({
            budget:          data.reduce((s: number, d: any) => s + (d.presupuesto_municipal || 0), 0) / n,
            propios:         data.reduce((s: number, d: any) => s + (d.ingresos_propios       || 0), 0) / n,
            transferencias:  data.reduce((s: number, d: any) => s + (d.transferencias_art91   || 0), 0) / n,
            population:      data.reduce((s: number, d: any) => s + (d.population             || 0), 0) / n,
          });
        }
      });
  }, [muniName, deptName, muniYear]);

  // Derived values
  const kpiBudget         = rawData?.presupuesto_municipal  || 0;
  const kpiPropios        = rawData?.ingresos_propios       || 0;
  const kpiTransferencias = rawData?.transferencias_art91   || 0;
  const kpiPopulation     = rawData?.population             || 0;

  const kpis = [
    { label: 'POBLACIÓN',       value: kpiPopulation ? fmtPop.format(kpiPopulation) + ' hab.' : '—', color: '#5eead4' },
    { label: 'ÁREA',            value: '—',                                                           color: '#7c8aa3' },
    { label: 'PRESUPUESTO',     value: kpiBudget         ? `L ${fmt.format(kpiBudget)}`         : '—', color: '#f59e0b' },
    { label: 'INGRESOS PROPIOS',value: kpiPropios        ? `L ${fmt.format(kpiPropios)}`        : '—', color: '#f59e0b' },
    { label: 'TRANSFERENCIA',   value: kpiTransferencias ? `L ${fmt.format(kpiTransferencias)}` : '—', color: '#f59e0b' },
    { label: 'IDH',             value: '—',                                                           color: '#7c8aa3' },
  ];

  // ── Chart refs ────────────────────────────────────────────────────────────
  const chartsRowRef  = useRef<HTMLDivElement>(null);
  const barSvgRef     = useRef<SVGSVGElement>(null);
  const donutSvgRef   = useRef<SVGSVGElement>(null);
  const lineSvgRef    = useRef<SVGSVGElement>(null);
  const [chartSize, setChartSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = chartsRowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 10 && height > 10) {
        setChartSize({ w: Math.floor(width / 3), h: Math.floor(height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Horizontal bar chart: municipality vs dept average ────────────────────
  useEffect(() => {
    if (!rawData || !deptAvg || !barSvgRef.current || chartSize.w < 40) return;
    const W = chartSize.w, H = chartSize.h;

    const svg = d3.select(barSvgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', W).attr('height', H);

    const metrics = [
      { label: 'Presupuesto',   muni: kpiBudget,         avg: deptAvg.budget },
      { label: 'Ing. Propios',  muni: kpiPropios,        avg: deptAvg.propios },
      { label: 'Transferencia', muni: kpiTransferencias, avg: deptAvg.transferencias },
      { label: 'Población',     muni: kpiPopulation,     avg: deptAvg.population },
    ];

    const mL = 82, mR = 36, mT = 34, mB = 28;
    const iW = W - mL - mR;
    const iH = H - mT - mB;
    // Cap row height so groups stay compact even on large screens
    const rowH = Math.min(iH / metrics.length, 46);
    const barH = Math.max(5, Math.min(9, rowH * 0.26));
    // Center the groups vertically within the inner area
    const groupsH = rowH * metrics.length;
    const groupOffsetY = Math.max(0, (iH - groupsH) / 2);

    const g = svg.append('g').attr('transform', `translate(${mL},${mT + groupOffsetY})`);

    // Title
    svg.append('text')
      .attr('x', W / 2).attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#7c8aa3').attr('font-size', 8.5)
      .attr('font-family', "'IBM Plex Mono', monospace")
      .attr('letter-spacing', '0.08em')
      .text('MUNICIPIO VS PROMEDIO DEPARTAMENTAL');

    metrics.forEach((m, i) => {
      const maxVal = Math.max(m.muni, m.avg, 1);
      const xScale = d3.scaleLinear([0, maxVal], [0, iW]);
      const midY   = i * rowH + rowH / 2;

      // row bg
      g.append('rect')
        .attr('x', 0).attr('y', i * rowH + 2)
        .attr('width', iW).attr('height', rowH - 4)
        .attr('fill', i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent');

      // metric label
      g.append('text')
        .attr('x', -6).attr('y', midY)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', '#7c8aa3').attr('font-size', 7.5)
        .attr('font-family', "'IBM Plex Mono', monospace")
        .text(m.label.toUpperCase());

      // municipality bar (teal)
      g.append('rect')
        .attr('x', 0).attr('y', midY - barH * 1.55)
        .attr('width', xScale(m.muni)).attr('height', barH)
        .attr('fill', '#00d4b8').attr('opacity', 0.82).attr('rx', 2);

      // dept avg bar (amber)
      g.append('rect')
        .attr('x', 0).attr('y', midY + barH * 0.45)
        .attr('width', xScale(m.avg)).attr('height', barH)
        .attr('fill', '#f59e0b').attr('opacity', 0.7).attr('rx', 2);

      // value label (municipality)
      if (m.muni > 0) {
        g.append('text')
          .attr('x', xScale(m.muni) + 3).attr('y', midY - barH * 1.07)
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#00d4b8').attr('font-size', 6.5)
          .attr('font-family', "'IBM Plex Mono', monospace")
          .text(m.label === 'Población' ? fmtPop.format(Math.round(m.muni)) : `L${fmt.format(m.muni)}`);
      }
    });

    // Legend — anchored below the group block
    const legY = groupsH + 16;
    [['#00d4b8', 'Municipio'], ['#f59e0b', 'Prom. departamental']].forEach(([color, label], li) => {
      const lx = li * 110;
      g.append('rect').attr('x', lx).attr('y', legY - 5).attr('width', 8).attr('height', 5).attr('rx', 1).attr('fill', color);
      g.append('text').attr('x', lx + 11).attr('y', legY).attr('fill', '#5a6880').attr('font-size', 7)
        .attr('font-family', "'IBM Plex Mono', monospace").text(label);
    });

  }, [rawData, deptAvg, kpiBudget, kpiPropios, kpiTransferencias, kpiPopulation, chartSize]);

  // ── Donut chart: composición presupuestaria ───────────────────────────────
  useEffect(() => {
    if (!rawData || !donutSvgRef.current || chartSize.w < 40) return;
    const W = chartSize.w, H = chartSize.h;

    const svg = d3.select(donutSvgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', W).attr('height', H);

    const transferencias = rawData.transferencias_art91 || 0;
    const propios        = rawData.ingresos_propios     || 0;
    const presupuesto    = rawData.presupuesto_municipal || 0;
    const otros          = Math.max(0, presupuesto - transferencias - propios);
    // Use the actual sum of displayed segments as denominator so % always sums to 100
    const segTotal       = transferencias + propios + otros;

    const segments = [
      { label: 'Transferencias', value: transferencias, color: '#f59e0b' },
      { label: 'Ing. propios',   value: propios,        color: '#00d4b8' },
      { label: 'Otros ingresos', value: otros,          color: '#1a2d48' },
    ].filter(s => s.value > 0);

    // Title
    svg.append('text')
      .attr('x', W / 2).attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#7c8aa3').attr('font-size', 8.5)
      .attr('font-family', "'IBM Plex Mono', monospace")
      .attr('letter-spacing', '0.08em')
      .text('COMPOSICIÓN PRESUPUESTARIA');

    const donutH = H - 60;
    const R  = Math.min(W * 0.42, donutH * 0.42);
    const cx = W / 2;
    const cy = 18 + donutH * 0.46;

    const pie  = d3.pie<typeof segments[0]>().value(d => d.value).sort(null).padAngle(0.025);
    const arc  = d3.arc<any>().innerRadius(R * 0.58).outerRadius(R);
    const arcH = d3.arc<any>().innerRadius(R * 0.58).outerRadius(R * 1.06);

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    pie(segments).forEach(s => {
      g.append('path')
        .datum(s)
        .attr('d', arc(s))
        .attr('fill', s.data.color)
        .attr('stroke', '#070c1a')
        .attr('stroke-width', 1.8)
        .style('cursor', 'default')
        .on('mouseenter', function() { d3.select(this).attr('d', arcH(d3.select(this).datum() as any)); })
        .on('mouseleave', function() { d3.select(this).attr('d', arc(d3.select(this).datum() as any)); });
    });

    // Center: largest segment % — divide by segTotal so it never exceeds 100
    const largest = segments.reduce((a, b) => a.value > b.value ? a : b, segments[0] ?? { value: 0, label: '', color: '' });
    const pct = segTotal > 0 ? Math.min(100, largest.value / segTotal * 100) : 0;

    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.15em')
      .attr('fill', '#e8eef6').attr('font-size', Math.min(22, R * 0.42)).attr('font-weight', 700)
      .attr('font-family', "'IBM Plex Mono', monospace").text(`${pct.toFixed(0)}%`);
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1.15em')
      .attr('fill', '#7c8aa3').attr('font-size', Math.min(7, R * 0.14))
      .attr('font-family', "'IBM Plex Mono', monospace").text(largest.label.toUpperCase());

    // Legend
    const legY0  = cy + R + 14;
    const legH   = 16;
    const totalW = segments.length * 88;
    const legX0  = (W - totalW) / 2;

    segments.forEach((s, i) => {
      const lx = legX0 + i * 88;
      svg.append('rect').attr('x', lx).attr('y', legY0).attr('width', 8).attr('height', 5).attr('rx', 1).attr('fill', s.color);
      svg.append('text').attr('x', lx + 11).attr('y', legY0 + 5)
        .attr('fill', '#5a6880').attr('font-size', 6.5)
        .attr('font-family', "'IBM Plex Mono', monospace")
        .text(`${s.label} ${segTotal > 0 ? Math.min(100, (s.value / segTotal * 100)).toFixed(0) : 0}%`);
      svg.append('text').attr('x', lx + 11).attr('y', legY0 + legH - 1)
        .attr('fill', '#7c8aa3').attr('font-size', 6.5)
        .attr('font-family', "'IBM Plex Mono', monospace")
        .text(`L ${fmt.format(s.value)}`);
    });

  }, [rawData, chartSize]);

  // ── Line chart: presupuesto evolution ────────────────────────────────────
  useEffect(() => {
    if (evolution.length < 2 || !lineSvgRef.current || chartSize.w < 40) return;
    const W = chartSize.w, H = chartSize.h;

    const svg = d3.select(lineSvgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', W).attr('height', H);

    const mL = 52, mR = 14, mT = 34, mB = 28;
    const iW = W - mL - mR;
    const iH = H - mT - mB;

    const startYear = evolution[0].year;
    const endYear   = evolution[evolution.length - 1].year;

    // Title
    svg.append('text')
      .attr('x', W / 2).attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#7c8aa3').attr('font-size', 8.5)
      .attr('font-family', "'IBM Plex Mono', monospace")
      .attr('letter-spacing', '0.08em')
      .text(`EVOLUCIÓN ${startYear}–${endYear}`);

    const xScale = d3.scalePoint(evolution.map(d => String(d.year)), [0, iW]);
    const maxB   = d3.max(evolution, d => d.budget) || 1;
    const yScale = d3.scaleLinear([0, maxB * 1.12], [iH, 0]);

    const g = svg.append('g').attr('transform', `translate(${mL},${mT})`);

    // Subtle grid
    yScale.ticks(4).forEach(t => {
      g.append('line')
        .attr('x1', 0).attr('x2', iW).attr('y1', yScale(t)).attr('y2', yScale(t))
        .attr('stroke', 'rgba(0,212,184,0.07)').attr('stroke-dasharray', '3,4');
    });

    // Y axis ticks
    yScale.ticks(4).forEach(t => {
      g.append('text')
        .attr('x', -5).attr('y', yScale(t))
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', '#4a5a73').attr('font-size', 6.5)
        .attr('font-family', "'IBM Plex Mono', monospace")
        .text(`L${fmt.format(t)}`);
    });

    // X axis labels
    evolution.forEach(d => {
      g.append('text')
        .attr('x', xScale(String(d.year)) ?? 0).attr('y', iH + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', '#4a5a73').attr('font-size', 6.5)
        .attr('font-family', "'IBM Plex Mono', monospace")
        .text(String(d.year));
    });

    // Area fill
    const area = d3.area<EvoPoint>()
      .x(d => xScale(String(d.year)) ?? 0)
      .y0(iH).y1(d => yScale(d.budget))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(evolution)
      .attr('d', area).attr('fill', 'rgba(0,212,184,0.08)');

    // Line
    const line = d3.line<EvoPoint>()
      .x(d => xScale(String(d.year)) ?? 0)
      .y(d => yScale(d.budget))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(evolution)
      .attr('d', line).attr('fill', 'none')
      .attr('stroke', '#00d4b8').attr('stroke-width', 1.8);

    // Dots + year labels on hover-zone
    evolution.forEach((d, i) => {
      const x = xScale(String(d.year)) ?? 0;
      const y = yScale(d.budget);
      const isLast = i === evolution.length - 1;

      g.append('circle')
        .attr('cx', x).attr('cy', y).attr('r', isLast ? 4.5 : 3)
        .attr('fill', isLast ? '#00d4b8' : '#00b89e')
        .attr('stroke', '#070c1a').attr('stroke-width', 1.5);

      if (isLast) {
        g.append('text')
          .attr('x', x).attr('y', y - 10)
          .attr('text-anchor', 'middle')
          .attr('fill', '#00d4b8').attr('font-size', 7).attr('font-weight', 600)
          .attr('font-family', "'IBM Plex Mono', monospace")
          .text(`L${fmt.format(d.budget)}`);
      }
    });

    // Accumulated change badge (top right)
    const first = evolution[0];
    const last  = evolution[evolution.length - 1];
    if (first && last && first.budget > 0) {
      const pct  = (last.budget - first.budget) / first.budget * 100;
      const sign = pct >= 0 ? '+' : '';
      const col  = pct >= 0 ? '#00d4b8' : '#ef5a5a';
      svg.append('rect')
        .attr('x', W - mR - 70).attr('y', mT - 26)
        .attr('width', 70).attr('height', 16).attr('rx', 4)
        .attr('fill', pct >= 0 ? 'rgba(0,212,184,0.12)' : 'rgba(239,90,90,0.12)')
        .attr('stroke', pct >= 0 ? 'rgba(0,212,184,0.35)' : 'rgba(239,90,90,0.35)')
        .attr('stroke-width', 1);
      svg.append('text')
        .attr('x', W - mR - 35).attr('y', mT - 14)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', col).attr('font-size', 8).attr('font-weight', 700)
        .attr('font-family', "'IBM Plex Mono', monospace")
        .text(`${sign}${pct.toFixed(0)}% acum.`);
    }

  }, [evolution, chartSize]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%', overflow: 'hidden',
      background: 'rgba(7,11,22,0.6)',
    }}>
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '11px 22px',
        borderBottom: '1px solid rgba(0,212,184,0.14)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(13,21,38,0.9)',
            border: '1px solid rgba(0,212,184,0.35)',
            borderRadius: 7, color: '#00d4b8', cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, fontWeight: 600, padding: '6px 14px',
            letterSpacing: '0.06em', flexShrink: 0,
          }}
        >
          ← {deptName.toUpperCase()}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#e8eef6', lineHeight: 1, letterSpacing: '0.01em' }}>
              {muniName}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 600, color: '#5eead4',
              background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.3)',
              borderRadius: 4, padding: '2px 7px',
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em',
            }}>
              DEPTO. {deptName.toUpperCase()}
            </span>
            {isCapital && (
              <span style={{
                fontSize: 9, fontWeight: 600, color: '#f59e0b',
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: 4, padding: '2px 7px',
                fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em',
              }}>
                CAPITAL DEPARTAMENTAL
              </span>
            )}
          </div>
        </div>

        {/* Year pills */}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {DETAIL_YEARS.map(y => (
            <button
              key={y}
              onClick={() => setMuniYear(y)}
              style={{
                background: muniYear === y ? 'rgba(0,212,184,0.18)' : 'transparent',
                border: `1px solid ${muniYear === y ? 'rgba(0,212,184,0.6)' : 'rgba(0,212,184,0.18)'}`,
                borderRadius: 6, color: muniYear === y ? '#00d4b8' : '#5a6880',
                cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, fontWeight: muniYear === y ? 700 : 400,
                padding: '4px 9px', transition: 'all 0.14s',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* ── ROW 1: 6 KPI cards ─────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6,
        padding: '10px 22px 18px 22px', flexShrink: 0,
        borderBottom: '1px solid rgba(0,212,184,0.12)',
        marginBottom: 2,
      }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: 'rgba(13,21,38,0.74)',
            border: '1px solid rgba(0,212,184,0.12)',
            borderRadius: 8, padding: '8px 10px', minWidth: 0,
          }}>
            <div style={{
              fontSize: 7.5, color: '#4a5a73',
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.1em', marginBottom: 5,
            }}>
              {k.label}
            </div>
            {rawLoad ? (
              <div style={{ width: '60%', height: 12, borderRadius: 3, background: 'rgba(0,212,184,0.1)' }} />
            ) : (
              <div style={{
                fontSize: 12, fontWeight: 700, color: k.color,
                fontFamily: "'IBM Plex Mono', monospace",
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {k.value}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── ROW 2: 3 charts ────────────────────────────────────────────── */}
      <div
        ref={chartsRowRef}
        style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}
      >
        {/* LEFT: horizontal bar comparison */}
        <div style={{
          flex: 1, borderRight: '1px solid rgba(0,212,184,0.08)',
          display: 'flex', alignItems: 'stretch',
        }}>
          {rawLoad || !rawData ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(0,212,184,0.15)', borderTopColor: '#00d4b8', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <svg ref={barSvgRef} style={{ display: 'block' }} />
          )}
        </div>

        {/* CENTER: donut */}
        <div style={{
          flex: 1, borderRight: '1px solid rgba(0,212,184,0.08)',
          display: 'flex', alignItems: 'stretch',
        }}>
          {rawLoad || !rawData ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(0,212,184,0.15)', borderTopColor: '#00d4b8', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <svg ref={donutSvgRef} style={{ display: 'block' }} />
          )}
        </div>

        {/* RIGHT: evolution line */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'stretch',
        }}>
          {evolution.length < 2 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace" }}>
                sin datos de evolución
              </span>
            </div>
          ) : (
            <svg ref={lineSvgRef} style={{ display: 'block' }} />
          )}
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 22px',
        borderTop: '1px solid rgba(0,212,184,0.08)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 7, color: '#2d3d54', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          FUENTE: AMHON / SEFIN / INE HONDURAS
        </span>
        <span style={{ fontSize: 7, color: '#2d3d54', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          SIMHO — SISTEMA DE INFORMACIÓN MUNICIPAL DE HONDURAS
        </span>
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
