// Análisis: cuadro técnico multianual (alcance País / Departamento / Municipio / Categoría; total o per cápita; nominal o real).
import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { useMunicipalitiesMultiYear, Municipality } from '../hooks/useMunicipalities';
import {
  sumarTotales, insumos, calcular, sinLiquidacion, excluirDeTotales, excluirDeRazones, notaDatoIncompleto, notaTotales, ROTULO_SIN_LIQUIDACION,
  Indicadores, Alcance, filasDeAlcance, indicadoresPorAnio, INDICADORES_ANALISIS, IndicadorAnalisis,
  porCapita, deflactar, variacionPct, tcac, notaMedianaDeuda, impuestosG1, impuestosICS, IMPUESTOS_G1, CAMPOS_IMPUESTOS_G1,
} from '../lib/indicadores';
import { ANIOS_SEFIN } from '../data/anios';
import { IPC, ipcCompleto, ANIO_BASE_REAL, ROTULO_PRECIOS_REALES, tituloGrafico } from '../data/ipc';
import { useNavbar } from '../context/NavbarContext';
import { fmtL, fmtLGrafico, fmtPct } from '../lib/formato';
import { DEPARTAMENTOS, codigoINE } from '../data/departamentos';
import { descargarXlsx, descargarCsv, nombreArchivo, TablaExport, Celda } from '../lib/exportar';
import BuscadorMunicipio from '../components/ficha/BuscadorMunicipio';
import TablaScroll from '../components/TablaScroll';
import { useEsMovil } from '../hooks/useMediaQuery';
import { C, MONO, COND, SANS, panel } from '../components/ficha/estilo';

const ALL_YEARS = ANIOS_SEFIN;
const DEPTS = [...DEPARTAMENTOS].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
const CATEGORIAS = ['A', 'B', 'C', 'D'];

// ── Agregación ────────────────────────────────────────────────────────────────

const sumField = (rows: Municipality[], key: keyof Municipality) => rows.reduce((acc, r) => acc + ((r[key] as number) ?? 0), 0);

// Montos SEFIN sumados + indicadores SIMHO (lib/indicadores, Σ/Σ sobre el ámbito).
interface YearData extends Indicadores {
  poblacion: number;
  [k: string]: number | null;
}

/**
 * Montos del ámbito como TOTALES: sin las filas sin liquidación (sí con las de dato incompleto; la UI lo anota).
 * Las razones del bloque de indicadores salen de indicadoresPorAnio (nivel razones).
 * `unMunicipio`: vista de un solo municipio; no excluye, muestra sus cifras (la UI marca el ⚠).
 */
function aggregate(all: Municipality[], unMunicipio = false): YearData {
  const rows = unMunicipio ? all : all.filter((m) => !excluirDeTotales(m));
  const s = (k: keyof Municipality) => sumField(rows, k);
  const ins = unMunicipio && rows.length === 1 ? insumos(rows[0]) : sumarTotales(rows);
  const campos: (keyof Municipality)[] = [
    'presupuesto_municipal', 'ingresos_tributarios', ...CAMPOS_IMPUESTOS_G1, 'tasas_servicios', 'derechos', 'ingresos_no_tributarios', 'ingresos_capital',
    'transferencias_art91', 'otras_transferencias', 'gastos_funcionamiento', 'servicios_personales', 'servicios_no_personales',
    'materiales_suministro', 'transferencias_corrientes', 'otros_gastos', 'gastos_capital_deuda', 'bienes_capitalizables',
    'transferencias_capital', 'activos_financieros', 'servicios_deuda', 'otros_gastos_capital', 'asignaciones_globales', 'total_egresos',
  ];
  // ponytail: las razones de YearData salen del nivel totales y NO se muestran; las razones vienen de indicadoresPorAnio.
  return {
    ...calcular(ins),
    ...Object.fromEntries(campos.map((k) => [k, s(k)])),
    impuestos:           rows.reduce((acc, r) => acc + impuestosG1(r), 0),
    impuestos_ics:       rows.reduce((acc, r) => acc + impuestosICS(r), 0),
    ingresos_recaudados: ins.ingresosTotales,
    transferencias:      ins.transferencias,
    recursos_balance:    ins.recursosBalance,
    poblacion:           ins.poblacion,
  } as YearData;
}

// ── Filas del cuadro ──────────────────────────────────────────────────────────

type RowVariant = 'group' | 'main' | 'sub' | 'highlight' | 'signed';
/** `ocultarSiCero`: filas de impuestos que no se muestran si valen 0 o nulo en todos los años visibles (en la exportación van siempre). */
interface TRow { key: string; label: string; variant: RowVariant; field?: string; ocultarSiCero?: boolean }

/** Espacio duro: la flecha ↳ nunca queda sola en una línea. */
const NBSP = String.fromCharCode(160);
const sangria = (nivel: number) => NBSP.repeat(4 * nivel);
/** Los 8 impuestos de G1, desde la lista central: IBI, subtotal ICS (Industria · Comercio · Servicios) y el resto. */
const FILAS_IMPUESTOS: TRow[] = IMPUESTOS_G1.flatMap((i, k): TRow[] => {
  const fila: TRow = { key: i.campo, label: `${sangria(i.ics ? 3 : 2)}↳ ${i.etiqueta}`, variant: 'sub', field: i.campo, ocultarSiCero: true };
  const primeraICS = i.ics && !IMPUESTOS_G1[k - 1]?.ics;
  return primeraICS
    ? [{ key: 'impuestos_ics', label: `${sangria(2)}↳ Industria, comercio y servicios`, variant: 'sub', field: 'impuestos_ics', ocultarSiCero: true }, fila]
    : [fila];
});

