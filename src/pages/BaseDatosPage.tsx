// Base de Datos: tabla municipal filtrable y ordenable por vista, con pie (TOTAL / MEDIANA) y exportación Excel/CSV.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Municipality } from '../hooks/useMunicipalities';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useNavbar } from '../context/NavbarContext';
import {
  ROTULO_POBLACION, ROTULO_SIN_LIQUIDACION, Indicadores, indicadoresMunicipio, insumos,
  excluirDeEstadisticas, excluirDeTotales, notaDatoIncompleto, notaTotales, pieTabla, notaMedianaDeuda,
} from '../lib/indicadores';
import { fmtL, fmtPct, fmtNum } from '../lib/formato';
import { DEPARTAMENTOS, nombreDepartamento, codigoINE } from '../data/departamentos';
import { ANIOS_SEFIN } from '../data/anios';
import { opcionesMunicipios, buscarMunicipios, rutaFicha } from '../lib/municipios';
import { descargarXlsx, descargarCsv, nombreArchivo, TablaExport, Celda } from '../lib/exportar';
import { C, MONO, COND, SANS, panel } from '../components/ficha/estilo';

type Tipo = 'texto' | 'entero' | 'monto' | 'pct' | 'lph';
interface Col { clave: string; titulo: string; tipo: Tipo; valor: (m: Municipality) => string | number | null; grupo?: string }

const DEPTS = [...DEPARTAMENTOS].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
const num = (v: unknown) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const sefin = (clave: keyof Municipality, titulo: string, grupo: string, tipo: Tipo = 'monto'): Col =>
  ({ clave, titulo, tipo, grupo, valor: (m) => num(m[clave]) });
const ind = (clave: keyof Indicadores, titulo: string, tipo: Tipo): Col => ({ clave, titulo, tipo, valor: (m) => indicadoresMunicipio(m)[clave] });

const DEPTO: Col = { clave: 'department', titulo: 'Departamento', tipo: 'texto', valor: (m) => nombreDepartamento(m.department), grupo: 'Identificación' };
const CAT: Col = { clave: 'categoria', titulo: 'Cat.', tipo: 'texto', valor: (m) => m.category ?? '', grupo: 'Identificación' };
const POB: Col = { clave: 'population', titulo: 'Población', tipo: 'entero', valor: (m) => num(m.population), grupo: 'Identificación' };
const TRANSF: Col = { clave: 'transferencias', titulo: 'Transferencias (L)', tipo: 'monto', valor: (m) => insumos(m).transferencias };

