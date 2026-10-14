// Pestañas Ingresos / Gastos / Resultado / Deuda / Evolución / Pares (barras simples, sin donas ni radar).
import React, { useRef, useState } from 'react';
import type { Municipality } from '../../hooks/useMunicipalities';
import {
  indicadoresMunicipio, insumos, semaforo, sinLiquidacion, ClaveSemaforo, ROTULO_SIN_LIQUIDACION,
  notaMedianaDeuda,
} from '../../lib/indicadores';
import { fmtL } from '../../lib/formato';
import { BarraPercentil, BarraValor } from './Barras';
import { Comparaciones, ETIQUETAS, fmtIndicador } from './TarjetasIndicadores';
import { C, MONO, COND, rotulo, cifra, grilla, h2, nota, TONO_COLOR } from './estilo';

type Pestana = 'ingresos' | 'gastos' | 'resultado' | 'deuda' | 'evolucion' | 'pares';
const PESTANAS: [Pestana, string][] = [
  ['ingresos', 'Ingresos'], ['gastos', 'Gastos'], ['resultado', 'Resultado'],
  ['deuda', 'Deuda'], ['evolucion', 'Evolución'], ['pares', 'Pares'],
];

const n0 = (v: number | null | undefined) => Number(v) || 0;
const pct = (v: number, total: number) => (total > 0 ? (v / total) * 100 : 0);
const caja: React.CSSProperties = { background: C.panel2, border: `1px solid ${C.borde}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 };
const h3: React.CSSProperties = { margin: 0, fontFamily: MONO, fontSize: 12, letterSpacing: '1.5px', color: C.suave, fontWeight: 500 };

interface Props { fila: Municipality; filasMuni: Municipality[]; comps: Comparaciones; excluida: boolean }

export default function PestanasFicha(props: Props) {
  const [activa, setActiva] = useState<Pestana>('ingresos');
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  // Patrón ARIA tabs: flechas izquierda/derecha (circular), Inicio y Fin; activa y enfoca la pestaña.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = PESTANAS.findIndex(([id]) => id === activa);
    const n = PESTANAS.length;
    const destino = e.key === 'ArrowRight' ? (i + 1) % n
      : e.key === 'ArrowLeft' ? (i - 1 + n) % n
      : e.key === 'Home' ? 0
      : e.key === 'End' ? n - 1
      : -1;
    if (destino < 0) return;
    e.preventDefault();
    setActiva(PESTANAS[destino][0]);
    botones.current[destino]?.focus();
  };
  return (
    <section style={{ background: C.panel, border: `1px solid ${C.borde}`, borderRadius: 14, overflow: 'hidden' }}>
      <div role="tablist" aria-label="Detalle de la ficha" onKeyDown={onKeyDown} style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, padding: 10, borderBottom: `1px solid ${C.borde}`, background: C.panel2,
      }}>
        {PESTANAS.map(([id, label], idx) => {
          const on = activa === id;
          return (
            <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={on} aria-controls={`panel-${id}`}
              ref={(el) => { botones.current[idx] = el; }} tabIndex={on ? 0 : -1}
              onClick={() => setActiva(id)} style={{
                minHeight: 44, padding: '0 18px', borderRadius: 8, cursor: 'pointer', fontFamily: COND, fontSize: 17,
                fontWeight: 600, letterSpacing: 0.5,
                ...(on ? { background: '#10302d', color: C.turquesa, border: '1px solid #1f5e55' }
                  : { background: 'transparent', color: C.texto2, border: '1px solid transparent' }),
              }}>{label}</button>
          );
        })}
      </div>
      <div role="tabpanel" id={`panel-${activa}`} aria-labelledby={`tab-${activa}`} tabIndex={0}
        style={{ padding: 'clamp(14px, 3vw, 22px)', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {activa === 'ingresos' && <TabIngresos {...props} />}
        {activa === 'gastos' && <TabGastos {...props} />}
        {activa === 'resultado' && <TabResultado {...props} />}
        {activa === 'deuda' && <TabDeuda {...props} />}
        {activa === 'evolucion' && <TabEvolucion {...props} />}
        {activa === 'pares' && <TabPares {...props} />}
      </div>
    </section>
  );
}

// ── Ingresos ────────────────────────────────────────────────────────────────

function TabIngresos({ fila, comps }: Props) {
  const i = insumos(fila);
  const total = i.ingresosDelAnio;
  const tasas = n0(fila.tasas_servicios), derechos = n0(fila.derechos);
  const segmentos: [string, number, string, string?][] = [
    ['Impuestos (G1)', n0(fila.ingresos_tributarios) - tasas - derechos, '#3fd6c0'],
    ['Tasas por servicios (G1)', tasas, '#2aa896'],
    ['Derechos (G1)', derechos, '#1c7a6d', '#ffffff'],
    ['No tributarios (G2)', n0(fila.ingresos_no_tributarios), '#9fece0'],
    ['Transferencias Art. 91 y otras', i.transferencias, C.ambar],
    ['Otros de capital', total - i.ingresosCorrientes - i.transferencias, '#5b6b82', '#ffffff'],
  ];
  const visibles = segmentos.filter(([, v]) => v > 0);
  const financiamiento = n0(fila.prestamos) + n0(fila.colocacion_bonos);
  const fuentes: [string, number][] = ([
    ['Impuesto s/ bienes inmuebles', fila.impuesto_bi], ['Impuesto personal', fila.impuesto_personal],
    ['Impuesto s/ industria (ICS)', fila.impuesto_industria], ['Impuesto s/ comercio (ICS)', fila.impuesto_comercio],
    ['Impuesto s/ servicios (ICS)', fila.impuesto_servicios], ['Impuesto pecuario', fila.impuesto_pecuario],
    ['Impuesto s/ extracción', fila.impuesto_extraccion], ['Impuesto de telecomunicaciones', fila.impuesto_telecomunicaciones],
    ['Tasas por servicios', fila.tasas_servicios], ['Derechos', fila.derechos],
    ['No tributarios', fila.ingresos_no_tributarios], ['Transferencias Art. 91', fila.transferencias_art91],
    ['Otras transferencias', fila.otras_transferencias], ['Venta de activos', fila.venta_activos],
    ['Contribuciones', fila.contribuciones], ['Subsidios', fila.subsidios],
    ['Herencias, legados y donaciones', fila.herencias_legados], ['Otros ingresos de capital', fila.otros_ingresos_capital],
  ] as [string, number | null][]).map(([l, v]) => [l, n0(v)] as [string, number]).filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ibi = comps.ibiPerCapita;
  const r = indicadoresMunicipio(fila);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <h2 style={h2}>Ingresos del año: {fmtL(total)}</h2>
        <div style={{ fontFamily: MONO, fontSize: 12, color: C.suave }}>
          + {fmtL(i.recursosBalance)} de recursos de balance
          {financiamiento > 0 ? ` + ${fmtL(financiamiento)} de préstamos y bonos` : ''} = {fmtL(i.ingresosTotales)} recaudado
        </div>
      </div>
      <div role="img" aria-label="Composición de los ingresos del año" style={{ display: 'flex', gap: 2 }}>
        {visibles.map(([label, v, color, tinta]) => (
          <div key={label} style={{ flex: `${v} 1 0`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{
              height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              whiteSpace: 'nowrap', fontFamily: MONO, fontSize: 12, fontWeight: 600, color: tinta ?? '#062621', background: color,
            }}><span className="ficha-seg-etiqueta">{pct(v, total) >= 8 ? fmtL(v) : ''}</span></div>
            <div className="ficha-seg-etiqueta" style={{ fontFamily: MONO, fontSize: 11, color: C.suave, textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {pct(v, total) >= 5 ? `${pct(v, total).toFixed(1)} %` : ''}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '10px 24px' }}>
        {visibles.map(([label, v, color]) => (
          <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, flex: '0 0 auto', background: color }} />
            <div title={label} style={{
              fontSize: 14, flex: '1 1 auto', minWidth: 0, color: C.texto,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{label}</div>
            <div style={{ fontFamily: MONO, fontSize: 13, color: C.texto, whiteSpace: 'nowrap', flex: '0 0 auto', marginLeft: 'auto', textAlign: 'right' }}>
              {fmtL(v)} · {Math.round(pct(v, total))} %
            </div>
          </div>
        ))}
      </div>
      <div style={grilla(300, 18)}>
        <div style={caja}>
          <h3 style={h3}>TOP 5 FUENTES DEL AÑO</h3>
          {fuentes.map(([label, v]) => (
            <BarraValor key={label} label={label} texto={fmtL(v)} valor={v} max={fuentes[0]?.[1] ?? 0}
              color={label.startsWith('Transferencias') || label.startsWith('Otras transf') ? C.ambar : C.turquesa} />
          ))}
        </div>
        <div style={caja}>
          <h3 style={h3}>ESFUERZO FISCAL PROPIO</h3>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <div><div style={cifra(32)}>{fmtL(r.ibiPerCapita)}</div><div style={{ fontSize: 13, color: C.suave }}>Impuesto s/ bienes inmuebles por habitante</div></div>
            <div><div style={cifra(32, C.suave)}>{fmtL(ibi?.mediana)}</div><div style={{ fontSize: 13, color: C.suave }}>Mediana categoría {fila.category}</div></div>
          </div>
          <p style={nota}>
            El IBI aporta el {Math.round(pct(n0(fila.impuesto_bi), i.ingresosCorrientes))} % de los ingresos corrientes;
            tasas y derechos ({fmtL(tasas + derechos)}), el {Math.round(pct(tasas + derechos, i.ingresosCorrientes))} %.
          </p>
        </div>
      </div>
    </>
  );
}

// ── Gastos ──────────────────────────────────────────────────────────────────

function TabGastos({ fila }: Props) {
  const total = n0(fila.total_egresos);
  const func: [string, number][] = ([
    ['Servicios personales', fila.servicios_personales], ['Otros (sin desglose)', fila.otros_gastos],
    ['Servicios no personales', fila.servicios_no_personales], ['Materiales y suministros', fila.materiales_suministro],
    ['Transferencias corrientes', fila.transferencias_corrientes],
  ] as [string, number | null][]).map(([l, v]) => [l, n0(v)] as [string, number]).sort((a, b) => b[1] - a[1]);
  const cap: [string, number, string][] = ([
    ['Bienes capitalizables (inversión)', fila.bienes_capitalizables, C.turquesa],
    ['Transferencias de capital', fila.transferencias_capital, C.turquesa],
    ['Servicio de deuda', fila.servicios_deuda, C.ambar],
    ['Activos financieros', fila.activos_financieros, C.turquesa],
    ['Otros gastos de capital', fila.otros_gastos_capital, C.turquesa],
    ['Asignaciones globales', fila.asignaciones_globales, C.turquesa],
  ] as [string, number | null, string][]).map(([l, v, c]) => [l, n0(v), c] as [string, number, string]).filter(([, v]) => v > 0);
  const max = Math.max(0, ...func.map((x) => x[1]), ...cap.map((x) => x[1]));
  const totF = n0(fila.gastos_funcionamiento), totC = n0(fila.gastos_capital_deuda);
  const otros = n0(fila.otros_gastos);

  return (
    <>
      <h2 style={h2}>Egresos del año: {fmtL(total)}</h2>
      <div style={grilla(300, 18)}>
        <div style={caja}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <h3 style={{ ...h2, fontSize: 20 }}>Funcionamiento</h3>
            <span style={{ fontFamily: MONO, fontSize: 14, color: C.texto }}>{fmtL(totF)} · {Math.round(pct(totF, total))} %</span>
          </div>
          {func.map(([l, v]) => <BarraValor key={l} label={l} texto={fmtL(v)} valor={v} max={max} color={C.gris} />)}
        </div>
        <div style={caja}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <h3 style={{ ...h2, fontSize: 20 }}>Capital y deuda</h3>
            <span style={{ fontFamily: MONO, fontSize: 14, color: C.texto }}>{fmtL(totC)} · {Math.round(pct(totC, total))} %</span>
          </div>
          {cap.map(([l, v, c]) => <BarraValor key={l} label={l} texto={fmtL(v)} valor={v} max={max} color={c} />)}
        </div>
      </div>
      {otros > 0 && (
        <p style={nota}>"Otros" de funcionamiento ({fmtL(otros)}, {Math.round(pct(otros, totF))} % del rubro) no tiene desglose en la fuente SEFIN.</p>
      )}
    </>
  );
}

// ── Resultado ───────────────────────────────────────────────────────────────

function TabResultado({ fila }: Props) {
  const r = indicadoresMunicipio(fila);
  const i = insumos(fila);
  const items: [string, string, string, string][] = [
    ['AHORRO CORRIENTE', fmtL(r.ahorroCorriente), `Ingresos corrientes ${fmtL(i.ingresosCorrientes)} − funcionamiento ${fmtL(i.funcionamiento)}`, r.ahorroCorriente < 0 ? C.coral : C.turquesa],
    ['RESULTADO SIN BALANCE', fmtL(r.resultadoSinBalance), `Ingresos del año ${fmtL(r.ingresosDelAnio)} − egresos ${fmtL(i.totalEgresos)}`, r.resultadoSinBalance < 0 ? C.coral : C.turquesa],
    ['RECURSOS DE BALANCE', fmtL(i.recursosBalance), `Caja heredada de ${fila.year - 1}`, C.ambar],
    ['RESULTADO CON BALANCE', fmtL(r.resultadoConBalance), 'Lo que reporta la liquidación SEFIN', C.texto],
  ];
  const sin = r.resultadoSinBalance, con = r.resultadoConBalance;
  return (
    <>
      <h2 style={h2}>Resultado fiscal {fila.year}</h2>
      <div style={grilla(220)}>
        {items.map(([label, valor, detalle, color]) => (
          <div key={label} style={{ ...caja, gap: 6 }}>
            <div style={rotulo}>{label}</div>
            <div style={cifra(34, color)}>{valor}</div>
            <div style={{ fontSize: 13, color: C.suave }}>{detalle}</div>
          </div>
        ))}
      </div>
      <p style={nota}>
        {sin < 0 && con > 0
          ? `El superávit de ${fmtL(con)} se explica por la caja heredada del año anterior. Con los ingresos del año, el municipio gastó ${fmtL(-sin)} más de lo que recaudó.`
          : sin >= 0
            ? `Con los ingresos del año, el municipio cerró con un superávit de ${fmtL(sin)}.`
            : `El municipio cerró con déficit aun contando la caja heredada: ${fmtL(con)}.`}
      </p>
    </>
  );
}

// ── Deuda ───────────────────────────────────────────────────────────────────

function TabDeuda({ fila, filasMuni, comps }: Props) {
  const serie = filasMuni.map((m) => ({ year: m.year, v: n0(m.servicios_deuda), sinLiq: sinLiquidacion(m) }));
  const max = Math.max(0, ...serie.map((s) => s.v));
  const r = indicadoresMunicipio(fila);
  const med = comps.servicioDeudaSobreCorrientes?.mediana;
  return (
    <>
      <h2 style={h2}>Servicio de la deuda</h2>
      <div role="img" aria-label={`Servicio de la deuda ${serie[0]?.year ?? ''} a ${serie[serie.length - 1]?.year ?? ''}`}
        style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(8px, 3vw, 22px)', height: 200, padding: '0 8px', borderBottom: `1px solid ${C.borde2}` }}>
        {serie.map((s) => (
          <div key={s.year} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end', minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.texto, whiteSpace: 'nowrap' }}>{s.sinLiq ? '—' : fmtL(s.v)}</div>
            <div style={{ width: '100%', maxWidth: 72, borderRadius: '6px 6px 0 0', height: max > 0 ? Math.round((s.v / max) * 140) : 0, background: s.year === fila.year ? C.ambar : '#3a4c66' }} />
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.suave }}>{s.year}</div>
          </div>
        ))}
      </div>
      <p style={nota}>
        En {fila.year} el servicio de la deuda equivale al {fmtIndicador('servicioDeudaSobreCorrientes', r.servicioDeudaSobreCorrientes)} de los
        ingresos corrientes{med != null ? ` (mediana cat. ${fila.category}: ${fmtIndicador('servicioDeudaSobreCorrientes', med)})` : ''}.
        {med === 0 ? ` ${notaMedianaDeuda(fila.category)}` : ''} El saldo de la deuda no está disponible en la base SEFIN.
      </p>
    </>
  );
}

// ── Evolución ───────────────────────────────────────────────────────────────

function TabEvolucion({ filasMuni }: Props) {
  const filas: [string, (m: Municipality) => string][] = [
    ['Ingresos corrientes', (m) => fmtL(insumos(m).ingresosCorrientes)],
    ['Transferencias Art. 91', (m) => fmtL(n0(m.transferencias_art91))],
    ['Autonomía', (m) => fmtIndicador('autonomia', indicadoresMunicipio(m).autonomia)],
    ['Gasto de funcionamiento', (m) => fmtL(insumos(m).funcionamiento)],
    ['Inversión (bienes capitalizables)', (m) => fmtL(insumos(m).inversion)],
    ['Recursos de balance', (m) => fmtL(insumos(m).recursosBalance)],
    ['Resultado sin balance', (m) => fmtL(indicadoresMunicipio(m).resultadoSinBalance)],
  ];
  const th: React.CSSProperties = { padding: '12px 14px', fontFamily: MONO, fontSize: 12, fontWeight: 600 };
  return (
    <>
      <h2 style={h2}>Evolución {filasMuni[0]?.year}–{filasMuni[filasMuni.length - 1]?.year}</h2>
      <div style={{ overflowX: 'auto', border: `1px solid ${C.borde}`, borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, fontSize: 14, color: C.texto }}>
          <thead>
            <tr style={{ background: C.panel2 }}>
              <th scope="col" style={{ ...th, textAlign: 'left', fontSize: 11, letterSpacing: '1.2px', color: C.suave, fontWeight: 500 }}>INDICADOR</th>
              {filasMuni.map((m) => <th key={m.year} scope="col" style={{ ...th, textAlign: 'right', color: C.turquesa }}>{m.year}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map(([label, f]) => (
              <tr key={label} style={{ borderTop: `1px solid ${C.borde}` }}>
                <th scope="row" style={{ textAlign: 'left', padding: '11px 14px', fontWeight: 500 }}>{label}</th>
                {filasMuni.map((m) => (
                  <td key={m.year} style={{ textAlign: 'right', padding: '11px 14px', fontFamily: MONO, whiteSpace: 'nowrap' }}>
                    {sinLiquidacion(m) ? ROTULO_SIN_LIQUIDACION : f(m)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ ...nota, fontSize: 13, color: C.suave }}>Autonomía = ingresos corrientes ÷ ingresos del año (sin recursos de balance, préstamos ni bonos). Lempiras corrientes.</p>
    </>
  );
}

// ── Pares ───────────────────────────────────────────────────────────────────

const CLAVES_PARES: ClaveSemaforo[] = [
  'autonomia', 'dependenciaTransferencias', 'propiosPerCapita', 'ibiPerCapita', 'funcionamientoSobreCorrientes',
  'inversionSobreGasto', 'inversionPerCapita', 'servicioDeudaSobreCorrientes', 'balanceSobreIngresos', 'resultadoSinBalance',
];

function TabPares({ fila, comps, excluida }: Props) {
  const r = indicadoresMunicipio(fila);
  const n = comps.autonomia?.n ?? 0;
  if (excluida) {
    return (
      <>
        <h2 style={h2}>Pares de categoría {fila.category} · {fila.year}</h2>
        <p style={{ ...nota, color: C.ambar }}>Sin comparación: este municipio está excluido de estadísticas en {fila.year}.</p>
      </>
    );
  }
  return (
    <>
      <h2 style={h2}>Posición entre los {n} municipios de categoría {fila.category} · {fila.year}</h2>
      {CLAVES_PARES.map((k) => {
        const c = comps[k];
        const v = r[k] as number | null;
        const tono = semaforo(k, v, c?.percentil ?? null).tono;
        const color = k === 'resultadoSinBalance' && v != null && v < 0 ? C.coral : TONO_COLOR[tono];
        return (
          <div key={k} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', alignItems: 'center', padding: '10px 0', borderTop: `1px solid ${C.borde}` }}>
            <div style={{ flex: '1 1 200px', fontSize: 14, color: C.texto }}>{ETIQUETAS[k]}</div>
            <div style={{ flex: '0 0 100px', fontFamily: MONO, fontSize: 14, textAlign: 'right', color: C.texto }}>{fmtIndicador(k, v)}</div>
            <div style={{ flex: '0 0 100px', fontFamily: MONO, fontSize: 13, textAlign: 'right', color: C.suave }}>{fmtIndicador(k, c?.mediana)}</div>
            <div style={{ flex: '1 1 180px' }}><BarraPercentil percentil={c?.percentil ?? null} color={color} /></div>
            <div style={{ flex: '0 0 44px', fontFamily: MONO, fontSize: 12, color: C.suave, textAlign: 'right' }}>{c?.percentil != null ? `P${c.percentil}` : '—'}</div>
          </div>
        );
      })}
      <div style={{ fontFamily: MONO, fontSize: 11, color: C.gris }}>
        Columnas: indicador · {fila.name} · mediana cat. {fila.category} · percentil (la línea gris marca la mediana)
      </div>
      {comps.servicioDeudaSobreCorrientes?.mediana === 0 && (
        <div style={{ fontSize: 12, color: C.suave }}>Servicio de deuda: {notaMedianaDeuda(fila.category)}</div>
      )}
    </>
  );
}
