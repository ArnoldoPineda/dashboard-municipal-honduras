// Mini mapa del departamento con el municipio resaltado (geometrías OCHA COD-AB de useMunicipiosTopo).
import React, { useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useMunicipiosTopo } from '../../hooks/useMunicipiosTopo';
import { normName } from '../../utils/sefin';
import { C } from './estilo';

const W = 132, H = 96;

export default function MiniMapaDepto({ department, claveMunicipio, nombre }: {
  department: string | null; claveMunicipio: string; nombre: string;
}) {
  const topo = useMunicipiosTopo();
  const formas = useMemo(() => {
    if (!topo || !department) return [];
    const objeto = topo.objects.municipios;
    const geoms = objeto.geometries.filter((g: any) => normName(g.properties?.department) === normName(department));
    const fc = topojson.feature(topo, { ...objeto, geometries: geoms }) as any;
    const path = d3.geoPath(d3.geoMercator().fitExtent([[2, 2], [W - 2, H - 2]], fc));
    return fc.features.map((f: any) => ({ key: f.properties.key as string, d: path(f) ?? '' }));
  }, [topo, department]);

  if (!formas.length) return <div style={{ width: W, height: H }} aria-hidden="true" />;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ubicación de ${nombre} en su departamento`}>
      {formas.map((f: { key: string; d: string }) => (
        <path key={f.key} d={f.d} stroke={C.fondo} strokeWidth={0.6}
          fill={f.key === claveMunicipio ? C.turquesa : '#24364d'} />
      ))}
    </svg>
  );
}