const VISTAS: Record<string, { etiqueta: string; cols: Col[] }> = {
  indicadores: { etiqueta: 'Indicadores', cols: [
    DEPTO, CAT, POB,
    ind('ingresosDelAnio', 'Ingresos del año (L)', 'monto'),
    ind('ingresosCorrientes', 'Ingresos corrientes (L)', 'monto'),
    TRANSF,
    sefin('gastos_funcionamiento', 'Funcionamiento (L)', ''),
    sefin('bienes_capitalizables', 'Inversión (L)', ''),
    ind('autonomia', 'Autonomía (%)', 'pct'),
    ind('propiosPerCapita', 'Propios por hab. (L)', 'lph'),
    ind('servicioDeudaSobreCorrientes', 'Servicio de deuda (% corrientes)', 'pct'),
  ] },
  ingresos: { etiqueta: 'Ingresos', cols: [
    DEPTO,
    sefin('ingresos_recaudados', 'Ingresos recaudados (L)', ''),
    sefin('recursos_balance', 'Recursos de balance (L)', ''),
    ind('ingresosDelAnio', 'Ingresos del año (L)', 'monto'),
    ind('ingresosCorrientes', 'Ingresos corrientes (L)', 'monto'),
    sefin('ingresos_tributarios', 'Tributarios G1 (L)', ''),
    sefin('impuesto_bi', 'Bienes inmuebles (L)', ''),
    sefin('tasas_servicios', 'Tasas por servicios (L)', ''),
    sefin('derechos', 'Derechos (L)', ''),
    sefin('ingresos_no_tributarios', 'No tributarios G2 (L)', ''),
    sefin('ingresos_capital', 'Ingresos de capital (L)', ''),
    sefin('prestamos', 'Préstamos (L)', ''),
    sefin('transferencias_art91', 'Art. 91 (L)', ''),
    sefin('otras_transferencias', 'Otras transferencias (L)', ''),
    ind('autonomia', 'Autonomía (%)', 'pct'),
    ind('dependenciaTransferencias', 'Dependencia (%)', 'pct'),
  ] },
  gastos: { etiqueta: 'Gastos', cols: [
    DEPTO,
    sefin('total_egresos', 'Total egresos (L)', ''),
    sefin('gastos_funcionamiento', 'Funcionamiento (L)', ''),
    sefin('servicios_personales', 'Servicios personales (L)', ''),
    sefin('servicios_no_personales', 'Servicios no personales (L)', ''),
    sefin('materiales_suministro', 'Materiales y suministros (L)', ''),
    sefin('transferencias_corrientes', 'Transferencias corrientes (L)', ''),
    sefin('otros_gastos', 'Otros funcionamiento (L)', ''),
    sefin('gastos_capital_deuda', 'Capital y deuda (L)', ''),
    sefin('bienes_capitalizables', 'Bienes capitalizables (L)', ''),
    sefin('transferencias_capital', 'Transferencias de capital (L)', ''),
    sefin('servicios_deuda', 'Servicio de deuda (L)', ''),
    ind('funcionamientoSobreCorrientes', 'Funcionamiento ÷ corrientes (%)', 'pct'),
    ind('inversionSobreGasto', 'Inversión ÷ gasto (%)', 'pct'),
    ind('inversionPerCapita', 'Inversión por hab. (L)', 'lph'),
  ] },
  deuda: { etiqueta: 'Deuda y resultado', cols: [
    DEPTO,
    sefin('servicios_deuda', 'Servicio de deuda (L)', ''),
    ind('servicioDeudaSobreCorrientes', 'Servicio de deuda (% corrientes)', 'pct'),
    sefin('prestamos', 'Préstamos (L)', ''),
    sefin('colocacion_bonos', 'Colocación de bonos (L)', ''),
    ind('ahorroCorriente', 'Ahorro corriente (L)', 'monto'),
    sefin('recursos_balance', 'Recursos de balance (L)', ''),
    ind('balanceSobreIngresos', 'Balance ÷ ingresos (%)', 'pct'),
    sefin('superavit_deficit', 'Superávit/déficit SEFIN (L)', ''),
    ind('resultadoConBalance', 'Resultado con balance (L)', 'monto'),
    ind('resultadoSinBalance', 'Resultado sin balance (L)', 'monto'),
  ] },
  sefin: { etiqueta: 'SEFIN completa', cols: [
    { clave: 'cod_ine', titulo: 'Cód. INE', tipo: 'texto', valor: (m) => codigoINE(m.department, m.code), grupo: 'Identificación' },
    DEPTO, { ...CAT, titulo: 'Categoría SGJD 2020' }, { ...POB, titulo: ROTULO_POBLACION },
    sefin('presupuesto_municipal', 'Presupuesto municipal', 'Totales'),
    sefin('gastos_presupuestados', 'Gastos presupuestados', 'Totales'),
    sefin('ingresos_propios', 'Ingresos propios (SEFIN)', 'Totales'),
    sefin('ingresos_recaudados', 'Ingresos recaudados', 'Totales'),
    sefin('autonomia_financiera', 'Autonomía financiera (SEFIN, %)', 'Totales', 'pct'),
    sefin('ingresos_corrientes', 'Ingresos corrientes (SEFIN)', 'Totales'),
    sefin('ingresos_tributarios', 'Ingresos tributarios', 'G1 · Tributarios'),
    sefin('impuesto_bi', 'Impuesto sobre bienes inmuebles', 'G1 · Tributarios'),
    sefin('impuesto_personal', 'Impuesto personal o vecinal', 'G1 · Tributarios'),
    sefin('impuesto_industria', 'Impuesto s/industria', 'G1 · Tributarios'),
    sefin('impuesto_comercio', 'Impuesto s/comercio', 'G1 · Tributarios'),
    sefin('impuesto_servicios', 'Impuesto s/servicios', 'G1 · Tributarios'),
    sefin('impuesto_pecuario', 'Impuesto pecuario', 'G1 · Tributarios'),
    sefin('impuesto_extraccion', 'Impuesto s/extracción', 'G1 · Tributarios'),
    sefin('impuesto_telecomunicaciones', 'Impuesto de telecomunicaciones', 'G1 · Tributarios'),
    sefin('tasas_servicios', 'Tasas por servicios', 'G1 · Tributarios'),
    sefin('derechos', 'Derechos', 'G1 · Tributarios'),
    sefin('ingresos_no_tributarios', 'Ingresos no tributarios', 'G2 · No tributarios'),
    sefin('ingresos_capital', 'Ingresos de capital', 'G4 · Capital y transferencias'),
    sefin('prestamos', 'Préstamos', 'G4 · Capital y transferencias'),
    sefin('venta_activos', 'Venta de activos', 'G4 · Capital y transferencias'),
    sefin('contribuciones', 'Contribuciones', 'G4 · Capital y transferencias'),
    sefin('colocacion_bonos', 'Colocación en bonos', 'G4 · Capital y transferencias'),
    sefin('transferencias_art91', 'Transferencias Art. 91', 'G4 · Capital y transferencias'),
    sefin('otras_transferencias', 'Otras transferencias', 'G4 · Capital y transferencias'),
    sefin('subsidios', 'Subsidios', 'G4 · Capital y transferencias'),
    sefin('herencias_legados', 'Herencias, legados y donaciones', 'G4 · Capital y transferencias'),
    sefin('otros_ingresos_capital', 'Otros ingresos de capital', 'G4 · Capital y transferencias'),
    sefin('recursos_balance', 'Recursos de balance', 'G4 · Capital y transferencias'),
    sefin('gastos_funcionamiento', 'Gastos de funcionamiento', 'Gastos'),
    sefin('servicios_personales', 'Servicios personales', 'Gastos'),
    sefin('servicios_no_personales', 'Servicios no personales', 'Gastos'),
    sefin('materiales_suministro', 'Materiales, suministro y maquinaria', 'Gastos'),
    sefin('transferencias_corrientes', 'Transferencias corrientes', 'Gastos'),
    sefin('otros_gastos', 'Otros', 'Gastos'),
    sefin('gastos_capital_deuda', 'Gastos de capital y deuda pública', 'Gastos'),
    sefin('bienes_capitalizables', 'Bienes capitalizables', 'Gastos'),
    sefin('transferencias_capital', 'Transferencias', 'Gastos'),
    sefin('activos_financieros', 'Activos financieros', 'Gastos'),
    sefin('servicios_deuda', 'Servicios de deuda', 'Gastos'),
    sefin('otros_gastos_capital', 'Otros gastos', 'Gastos'),
    sefin('asignaciones_globales', 'Asignaciones globales', 'Gastos'),
    sefin('total_egresos', 'Total egresos', 'Gastos'),
    sefin('superavit_deficit', 'Superávit o déficit', 'Gastos'),
    sefin('gasto_corriente', 'Gasto corriente (SEFIN: = ingreso corriente ajustado)', 'Control SEFIN'),
    sefin('ingreso_corriente_ajustado', 'Ingreso corriente ajustado', 'Control SEFIN'),
  ] },
};
type Vista = keyof typeof VISTAS;

