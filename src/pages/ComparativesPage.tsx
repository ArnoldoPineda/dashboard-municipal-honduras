// Comparar (Fase 6): hasta 5 municipios frente a sus pares (misma categoría SGJD 2020 y mismo año).
// Valores, medianas, percentiles y semáforo salen de lib/indicadores (comparacionPares, semaforo); formato de lib/formato.
import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { Municipality } from '../hooks/useMunicipalities';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useNavbar } from '../context/NavbarContext';
import {
  Indicadores, ClaveSemaforo, SEMAFORO, Comparacion, ROTULO_CATEGORIA,
  indicadoresMunicipio, comparacionPares, semaforo, sinLiquidacion, atipicos, paresSugeridos, excluirDeRazones,
} from '../lib/indicadores';
import { fmtPct, fmtLGrafico } from '../lib/formato';
import { codigoINE, nombreDepartamento } from '../data/departamentos';
import { rutaFicha } from '../lib/municipios';
import { NO_DATA_MSG } from '../utils/sefin';
import SelectorAnio from '../components/SelectorAnio';
import BuscadorMunicipio from '../components/ficha/BuscadorMunicipio';
import { motivoExclusion } from '../components/ficha/FranjaExcluido';
import { ETIQUETAS, fmtIndicador } from '../components/ficha/TarjetasIndicadores';
import { C, MONO, COND, SANS, panel, rotulo, grilla, TONO_COLOR } from '../components/ficha/estilo';

const MAX = 5;
const COLORES = ['#3fd6c0', '#f0a33a', '#5aa9e6', '#e879a6', '#b6a4f5'];

type Clave = ClaveSemaforo | 'ejecucion';
const FILAS: Clave[] = [
  'autonomia', 'dependenciaTransferencias', 'propiosPerCapita', 'ibiPerCapita', 'inversionPerCapita',
  'funcionamientoSobreCorrientes', 'inversionSobreGasto', 'ahorroCorriente', 'servicioDeudaSobreCorrientes',
  'balanceSobreIngresos', 'resultadoSinBalance', 'ejecucion',
];
const etiqueta = (k: Clave) => (k === 'ejecucion' ? 'Ejecución (vs. presupuesto aprobado)' : ETIQUETAS[k]);
const fmt = (k: Clave, v: number | null | undefined) => (k === 'ejecucion' ? fmtPct(v) : fmtIndicador(k, v));
/** Montos absolutos: solo el valor, sin percentil ni semáforo (favorecen a los municipios grandes). */
const SIN_PERCENTIL: Clave[] = ['ahorroCorriente', 'resultadoSinBalance'];
const esMonto = (k: Clave) => k.endsWith('PerCapita') || k === 'ahorroCorriente' || k === 'resultadoSinBalance';
const ineDe = (m: Municipality) => codigoINE(m.department, m.code);

/** Texto del ⚠ de un municipio: motivo de exclusión y señales de atípico (docs/ATIPICOS.md), sin repetir. */
function avisos(m: Municipality): string[] {
  const motivo = motivoExclusion(m);
  const señales = atipicos(m).filter((s) => !motivo || !motivo.includes(s));
  return [...(motivo ? [`${motivo} Excluido de medianas y percentiles.`] : []), ...señales];
}

function Punto({ clave, valor, comp }: { clave: Clave; valor: number | null; comp: Comparacion }) {
  if (clave === 'ejecucion') return <span style={{ fontSize: 11, color: C.gris }}>sin dirección</span>;
  const s = semaforo(clave, valor, comp.percentil);
  return (
    <span role="img" aria-label={s.etiqueta} title={s.etiqueta}
      style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: TONO_COLOR[s.tono], flexShrink: 0 }} />
  );
}

