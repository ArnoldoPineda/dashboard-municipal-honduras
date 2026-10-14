// Rankings (Fase 6): quién está arriba y abajo en cada indicador. Posición, percentil y exclusiones salen de
// lib/indicadores (rankear: sentido "mejor" según SEMAFORO, excluidos al final sin posición).
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useNavbar } from '../context/NavbarContext';
import {
  ClaveSemaforo, SEMAFORO, FilaRanking, ROTULO_POBLACION, ROTULO_CATEGORIA, ROTULO_SIN_LIQUIDACION,
  rankear, sinLiquidacion, inversionCasiNula, rotuloInversionCasiNula, TEXTO_INVERSION_CASI_NULA,
} from '../lib/indicadores';
import { fmtNum } from '../lib/formato';
import { DEPARTAMENTOS, nombreDepartamento, codigoINE } from '../data/departamentos';
import { rutaFicha } from '../lib/municipios';
import { NO_DATA_MSG } from '../utils/sefin';
import { descargarXlsx, descargarCsv, nombreArchivo, TablaExport } from '../lib/exportar';
import SelectorAnio from '../components/SelectorAnio';
import OrdenMovil from '../components/OrdenMovil';
import { useEsMovil } from '../hooks/useMediaQuery';
import { ETIQUETAS, fmtIndicador } from '../components/ficha/TarjetasIndicadores';
import { C, MONO, COND, SANS, panel } from '../components/ficha/estilo';

const GRUPOS: { titulo: string; claves: ClaveSemaforo[] }[] = [
  { titulo: 'Per cápita', claves: ['propiosPerCapita', 'ibiPerCapita', 'inversionPerCapita'] },
  { titulo: 'Razones', claves: [
    'autonomia', 'dependenciaTransferencias', 'funcionamientoSobreCorrientes',
    'inversionSobreGasto', 'servicioDeudaSobreCorrientes', 'balanceSobreIngresos',
  ] },
];
const DEPTS = [...DEPARTAMENTOS].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
const NOTA_MONTOS = 'Los montos absolutos no se rankean porque favorecen a los municipios grandes; para capacidad de ahorro, ver Funcionamiento / ingresos corrientes.';
const REGLA_EXCLUSION = 'Posiciones y percentiles sin las filas sin liquidación, sin transferencia Art. 91 en la fuente o con rendición parcial; '
  + 'esas filas aparecen al final con ⚠ y sin posición. El percentil se calcula en la categoría completa del año (pares de la Ficha Municipal).';

type Vista = 'top' | 'bottom' | 'todos';
type Col = 'posicion' | 'municipio' | 'departamento' | 'categoria' | 'poblacion' | 'valor' | 'percentil';
const COLS: { col: Col; titulo: string; num: boolean }[] = [
  { col: 'posicion', titulo: 'Posición (en este filtro)', num: true },
  { col: 'municipio', titulo: 'Municipio', num: false },
  { col: 'departamento', titulo: 'Departamento', num: false },
  { col: 'categoria', titulo: 'Categoría', num: false },
  { col: 'poblacion', titulo: 'Población', num: true },
  { col: 'valor', titulo: 'Valor', num: true },
  { col: 'percentil', titulo: 'Percentil en su categoría', num: true },
];

const celda = (r: FilaRanking, col: Col): string | number | null => {
  switch (col) {
    case 'posicion': return r.posicion;
    case 'municipio': return r.fila.name ?? '';
    case 'departamento': return nombreDepartamento(r.fila.department);
    case 'categoria': return r.fila.category ?? '';
    case 'poblacion': return r.fila.population ?? null;
    case 'valor': return r.valor;
    case 'percentil': return r.percentil;
  }
};

