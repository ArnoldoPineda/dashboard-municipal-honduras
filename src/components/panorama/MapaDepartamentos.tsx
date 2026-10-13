// Mapa real de los 18 departamentos (límites OCHA COD-AB) coloreado por la métrica seleccionada.
// Clic en un departamento → Vista Departamental. Compartido por el Panorama y el Mapa nacional.
import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useNavigate } from 'react-router-dom';
import type { Municipality } from '../../hooks/useMunicipalities';
import { useMunicipiosTopo } from '../../hooks/useMunicipiosTopo';
import { resumenPorDepartamento, clasesQuintil, MetricaMapa, Clases, ResumenDepartamento } from '../../lib/indicadores';
import { colorMetrica, textoSobre, textoClase, METRICAS, CATEGORICA, SECUENCIAL, SIN_DATO, ETIQUETA_METRICA } from '../../lib/colorMetrica';
import { nombreDepartamento } from '../../data/departamentos';
import { deptSlug } from '../../utils/sefin';

const W = 640, H = 400;
const MONO = "'IBM Plex Mono', monospace";

export interface DatosDepartamentos { filas: ResumenDepartamento[]; clases?: Clases }

/** Valores y clases por departamento para una métrica (reutilizado por el ranking del Panorama). */
export function datosDepartamentos(filasAnio: Municipality[], metrica: MetricaMapa): DatosDepartamentos {
  const filas = resumenPorDepartamento(filasAnio, metrica);
  if (metrica === 'categoria') return { filas };
  return { filas, clases: clasesQuintil(filas.map((f) => f.valor), METRICAS[metrica].direccion) };
}

export const valorTexto = (metrica: MetricaMapa, d: ResumenDepartamento) =>
  metrica === 'categoria'
    ? (d.categoria ? `Cat. ${d.categoria}` : '—')
    : d.valor == null ? '—' : METRICAS[metrica].formato(d.valor);

export function LeyendaMetrica({ metrica, clases, sinDato = false }: { metrica: MetricaMapa; clases?: Clases; sinDato?: boolean }) {
  const items = metrica === 'categoria'
    ? Object.entries(CATEGORICA).map(([c, color]) => ({ color, texto: `Categoría ${c}` }))
    : (clases?.rangos ?? []).map((r) => ({
      color: SECUENCIAL[r.clase],
      texto: `${METRICAS[metrica].formato(r.desde)} – ${METRICAS[metrica].formato(r.hasta)}`,
    }));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', alignItems: 'center', fontFamily: MONO, fontSize: 11, color: '#a9b7c8' }}>
      {items.map((it) => (
        <span key={it.texto} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 3, background: it.color, display: 'inline-block' }} />{it.texto}
        </span>
      ))}
      {sinDato && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 3, display: 'inline-block', background: `repeating-linear-gradient(45deg, ${SIN_DATO} 0 3px, #8a9bb0 3px 5px)` }} />Sin dato comparable
        </span>
      )}
      {metrica !== 'categoria' && <span style={{ color: '#8a9bb0' }}>Más claro = mejor</span>}
    </div>
  );
}

export default function MapaDepartamentos({ filasAnio, metrica, maxAlto = 420 }: { filasAnio: Municipality[]; metrica: MetricaMapa; maxAlto?: number | string }) {
  const topo = useMunicipiosTopo();
  const navigate = useNavigate();
  const [hover, setHover] = useState<{ x: number; y: number; d: ResumenDepartamento } | null>(null);
  const datos = useMemo(() => datosDepartamentos(filasAnio, metrica), [filasAnio, metrica]);
  const porDepto = useMemo(() => new Map(datos.filas.map((f) => [f.department, f])), [datos]);

  const formas = useMemo(() => {
    if (!topo) return [];
    const fc = topojson.feature(topo, topo.objects.departamentos) as any;
    const path = d3.geoPath(d3.geoMercator().fitExtent([[8, 8], [W - 8, H - 8]], fc));
    return fc.features.map((f: any) => {
      const [[x0, y0], [x1, y1]] = path.bounds(f);
      // Rótulo solo donde cabe sin encimarse (los departamentos pequeños del occidente quedan al tooltip y al ranking).
      const rotulo = path.area(f) > 1500 && (x1 - x0) * (y1 - y0) > 6000;
      return { department: String(f.properties.department).toUpperCase(), d: path(f) ?? '', c: path.centroid(f), rotulo };
    });
  }, [topo]);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
        aria-label={`Mapa de los 18 departamentos coloreado por ${ETIQUETA_METRICA[metrica]}; clic para abrir el departamento`}
        style={{ display: 'block', maxHeight: maxAlto, minHeight: 220 }} onMouseLeave={() => setHover(null)}>
        {formas.map((f: any) => {
          const d = porDepto.get(f.department);
          const fill = d ? colorMetrica(metrica, d, datos.clases) : SIN_DATO;
          return (
            <path key={f.department} d={f.d} fill={fill} stroke="#0a0f1a" strokeWidth={1.2} style={{ cursor: 'pointer' }}
              onMouseMove={(e) => {
                const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                if (d) setHover({ x: e.clientX - r.left, y: e.clientY - r.top, d });
              }}
              onClick={() => navigate(`/departamento/${deptSlug(f.department)}`)}>
              <title>{nombreDepartamento(f.department)}</title>
            </path>
          );
        })}
        {formas.filter((f: any) => f.rotulo).map((f: any) => {
          const d = porDepto.get(f.department);
          const fill = d ? colorMetrica(metrica, d, datos.clases) : SIN_DATO;
          return d ? (
            <text key={`t-${f.department}`} x={f.c[0]} y={f.c[1]} textAnchor="middle" dominantBaseline="middle"
              fontFamily={MONO} fontSize={12} fontWeight={600} fill={textoSobre(fill.startsWith('#') ? fill : SIN_DATO)}
              style={{ pointerEvents: 'none' }}>{valorTexto(metrica, d)}</text>
          ) : null;
        })}
      </svg>
      {hover && (
        <div role="tooltip" style={{
          position: 'absolute', left: Math.min(hover.x + 12, 9999), top: hover.y + 12, pointerEvents: 'none', zIndex: 5,
          background: '#0c1320', border: '1px solid #2a3d55', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#e6edf3',
          maxWidth: 240,
        }}>
          <div style={{ fontWeight: 600 }}>{nombreDepartamento(hover.d.department)}</div>
          <div style={{ fontFamily: MONO }}>{ETIQUETA_METRICA[metrica]}: {valorTexto(metrica, hover.d)}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#a9b7c8' }}>
            {metrica === 'categoria'
              ? Object.entries(hover.d.conteo ?? {}).map(([c, n]) => `${c} ${n}`).join(' · ')
              : textoClase(datos.clases?.clase(hover.d.valor) ?? null)}
          </div>
        </div>
      )}
      <LeyendaMetrica metrica={metrica} clases={datos.clases} />
    </div>
  );
}