const motivo = (m: Municipality) => (excluirDeEstadisticas(m) ? notaDatoIncompleto(m) ?? ROTULO_SIN_LIQUIDACION : null);
const fmtCelda = (tipo: Tipo, v: string | number | null) =>
  tipo === 'texto' ? (v ?? '') : tipo === 'pct' ? fmtPct(v as number | null) : tipo === 'entero' ? fmtNum(v as number | null) : fmtL(v as number | null, { completo: true });
const ROTULO: React.CSSProperties = { fontFamily: MONO, display: 'block', fontSize: 11, color: C.suave, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 };
const control: React.CSSProperties = { minHeight: 44, fontSize: 14 };

export default function BaseDatosPage() {
  const { fiscalYear, setFiscalYear } = useNavbar();
  const { municipalities, loading } = useMunicipalitiesMultiYear(ANIOS_SEFIN);
  const [depto, setDepto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [texto, setTexto] = useState('');
  const [vista, setVista] = useState<Vista>('indicadores');
  const [orden, setOrden] = useState<{ clave: string; dir: 1 | -1 } | null>(null);

  const cols = VISTAS[vista].cols;
  const opciones = useMemo(() => opcionesMunicipios(municipalities), [municipalities]);
  const filas = useMemo(() => {
    const ines = texto.trim() ? new Set(buscarMunicipios(texto, opciones, Infinity).map((o) => o.ine)) : null;
    return municipalities.filter((m) => m.year === fiscalYear
      && (!depto || codigoINE(m.department, m.code).slice(0, 2) === depto)
      && (!categoria || m.category === categoria)
      && (!ines || ines.has(codigoINE(m.department, m.code))));
  }, [municipalities, fiscalYear, depto, categoria, texto, opciones]);

  const ordenadas = useMemo(() => {
    const base = [...filas].sort((a, b) => codigoINE(a.department, a.code).localeCompare(codigoINE(b.department, b.code)));
    if (!orden) return base;
    const col = orden.clave === 'name' ? { valor: (m: Municipality) => m.name ?? '' } : cols.find((c) => c.clave === orden.clave);
    if (!col) return base;
    return base.sort((a, b) => {
      const x = col.valor(a), y = col.valor(b);
      const nx = x == null || x === '', ny = y == null || y === '';
      if (nx || ny) return nx && ny ? 0 : nx ? 1 : -1; // sin dato siempre al final
      return orden.dir * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es'));
    });
  }, [filas, orden, cols]);

  const pie = useMemo(() => pieTabla(filas, cols.map((c) => ({
    clave: c.clave, agregacion: c.tipo === 'monto' || c.tipo === 'entero' ? 'suma' : c.tipo === 'texto' ? 'ninguna' : 'mediana',
    valor: (m: Municipality) => { const v = c.valor(m); return typeof v === 'number' ? v : null; },
  }))), [filas, cols]);
  const nEst = filas.filter((m) => !excluirDeEstadisticas(m)).length;
  const nTot = filas.filter((m) => !excluirDeTotales(m)).length;
  const notaTot = notaTotales(filas);
  const esSuma = (c: Col) => c.tipo === 'monto' || c.tipo === 'entero';
  const numericas = cols.filter((c) => c.tipo !== 'texto');
  const deudaCero = cols.some((c) => c.clave === 'servicioDeudaSobreCorrientes') && pie.servicioDeudaSobreCorrientes === 0;
  const excluidas = filas.filter(excluirDeEstadisticas);

  const ordenar = (clave: string) => setOrden((o) => (o?.clave === clave ? { clave, dir: o.dir === 1 ? -1 : 1 } : { clave, dir: 1 }));
  const ariaSort = (clave: string): React.AriaAttributes['aria-sort'] => (orden?.clave === clave ? (orden.dir === 1 ? 'ascending' : 'descending') : 'none');
  const flecha = (clave: string) => (orden?.clave === clave ? (orden.dir === 1 ? ' ▲' : ' ▼') : '');

  // Grupos del encabezado (solo vista SEFIN completa): celdas contiguas con el mismo grupo.
  const grupos = vista === 'sefin' ? cols.reduce<{ g: string; n: number }[]>((acc, c) => {
    const g = c.grupo ?? '';
    if (acc.length && acc[acc.length - 1].g === g) acc[acc.length - 1].n++; else acc.push({ g, n: 1 });
    return acc;
  }, []) : null;

  const deptNombre = DEPTS.find((d) => d.cod === depto)?.nombre;
  const alcance = [deptNombre ?? 'Todos los departamentos', categoria ? `Categoría ${categoria}` : 'Todas las categorías'].join(' · ');

  function tablaExport(): TablaExport {
    return {
      columnas: [
        { clave: 'name', titulo: 'Municipio', tipo: 'texto' },
        ...cols.map((c) => ({ clave: c.clave, titulo: c.titulo, tipo: c.tipo })),
        { clave: 'nota', titulo: 'Nota (⚠ excluido)', tipo: 'texto' },
      ],
      filas: ordenadas.map((m) => [m.name ?? '', ...cols.map((c) => c.valor(m) as Celda), motivo(m)]),
      resumen: {
        columnas: [
          { clave: 'campo', titulo: 'Campo', tipo: 'texto' }, { clave: 'columna', titulo: 'Columna', tipo: 'texto' },
          { clave: 'criterio', titulo: 'Criterio', tipo: 'texto' }, { clave: 'valor', titulo: 'Valor', tipo: 'variable' },
        ],
        filas: [
          ['n_totales', 'Municipios en los totales', 'Conteo', nTot],
          ['n', 'Municipios en las medianas', 'Conteo', nEst],
          ...numericas.map((c) => [c.clave, c.titulo, esSuma(c) ? 'Total' : 'Mediana', pie[c.clave] ?? null] as Celda[]),
        ],
        tipoFila: ['entero', 'entero', ...numericas.map((c) => c.tipo as 'entero' | 'monto' | 'pct' | 'lph')],
        nota: `Totales de montos y población sin las filas sin liquidación (${filas.length - nTot}); medianas de porcentajes y montos por habitante `
          + `sin ninguna fila excluida (${excluidas.length}: sin liquidación, sin transferencia Art. 91 o rendición parcial). Grupo: año ${fiscalYear} · ${alcance}.`
          + (notaTot ? ` ${notaTot}` : '')
          + (deudaCero ? ` ${notaMedianaDeuda()}` : ''),
      },
    };
  }
  function notasExport(): [string, string][] {
    return [
      ['Página', `Base de Datos — vista ${VISTAS[vista].etiqueta}`],
      ['Filtros', `Año ${fiscalYear} · ${alcance}${texto.trim() ? ` · búsqueda "${texto.trim()}"` : ''}`],
      ['Filas', `${filas.length} municipios; ${nEst} en estadísticas`],
      ['Resumen', 'Hoja Resumen: totales de montos y población (sin las filas sin liquidación) y medianas de porcentajes y montos por habitante (sin ninguna fila excluida).'],
      ['Excluidos', excluidas.length ? excluidas.map((m) => `${m.name} (${codigoINE(m.department, m.code)}): ${motivo(m)}`).join(' · ') : 'Ninguno'],
    ];
  }
  const alcanceArchivo = [deptNombre, categoria && `Cat ${categoria}`].filter(Boolean).join(' ') || 'Pais';
  const nombre = (ext: 'xlsx' | 'csv') => nombreArchivo(`Base de Datos ${VISTAS[vista].etiqueta}`, alcanceArchivo, [fiscalYear], ext);

  const thBase: React.CSSProperties = { padding: 0, background: C.panel2, color: C.suave, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textAlign: 'right', borderBottom: `1px solid ${C.borde2}` };
  const botonOrden: React.CSSProperties = { all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'block', width: '100%', minHeight: 44, padding: '8px 10px', textAlign: 'inherit', fontFamily: MONO, color: 'inherit' };
  const fija = (bg: string, z = 1): React.CSSProperties => ({ position: 'sticky', left: 0, zIndex: z, background: bg, boxShadow: `1px 0 0 ${C.borde2}` });

  return (
    <div className="simho-scroll" style={{ flex: 1, overflowY: 'auto', background: C.fondo, color: C.texto, fontFamily: SANS }}>
      <div style={{ padding: '24px clamp(16px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <header>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: C.turquesa }}>SIMHO — SEFIN {fiscalYear}</div>
          <h1 style={{ margin: '4px 0 0', fontFamily: COND, fontSize: 'clamp(30px, 5vw, 38px)', fontWeight: 700 }}>Base de Datos</h1>
          <div style={{ fontSize: 14, color: C.suave, marginTop: 4 }}>
            {loading ? 'Cargando…' : `${filas.length} municipios · ${nEst} en estadísticas${excluidas.length ? ` · ${excluidas.length} con ⚠` : ''}`}
          </div>
        </header>

        <section aria-label="Filtros" className="bd-filtros" style={{ ...panel, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          <label><span style={ROTULO}>Año</span>
            <select className="simho-select" value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))} style={control}>
              {ANIOS_SEFIN.map((y) => <option key={y} value={y}>{y}</option>)}
            </select></label>
          <label><span style={ROTULO}>Departamento</span>
            <select className="simho-select" value={depto} onChange={(e) => setDepto(e.target.value)} style={control}>
              <option value="">Todos</option>
              {DEPTS.map((d) => <option key={d.cod} value={d.cod}>{d.nombre}</option>)}
            </select></label>
          <label><span style={ROTULO}>Categoría</span>
            <select className="simho-select" value={categoria} onChange={(e) => setCategoria(e.target.value)} style={control}>
              <option value="">Todas</option>
              {['A', 'B', 'C', 'D'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
          <label style={{ flex: '1 1 220px' }}><span style={ROTULO}>Buscar municipio</span>
            <input type="search" className="simho-search" value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder="Sin tildes, parcial: «sigua», «santa barbara»…" style={{ ...control, width: '100%' }} /></label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" disabled={loading} onClick={() => descargarXlsx(tablaExport(), notasExport(), nombre('xlsx'))}
              style={{ minHeight: 44, padding: '0 16px', borderRadius: 8, border: `1px solid ${C.turquesa}`, background: C.turquesa, color: '#062621', fontFamily: COND, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Descargar Excel</button>
            <button type="button" disabled={loading} onClick={() => descargarCsv(tablaExport(), nombre('csv'))}
              style={{ minHeight: 44, padding: '0 16px', borderRadius: 8, border: `1px solid ${C.borde2}`, background: 'transparent', color: C.texto2, fontFamily: COND, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>CSV</button>
          </div>
        </section>

        <div role="group" aria-label="Vista" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: C.panel, border: `1px solid ${C.borde2}`, borderRadius: 10, padding: 4, alignSelf: 'flex-start', maxWidth: '100%' }}>
          {(Object.keys(VISTAS) as Vista[]).map((v) => (
            <button key={v} type="button" aria-pressed={vista === v} onClick={() => { setVista(v); setOrden(null); }} style={{
              minHeight: 44, padding: '0 14px', borderRadius: 8, cursor: 'pointer', fontFamily: COND, fontSize: 16, fontWeight: 600,
              border: '1px solid transparent', background: vista === v ? C.turquesa : 'transparent', color: vista === v ? '#062621' : C.texto2,
            }}>{VISTAS[v].etiqueta}</button>
          ))}
        </div>

        <section aria-label={`Tabla: ${VISTAS[vista].etiqueta}`} style={{ ...panel, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: MONO, fontSize: 13 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
                {grupos && (
                  <tr>
                    <th aria-hidden="true" style={{ ...thBase, ...fija(C.panel2, 4) }} />
                    {grupos.map((g, i) => (
                      <th key={i} colSpan={g.n} scope="colgroup" style={{ ...thBase, textAlign: 'left', padding: '6px 10px', color: C.turquesa, borderLeft: `1px solid ${C.borde2}` }}>{g.g}</th>
                    ))}
                  </tr>
                )}
                <tr>
                  <th scope="col" aria-sort={ariaSort('name')} className="col-fija" style={{ ...thBase, ...fija(C.panel2, 4), textAlign: 'left', minWidth: 190 }}>
                    <button type="button" style={botonOrden} onClick={() => ordenar('name')}>MUNICIPIO{flecha('name')}</button>
                  </th>
                  {cols.map((c) => (
                    <th key={c.clave} scope="col" aria-sort={ariaSort(c.clave)} style={{ ...thBase, textAlign: c.tipo === 'texto' ? 'left' : 'right', minWidth: c.tipo === 'texto' ? 90 : 128 }}>
                      <button type="button" style={botonOrden} onClick={() => ordenar(c.clave)}>{c.titulo}{flecha(c.clave)}</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((m, i) => {
                  const bg = i % 2 ? C.panel : '#111a2b';
                  const nota = motivo(m);
                  const ruta = rutaFicha(codigoINE(m.department, m.code));
                  return (
                    <tr key={m.id ?? `${m.department}|${m.code}`} style={{ background: bg }}>
                      <th scope="row" className="col-fija" style={{ ...fija(bg), textAlign: 'left', padding: '8px 10px', fontWeight: 500, fontFamily: SANS, fontSize: 14 }}>
                        {ruta ? <Link to={ruta} style={{ color: C.texto, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>{m.name}</Link> : m.name}
                        {nota && <span role="img" title={nota} aria-label={excluirDeTotales(m) ? `Fuera de totales y medianas: ${nota}` : `Suma en los totales, fuera de las medianas: ${nota}`} style={{ color: C.ambar, marginLeft: 6, cursor: 'help' }}>⚠</span>}
                      </th>
                      {cols.map((c) => (
                        <td key={c.clave} style={{ padding: '8px 10px', textAlign: c.tipo === 'texto' ? 'left' : 'right', whiteSpace: 'nowrap', color: nota ? C.suave : C.texto }}>
                          {fmtCelda(c.tipo, c.valor(m))}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 3 }}>
                <tr>
                  <th scope="row" style={{ ...fija('#10302d', 4), textAlign: 'left', padding: '10px', color: C.turquesa, fontSize: 12, borderTop: `1px solid ${C.turquesa}` }}>
                    TOTAL / MEDIANA<div style={{ color: C.suave, fontSize: 11, fontWeight: 400 }}>{nTot} en totales · {nEst} en medianas</div>
                  </th>
                  {cols.map((c) => (
                    <td key={c.clave} style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap', background: '#10302d', fontWeight: 700, borderTop: `1px solid ${C.turquesa}` }}>
                      {c.tipo === 'texto' ? '' : <>{fmtCelda(c.tipo, pie[c.clave])}<div style={{ fontSize: 11, color: C.suave, fontWeight: 400 }}>{c.tipo === 'monto' || c.tipo === 'entero' ? 'total' : 'mediana'}</div></>}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
        {notaTot && <p style={{ margin: 0, fontSize: 13, color: C.ambar }}>Totales: {notaTot}</p>}
        {deudaCero && <p style={{ margin: 0, fontSize: 13, color: C.suave }}>Mediana del servicio de deuda en 0.0 %: {notaMedianaDeuda()}</p>}
        <p style={{ margin: 0, fontSize: 13, color: C.suave }}>
          ⚠ Sin liquidación: fuera de totales y medianas. Sin transferencia Art. 91 o rendición parcial: suman en los totales, pero quedan fuera de las medianas. Clic en un municipio para abrir su ficha.
        </p>
      </div>
    </div>
  );
}