export default function ComparativesPage() {
  const { fiscalYear } = useNavbar();
  const [params] = useSearchParams();
  // Preselección desde la Ficha Municipal: /comparativos?municipio=0318 (código INE).
  const [ines, setInes] = useState<string[]>(() => {
    const p = params.get('municipio');
    return p && /^\d{4}$/.test(p) ? [p] : [];
  });
  const { municipalities: filasAnio, loading } = useMunicipalitiesMultiYear([fiscalYear]);
  const sinDatos = !loading && filasAnio.length === 0;

  const elegidos = useMemo(
    () => ines.map((ine) => ({ ine, fila: filasAnio.find((m) => ineDe(m) === ine) ?? null })),
    [ines, filasAnio],
  );
  const conFila = useMemo(() => elegidos.filter((e): e is { ine: string; fila: Municipality } => e.fila != null), [elegidos]);

  // comps[ine][clave]: percentil y mediana del municipio en su categoría.
  const comps = useMemo(() => Object.fromEntries(conFila.map(({ ine, fila }) => [
    ine, Object.fromEntries(FILAS.map((k) => [k, comparacionPares(filasAnio, fila, k as keyof Indicadores)])) as Record<Clave, Comparacion>,
  ])), [conFila, filasAnio]);

  // Una columna "Mediana cat. X" por categoría presente (los percentiles son siempre dentro de la propia categoría).
  const categorias = useMemo(() => {
    const vistas = new Map<string, string>(); // categoría → ine de un municipio de esa categoría
    conFila.forEach(({ ine, fila }) => { if (fila.category && !vistas.has(fila.category)) vistas.set(fila.category, ine); });
    return Array.from(vistas.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([cat, ine]) => ({ cat, ine }));
  }, [conFila]);

  const agregar = (ine: string) => setInes((xs) => (!/^\d{4}$/.test(ine) || xs.includes(ine) || xs.length >= MAX ? xs : [...xs, ine]));
  const quitar = (ine: string) => setInes((xs) => xs.filter((x) => x !== ine));
  // Pares de la categoría en el año (sin excluidos, incluido el municipio), como en comparacionPares.
  const nPares = (fila: Municipality) => filasAnio.filter((m) => m.year === fila.year && m.category === fila.category && !excluirDeRazones(m)).length;
  const base = conFila.find(({ fila }) => !excluirDeRazones(fila))?.fila ?? conFila[0]?.fila ?? null;
  const sugeridos = useMemo(
    () => (base ? paresSugeridos(filasAnio, base, conFila.map((e) => e.fila), MAX - ines.length) : []),
    [base, filasAnio, conFila, ines.length],
  );
  const color = (ine: string) => COLORES[ines.indexOf(ine) % COLORES.length];
  const conAvisos = conFila.map(({ ine, fila }) => ({ ine, fila, avisos: avisos(fila) })).filter((x) => x.avisos.length);

  const boton: React.CSSProperties = {
    minHeight: 44, padding: '0 16px', borderRadius: 8, border: `1px solid ${C.turquesa}`, background: 'transparent',
    color: C.turquesa, fontFamily: COND, fontSize: 16, fontWeight: 600, cursor: 'pointer',
  };
  const th: React.CSSProperties = { padding: '10px 12px', background: C.panel2, borderBottom: `1px solid ${C.borde2}`, textAlign: 'right', verticalAlign: 'bottom', minWidth: 140 };
  const fija = (bg: string): React.CSSProperties => ({ position: 'sticky', left: 0, zIndex: 1, background: bg, boxShadow: `1px 0 0 ${C.borde2}`, textAlign: 'left' });

  return (
    <div className="simho-scroll" style={{ flex: 1, overflowY: 'auto', background: C.fondo, color: C.texto, fontFamily: SANS }}>
      <div style={{ padding: '24px clamp(16px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1240 }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: C.turquesa }}>SIMHO — SEFIN {fiscalYear}</div>
            <h1 style={{ margin: '4px 0 0', fontFamily: COND, fontSize: 'clamp(30px, 5vw, 38px)', fontWeight: 700 }}>Comparar municipios</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: C.suave }}>
              ¿Cómo está cada municipio frente a sus pares? Pares: misma categoría ({ROTULO_CATEGORIA}) y mismo año.
            </p>
          </div>
          <SelectorAnio alto />
        </header>

        <section aria-label="Municipios a comparar" style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {ines.length < MAX
              ? <BuscadorMunicipio filas={filasAnio} onElegir={(o) => agregar(o.ine)} />
              : <span style={{ fontSize: 14, color: C.suave }}>Máximo {MAX} municipios.</span>}
            <button type="button" style={{ ...boton, opacity: sugeridos.length ? 1 : 0.5, cursor: sugeridos.length ? 'pointer' : 'default' }}
              disabled={!sugeridos.length} onClick={() => sugeridos.forEach((m) => agregar(ineDe(m)))}
              title={base ? `Misma categoría que ${base.name}, población más cercana` : 'Elegí primero un municipio'}>
              Agregar pares sugeridos
            </button>
          </div>
          {base && sugeridos.length > 0 && (
            <div style={{ fontSize: 13, color: C.suave }}>
              Sugeridos para {base.name} (categoría {base.category}, población más cercana): {sugeridos.map((m) => m.name).join(', ')}.
            </div>
          )}
          {ines.length > 0 && (
            <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
              {elegidos.map(({ ine, fila }) => (
                <li key={ine} style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${color(ine)}`, borderRadius: 999, padding: '0 4px 0 12px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color(ine) }} aria-hidden="true" />
                  <span style={{ fontSize: 14 }}>{fila ? `${fila.name} — ${nombreDepartamento(fila.department)}` : loading ? 'Cargando…' : `${ine} (sin datos ${fiscalYear})`}</span>
                  <button type="button" onClick={() => quitar(ine)} aria-label={`Quitar ${fila?.name ?? ine}`}
                    className="boton-quitar" style={{ all: 'unset', cursor: 'pointer', width: 44, height: 44, display: 'grid', placeItems: 'center', color: C.suave, fontSize: 18 }}>×</button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ fontSize: 13, color: C.suave }}>
            Para comparar departamentos, ver <Link to="/dashboard" style={{ color: C.turquesa }}>Panorama Nacional</Link>.
          </div>
        </section>

        {loading ? <div style={{ fontFamily: MONO, color: C.suave }}>Cargando datos SEFIN…</div>
          : sinDatos ? <div style={{ fontFamily: MONO, color: C.ambar }}>⚠ {NO_DATA_MSG}</div>
          : !ines.length ? <div style={{ ...panel, color: C.suave }}>Buscá un municipio para empezar. Podés comparar hasta {MAX}.</div>
          : (
          <>
            <section aria-label="Tabla comparativa" style={{ ...panel, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontFamily: MONO, fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th scope="col" className="col-fija" style={{ ...th, ...fija(C.panel2), minWidth: 170, ...rotulo }}>Indicador</th>
                      {elegidos.map(({ ine, fila }) => {
                        const av = fila ? avisos(fila) : [];
                        const ruta = rutaFicha(ine);
                        return (
                          <th key={ine} scope="col" style={{ ...th, borderTop: `3px solid ${color(ine)}` }}>
                            {ruta ? <Link to={ruta} style={{ fontFamily: COND, fontSize: 17, color: C.texto, textDecoration: 'none' }}>{fila?.name ?? ine}</Link> : ine}
                            {av.length > 0 && <span title={av.join(' · ')} aria-label={`Aviso: ${av.join(' · ')}`} style={{ color: C.ambar, marginLeft: 4 }}>⚠</span>}
                            <div style={{ fontSize: 11, color: C.suave, fontWeight: 400 }}>
                              {fila ? `${nombreDepartamento(fila.department)} · ${fila.category ? `Cat. ${fila.category} · ${nPares(fila)} pares` : 'Sin categoría'}` : `Sin datos ${fiscalYear}`}
                            </div>
                          </th>
                        );
                      })}
                      {categorias.map(({ cat }) => (
                        <th key={cat} scope="col" style={{ ...th, color: C.suave, fontFamily: COND, fontSize: 16 }}>Mediana cat. {cat}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FILAS.map((k) => (
                      <tr key={k}>
                        <th scope="row" className="col-fija" style={{ ...fija(C.panel), padding: '8px 12px', fontFamily: SANS, fontWeight: 500, fontSize: 14, borderTop: `1px solid ${C.borde}` }}>
                          {etiqueta(k)}
                        </th>
                        {elegidos.map(({ ine, fila }) => {
                          const td: React.CSSProperties = { padding: '8px 12px', textAlign: 'right', borderTop: `1px solid ${C.borde}`, whiteSpace: 'nowrap' };
                          if (!fila) return <td key={ine} style={{ ...td, color: C.gris }}>—</td>;
                          if (sinLiquidacion(fila)) return <td key={ine} style={{ ...td, color: C.ambar }}>Sin liquidación</td>;
                          const v = indicadoresMunicipio(fila)[k];
                          const c = comps[ine][k];
                          if (SIN_PERCENTIL.includes(k)) return (
                            <td key={ine} style={td}>
                              <span style={{ color: C.texto, fontWeight: 600 }}>{fmt(k, v)}</span>
                              <div style={{ fontSize: 11, color: C.suave }}>monto, sin percentil</div>
                            </td>
                          );
                          return (
                            <td key={ine} style={td}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: C.texto, fontWeight: 600 }}>{fmt(k, v)}</span>
                                <Punto clave={k} valor={v} comp={c} />
                              </div>
                              <div style={{ fontSize: 11, color: C.suave }}>{c.percentil != null ? `P${c.percentil}` : 'sin percentil'}</div>
                            </td>
                          );
                        })}
                        {categorias.map(({ cat, ine }) => (
                          <td key={cat} style={{ padding: '8px 12px', textAlign: 'right', borderTop: `1px solid ${C.borde}`, color: C.suave, whiteSpace: 'nowrap' }}>
                            {fmt(k, comps[ine][k].mediana)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 14px', fontSize: 12, color: C.suave, borderTop: `1px solid ${C.borde}` }}>
                P = percentil en su categoría (% de pares con valor menor). Punto: <span style={{ color: C.turquesa }}>●</span> sobre la mediana ·{' '}
                <span style={{ color: C.gris }}>●</span> en la mediana · <span style={{ color: C.ambar }}>●</span> bajo la mediana o alerta, según el sentido favorable del indicador.
                La ejecución no tiene sentido favorable ("sin dirección"). Ahorro corriente y resultado sin balance son montos: sin percentil ni punto.
              </div>
            </section>

            {conAvisos.length > 0 && (
              <section role="note" aria-label="Avisos" style={{ ...panel, borderColor: C.ambar, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {conAvisos.map(({ ine, fila, avisos: av }) => (
                  <div key={ine} style={{ fontSize: 14, color: '#f5e3c4' }}><span style={{ color: C.ambar }}>⚠ {fila.name}:</span> {av.join(' · ')}</div>
                ))}
              </section>
            )}

            <section aria-label="Gráficos por indicador" style={grilla(340)}>
              {FILAS.map((k) => {
                const datos = conFila.filter(({ fila }) => !sinLiquidacion(fila))
                  .map(({ ine, fila }) => ({ ine, nombre: `${avisos(fila).length ? '⚠ ' : ''}${fila.name ?? ine}`, valor: indicadoresMunicipio(fila)[k] }))
                  .filter((d): d is { ine: string; nombre: string; valor: number } => d.valor != null);
                const tick = (v: number) => (esMonto(k) ? fmtLGrafico(v) : `${Math.round(v)} %`);
                const sentido = k === 'ejecucion' ? 'sin dirección' : SEMAFORO[k] === 'mayor' ? 'mayor es mejor' : 'menor es mejor';
                return (
                  <figure key={k} style={{ ...panel, margin: 0 }}>
                    <figcaption style={{ fontFamily: COND, fontSize: 17, fontWeight: 600 }}>
                      {etiqueta(k)} <span style={{ fontFamily: MONO, fontSize: 11, color: C.suave, fontWeight: 400 }}>· {sentido}</span>
                    </figcaption>
                    {datos.length ? (
                      <ResponsiveContainer width="100%" height={52 + datos.length * 34}>
                        <BarChart data={datos} layout="vertical" margin={{ top: 18, right: 24, left: 0, bottom: 0 }}>
                          <CartesianGrid horizontal={false} stroke={C.borde} />
                          <XAxis type="number" tickFormatter={tick} tick={{ fill: C.suave, fontSize: 11 }} stroke={C.borde2} />
                          <YAxis type="category" dataKey="nombre" width={110} tick={{ fill: C.texto2, fontSize: 12 }} stroke={C.borde2} />
                          <Tooltip formatter={(v) => fmt(k, Number(v))} contentStyle={{ background: C.panel2, border: `1px solid ${C.borde2}` }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                          <Bar dataKey="valor" name={etiqueta(k)} isAnimationActive={false} barSize={18}>
                            {datos.map((d) => <Cell key={d.ine} fill={color(d.ine)} />)}
                          </Bar>
                          {categorias.map(({ cat, ine }) => {
                            const med = comps[ine][k].mediana;
                            return med == null ? null : (
                              <ReferenceLine key={cat} x={med} ifOverflow="extendDomain" stroke={C.texto2} strokeDasharray="4 3"
                                label={{ value: `Med. ${cat}`, position: 'top', fill: C.texto2, fontSize: 11 }} />
                            );
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div style={{ fontSize: 13, color: C.suave, padding: '12px 0' }}>Sin datos para graficar.</div>}
                  </figure>
                );
              })}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