export default function RankingsPage() {
  const { fiscalYear } = useNavbar();
  const navigate = useNavigate();
  const esMovil = useEsMovil();
  const [clave, setClave] = useState<ClaveSemaforo>('autonomia');
  const [categoria, setCategoria] = useState('');
  const [depto, setDepto] = useState('');
  const [vista, setVista] = useState<Vista>('top');
  const [orden, setOrden] = useState<{ col: Col; dir: 1 | -1 } | null>(null);
  const { municipalities: filasAnio, loading } = useMunicipalitiesMultiYear([fiscalYear]);
  const sinDatos = !loading && filasAnio.length === 0;

  const ranking = useMemo(() => {
    const visibles = filasAnio.filter((m) => (!categoria || m.category === categoria)
      && (!depto || codigoINE(m.department, m.code).slice(0, 2) === depto));
    return rankear(filasAnio, visibles, clave);
  }, [filasAnio, categoria, depto, clave]);

  const rankeados = useMemo(() => ranking.filter((r) => r.posicion != null), [ranking]);
  const excluidos = useMemo(() => ranking.filter((r) => r.motivo), [ranking]);
  const sinDato = ranking.length - rankeados.length - excluidos.length;

  const enVista = useMemo(() => (vista === 'top' ? rankeados.slice(0, 10) : vista === 'bottom' ? rankeados.slice(-10) : ranking),
    [vista, rankeados, ranking]);
  // El clic en un encabezado solo reordena la vista; la posición es siempre la del indicador.
  const filas = useMemo(() => {
    if (!orden) return enVista;
    const { col, dir } = orden;
    return [...enVista].sort((a, b) => {
      if (!!a.motivo !== !!b.motivo) return a.motivo ? 1 : -1; // excluidos siempre al final
      const x = celda(a, col); const y = celda(b, col);
      if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1; // vacíos al final
      return dir * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es'));
    });
  }, [enVista, orden]);

  const ordenar = (col: Col) => setOrden((o) => (o?.col === col ? { col, dir: o.dir === 1 ? -1 : 1 } : { col, dir: 1 }));
  const ariaSort = (col: Col): React.AriaAttributes['aria-sort'] => (orden?.col === col ? (orden.dir === 1 ? 'ascending' : 'descending') : 'none');

  const sentido = SEMAFORO[clave] === 'mayor' ? 'mayor es mejor' : 'menor es mejor';
  const deptNombre = DEPTS.find((d) => d.cod === depto)?.nombre;
  const alcance = [deptNombre ?? 'Todos los departamentos', categoria ? `Categoría ${categoria}` : 'Todas las categorías'].join(' · ');
  const esPct = !clave.endsWith('PerCapita');
  // Atípico de fuente (docs/ATIPICOS.md §8): se marca, no se excluye; solo en los indicadores de inversión.
  const atipico = (r: FilaRanking) => !r.motivo && (clave === 'inversionPerCapita' || clave === 'inversionSobreGasto') && inversionCasiNula(r.fila);

  function tablaExport(): TablaExport {
    return {
      columnas: [
        { clave: 'posicion', titulo: 'Posición (en este filtro)', tipo: 'entero' },
        { clave: 'cod_ine', titulo: 'Código INE', tipo: 'texto' },
        { clave: 'name', titulo: 'Municipio', tipo: 'texto' },
        { clave: 'department', titulo: 'Departamento', tipo: 'texto' },
        { clave: 'categoria', titulo: 'Categoría', tipo: 'texto' },
        { clave: 'population', titulo: 'Población', tipo: 'entero' },
        { clave, titulo: `${ETIQUETAS[clave]} (${esPct ? '%' : 'L por hab.'})`, tipo: esPct ? 'pct' : 'lph' },
        { clave: 'percentil_categoria', titulo: 'Percentil en su categoría', tipo: 'entero' },
        { clave: 'nota', titulo: 'Nota (⚠ excluido o atípico)', tipo: 'texto' },
      ],
      filas: ranking.map((r) => [
        r.posicion, codigoINE(r.fila.department, r.fila.code), r.fila.name ?? '', nombreDepartamento(r.fila.department),
        r.fila.category ?? '', r.fila.population ?? null, r.valor, r.percentil, r.motivo ?? (atipico(r) ? `Atípico: ${rotuloInversionCasiNula(r.fila)}` : ''),
      ]),
    };
  }
  const notasExport = (): [string, string][] => [
    ['Página', `Rankings — ${ETIQUETAS[clave]} (${sentido})`],
    ['Filtros', `Año ${fiscalYear} · ${alcance}. Se exporta el filtro completo (no solo Top 10 / Bottom 10).`],
    ['Filas', `${rankeados.length} municipios rankeados · ${excluidos.length} excluidos ⚠${sinDato ? ` · ${sinDato} sin dato` : ''}`],
    ['Regla de exclusión', REGLA_EXCLUSION],
    ['Excluidos', excluidos.length ? excluidos.map((r) => `${r.fila.name} (${codigoINE(r.fila.department, r.fila.code)}): ${r.motivo}`).join(' · ') : 'Ninguno'],
    ['Montos absolutos', NOTA_MONTOS],
  ];
  const alcanceArchivo = [ETIQUETAS[clave], deptNombre, categoria && `Cat ${categoria}`].filter(Boolean).join(' ');
  const nombre = (ext: 'xlsx' | 'csv') => nombreArchivo('Rankings', alcanceArchivo, [fiscalYear], ext);

  const rot: React.CSSProperties = { display: 'block', fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', color: C.suave, marginBottom: 4 };
  const control: React.CSSProperties = { minHeight: 44, fontSize: 14 };
  const boton = (activo: boolean): React.CSSProperties => ({
    minHeight: 44, padding: '0 14px', borderRadius: 8, cursor: 'pointer', fontFamily: COND, fontSize: 16, fontWeight: 600,
    border: '1px solid transparent', background: activo ? C.turquesa : 'transparent', color: activo ? '#062621' : C.texto2,
  });
  const th: React.CSSProperties = { padding: 0, background: C.panel2, color: C.suave, fontSize: 11, fontWeight: 600, borderBottom: `1px solid ${C.borde2}`, whiteSpace: 'nowrap' };
  const botonOrden: React.CSSProperties = { all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'block', width: '100%', minHeight: 44, padding: '8px 10px', textAlign: 'inherit', fontFamily: MONO, color: 'inherit' };
  const td: React.CSSProperties = { padding: '8px 10px', borderTop: `1px solid ${C.borde}`, whiteSpace: 'nowrap' };
  // Posición y Municipio quedan fijas al desplazar en horizontal (fondo opaco para tapar lo que pasa debajo).
  const POS_W = 76;
  const fija = (col: Col, bg: string, z = 1): React.CSSProperties =>
    col === 'posicion' ? { position: 'sticky', left: 0, zIndex: z, background: bg, width: POS_W, minWidth: POS_W, maxWidth: POS_W }
    : col === 'municipio' ? { position: 'sticky', left: POS_W, zIndex: z, background: bg, boxShadow: `1px 0 0 ${C.borde2}` } : {};

  return (
    <div className="simho-scroll" style={{ flex: 1, overflowY: 'auto', background: C.fondo, color: C.texto, fontFamily: SANS }}>
      <div style={{ padding: '24px clamp(16px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1240 }}>
        <header>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: C.turquesa }}>SIMHO — SEFIN {fiscalYear}</div>
          <h1 style={{ margin: '4px 0 0', fontFamily: COND, fontSize: 'clamp(30px, 5vw, 38px)', fontWeight: 700 }}>Rankings</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: C.suave }}>¿Quién está arriba y quién abajo en cada indicador?</p>
        </header>

        <section aria-label="Filtros" style={{ ...panel, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 260px' }}><span style={rot}>Indicador</span>
            <select className="simho-select" value={clave} onChange={(e) => { setClave(e.target.value as ClaveSemaforo); setOrden(null); }} style={{ ...control, width: '100%' }}>
              {GRUPOS.map((g) => (
                <optgroup key={g.titulo} label={g.titulo}>
                  {g.claves.map((k) => <option key={k} value={k}>{ETIQUETAS[k]}</option>)}
                </optgroup>
              ))}
            </select></label>
          <label><span style={rot} title={ROTULO_CATEGORIA}>Categoría</span>
            <select className="simho-select" value={categoria} onChange={(e) => setCategoria(e.target.value)} style={control}>
              <option value="">Todas</option>
              {['A', 'B', 'C', 'D'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
          <label><span style={rot}>Departamento</span>
            <select className="simho-select" value={depto} onChange={(e) => setDepto(e.target.value)} style={control}>
              <option value="">Todos</option>
              {DEPTS.map((d) => <option key={d.cod} value={d.cod}>{d.nombre}</option>)}
            </select></label>
          <div><span style={rot}>Año</span><SelectorAnio alto /></div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" disabled={loading || sinDatos} onClick={() => descargarXlsx(tablaExport(), notasExport(), nombre('xlsx'))}
              style={{ minHeight: 44, padding: '0 16px', borderRadius: 8, border: `1px solid ${C.turquesa}`, background: C.turquesa, color: '#062621', fontFamily: COND, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Descargar Excel</button>
            <button type="button" disabled={loading || sinDatos} onClick={() => descargarCsv(tablaExport(), nombre('csv'))}
              style={{ minHeight: 44, padding: '0 16px', borderRadius: 8, border: `1px solid ${C.borde2}`, background: 'transparent', color: C.texto2, fontFamily: COND, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>CSV</button>
          </div>
        </section>

        <div role="group" aria-label="Vista" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: C.panel, border: `1px solid ${C.borde2}`, borderRadius: 10, padding: 4, alignSelf: 'flex-start', maxWidth: '100%' }}>
          {([['top', 'Top 10'], ['bottom', 'Bottom 10'], ['todos', 'Todos']] as [Vista, string][]).map(([v, t]) => (
            <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)} style={boton(vista === v)}>{t}</button>
          ))}
        </div>

        {loading ? <div style={{ fontFamily: MONO, color: C.suave }}>Cargando datos SEFIN…</div>
          : sinDatos ? <div style={{ fontFamily: MONO, color: C.ambar }}>⚠ {NO_DATA_MSG}</div>
          : (
          <section aria-label={`Ranking: ${ETIQUETAS[clave]}`} style={{ ...panel, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.borde2}` }}>
              <div style={{ fontFamily: COND, fontSize: 20, fontWeight: 600 }}>{ETIQUETAS[clave]} <span style={{ fontFamily: MONO, fontSize: 12, color: C.suave, fontWeight: 400 }}>· {sentido} · {alcance}</span></div>
              <div style={{ fontFamily: MONO, fontSize: 13, color: C.suave, marginTop: 2 }}>
                {rankeados.length} municipios rankeados · {excluidos.length} excluidos ⚠{sinDato ? ` · ${sinDato} sin dato` : ''}
                {vista !== 'todos' && excluidos.length > 0 ? ' (ver Todos)' : ''}
              </div>
            </div>
            {esMovil ? (
              <>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.borde2}` }}>
                  <OrdenMovil opciones={COLS.map(({ col, titulo }) => ({ clave: col, titulo }))}
                    orden={orden && { clave: orden.col, dir: orden.dir }}
                    onCambio={(o) => setOrden(o && { col: o.clave as Col, dir: o.dir })} />
                </div>
                <ul aria-label={`Ranking: ${ETIQUETAS[clave]}`} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {filas.map((r) => {
                    const ruta = rutaFicha(codigoINE(r.fila.department, r.fila.code));
                    const contenido = (
                      <>
                        <span style={{ fontFamily: COND, fontSize: 22, fontWeight: 700, minWidth: 34, textAlign: 'right', color: r.posicion != null && r.posicion <= 3 ? C.turquesa : C.texto2 }}>
                          {r.posicion ?? '—'}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: C.texto }}>
                            {r.fila.name}
                            {r.motivo && <span role="img" title={r.motivo} aria-label={`Excluido: ${r.motivo}`} style={{ color: C.ambar, marginLeft: 6 }}>⚠</span>}
                            {atipico(r) && (
                              <span style={{ marginLeft: 6, fontFamily: MONO, fontSize: 11, fontWeight: 400, color: C.ambar, border: `1px solid ${C.ambar}`, borderRadius: 4, padding: '0 4px' }}>atípico</span>
                            )}
                          </span>
                          <span style={{ display: 'block', fontFamily: MONO, fontSize: 12, color: C.suave, marginTop: 2 }}>
                            {nombreDepartamento(r.fila.department)} · Cat. {r.fila.category ?? '—'} · {fmtNum(r.fila.population)} hab.
                          </span>
                          {(r.motivo || atipico(r)) && (
                            <span style={{ display: 'block', fontSize: 12, color: C.ambar, marginTop: 4 }}>{r.motivo ?? rotuloInversionCasiNula(r.fila)}</span>
                          )}
                        </span>
                        <span style={{ textAlign: 'right', fontFamily: MONO, flexShrink: 0 }}>
                          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: r.motivo ? C.gris : C.texto }}>
                            {sinLiquidacion(r.fila) ? ROTULO_SIN_LIQUIDACION : fmtIndicador(clave, r.valor)}
                          </span>
                          <span style={{ display: 'block', fontSize: 12, color: C.suave, marginTop: 2 }}>{r.percentil != null ? `P${r.percentil}` : '—'}</span>
                        </span>
                      </>
                    );
                    const caja: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', color: 'inherit', textDecoration: 'none' };
                    return (
                      <li key={`${r.fila.department}|${r.fila.code}`} style={{ borderTop: `1px solid ${C.borde}`, background: r.motivo ? C.filaAviso : C.panel }}>
                        {ruta ? <Link to={ruta} style={caja}>{contenido}</Link> : <div style={caja}>{contenido}</div>}
                      </li>
                    );
                  })}
                  {!filas.length && <li style={{ padding: 24, textAlign: 'center', color: C.suave }}>Sin municipios para este filtro.</li>}
                </ul>
              </>
            ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: MONO, fontSize: 13 }}>
                <thead>
                  <tr>
                    {COLS.map(({ col, titulo, num }) => (
                      <th key={col} scope="col" aria-sort={ariaSort(col)} title={col === 'poblacion' ? ROTULO_POBLACION : col === 'categoria' ? ROTULO_CATEGORIA : undefined}
                        style={{ ...th, ...fija(col, C.panel2, 2), textAlign: num ? 'right' : 'left', whiteSpace: col === 'posicion' || col === 'percentil' ? 'normal' : 'nowrap' }}>
                        <button type="button" style={botonOrden} onClick={() => ordenar(col)}>
                          {titulo}{orden?.col === col ? (orden.dir === 1 ? ' ▲' : ' ▼') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((r) => {
                    const ine = codigoINE(r.fila.department, r.fila.code);
                    const ruta = rutaFicha(ine);
                    const fondo = r.motivo ? C.filaAviso : C.panel;
                    return (
                      <tr key={`${r.fila.department}|${r.fila.code}`} onClick={() => ruta && navigate(ruta)} style={{ cursor: ruta ? 'pointer' : 'default', background: fondo }}>
                        <td style={{ ...td, ...fija('posicion', fondo), textAlign: 'right', color: r.posicion != null && r.posicion <= 3 ? C.turquesa : C.texto2 }}>{r.posicion ?? '—'}</td>
                        <td style={{ ...td, ...fija('municipio', fondo), fontFamily: SANS, fontSize: 14, whiteSpace: 'normal', minWidth: 150 }}>
                          {ruta ? <Link to={ruta} onClick={(e) => e.stopPropagation()} style={{ color: C.texto, textDecoration: 'none' }}>{r.fila.name}</Link> : r.fila.name}
                          {r.motivo && <span role="img" title={r.motivo} aria-label={`Excluido: ${r.motivo}`} style={{ color: C.ambar, marginLeft: 6 }}>⚠</span>}
                          {atipico(r) && (
                            <span title={rotuloInversionCasiNula(r.fila)} style={{ marginLeft: 6, fontFamily: MONO, fontSize: 11, color: C.ambar, border: `1px solid ${C.ambar}`, borderRadius: 4, padding: '0 4px' }}>
                              atípico<span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>: {rotuloInversionCasiNula(r.fila)}</span>
                            </span>
                          )}
                        </td>
                        <td style={{ ...td, color: C.texto2, whiteSpace: 'normal', minWidth: 100 }}>{nombreDepartamento(r.fila.department)}</td>
                        <td style={{ ...td, color: C.texto2 }}>{r.fila.category ?? '—'}</td>
                        <td style={{ ...td, textAlign: 'right', color: C.texto2 }}>{fmtNum(r.fila.population)}</td>
                        <td title={r.motivo ? `Excluido de posiciones y percentiles: ${r.motivo}` : undefined}
                          style={{ ...td, textAlign: 'right', fontWeight: 600, color: r.motivo ? C.gris : C.texto }}>
                          {sinLiquidacion(r.fila) ? ROTULO_SIN_LIQUIDACION : fmtIndicador(clave, r.valor)}
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: C.texto2 }}>{r.percentil != null ? `P${r.percentil}` : '—'}</td>
                      </tr>
                    );
                  })}
                  {!filas.length && <tr><td colSpan={COLS.length} style={{ ...td, textAlign: 'center', color: C.suave, padding: 24 }}>Sin municipios para este filtro.</td></tr>}
                </tbody>
              </table>
            </div>
            )}
            {excluidos.length > 0 && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: C.suave, borderTop: `1px solid ${C.borde}` }}>
                ⚠ {REGLA_EXCLUSION}
              </div>
            )}
            {ranking.some(atipico) && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: C.suave, borderTop: `1px solid ${C.borde}` }}>
                <span style={{ color: C.ambar }}>atípico</span>: {TEXTO_INVERSION_CASI_NULA}; el motivo de cada fila está en su marca.
                Se rankea igual; no se excluye.
              </div>
            )}
          </section>
        )}
        <p style={{ margin: 0, fontSize: 13, color: C.suave }}>{NOTA_MONTOS}</p>
      </div>
    </div>
  );
}
