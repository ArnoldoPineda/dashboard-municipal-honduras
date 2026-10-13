// Ficha Municipal única (Fase 3): reemplaza la ficha del mapa y la antigua Detalle Municipio.
// Todas las cifras salen de lib/indicadores (comparacionPares, semaforo, lecturaSimho) y lib/formato (fmtL).
import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useNavbar } from '../context/NavbarContext';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { ANIOS_SEFIN } from '../data/anios';
import { deptSlug, NO_DATA_MSG } from '../utils/sefin';
import { comparacionPares, excluirDeEstadisticas, ClaveSemaforo } from '../lib/indicadores';
import EncabezadoFicha from '../components/ficha/EncabezadoFicha';
import BuscadorMunicipio from '../components/ficha/BuscadorMunicipio';
import { LecturaSimho, TarjetasIndicadores, FranjaResultado, Comparaciones } from '../components/ficha/TarjetasIndicadores';
import PestanasFicha from '../components/ficha/PestanasFicha';
import DetalleContable from '../components/ficha/DetalleContable';
import { C, SANS, MONO, h2 } from '../components/ficha/estilo';

/** Última ficha consultada (para /muni-detalle). */
export const CLAVE_ULTIMA_FICHA = 'simho:ultimaFicha';

const CLAVES: ClaveSemaforo[] = [
  'autonomia', 'propiosPerCapita', 'funcionamientoSobreCorrientes', 'inversionSobreGasto',
  'servicioDeudaSobreCorrientes', 'balanceSobreIngresos', 'ibiPerCapita', 'inversionPerCapita',
  'dependenciaTransferencias', 'resultadoSinBalance',
];

const contenedor: React.CSSProperties = {
  flex: 1, overflowY: 'auto', background: C.fondo, color: C.texto, fontFamily: SANS,
};
const columna: React.CSSProperties = {
  padding: '28px clamp(16px, 3vw, 40px) 24px', display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1240,
};

function Mensaje({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 32, fontFamily: MONO, color: C.suave }}>{children}</div>;
}

export default function FichaMunicipal() {
  const { deptId, code } = useParams<{ deptId: string; code: string }>();
  const { fiscalYear } = useNavbar();
  const { municipalities, loading } = useMunicipalitiesMultiYear(ANIOS_SEFIN);

  const filasMuni = useMemo(
    () => municipalities.filter((m) => deptSlug(m.department) === deptId && String(m.code) === code).sort((a, b) => a.year - b.year),
    [municipalities, deptId, code],
  );
  const fila = filasMuni.find((m) => m.year === fiscalYear) ?? null;

  const comps: Comparaciones = useMemo(() => {
    if (!fila) return {};
    const delAnio = municipalities.filter((m) => m.year === fila.year);
    return Object.fromEntries(CLAVES.map((k) => [k, comparacionPares(delAnio, fila, k)]));
  }, [municipalities, fila]);

  useEffect(() => {
    try { localStorage.setItem(CLAVE_ULTIMA_FICHA, `/municipio/${deptId}/${code}`); } catch { /* sin almacenamiento */ }
  }, [deptId, code]);

  if (loading) return <Mensaje>Cargando datos SEFIN…</Mensaje>;
  if (!filasMuni.length) return <BuscarFicha filas={municipalities} mensaje="Municipio no encontrado." />;

  const encabezado = fila ?? filasMuni[filasMuni.length - 1];
  const excluida = fila ? excluirDeEstadisticas(fila) : false;

  return (
    <div style={contenedor}>
      <div style={columna}>
        <EncabezadoFicha fila={encabezado} filas={municipalities} />
        {!fila ? (
          <Mensaje>⚠ {NO_DATA_MSG} ({fiscalYear})</Mensaje>
        ) : (
          <>
            <LecturaSimho fila={fila} comps={comps} excluida={excluida} />
            <TarjetasIndicadores fila={fila} comps={comps} excluida={excluida} />
            <FranjaResultado fila={fila} />
            <PestanasFicha fila={fila} filasMuni={filasMuni} comps={comps} excluida={excluida} />
            <DetalleContable fila={fila} />
          </>
        )}
      </div>
    </div>
  );
}

/** Sin municipio elegido (o no encontrado): solo el buscador. */
export function BuscarFicha({ filas, mensaje }: { filas: Parameters<typeof BuscadorMunicipio>[0]['filas']; mensaje?: string }) {
  return (
    <div style={contenedor}>
      <div style={columna}>
        <h1 style={{ ...h2, fontSize: 36 }}>Ficha Municipal</h1>
        <p style={{ margin: 0, color: C.suave }}>{mensaje ?? 'Busque un municipio para ver su ficha.'}</p>
        <div style={{ maxWidth: 360 }}><BuscadorMunicipio filas={filas} /></div>
      </div>
    </div>
  );
}
