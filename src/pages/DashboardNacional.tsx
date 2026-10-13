// Panorama Nacional (mockup aprobado: docs/mockups/panorama-nacional.mockup.html).
import React, { useMemo } from 'react';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useNavbar } from '../context/NavbarContext';
import { resumenNacional } from '../lib/indicadores';
import { NO_DATA_MSG } from '../utils/sefin';
import { ANIOS_SEFIN } from '../data/anios';
import SelectorAnio from '../components/SelectorAnio';
import { C, MONO, COND, SANS } from '../components/ficha/estilo';
import {
  LecturaNacional, TarjetasNacionales, DistribucionAutonomia, TablaCategorias, SeccionDepartamentos, TendenciaAutonomia,
} from '../components/panorama/SeccionesPanorama';

const contenedor: React.CSSProperties = { flex: 1, overflowY: 'auto', background: C.fondo, color: C.texto, fontFamily: SANS };
const columna: React.CSSProperties = {
  padding: '28px clamp(16px, 3vw, 40px) 24px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1240,
  containerType: 'inline-size', // tarjetas según el ancho del contenido (index.css: .panorama-tarjetas)
};

export default function DashboardNacional() {
  const { fiscalYear, indicator, setIndicator } = useNavbar();
  const { municipalities, loading } = useMunicipalitiesMultiYear(ANIOS_SEFIN);
  const filasAnio = useMemo(() => municipalities.filter((m) => m.year === fiscalYear), [municipalities, fiscalYear]);
  const r = useMemo(() => resumenNacional(municipalities, fiscalYear), [municipalities, fiscalYear]);
  const sinDatos = !loading && filasAnio.length === 0;

  return (
    <div className="simho-scroll simho-view-in" style={contenedor}>
      <div style={columna}>
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: C.suave }}>HONDURAS · {fiscalYear}</div>
            <h1 style={{ margin: '4px 0 0', fontFamily: COND, fontSize: 'clamp(30px, 5vw, 40px)', fontWeight: 700 }}>Panorama Nacional</h1>
            <div style={{ fontSize: 14, color: C.suave, marginTop: 4 }}>
              {loading ? 'Cargando…' : sinDatos ? `${NO_DATA_MSG} (${fiscalYear})`
                : `${r.n} municipios en estadísticas · ${r.departamentos} departamentos`
                  + (r.excluidos.length ? ` · ${r.excluidos.length} excluidos (${r.excluidos.join(', ')})` : '')}
            </div>
          </div>
          <SelectorAnio alto />
        </header>

        {!loading && !sinDatos && (
          <>
            <LecturaNacional r={r} />
            <TarjetasNacionales r={r} />
            <DistribucionAutonomia r={r} />
            <TablaCategorias r={r} />
            <SeccionDepartamentos filasAnio={filasAnio} metrica={indicator} onMetrica={setIndicator} anio={fiscalYear} />
            <TendenciaAutonomia filas={municipalities} anios={ANIOS_SEFIN} />
          </>
        )}
      </div>
    </div>
  );
}