const TABLE_ROWS: TRow[] = [
  { key: 'g_pres',  label: 'PRESUPUESTO',                   variant: 'group' },
  { key: 'pres',    label: 'Presupuesto Municipal',          variant: 'main',      field: 'presupuesto_municipal' },
  { key: 'g_ing',   label: 'INGRESOS',                       variant: 'group' },
  { key: 'ing_r',   label: 'Ingresos Recaudados (total)',    variant: 'main',      field: 'ingresos_recaudados' },
  { key: 'ing_a',   label: 'Ingresos del Año (sin balance, préstamos ni bonos)', variant: 'main', field: 'ingresosDelAnio' },
  // Jerarquía SEFIN: Corrientes = Tributarios (G1, ya incluye Tasas y Derechos) + No Tributarios (G2).
  { key: 'ing_c',   label: 'Ingresos Corrientes',            variant: 'main',      field: 'ingresosCorrientes' },
  { key: 'ing_t',   label: '↳ Ingresos Tributarios (G1)',    variant: 'sub',       field: 'ingresos_tributarios' },
  { key: 'imp',     label: `${sangria(1)}↳ de los cuales: Impuestos`, variant: 'sub', field: 'impuestos' },
  ...FILAS_IMPUESTOS,
  { key: 'tasas',   label: `${sangria(1)}↳ de los cuales: Tasas por Servicios`, variant: 'sub', field: 'tasas_servicios' },
  { key: 'derech',  label: `${sangria(1)}↳ de los cuales: Derechos`, variant: 'sub', field: 'derechos' },
  { key: 'ing_nt',  label: '↳ Ingresos No Tributarios (G2)', variant: 'sub',       field: 'ingresos_no_tributarios' },
  { key: 'ing_cap', label: 'Ingresos de Capital',            variant: 'main',      field: 'ingresos_capital' },
  { key: 'g_trans', label: 'TRANSFERENCIAS RECIBIDAS',       variant: 'group' },
  { key: 'tr91',    label: 'Transferencias Art. 91',         variant: 'main',      field: 'transferencias_art91' },
  { key: 'g_egr',   label: 'EGRESOS',                        variant: 'group' },
  { key: 'gf',      label: 'Gastos de Funcionamiento',       variant: 'main',      field: 'gastos_funcionamiento' },
  { key: 'sp',      label: '↳ Servicios Personales',         variant: 'sub',       field: 'servicios_personales' },
  { key: 'snp',     label: '↳ Servicios No Personales',      variant: 'sub',       field: 'servicios_no_personales' },
  { key: 'mat',     label: '↳ Materiales y Suministros',     variant: 'sub',       field: 'materiales_suministro' },
  { key: 'tcte',    label: '↳ Transferencias Corrientes',    variant: 'sub',       field: 'transferencias_corrientes' },
  { key: 'otf',     label: '↳ Otros',                        variant: 'sub',       field: 'otros_gastos' },
  { key: 'gc',      label: 'Gastos de Capital y Deuda',      variant: 'main',      field: 'gastos_capital_deuda' },
  { key: 'bc',      label: '↳ Bienes Capitalizables',        variant: 'sub',       field: 'bienes_capitalizables' },
  { key: 'tce',     label: '↳ Transferencias ejecutadas',    variant: 'sub',       field: 'transferencias_capital' },
  { key: 'sd',      label: '↳ Servicios de Deuda',           variant: 'sub',       field: 'servicios_deuda' },
  { key: 'ogc',     label: '↳ Otros Gastos',                 variant: 'sub',       field: 'otros_gastos_capital' },
  { key: 'ag',      label: '↳ Asignaciones Globales',        variant: 'sub',       field: 'asignaciones_globales' },
  { key: 'te',      label: 'Total Egresos',                  variant: 'highlight', field: 'total_egresos' },
  { key: 'g_res',   label: 'RESULTADO',                      variant: 'group' },
  { key: 'sdef',    label: 'Resultado con Balance (Superávit/Déficit SEFIN)', variant: 'signed', field: 'resultadoConBalance' },
  { key: 'rsb',     label: 'Resultado sin Balance',          variant: 'signed',    field: 'resultadoSinBalance' },
  { key: 'ahc',     label: 'Ahorro Corriente',               variant: 'signed',    field: 'ahorroCorriente' },
];

const ETIQUETA_IND: Record<IndicadorAnalisis, string> = {
  autonomia: 'Autonomía', dependenciaTransferencias: 'Dependencia de transferencias',
  funcionamientoSobreCorrientes: 'Funcionamiento ÷ corrientes', inversionSobreGasto: 'Inversión ÷ gasto total',
  servicioDeudaSobreCorrientes: 'Servicio de deuda ÷ corrientes', balanceSobreIngresos: 'Recursos de balance ÷ ingresos',
  propiosPerCapita: 'Ingresos propios por habitante', ibiPerCapita: 'IBI por habitante',
  inversionPerCapita: 'Inversión por habitante', ejecucion: 'Ejecución vs. presupuesto aprobado',
};
const IND_LPH = new Set<IndicadorAnalisis>(['propiosPerCapita', 'ibiPerCapita', 'inversionPerCapita']);

// ── Estilos (contraste AA sobre los paneles; ningún texto bajo 11 px) ─────────

