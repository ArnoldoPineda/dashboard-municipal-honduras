// "Ver detalle contable": bloques G1 / G2 / G4 / funcionamiento / capital y deuda (los de la antigua
// Detalle Municipio), rubro por rubro de la liquidación SEFIN. Cerrado por defecto.
import React from 'react';
import type { Municipality } from '../../hooks/useMunicipalities';
import { fmtL } from '../../lib/formato';
import { C, MONO, COND, grilla } from './estilo';

type Campo = keyof Municipality;
interface Bloque { titulo: string; color: string; total: Campo; nota?: string; rubros: [string, Campo][] }

const BLOQUES: Bloque[] = [
  { titulo: 'G1 — Ingresos tributarios', color: C.turquesa, total: 'ingresos_tributarios', rubros: [
    ['Impuesto s/ bienes inmuebles', 'impuesto_bi'], ['Impuesto personal (vecinal)', 'impuesto_personal'],
    ['Impuesto s/ industria (ICS)', 'impuesto_industria'], ['Impuesto s/ comercio (ICS)', 'impuesto_comercio'],
    ['Impuesto s/ servicios (ICS)', 'impuesto_servicios'], ['Impuesto pecuario', 'impuesto_pecuario'],
    ['Impuesto s/ extracción', 'impuesto_extraccion'], ['Impuesto de telecomunicaciones', 'impuesto_telecomunicaciones'],
    ['Tasas por servicios', 'tasas_servicios'], ['Derechos', 'derechos'],
  ] },
  { titulo: 'G2 — Ingresos no tributarios', color: '#9fece0', total: 'ingresos_no_tributarios',
    nota: 'Tasas por servicios y derechos son tributarios: se cuentan una sola vez, en G1.', rubros: [
      ['Multas, mora y recargos', 'ingresos_no_tributarios'],
    ] },
  { titulo: 'G4 — Recursos de capital y financiamiento', color: C.ambar, total: 'ingresos_capital', rubros: [
    ['Venta de activos', 'venta_activos'], ['Contribuciones', 'contribuciones'], ['Préstamos', 'prestamos'],
    ['Colocación de bonos', 'colocacion_bonos'], ['Transferencias Art. 91', 'transferencias_art91'],
    ['Otras transferencias', 'otras_transferencias'], ['Subsidios', 'subsidios'],
    ['Herencias, legados y donaciones', 'herencias_legados'], ['Otros ingresos de capital', 'otros_ingresos_capital'],
    ['Recursos de balance', 'recursos_balance'],
  ] },
  { titulo: 'Gastos de funcionamiento', color: C.gris, total: 'gastos_funcionamiento', rubros: [
    ['Servicios personales', 'servicios_personales'], ['Servicios no personales', 'servicios_no_personales'],
    ['Materiales, suministros y maquinaria', 'materiales_suministro'], ['Transferencias corrientes', 'transferencias_corrientes'],
    ['Otros', 'otros_gastos'],
  ] },
  { titulo: 'Gastos de capital y deuda pública', color: '#7f93ad', total: 'gastos_capital_deuda', rubros: [
    ['Bienes capitalizables', 'bienes_capitalizables'], ['Transferencias de capital', 'transferencias_capital'],
    ['Activos financieros', 'activos_financieros'], ['Servicio de deuda', 'servicios_deuda'],
    ['Otros gastos de capital', 'otros_gastos_capital'], ['Asignaciones globales', 'asignaciones_globales'],
  ] },
];

const monto = (m: Municipality, k: Campo) => fmtL(Number(m[k]) || 0);

export default function DetalleContable({ fila }: { fila: Municipality }) {
  return (
    <details style={{ background: C.panel, border: `1px solid ${C.borde}`, borderRadius: 14, padding: '14px 18px' }}>
      <summary style={{ cursor: 'pointer', fontFamily: MONO, fontSize: 12, letterSpacing: '1.5px', color: C.suave, minHeight: 44, display: 'flex', alignItems: 'center' }}>
        VER DETALLE CONTABLE (G1, G2, G4, FUNCIONAMIENTO, CAPITAL Y DEUDA)
      </summary>
      <div style={{ ...grilla(300, 14), marginTop: 14 }}>
        {BLOQUES.map((b) => (
          <section key={b.titulo} style={{ background: C.panel2, border: `1px solid ${C.borde}`, borderLeft: `3px solid ${b.color}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <h3 style={{ margin: 0, fontFamily: COND, fontSize: 18, fontWeight: 600, color: C.texto }}>{b.titulo}</h3>
              <span style={{ fontFamily: MONO, fontSize: 13, color: b.color === C.gris ? C.texto : b.color, whiteSpace: 'nowrap' }}>{monto(fila, b.total)}</span>
            </div>
            {b.nota && <p style={{ margin: '6px 0 0', fontSize: 12, color: C.suave }}>{b.nota}</p>}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 13, color: C.texto2 }}>
              <tbody>
                {b.rubros.map(([label, k]) => (
                  <tr key={label} style={{ borderTop: `1px solid ${C.borde}` }}>
                    <th scope="row" style={{ textAlign: 'left', fontWeight: 400, padding: '6px 0' }}>{label}</th>
                    <td style={{ textAlign: 'right', fontFamily: MONO, padding: '6px 0', whiteSpace: 'nowrap' }}>{monto(fila, k)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </details>
  );
}
