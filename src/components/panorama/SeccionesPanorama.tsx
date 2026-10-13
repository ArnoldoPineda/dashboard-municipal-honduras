// Secciones del Panorama Nacional (mockup docs/mockups/panorama-nacional.mockup.html). Sin donas, radar ni gradientes.
import React from 'react';
import type { Municipality } from '../../hooks/useMunicipalities';
import {
  ResumenNacional, MetricaMapa, mediana, indicadoresAgregados, lecturaNacional,
} from '../../lib/indicadores';
import { fmtL } from '../../lib/formato';
import { METRICAS, ETIQUETA_METRICA, CATEGORICA } from '../../lib/colorMetrica';
import { nombreDepartamento } from '../../data/departamentos';
import { C, MONO, COND, panel, rotulo, cifra, h2, nota } from '../ficha/estilo';
import MapaDepartamentos, { datosDepartamentos, valorTexto } from './MapaDepartamentos';
import SelectorMetrica from '../SelectorMetrica';

const pct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)} %`);
const seccion: React.CSSProperties = { ...panel, padding: 'clamp(14px, 3vw, 20px)', display: 'flex', flexDirection: 'column', gap: 14 };
const sub: React.CSSProperties = { fontSize: 13, color: C.suave, marginTop: 4 };

export function LecturaNacional({ r }: { r: ResumenNacional }) {
  return (
    <section aria-label="Lectura automática nacional" style={{
      background: '#13202f', border: '1px solid #2a3d55', borderRadius: 14, padding: '16px 20px',
      display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
    }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: C.ambar, flex: '0 0 auto' }}>LECTURA AUTOMÁTICA SIMHO · {r.anio}</div>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, flex: '1 1 320px', color: '#dde6ef' }}>{lecturaNacional(r)}</p>
    </section>
  );
}

export function TarjetasNacionales({ r }: { r: ResumenNacional }) {
  const t: [string, string, string, string][] = [
    ['Autonomía fiscal', pct(r.indicadores.autonomia.mediana), pct(r.indicadores.autonomia.agregado),
      'Ingresos corrientes ÷ ingresos del año. El agregado lo dominan las grandes ciudades.'],
    ['Ingresos propios por habitante', fmtL(r.indicadores.propiosPerCapita.mediana), fmtL(r.indicadores.propiosPerCapita.agregado),
      'Recaudación corriente por habitante del municipio típico.'],
    ['Dependencia de transferencias', pct(r.indicadores.dependenciaTransferencias.mediana), pct(r.indicadores.dependenciaTransferencias.agregado),
      'Parte de los ingresos del año que llega por Art. 91 y otras transferencias.'],
    ['Recursos de balance ÷ ingresos', pct(r.indicadores.balanceSobreIngresos.mediana), pct(r.indicadores.balanceSobreIngresos.agregado),
      'Caja de años anteriores que se incorpora al presupuesto.'],
  ];
  return (
    <section aria-label="Indicadores nacionales" className="panorama-tarjetas">
      {t.map(([label, med, agg, txt]) => (
        <article key={label} style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={rotulo}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <div style={cifra(40)}>{med}</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.suave }}>mediana municipal</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: C.suave }}>Agregado nacional: <span style={{ color: C.texto }}>{agg}</span></div>
          <div style={{ fontSize: 13, color: C.suave, lineHeight: 1.4 }}>{txt}</div>
        </article>
      ))}
    </section>
  );
}

export function DistribucionAutonomia({ r }: { r: ResumenNacional }) {
  const max = Math.max(1, ...r.distribucion.map((g) => g.n));
  const bajo25 = r.distribucion.slice(0, 2).reduce((s, g) => s + g.n, 0);
  const total = r.distribucion.reduce((s, g) => s + g.n, 0) || 1;
  const desc = r.distribucion.map((g) => `${g.n} municipios con autonomía ${g.etiqueta}`).join(', ');
  return (
    <section aria-label="Distribución de la autonomía" style={seccion}>
      <div>
        <h2 style={{ ...h2, fontSize: 22 }}>¿Cuánto se financian solos los municipios?</h2>
        <div style={sub}>Número de municipios según su autonomía fiscal · {r.anio}</div>
      </div>
      <div role="img" aria-label={desc} style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(6px, 2vw, 14px)', height: 220, borderBottom: `1px solid ${C.borde2}`, padding: '0 4px' }}>
        {r.distribucion.map((g, i) => (
          <div key={g.etiqueta} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
            <div style={{ fontFamily: COND, fontSize: 22, fontWeight: 700, color: C.texto }}>{g.n}</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.suave }}>{Math.round((100 * g.n) / total)} %</div>
            <div style={{ width: '100%', maxWidth: 80, borderRadius: '6px 6px 0 0', height: Math.round((g.n / max) * 150), background: i < 2 ? C.ambar : C.turquesa }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'clamp(6px, 2vw, 14px)', padding: '0 4px' }}>
        {r.distribucion.map((g) => (
          <div key={g.etiqueta} style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', fontFamily: MONO, fontSize: 12, color: C.texto2 }}>{g.etiqueta}</div>
        ))}
      </div>
      <p style={nota}>En naranja, los {bajo25} municipios que generan menos de una cuarta parte de sus ingresos del año.</p>
    </section>
  );
}

export function TablaCategorias({ r }: { r: ResumenNacional }) {
  const th: React.CSSProperties = { padding: '10px 6px', fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: C.suave, fontWeight: 500, textAlign: 'right' };
  const td: React.CSSProperties = { textAlign: 'right', padding: '12px 6px', fontFamily: MONO, whiteSpace: 'nowrap' };
  const c = r.categorias.find((x) => x.categoria === 'C');
  return (
    <section aria-label="Resumen por categoría" style={seccion}>
      <div>
        <h2 style={{ ...h2, fontSize: 22 }}>Por categoría municipal (SGJD 2020)</h2>
        <div style={sub}>Medianas municipales · {r.anio}</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460, fontSize: 14, color: C.texto }}>
          <thead><tr>
            <th scope="col" style={{ ...th, textAlign: 'left' }}>CAT.</th>
            <th scope="col" style={th}>MUNIC.</th><th scope="col" style={th}>POBLACIÓN</th>
            <th scope="col" style={{ ...th, textAlign: 'left', paddingLeft: 14 }}>AUTONOMÍA</th>
            <th scope="col" style={th}>PROPIOS / HAB.</th><th scope="col" style={th}>DEPENDENCIA</th>
          </tr></thead>
          <tbody>
            {r.categorias.map((x) => (
              <tr key={x.categoria} style={{ borderTop: `1px solid ${C.borde}` }}>
                <th scope="row" style={{ textAlign: 'left', padding: '12px 6px', fontFamily: COND, fontSize: 18 }}>{x.categoria}</th>
                <td style={td}>{x.n}</td>
                <td style={td}>{x.poblacion.toLocaleString('en-US')}</td>
                <td style={{ padding: '12px 6px 12px 14px', minWidth: 150 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: '1 1 auto', height: 8, borderRadius: 4, background: C.pista }}>
                      <div style={{ height: 8, borderRadius: 4, width: `${Math.min(100, x.autonomia ?? 0)}%`, background: C.turquesa }} />
                    </div>
                    <span style={{ fontFamily: MONO, minWidth: 56, textAlign: 'right' }}>{pct(x.autonomia)}</span>
                  </div>
                </td>
                <td style={td}>{fmtL(x.propiosPc)}</td>
                <td style={td}>{pct(x.dependencia)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {c && (
        <p style={nota}>
          {c.n} de los {r.n} municipios son categoría C: generan el {pct(c.autonomia)} de sus ingresos del año (mediana) y dependen de las transferencias en un {pct(c.dependencia)}.
        </p>
      )}
    </section>
  );
}

export function SeccionDepartamentos({ filasAnio, metrica, onMetrica, anio }: {
  filasAnio: Municipality[]; metrica: MetricaMapa; onMetrica: (m: MetricaMapa) => void; anio: number;
}) {
  const datos = datosDepartamentos(filasAnio, metrica);
  const numerica = metrica !== 'categoria';
  const signo = numerica && METRICAS[metrica].direccion === 'menor' ? 1 : -1; // el mejor primero
  const filas = [...datos.filas].sort((a, b) => numerica
    ? (a.valor == null ? 1 : b.valor == null ? -1 : signo * (a.valor - b.valor))
    : (b.conteo!.A + b.conteo!.B) - (a.conteo!.A + a.conteo!.B));
  const max = Math.max(1e-9, ...datos.filas.map((f) => f.valor ?? 0));
  return (
    <section aria-label="Departamentos" style={seccion}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ ...h2, fontSize: 22 }}>Departamentos</h2>
          <div style={sub}>{numerica ? METRICAS[metrica].notaDepto : 'Categoría predominante entre sus municipios (SGJD 2020)'} · {anio}</div>
        </div>
        <SelectorMetrica valor={metrica} onCambio={onMetrica} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 22, alignItems: 'start' }}>
        <MapaDepartamentos filasAnio={filasAnio} metrica={metrica} />
        <ol aria-label={`Ranking de departamentos por ${ETIQUETA_METRICA[metrica]}`} style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {filas.map((f, i) => (
            <li key={f.department} style={{ display: 'grid', gridTemplateColumns: `22px minmax(0, 1.4fr) minmax(36px, 1fr) ${numerica ? 76 : 116}px`, gap: 10, alignItems: 'center', fontSize: 14, color: C.texto }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.gris, textAlign: 'right' }}>{i + 1}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreDepartamento(f.department)}</span>
              {numerica ? (
                <div style={{ height: 10, borderRadius: 5, background: C.pista }}>
                  <div style={{ height: 10, borderRadius: 5, width: `${Math.max(0, ((f.valor ?? 0) / max) * 100)}%`, background: C.turquesa }} />
                </div>
              ) : (
                <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: C.pista }}>
                  {Object.entries(f.conteo ?? {}).map(([c, n]) => <div key={c} style={{ flex: `${n} 1 0`, background: CATEGORICA[c] }} />)}
                </div>
              )}
              <span style={{ fontFamily: MONO, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {numerica ? valorTexto(metrica, f) : Object.entries(f.conteo ?? {}).map(([c, n]) => `${c}${n}`).join(' ')}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function TendenciaAutonomia({ filas, anios }: { filas: Municipality[]; anios: number[] }) {
  const de = (y: number) => filas.filter((m) => m.year === y);
  const filasTabla: [string, (y: number) => string][] = [
    ['Autonomía — mediana municipal', (y) => pct(mediana(de(y), 'autonomia'))],
    ['Autonomía — agregado nacional', (y) => pct(indicadoresAgregados(de(y)).autonomia)],
  ];
  const th: React.CSSProperties = { padding: '12px 14px', fontFamily: MONO, fontSize: 12, fontWeight: 600 };
  return (
    <section aria-label="Tendencia" style={seccion}>
      <h2 style={{ ...h2, fontSize: 22 }}>Autonomía {anios[0]}–{anios[anios.length - 1]}: municipio típico frente al agregado</h2>
      <div style={{ overflowX: 'auto', border: `1px solid ${C.borde}`, borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520, fontSize: 14, color: C.texto }}>
          <thead><tr style={{ background: C.panel2 }}>
            <th scope="col" style={{ ...th, textAlign: 'left', fontSize: 11, letterSpacing: 1.2, color: C.suave, fontWeight: 500 }}>INDICADOR</th>
            {anios.map((y) => <th key={y} scope="col" style={{ ...th, textAlign: 'right', color: C.turquesa }}>{y}</th>)}
          </tr></thead>
          <tbody>
            {filasTabla.map(([label, f]) => (
              <tr key={label} style={{ borderTop: `1px solid ${C.borde}` }}>
                <th scope="row" style={{ textAlign: 'left', padding: '11px 14px', fontWeight: 500 }}>{label}</th>
                {anios.map((y) => <td key={y} style={{ textAlign: 'right', padding: '11px 14px', fontFamily: MONO }}>{f(y)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ ...nota, fontSize: 13, color: C.suave }}>La mediana describe al municipio típico; el agregado (Σ/Σ) lo dominan los municipios grandes.</p>
    </section>
  );
}