const ROTULO: React.CSSProperties = { fontFamily: MONO, display: 'block', fontSize: 11, color: C.suave, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 };
const COLORES = { teal: '#2dd4bf', amber: '#f59e0b', violet: '#a855f7', pink: '#ec4899', blue: '#06b6d4', green: '#22c55e', red: '#ef4444' };
const boton = (on: boolean, disabled = false): React.CSSProperties => ({
  minHeight: 44, padding: '0 14px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: COND, fontSize: 16, fontWeight: 600,
  border: `1px solid ${on ? C.turquesa : C.borde2}`, background: on ? C.turquesa : 'transparent',
  color: on ? '#062621' : disabled ? C.gris : C.texto2, opacity: disabled ? 0.7 : 1,
});

function Grupo<T extends string>({ etiqueta, opciones, valor, onCambio, deshabilitada }: {
  etiqueta: string; opciones: [T, string][]; valor: T; onCambio: (v: T) => void; deshabilitada?: Partial<Record<T, boolean>>;
}) {
  return (
    <div>
      <span style={ROTULO}>{etiqueta}</span>
      <div role="group" aria-label={etiqueta} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {opciones.map(([v, t]) => (
          <button key={v} type="button" aria-pressed={valor === v} disabled={deshabilitada?.[v]}
            onClick={() => onCambio(v)} style={boton(valor === v, deshabilitada?.[v])}>{t}</button>
        ))}
      </div>
    </div>
  );
}

function DarkTooltip({ active, payload, label, fmtVal }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.panel2, border: `1px solid ${C.borde2}`, borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      {label && <div style={{ color: C.suave, fontFamily: MONO, marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || C.turquesa, fontFamily: MONO }}>{p.name}: {fmtVal(p.value, p.dataKey)}</div>
      ))}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

type TipoAlcance = Alcance['tipo'];

