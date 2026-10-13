// Lectura SIMHO, seis tarjetas de indicadores y franja de resultado del año.
import React from 'react';
import type { Municipality } from '../../hooks/useMunicipalities';
import {
  indicadoresMunicipio, insumos, semaforo, lecturaSimho, ClaveSemaforo, Comparacion,
} from '../../lib/indicadores';
import { fmtL } from '../../lib/formato';
import { BarraPercentil } from './Barras';
import { C, MONO, panel, rotulo, cifra, grilla, TONO_COLOR } from './estilo';

export type Comparaciones = Partial<Record<ClaveSemaforo, Comparacion>>;

/** Formato de cada indicador comparable (porcentaje o lempiras). */
export const fmtIndicador = (clave: ClaveSemaforo, v: number | null | undefined) =>
  v == null ? '—'
    : clave.endsWith('PerCapita') || clave === 'resultadoSinBalance' || clave === 'ahorroCorriente' ? fmtL(v)
    : `${v.toFixed(1)} %`;

export const ETIQUETAS: Record<ClaveSemaforo, string> = {
  autonomia:                     'Autonomía fiscal',
  propiosPerCapita:              'Ingresos propios por habitante',
  ibiPerCapita:                  'IBI por habitante',
  inversionSobreGasto:           'Inversión ÷ gasto total',
  inversionPerCapita:            'Inversión por habitante',
  ahorroCorriente:               'Ahorro corriente',
  resultadoSinBalance:           'Resultado sin balance',
  dependenciaTransferencias:     'Dependencia de transferencias',
  funcionamientoSobreCorrientes: 'Funcionamiento ÷ ingresos corrientes',
  servicioDeudaSobreCorrientes:  'Servicio de deuda ÷ ingresos corrientes',
  balanceSobreIngresos:          'Recursos de balance ÷ ingresos',
};

const TARJETAS: ClaveSemaforo[] = [
  'autonomia', 'propiosPerCapita', 'funcionamientoSobreCorrientes',
  'inversionSobreGasto', 'servicioDeudaSobreCorrientes', 'balanceSobreIngresos',
];

function notaTarjeta(clave: ClaveSemaforo, fila: Municipality): string {
  const i = insumos(fila);
  switch (clave) {
    case 'autonomia':                     return 'Parte de los ingresos del año que el municipio genera por sí mismo.';
    case 'propiosPerCapita':              return 'Ingresos corrientes (tributarios y no tributarios) por habitante.';
    case 'funcionamientoSobreCorrientes': return 'Parte de los ingresos propios que absorbe el gasto de operación.';
    case 'inversionSobreGasto':           return 'Parte del gasto total que va a obra y bienes de capital.';
    case 'servicioDeudaSobreCorrientes':  return 'Pago de deuda frente a ingresos propios. Saldo de deuda no disponible en SEFIN.';
    case 'balanceSobreIngresos':          return `Caja de años anteriores incorporada al presupuesto: ${fmtL(i.recursosBalance)}.`;
    default:                              return '';
  }
}

export function LecturaSimho({ fila, comps, excluida }: { fila: Municipality; comps: Comparaciones; excluida: boolean }) {
  return (
    <section aria-label="Lectura automática SIMHO" style={{
      background: '#13202f', border: '1px solid #2a3d55', borderRadius: 14, padding: '16px 20px',
      display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
    }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: C.ambar, flex: '0 0 auto' }}>
        LECTURA AUTOMÁTICA SIMHO · {fila.year}
      </div>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, flex: '1 1 320px', color: '#dde6ef' }}>
        {excluida
          ? `Sin lectura comparativa: el municipio está excluido de estadísticas en ${fila.year}.`
          : lecturaSimho(fila, comps)}
      </p>
    </section>
  );
}

export function TarjetasIndicadores({ fila, comps, excluida }: { fila: Municipality; comps: Comparaciones; excluida: boolean }) {
  const r = indicadoresMunicipio(fila);
  return (
    <section aria-label="Indicadores clave" style={grilla(240)}>
      {TARJETAS.map((k) => {
        const c = comps[k];
        const valor = r[k] as number | null;
        // Excluido: sin juicio de semáforo (ni alertas), solo el valor.
        const s = excluida ? { etiqueta: 'SIN COMPARACIÓN', tono: 'gris' as const } : semaforo(k, valor, c?.percentil ?? null);
        const color = TONO_COLOR[s.tono];
        return (
          <article key={k} style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={rotulo}>{ETIQUETAS[k]}</div>
              <div style={{
                fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: 1, padding: '4px 8px', borderRadius: 6,
                whiteSpace: 'nowrap',
                ...(s.tono === 'gris' ? { border: `1px solid ${C.gris}`, color: C.texto2 } : { background: color, color: '#062621' }),
              }}>{s.etiqueta}</div>
            </div>
            <div style={cifra(38)}>{fmtIndicador(k, valor)}</div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.suave }}>
              Mediana cat. {fila.category}: <span style={{ color: C.texto }}>{fmtIndicador(k, c?.mediana)}</span>
            </div>
            {excluida
              ? <div style={{ fontFamily: MONO, fontSize: 11, color: C.ambar }}>Sin comparación: excluido de estadísticas</div>
              : <BarraPercentil percentil={c?.percentil ?? null} color={color} n={c?.n} />}
            <div style={{ fontSize: 13, color: C.suave, lineHeight: 1.4 }}>{notaTarjeta(k, fila)}</div>
          </article>
        );
      })}
    </section>
  );
}

export function FranjaResultado({ fila }: { fila: Municipality }) {
  const r = indicadoresMunicipio(fila);
  const i = insumos(fila);
  const conSigno = (v: number) => (v > 0 ? `+${fmtL(v)}` : fmtL(v));
  const items: [string, string, string][] = [
    [`Ingresos del año ${fila.year}`, fmtL(r.ingresosDelAnio), C.texto],
    [`Egresos del año ${fila.year}`, fmtL(i.totalEgresos), C.texto],
    ['Resultado sin balance', conSigno(r.resultadoSinBalance), r.resultadoSinBalance < 0 ? C.coral : C.turquesa],
    ['Resultado con balance', conSigno(r.resultadoConBalance), r.resultadoConBalance < 0 ? C.coral : C.turquesa],
  ];
  return (
    <section aria-label="Resultado del año" style={grilla(200)}>
      {items.map(([label, valor, color]) => (
        <div key={label} style={{ ...panel, padding: '14px 18px' }}>
          <div style={rotulo}>{label}</div>
          <div style={cifra(30, color)}>{valor}</div>
        </div>
      ))}
    </section>
  );
}