export default function AnalyticsPage() {
  const [tipo, setTipo]           = useState<TipoAlcance>('pais');
  const [cod, setCod]             = useState('');
  const [muni, setMuni]           = useState<{ ine: string; etiqueta: string } | null>(null);
  const [categoria, setCategoria] = useState('A');
  const [selectedYears, setSelectedYears] = useState<number[]>([...ALL_YEARS]);
  const [perCapita, setPerCapita] = useState(false);
  const [real, setReal]           = useState(false);

  const { municipalities, loading } = useMunicipalitiesMultiYear(ALL_YEARS);
  const sortedYears = [...selectedYears].sort((a, b) => a - b);
  const ultimo = sortedYears[sortedYears.length - 1];
  const hayIPC = ipcCompleto([...sortedYears, ANIO_BASE_REAL]);
  const enReal = real && hayIPC;
  // Pie de fuente global: precios constantes mientras "Real" esté activo en esta página.
  const { setNotaPie } = useNavbar();
  const esMovil = useEsMovil();
  useEffect(() => { setNotaPie(enReal ? ROTULO_PRECIOS_REALES : null); return () => setNotaPie(null); }, [enReal, setNotaPie]);

  const alcance: Alcance | null = tipo === 'pais' ? { tipo }
    : tipo === 'departamento' ? (cod ? { tipo, cod } : null)
    : tipo === 'municipio' ? (muni ? { tipo, ine: muni.ine } : null)
    : { tipo, categoria };

  const filasAlcance = useMemo(() => (alcance ? filasDeAlcance(municipalities, alcance) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [municipalities, tipo, cod, muni, categoria]);

  const yearDataMap = useMemo(() => Object.fromEntries(sortedYears.map((y) =>
    [y, aggregate(filasAlcance.filter((m) => m.year === y), tipo === 'municipio')])) as Record<number, YearData>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filasAlcance, tipo, selectedYears]);
  const indicadores = useMemo(() => indicadoresPorAnio(filasAlcance, sortedYears),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filasAlcance, selectedYears]);

  // Filas del municipio elegido: años sin liquidación (sin cifras) y con dato incompleto (⚠).
  const sinLiqYears = useMemo(() => new Set<number>(tipo !== 'municipio' ? [] : filasAlcance.filter(sinLiquidacion).map((m) => m.year)), [filasAlcance, tipo]);
  const notaIncompleto = useMemo(() => new Map<number, string>(tipo !== 'municipio' ? [] : filasAlcance
    .flatMap((m) => { const t = notaDatoIncompleto(m); return t ? [[m.year, t] as [number, string]] : []; })), [filasAlcance, tipo]);

  const deptNombre = DEPTS.find((d) => d.cod === cod)?.nombre ?? '';
  const scopeLabel = tipo === 'pais' ? 'Honduras (País)'
    : tipo === 'departamento' ? (deptNombre ? `Departamento de ${deptNombre}` : 'Departamento (selecciona)')
    : tipo === 'municipio' ? (muni?.etiqueta ?? 'Municipio (selecciona)')
    : `Categoría ${categoria} (SGJD 2020)`;
  const agregado = tipo !== 'municipio';
  const unidad = `${perCapita ? 'Lempiras por habitante' : 'Lempiras'} · ${enReal ? `precios constantes de ${ANIO_BASE_REAL}` : 'precios corrientes'}`;

  /** Monto tal como se muestra: real (precios del último año) y/o por habitante del mismo año. */
  const ver = (v: number | null | undefined, y: number): number | null => {
    if (v == null) return null;
    let x: number | null = v;
    if (enReal) x = deflactar(x, y, ANIO_BASE_REAL, IPC.valores);
    if (perCapita) x = porCapita(x, yearDataMap[y]?.poblacion);
    return x;
  };
  const valor = (row: TRow, y: number) => (row.field && !sinLiqYears.has(y) ? ver(yearDataMap[y]?.[row.field] as number | null, y) : null);
  // Filas de impuestos en 0 o nulo en todos los años visibles: fuera del cuadro (no de la exportación).
  const filasVisibles = TABLE_ROWS.filter((row) => !row.ocultarSiCero || sortedYears.some((y) => { const v = valor(row, y); return v != null && v !== 0; }));
  const variacion = (row: TRow) => (sortedYears.length < 2 ? null
    : variacionPct(valor(row, sortedYears[sortedYears.length - 2]), valor(row, ultimo)));
  const crecimiento = (row: TRow) => (sortedYears.length < 2 ? null : tcac(valor(row, sortedYears[0]), valor(row, ultimo), ultimo - sortedYears[0]));
  const verInd = (k: IndicadorAnalisis, v: number | null, y: number) => (IND_LPH.has(k) && enReal ? deflactar(v, y, ANIO_BASE_REAL, IPC.valores) : v);
  const fmtInd = (k: IndicadorAnalisis, v: number | null) => (IND_LPH.has(k) ? fmtL(v) : fmtPct(v));
  const fmtMonto = (v: number | null) => (v == null || v === 0 ? '—' : fmtL(v));
  // Totales que incluyen filas sin Art. 91 o con rendición parcial (alcances agregados).
  const notasTotales = agregado ? sortedYears.flatMap((y) => {
    const t = notaTotales(filasAlcance.filter((m) => m.year === y));
    return t ? [[y, t] as [number, string]] : [];
  }) : [];
  // Mediana del servicio de deuda en 0 en algún año (alcances agregados): más de la mitad sin pagos de deuda.
  const deudaCero = agregado && sortedYears.some((y) => indicadores[y]?.servicioDeudaSobreCorrientes.mediana === 0);

  function toggleYear(y: number) {
    setSelectedYears((prev) => (prev.includes(y) ? (prev.length > 1 ? prev.filter((p) => p !== y) : prev) : [...prev, y]));
  }

  // ── Gráficos (lempiras tal como se muestran en la tabla) ──
  const serie = (field: string) => (y: number): number | null => (sinLiqYears.has(y) ? null : ver(yearDataMap[y]?.[field] as number, y));
  const chart1 = sortedYears.map((y) => {
    const corr = serie('ingresosCorrientes')(y), tr = serie('transferencias')(y), anio = serie('ingresosDelAnio')(y), tot = serie('ingresos_recaudados')(y);
    const ok = corr != null && tr != null && anio != null && tot != null;
    return { year: String(y), 'Ing. Corrientes': corr, 'Transferencias': tr, 'Otros del año': ok ? anio - corr - tr : null, 'Balance y financ.': ok ? tot - anio : null };
  });
  const chart2 = sortedYears.map((y) => ({ year: String(y), Mediana: indicadores[y]?.autonomia.mediana, Agregado: indicadores[y]?.autonomia.agregado }));
  const chart3 = sortedYears.map((y) => ({ year: String(y), Funcionamiento: serie('gastos_funcionamiento')(y), 'Capital y Deuda': serie('gastos_capital_deuda')(y) }));
  const chart4 = sortedYears.map((y) => ({
    year: String(y),
    'Con balance': sinLiqYears.has(y) ? null : serie('resultadoConBalance')(y),
    'Sin balance': sinLiqYears.has(y) ? null : serie('resultadoSinBalance')(y),
  }));
  const chart5 = sortedYears.map((y) => ({
    year: String(y),
    'Servicio de deuda': serie('servicios_deuda')(y),
    'Ingresos corrientes': serie('ingresosCorrientes')(y),
    'Deuda ÷ corrientes (%)': indicadores[y]?.servicioDeudaSobreCorrientes.agregado ?? null,
  }));

  const TICK = { fill: C.suave, fontSize: 11, fontFamily: MONO };
  const GRID = { stroke: 'rgba(0,212,184,0.08)', strokeDasharray: '3 4' as string, vertical: false };
  const TT_WRAP = { background: 'transparent', border: 'none', boxShadow: 'none' };
  const LEG = (v: string) => <span style={{ color: C.texto2, fontSize: 12, fontFamily: MONO }}>{v}</span>;
  const fmtGraf = (v: number) => fmtL(v);

  // ── Exportación: el cuadro tal como se ve ──
  function tablaExport(): TablaExport {
    // Datos: exactamente una fila por concepto (sin filas de título); el bloque va en la columna Grupo.
    const tMonto = perCapita ? 'lph' : 'monto';
    let grupoActual = '';
    const filas: Celda[][] = TABLE_ROWS.flatMap((row) => {
      if (row.variant === 'group') { grupoActual = row.label.charAt(0) + row.label.slice(1).toLowerCase(); return []; }
      return [[grupoActual, row.label.replace(/\u00a0/g, ' ').trim(), ...sortedYears.map((y) => valor(row, y)), variacion(row), crecimiento(row)]];
    });
    // Resumen: indicadores (mediana municipal y agregado del alcance, o el valor del municipio).
    const series: ['mediana' | 'agregado', string][] = agregado ? [['mediana', 'Mediana municipal'], ['agregado', 'Agregado (Σ/Σ)']] : [['agregado', 'Valor del municipio']];
    const resFilas: Celda[][] = [], resTipos: ('pct' | 'lph')[] = [];
    INDICADORES_ANALISIS.forEach((k) => series.forEach(([s, t]) => {
      resFilas.push([ETIQUETA_IND[k], t, ...sortedYears.map((y) => verInd(k, indicadores[y]?.[k][s] ?? null, y))]);
      resTipos.push(IND_LPH.has(k) ? 'lph' : 'pct');
    }));
    return {
      resumen: {
        columnas: [
          { clave: 'indicador', titulo: 'Indicador', tipo: 'texto' }, { clave: 'serie', titulo: 'Serie', tipo: 'texto' },
          ...sortedYears.map((y) => ({ clave: String(y), titulo: String(y), tipo: 'variable' as const })),
        ],
        filas: resFilas, tipoFila: resTipos,
        nota: (agregado
          ? `Mediana municipal y agregado (Σ numeradores ÷ Σ denominadores) de ${scopeLabel}, sin municipios sin liquidación, sin transferencia Art. 91 ni con rendición parcial. Los montos de la hoja Datos son totales: solo excluyen las filas sin liquidación.`
          : `Valores de ${scopeLabel}.`)
          + (perCapita || enReal ? ` Montos por habitante ${enReal ? `a precios de ${ANIO_BASE_REAL}` : 'nominales'}.` : '')
          + (deudaCero ? ` ${notaMedianaDeuda()}` : ''),
      },
      columnas: [
        { clave: 'grupo', titulo: 'Grupo', tipo: 'texto' },
        { clave: 'concepto', titulo: `Concepto (${unidad})`, tipo: 'texto' },
        ...sortedYears.map((y) => ({ clave: String(y), titulo: String(y), tipo: 'variable' as const })),
        { clave: 'var', titulo: 'Var. % último año', tipo: 'pct' },
        { clave: 'tcac', titulo: 'Crec. promedio anual (%)', tipo: 'pct' },
      ],
      filas, tipoFila: filas.map(() => tMonto),
      campos: ['grupo', 'concepto', ...Array.from(new Set([...TABLE_ROWS.flatMap((r) => (r.field ? [r.field] : [])), ...INDICADORES_ANALISIS])), 'var', 'tcac'],
    };
  }
  function notasExport(): [string, string][] {
    const lista = (f: (m: Municipality) => boolean) => filasAlcance.filter((m) => sortedYears.includes(m.year) && f(m))
      .sort((a, b) => a.year - b.year || (a.name ?? '').localeCompare(b.name ?? ''))
      .map((m) => `${m.year} ${m.name} (${codigoINE(m.department, m.code)}): ${notaDatoIncompleto(m) ?? ROTULO_SIN_LIQUIDACION}`);
    const fueraTot = lista(excluirDeTotales);
    const soloRaz = lista((m) => excluirDeRazones(m) && !excluirDeTotales(m));
    const excl = [
      ...(fueraTot.length ? [`Fuera de totales y razones: ${fueraTot.join('; ')}`] : []),
      ...(soloRaz.length ? [`Suman en los totales pero quedan fuera de razones y medianas: ${soloRaz.join('; ')}`] : []),
    ];
    return [
      ['Página', 'Análisis — cuadro presupuestario multianual'],
      ['Alcance', scopeLabel],
      ['Años', sortedYears.join(', ')],
      ['Unidad', unidad],
      ['Per cápita', perCapita ? 'Sí: cada monto se divide entre la población del mismo año del alcance' : 'No'],
      ['Precios', enReal ? `Reales: ${ROTULO_PRECIOS_REALES}` : 'Nominales (corrientes)'],
      ['Indicadores', agregado ? 'Mediana municipal y agregado Σ/Σ del alcance' : 'Valor del municipio'],
      ...notasTotales.map(([y, t]) => [`Totales ${y}`, t] as [string, string]),
      ['Excluidos', excl.length ? excl.join(' · ') : (agregado ? 'Ninguno en el alcance y años seleccionados' : 'No aplica (vista de un municipio: se muestran sus cifras)')],
    ];
  }
  const nombre = (ext: 'xlsx' | 'csv') => nombreArchivo('Análisis', scopeLabel.replace(/\(.*\)/, '').trim(), sortedYears, ext);

  const listo = !!alcance && !loading;

  return (
    <div className="simho-scroll" style={{ flex: 1, overflowY: 'auto', background: C.fondo, color: C.texto, fontFamily: SANS }}>
      <div style={{ padding: '24px clamp(16px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400 }}>
        <header>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: C.turquesa }}>SIMHO — ANÁLISIS PRESUPUESTARIO</div>
          <h1 style={{ margin: '4px 0 0', fontFamily: COND, fontSize: 'clamp(30px, 5vw, 38px)', fontWeight: 700 }}>Análisis</h1>
        </header>

        {/* Controles */}
        <section aria-label="Controles" className="analisis-controles" style={{ ...panel, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-end' }}>
          <Grupo<TipoAlcance> etiqueta="Alcance" valor={tipo} onCambio={(v) => setTipo(v)}
            opciones={[['pais', 'País'], ['departamento', 'Departamento'], ['municipio', 'Municipio'], ['categoria', 'Categoría']]} />
          {tipo === 'departamento' && (
            <label>
              <span style={ROTULO}>Departamento</span>
              <select className="simho-select" value={cod} onChange={(e) => setCod(e.target.value)} style={{ minHeight: 44, fontSize: 14 }}>
                <option value="">— Selecciona —</option>
                {DEPTS.map((d) => <option key={d.cod} value={d.cod}>{d.nombre}</option>)}
              </select>
            </label>
          )}
          {tipo === 'municipio' && (
            <div style={{ minWidth: 0 }}>
              <span style={ROTULO}>Municipio{muni ? `: ${muni.etiqueta}` : ''}</span>
              <BuscadorMunicipio filas={municipalities} onElegir={(o) => setMuni({ ine: o.ine, etiqueta: o.etiqueta })} />
            </div>
          )}
          {tipo === 'categoria' && (
            <Grupo<string> etiqueta="Categoría SGJD" valor={categoria} onCambio={setCategoria} opciones={CATEGORIAS.map((c) => [c, c])} />
          )}
          <div>
            <span style={ROTULO}>Años</span>
            <div role="group" aria-label="Años" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ALL_YEARS.map((y) => (
                <button key={y} type="button" aria-pressed={selectedYears.includes(y)} onClick={() => toggleYear(y)}
                  style={{ ...boton(selectedYears.includes(y)), fontFamily: MONO, fontSize: 13 }}>{y}</button>
              ))}
            </div>
          </div>
          <Grupo<'total' | 'pc'> etiqueta="Montos" valor={perCapita ? 'pc' : 'total'} onCambio={(v) => setPerCapita(v === 'pc')}
            opciones={[['total', 'Total'], ['pc', 'Per cápita']]} />
          <div>
            <Grupo<'nominal' | 'real'> etiqueta="Precios" valor={enReal ? 'real' : 'nominal'} onCambio={(v) => setReal(v === 'real')}
              opciones={[['nominal', 'Nominal'], ['real', 'Real']]} deshabilitada={{ real: !hayIPC }} />
            {!hayIPC && <div style={{ fontFamily: MONO, fontSize: 11, color: C.ambar, marginTop: 6 }}>Serie IPC pendiente de carga</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
            <button type="button" disabled={!listo} onClick={() => descargarXlsx(tablaExport(), notasExport(), nombre('xlsx'))} style={boton(true, !listo)}>Descargar Excel</button>
            <button type="button" disabled={!listo} onClick={() => descargarCsv(tablaExport(), nombre('csv'))} style={boton(false, !listo)}>CSV</button>
          </div>
        </section>

        {!alcance ? (
          <div style={{ ...panel, fontFamily: MONO, color: C.suave }}>Selecciona {tipo === 'departamento' ? 'un departamento' : 'un municipio'} para ver el cuadro.</div>
        ) : (
          <>
            {/* Cuadro */}
            <section aria-label="Cuadro presupuestario" style={{ ...panel, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px 10px', borderBottom: `1px solid ${C.borde}` }}>
                <h2 style={{ margin: 0, fontFamily: COND, fontSize: 22, fontWeight: 600 }}>Ejecución presupuestaria — {scopeLabel}</h2>
                <div style={{ fontFamily: MONO, fontSize: 12, color: C.suave, marginTop: 4 }}>{unidad}{loading ? ' · Cargando…' : ''}</div>
              </div>
              <TablaScroll>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560, fontFamily: MONO }}>
                  <thead>
                    <tr style={{ background: C.panel2 }}>
                      <th scope="col" className="col-fija" style={{ padding: '10px 16px', textAlign: 'left', color: C.suave, fontSize: 11, letterSpacing: '0.1em', fontWeight: 600, position: 'sticky', left: 0, zIndex: 2, background: C.panel2, minWidth: 220 }}>CONCEPTO</th>
                      {sortedYears.map((y) => (
                        <th key={y} scope="col" style={{ padding: '10px 12px', textAlign: 'right', color: C.turquesa, fontSize: 13, fontWeight: 700, minWidth: 104 }}>
                          {y}
                          {notaIncompleto.has(y) && <div title={notaIncompleto.get(y)} style={{ color: C.ambar, fontSize: 11, fontWeight: 600, maxWidth: 150, whiteSpace: 'normal' }}>⚠ {notaIncompleto.get(y)}</div>}
                          {sinLiqYears.has(y) && <div style={{ color: C.ambar, fontSize: 11, fontWeight: 600 }}>⚠ {ROTULO_SIN_LIQUIDACION}</div>}
                        </th>
                      ))}
                      {sortedYears.length > 1 && <>
                        <th scope="col" style={{ padding: '10px 12px', textAlign: 'right', color: C.suave, fontSize: 11, fontWeight: 600, minWidth: 96 }}>VAR. % {sortedYears[sortedYears.length - 2]}–{ultimo}</th>
                        <th scope="col" style={{ padding: '10px 12px', textAlign: 'right', color: C.suave, fontSize: 11, fontWeight: 600, minWidth: 96 }}>CREC. PROM. ANUAL</th>
                      </>}
                    </tr>
                  </thead>
                  <tbody>
                    {filasVisibles.map((row, idx) => {
                      const isGroup = row.variant === 'group', isSub = row.variant === 'sub', isHi = row.variant === 'highlight';
                      // Sangría del rótulo (espacios iniciales) como margen: el texto que se corta en dos líneas queda alineado.
                      // Escritorio: el nivel 1 ocupa lo mismo que sus 4 espacios (29 px) y los niveles 2–3 suman 14 px, para no ensanchar la columna (220 px).
                      const nivel = (row.label.match(/^\s*/)?.[0].length ?? 0) / 4;
                      const bg = isGroup ? C.panel2 : isHi ? '#10302d' : idx % 2 === 0 ? '#111a2b' : C.panel;
                      const color = (v: number | null) => (row.variant === 'signed' && v != null && v !== 0 ? (v > 0 ? '#4ade80' : '#ff7a6b') : isSub ? C.texto2 : C.texto);
                      return (
                        <tr key={row.key} style={{ background: bg }}>
                          <th scope="row" className="col-fija" style={{
                            padding: isSub ? `7px 16px 7px ${esMovil ? 12 + nivel * 8 : 28 + Math.min(nivel, 1) * 29 + Math.max(nivel - 1, 0) * 14}px` : '8px 16px', textAlign: 'left', position: 'sticky', left: 0, zIndex: 1, background: bg,
                            color: isGroup ? C.suave : isSub ? C.texto2 : C.texto, fontSize: isGroup ? 11 : isSub ? 12 : 13,
                            fontWeight: isGroup || isHi ? 700 : isSub ? 400 : 500, letterSpacing: isGroup ? '0.14em' : 0,
                          }}>{row.label.trimStart().replace(/^↳ /, '↳' + NBSP)}</th>
                          {sortedYears.map((y) => { const v = valor(row, y); return (
                            <td key={y} style={{ padding: '8px 12px', textAlign: 'right', fontSize: isSub ? 12 : 13, fontWeight: isHi ? 700 : 400, color: color(v), whiteSpace: 'nowrap' }}>
                              {isGroup ? '' : fmtMonto(v)}
                            </td>
                          ); })}
                          {sortedYears.length > 1 && <>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, color: C.texto2 }}>{isGroup ? '' : fmtPct(variacion(row))}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, color: C.texto2 }}>{isGroup ? '' : fmtPct(crecimiento(row))}</td>
                          </>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TablaScroll>
              {notasTotales.map(([y, t]) => (
                <div key={y} style={{ padding: '8px 18px', borderTop: `1px solid ${C.borde}`, fontSize: 13, color: C.ambar }}>{y}: {t}</div>
              ))}
              {filasVisibles.length < TABLE_ROWS.length && (
                <div style={{ padding: '8px 18px', borderTop: `1px solid ${C.borde}`, fontFamily: MONO, fontSize: 11, color: C.suave }}>
                  Se ocultan impuestos sin recaudación en los años mostrados.
                </div>
              )}
              <div style={{ padding: '8px 18px', borderTop: `1px solid ${C.borde}`, fontFamily: MONO, fontSize: 11, color: C.suave }}>
                Var. %: último año frente al anterior seleccionado. Crecimiento promedio anual (TCAC) entre {sortedYears[0]} y {ultimo}; "—" si algún extremo es ≤ 0.{enReal ? ' En modo Real son variaciones a precios constantes (sin inflación).' : ''}
              </div>
            </section>

            {/* Indicadores por año */}
            <section aria-label="Indicadores por año" style={{ ...panel, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px 10px', borderBottom: `1px solid ${C.borde}` }}>
                <h2 style={{ margin: 0, fontFamily: COND, fontSize: 22, fontWeight: 600 }}>Indicadores por año</h2>
                <div style={{ fontFamily: MONO, fontSize: 12, color: C.suave, marginTop: 4 }}>
                  {agregado ? 'Mediana municipal y agregado (Σ/Σ) del alcance, sin municipios sin liquidación, sin Art. 91 ni con rendición parcial' : 'Valores del municipio'}
                </div>
              </div>
              <TablaScroll>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560, fontFamily: MONO, fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.panel2 }}>
                      <th scope="col" className="col-fija" style={{ padding: '10px 16px', textAlign: 'left', color: C.suave, fontSize: 11, letterSpacing: '0.1em', position: 'sticky', left: 0, background: C.panel2, minWidth: 220 }}>INDICADOR</th>
                      {agregado && <th scope="col" style={{ padding: '10px 12px', textAlign: 'left', color: C.suave, fontSize: 11 }}>SERIE</th>}
                      {sortedYears.map((y) => <th key={y} scope="col" style={{ padding: '10px 12px', textAlign: 'right', color: C.turquesa, minWidth: 96 }}>{y}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {INDICADORES_ANALISIS.flatMap((k, i) => (agregado ? (['mediana', 'agregado'] as const) : (['agregado'] as const)).map((s, j) => {
                      const bg = i % 2 === 0 ? '#111a2b' : C.panel;
                      return (
                        <tr key={`${k}-${s}`} style={{ background: bg, borderTop: j === 0 ? `1px solid ${C.borde}` : undefined }}>
                          <th scope="row" className="col-fija" style={{ padding: '7px 16px', textAlign: 'left', fontWeight: 500, color: j === 0 ? C.texto : 'transparent', position: 'sticky', left: 0, background: bg }}>
                            {ETIQUETA_IND[k]}
                          </th>
                          {agregado && <td style={{ padding: '7px 12px', color: C.suave, fontSize: 12 }}>{s === 'mediana' ? 'Mediana' : 'Agregado'}</td>}
                          {sortedYears.map((y) => (
                            <td key={y} style={{ padding: '7px 12px', textAlign: 'right', color: s === 'mediana' ? C.texto : C.texto2 }}>
                              {fmtInd(k, verInd(k, indicadores[y]?.[k][s] ?? null, y))}
                            </td>
                          ))}
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </TablaScroll>
              {deudaCero && (
                <div style={{ padding: '8px 18px', borderTop: `1px solid ${C.borde}`, fontSize: 13, color: C.suave }}>
                  Servicio de deuda ÷ corrientes, mediana en 0.0 %: {notaMedianaDeuda()}
                </div>
              )}
            </section>

            {/* Gráficos */}
            <section aria-label="Gráficos" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 12 }}>
              {[
                { titulo: 'Evolución de ingresos', chart: (
                  <BarChart data={chart1} margin={{ top: 4, right: 14, left: 2, bottom: 4 }} barCategoryGap="28%">
                    <CartesianGrid {...GRID} /><XAxis dataKey="year" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} width={104} tickFormatter={(v) => fmtLGrafico(v)} />
                    <RTooltip content={<DarkTooltip fmtVal={fmtGraf} />} wrapperStyle={TT_WRAP} /><Legend formatter={LEG} iconSize={8} verticalAlign="bottom" />
                    <Bar dataKey="Ing. Corrientes" stackId="i" fill={COLORES.teal} maxBarSize={36} />
                    <Bar dataKey="Transferencias" stackId="i" fill={COLORES.amber} maxBarSize={36} />
                    <Bar dataKey="Otros del año" stackId="i" fill={COLORES.blue} maxBarSize={36} />
                    <Bar dataKey="Balance y financ." stackId="i" fill={COLORES.violet} radius={[3, 3, 0, 0]} maxBarSize={36} />
                  </BarChart>) },
                { titulo: agregado ? 'Autonomía: mediana y agregado (%)' : 'Autonomía (%)', chart: (
                  <LineChart data={chart2} margin={{ top: 4, right: 14, left: 2, bottom: 4 }}>
                    <CartesianGrid {...GRID} /><XAxis dataKey="year" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${v}%`} />
                    <RTooltip content={<DarkTooltip fmtVal={(v: number) => fmtPct(v)} />} wrapperStyle={TT_WRAP} /><Legend formatter={LEG} iconSize={8} verticalAlign="bottom" />
                    {agregado && <Line type="monotone" dataKey="Mediana" stroke={COLORES.amber} strokeWidth={2} dot={{ r: 4, fill: COLORES.amber, strokeWidth: 0 }} />}
                    <Line type="monotone" dataKey="Agregado" name={agregado ? 'Agregado' : 'Autonomía'} stroke={COLORES.teal} strokeWidth={2} dot={{ r: 4, fill: COLORES.teal, strokeWidth: 0 }} />
                  </LineChart>) },
                { titulo: 'Estructura de egresos', chart: (
                  <BarChart data={chart3} margin={{ top: 4, right: 14, left: 2, bottom: 4 }} barCategoryGap="38%">
                    <CartesianGrid {...GRID} /><XAxis dataKey="year" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} width={104} tickFormatter={(v) => fmtLGrafico(v)} />
                    <RTooltip content={<DarkTooltip fmtVal={fmtGraf} />} wrapperStyle={TT_WRAP} /><Legend formatter={LEG} iconSize={8} verticalAlign="bottom" />
                    <Bar dataKey="Funcionamiento" stackId="e" fill={COLORES.pink} maxBarSize={36} />
                    <Bar dataKey="Capital y Deuda" stackId="e" fill={COLORES.violet} radius={[3, 3, 0, 0]} maxBarSize={36} />
                  </BarChart>) },
                { titulo: 'Resultado con y sin balance', chart: (
                  <BarChart data={chart4} margin={{ top: 4, right: 14, left: 2, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid {...GRID} /><XAxis dataKey="year" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} width={104} tickFormatter={(v) => fmtLGrafico(v)} />
                    <RTooltip content={<DarkTooltip fmtVal={fmtGraf} />} wrapperStyle={TT_WRAP} /><Legend formatter={LEG} iconSize={8} verticalAlign="bottom" />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" />
                    <Bar dataKey="Con balance" fill={COLORES.teal} maxBarSize={30} />
                    <Bar dataKey="Sin balance" fill={COLORES.amber} maxBarSize={30} />
                  </BarChart>) },
                { titulo: 'Servicio de deuda vs. ingresos corrientes', chart: (
                  <ComposedChart data={chart5} margin={{ top: 4, right: 4, left: 2, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid {...GRID} /><XAxis dataKey="year" tick={TICK} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="l" tick={TICK} tickLine={false} axisLine={false} width={104} tickFormatter={(v) => fmtLGrafico(v)} />
                    <YAxis yAxisId="p" orientation="right" tick={TICK} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${v}%`} />
                    <RTooltip content={<DarkTooltip fmtVal={(v: number, k: string) => (k === 'Deuda ÷ corrientes (%)' ? fmtPct(v) : fmtL(v))} />} wrapperStyle={TT_WRAP} />
                    <Legend formatter={LEG} iconSize={8} verticalAlign="bottom" />
                    <Bar yAxisId="l" dataKey="Ingresos corrientes" fill={COLORES.teal} maxBarSize={30} />
                    <Bar yAxisId="l" dataKey="Servicio de deuda" fill={COLORES.red} maxBarSize={30} />
                    <Line yAxisId="p" type="monotone" dataKey="Deuda ÷ corrientes (%)" stroke={COLORES.amber} strokeWidth={2} dot={{ r: 4, fill: COLORES.amber, strokeWidth: 0 }} />
                  </ComposedChart>) },
              ].map((g) => (
                <div key={g.titulo} style={{ ...panel, padding: '14px 10px 10px' }}>
                  <h3 style={{ margin: '0 0 10px 6px', fontFamily: MONO, fontSize: 12, color: C.suave, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                    {tituloGrafico(g.titulo, perCapita, enReal)}
                  </h3>
                  {/* En celular la leyenda ocupa más líneas: más alto para que el área del gráfico siga legible. */}
                  <ResponsiveContainer width="100%" height={esMovil ? 300 : 240}>{g.chart}</ResponsiveContainer>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
