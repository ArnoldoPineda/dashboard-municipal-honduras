// Fuente única de indicadores financieros municipales (docs/PLAN_REDISENO.md §1).
// Por municipio y año. Agregados (departamento, nación): suma de numeradores y denominadores.
import type { Municipality } from '../hooks/useMunicipalities';
import { fmtL } from './formato';
import { codigoINE } from '../data/departamentos';

/** Rótulo único de la población mostrada (SEFIN "ajustada" hasta cargar INE). */
export const ROTULO_POBLACION = 'Población: proyección (provisional)';
/** Rótulo único de la categoría A–D: columna `category`; nota del Excel SEFIN 2021–2022 (docs/ATIPICOS.md §6). */
export const ROTULO_CATEGORIA = 'Categoría SGJD 2020 (según nota del Excel SEFIN)';
export const ROTULO_SIN_LIQUIDACION = 'Sin liquidación';
/** Fila con liquidación pero Art. 91 + otras transferencias = 0 (docs/ATIPICOS.md §5). */
export const ROTULO_SIN_ART91 = 'Sin transferencia Art. 91 en la fuente (puede ser retención de SEFIN o dato faltante)';
/** Rendición de menos de un año según las notas del Excel SEFIN (docs/ATIPICOS.md §6). */
export const ROTULO_RENDICION_PARCIAL = 'Dato incompleto (rendición parcial)';
/**
 * Rendiciones parciales según las notas al pie del Excel SEFIN que no caen en "sin liquidación"
 * (docs/ATIPICOS.md §6). Clave: "DEPARTAMENTO|code|año".
 */
const RENDICION_PARCIAL = new Set(['GRACIAS A DIOS|6|2021', 'EL PARAISO|11|2022']);
/**
 * Bienes capitalizables ÷ total egresos por debajo de este % : señal de atípico, no exclusión. En la fuente, el gasto
 * de capital de estas filas suele quedar en "Asignaciones globales" y no en bienes capitalizables (docs/ATIPICOS.md §8).
 */
export const UMBRAL_INVERSION_GASTO = 2;
export const ROTULO_INVERSION_CASI_NULA = 'Inversión en bienes capitalizables casi nula (< 2 % del gasto). '
  + 'El gasto de capital puede estar registrado en Asignaciones globales — verificar con la liquidación';
/** La ejecución se mide contra el aprobado (no hay vigente); por encima de este % se marca ⚠. */
export const UMBRAL_EJECUCION = 150;

/** Montos no finitos (NaN, ±Infinity, texto) se tratan como null, es decir, 0 en las sumas. */
const n = (v: number | string | null | undefined) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const fin = (x: number) => (Number.isFinite(x) ? x : null);
const ratio = (num: number, den: number) => (den > 0 ? fin((num / den) * 100) : null);
const perCapita = (num: number, pob: number) => (pob > 0 ? fin(num / pob) : null);

/** Montos base (lempiras) de los que salen todos los indicadores. Sumables entre municipios. */
export interface Insumos {
  ingresosTotales:   number;
  recursosBalance:   number;
  ingresosCorrientes: number;
  ingresosDelAnio:   number;
  transferencias:    number;
  ibi:               number;
  funcionamiento:    number;
  inversion:         number;
  servicioDeuda:     number;
  totalEgresos:      number;
  presupuesto:       number;
  poblacion:         number;
}

export function insumos(m: Municipality): Insumos {
  const ingresosTotales = n(m.ingresos_recaudados);
  const recursosBalance = n(m.recursos_balance);
  return {
    ingresosTotales,
    recursosBalance,
    // G1 ya incluye tasas y derechos: no se vuelven a sumar.
    ingresosCorrientes: n(m.ingresos_tributarios) + n(m.ingresos_no_tributarios),
    ingresosDelAnio:    ingresosTotales - recursosBalance - n(m.prestamos) - n(m.colocacion_bonos),
    transferencias:     n(m.transferencias_art91) + n(m.otras_transferencias),
    ibi:                n(m.impuesto_bi),
    funcionamiento:     n(m.gastos_funcionamiento),
    inversion:          n(m.bienes_capitalizables),
    servicioDeuda:      n(m.servicios_deuda),
    totalEgresos:       n(m.total_egresos),
    // Aprobado: la base no trae presupuesto vigente.
    presupuesto:        n(m.presupuesto_municipal),
    // ponytail: población SEFIN provisional hasta cargar INE (plan §3.1).
    poblacion:          n(m.population),
  };
}

/**
 * Fila sin liquidación reportada: egresos ≤ 0 e ingresos corrientes en cero (docs/ATIPICOS.md §2).
 * Se excluye de totales, medianas y rankings; la UI la muestra como "Sin liquidación".
 */
export const sinLiquidacion = (m: Municipality) =>
  n(m.total_egresos) <= 0 && n(m.ingresos_tributarios) + n(m.ingresos_no_tributarios) === 0;

export const rendicionParcial = (m: Municipality) =>
  !sinLiquidacion(m) && RENDICION_PARCIAL.has(`${m.department}|${m.code}|${m.year}`);

/** Art. 91 + otras transferencias = 0 con ingresos corrientes > 0 (y con liquidación). */
export const sinArt91 = (m: Municipality) =>
  !sinLiquidacion(m) && !rendicionParcial(m)
  && n(m.transferencias_art91) + n(m.otras_transferencias) === 0
  && n(m.ingresos_tributarios) + n(m.ingresos_no_tributarios) > 0;

/** Dato incompleto: sin Art. 91 en la fuente o rendición parcial. Se muestra con ⚠ y se excluye de las estadísticas. */
export const datoIncompleto = (m: Municipality) => rendicionParcial(m) || sinArt91(m);

/** Texto del ⚠ (rótulo y tooltip) de una fila incompleta; null si no lo es. */
export const notaDatoIncompleto = (m: Municipality): string | null =>
  rendicionParcial(m) ? ROTULO_RENDICION_PARCIAL : sinArt91(m) ? ROTULO_SIN_ART91 : null;

/**
 * Dos niveles de exclusión (docs/ATIPICOS.md):
 * - TOTALES (sumas de montos y población): fuera solo las filas sin liquidación. Una fila sin Art. 91 o con
 *   rendición parcial sí tiene ingresos y gastos reales; sacarla de los totales crea caídas artificiales
 *   (2023: el presupuesto nacional bajaba de 28.4 a 23.2 mil M al quitar San Pedro Sula).
 * - RAZONES (razones agregadas, medianas, percentiles, distribución, semáforo y rankings): fuera también las
 *   filas sin Art. 91 y las rendiciones parciales, porque su dato incompleto distorsiona la comparación.
 */
export const excluirDeTotales = (m: Municipality) => sinLiquidacion(m);
export const excluirDeRazones = (m: Municipality) => sinLiquidacion(m) || datoIncompleto(m);
/** Alias histórico de excluirDeRazones (medianas, percentiles, rankings, "municipios en estadísticas"). */
export const excluirDeEstadisticas = excluirDeRazones;

/**
 * Suma de insumos de un grupo (un año). `nivel` 'razones' (por defecto): base de las razones agregadas
 * (indicadoresAgregados). 'totales': montos y población para mostrar como total (ver sumarTotales).
 */
export function sumarInsumos(rows: Municipality[], nivel: 'razones' | 'totales' = 'razones'): Insumos {
  const acc = insumos({} as Municipality);
  const fuera = nivel === 'totales' ? excluirDeTotales : excluirDeRazones;
  rows.filter((m) => !fuera(m)).forEach((m) => {
    const i = insumos(m);
    (Object.keys(acc) as (keyof Insumos)[]).forEach((k) => { acc[k] += i[k]; });
  });
  return acc;
}

/** Montos y población de un grupo (un año) para mostrar como TOTAL: solo sin las filas sin liquidación. */
export const sumarTotales = (rows: Municipality[]) => sumarInsumos(rows, 'totales');

/**
 * Nota para un total que incluye filas con dato incompleto (sin Art. 91 o rendición parcial); null si no hay.
 * Ej.: "Incluye 1 municipio(s) sin transferencia Art. 91 en la fuente; las transferencias pueden estar subestimadas."
 */
export function notaTotales(rows: Municipality[]): string | null {
  const s91 = rows.filter(sinArt91).length;
  const rp = rows.filter(rendicionParcial).length;
  const partes = [
    s91 ? `Incluye ${s91} municipio(s) sin transferencia Art. 91 en la fuente; las transferencias pueden estar subestimadas.` : '',
    rp ? `Incluye ${rp} municipio(s) con rendición parcial (dato incompleto).` : '',
  ].filter(Boolean);
  return partes.length ? partes.join(' ') : null;
}

/** Porcentajes en 0–100; per cápita en lempiras; montos en lempiras. null = denominador ≤ 0. */
export interface Indicadores {
  ingresosCorrientes:            number;
  ingresosDelAnio:               number;
  autonomia:                     number | null;
  dependenciaTransferencias:     number | null;
  propiosPerCapita:              number | null;
  ibiPerCapita:                  number | null;
  funcionamientoSobreCorrientes: number | null;
  inversionSobreGasto:           number | null;
  inversionPerCapita:            number | null;
  ahorroCorriente:               number;
  servicioDeudaSobreCorrientes:  number | null;
  balanceSobreIngresos:          number | null;
  resultadoConBalance:           number;
  resultadoSinBalance:           number;
  /** Contra presupuesto aprobado (no hay vigente). */
  ejecucion:                     number | null;
}

export function calcular(i: Insumos): Indicadores {
  return {
    ingresosCorrientes:            i.ingresosCorrientes,
    ingresosDelAnio:               i.ingresosDelAnio,
    autonomia:                     ratio(i.ingresosCorrientes, i.ingresosDelAnio),
    dependenciaTransferencias:     ratio(i.transferencias, i.ingresosDelAnio),
    propiosPerCapita:              perCapita(i.ingresosCorrientes, i.poblacion),
    ibiPerCapita:                  perCapita(i.ibi, i.poblacion),
    funcionamientoSobreCorrientes: ratio(i.funcionamiento, i.ingresosCorrientes),
    inversionSobreGasto:           ratio(i.inversion, i.totalEgresos),
    inversionPerCapita:            perCapita(i.inversion, i.poblacion),
    ahorroCorriente:               i.ingresosCorrientes - i.funcionamiento,
    servicioDeudaSobreCorrientes:  ratio(i.servicioDeuda, i.ingresosCorrientes),
    balanceSobreIngresos:          ratio(i.recursosBalance, i.ingresosTotales),
    // Bug 5: la base solo trae superavit_deficit (con balance); SIMHO publica ambos resultados.
    resultadoConBalance:           i.ingresosTotales - i.totalEgresos,
    resultadoSinBalance:           i.ingresosDelAnio - i.totalEgresos,
    ejecucion:                     ratio(i.totalEgresos, i.presupuesto),
  };
}

export const indicadoresMunicipio = (m: Municipality) => calcular(insumos(m));
/** `rows` de un solo año: con varios años la población se suma entre años. */
export const indicadoresAgregados = (rows: Municipality[]) => calcular(sumarInsumos(rows));

/** Mediana municipal de un indicador; ignora null y filas excluidas de estadísticas. */
export function mediana(rows: Municipality[], k: keyof Indicadores): number | null {
  const v = rows.filter((m) => !excluirDeEstadisticas(m)).map((m) => indicadoresMunicipio(m)[k]).filter((x): x is number => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const h = v.length >> 1;
  return v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2;
}

/** Bienes capitalizables < UMBRAL_INVERSION_GASTO % del gasto total, con liquidación (atípico de fuente, no se excluye). */
export const inversionCasiNula = (m: Municipality) => {
  const v = indicadoresMunicipio(m).inversionSobreGasto;
  return !sinLiquidacion(m) && v != null && v < UMBRAL_INVERSION_GASTO;
};

/** Diferencia tolerada entre un subtotal SEFIN y la suma de sus renglones (lempiras). */
const TOL = 1;
const suma = (m: Municipality, ks: (keyof Municipality)[]) => ks.reduce((s, k) => s + n(m[k] as number), 0);

/** Señales de datos sospechosos de una fila (catálogo en docs/ATIPICOS.md). Vacío = sin observaciones. */
export function atipicos(m: Municipality): string[] {
  const i = insumos(m);
  const r = calcular(i);
  const out: string[] = [];
  if (i.ingresosCorrientes < 0) out.push('Ingresos corrientes negativos');
  if (i.ingresosCorrientes === 0 && i.ingresosTotales > 0) out.push('Ingresos corrientes en cero');
  if (i.ingresosTotales > 0 && i.ingresosDelAnio <= 0) out.push('Ingresos del año ≤ 0 (balance y financiamiento ≥ total)');
  if (r.autonomia !== null && r.autonomia > 100) out.push('Autonomía > 100 %');
  const nota = notaDatoIncompleto(m);
  if (nota) out.push(nota);
  if (inversionCasiNula(m)) out.push(ROTULO_INVERSION_CASI_NULA);
  if (i.poblacion <= 0) out.push('Sin población');
  if (i.totalEgresos <= 0) out.push('Sin egresos reportados');
  if (i.ingresosTotales <= 0) out.push('Sin ingresos reportados');
  // ponytail: umbral fijo 2× el aprobado; ajustar si aparecen ampliaciones presupuestarias legítimas.
  if (r.ejecucion !== null && r.ejecucion > 200) out.push('Egresos > 2 × presupuesto aprobado');
  const g1 = suma(m, ['impuesto_bi', 'impuesto_personal', 'impuesto_industria', 'impuesto_comercio', 'impuesto_servicios',
    'impuesto_pecuario', 'impuesto_extraccion', 'impuesto_telecomunicaciones', 'tasas_servicios', 'derechos']);
  if (Math.abs(g1 - n(m.ingresos_tributarios)) > TOL) out.push('Tributarios ≠ suma de renglones');
  if (Math.abs(i.ingresosCorrientes - n(m.ingresos_corrientes)) > TOL) out.push('Corrientes SEFIN ≠ G1 + G2');
  const func = suma(m, ['servicios_personales', 'servicios_no_personales', 'materiales_suministro', 'transferencias_corrientes', 'otros_gastos']);
  if (Math.abs(func - i.funcionamiento) > TOL) out.push('Funcionamiento ≠ suma de renglones');
  return out;
}

// ── Comparación con pares (Ficha Municipal) ──────────────────────────────────

export interface Comparacion {
  mediana:   number | null;
  /** round(100 × pares con valor menor ÷ pares con dato); null si la fila está excluida o sin dato. */
  percentil: number | null;
  /** Pares con dato (incluye al propio municipio). */
  n:         number;
}

/**
 * Pares = misma categoría y mismo año, sin las filas de excluirDeEstadisticas(); incluye al municipio.
 * Para una fila excluida devuelve la mediana de sus pares pero no percentil.
 */
export function comparacionPares(filas: Municipality[], fila: Municipality, clave: keyof Indicadores): Comparacion {
  const pares = filas.filter((m) => m.year === fila.year && m.category === fila.category && !excluirDeEstadisticas(m));
  const vals = pares.map((m) => indicadoresMunicipio(m)[clave]).filter((v): v is number => v != null);
  const x = indicadoresMunicipio(fila)[clave];
  const percentil = excluirDeEstadisticas(fila) || x == null || !vals.length
    ? null : Math.round((100 * vals.filter((v) => v < x).length) / vals.length);
  return { mediana: mediana(pares, clave), percentil, n: vals.length };
}

/** Dirección de cada indicador comparable: "mayor" = mayor es mejor. */
export const SEMAFORO = {
  autonomia:                     'mayor',
  propiosPerCapita:              'mayor',
  ibiPerCapita:                  'mayor',
  inversionSobreGasto:           'mayor',
  inversionPerCapita:            'mayor',
  ahorroCorriente:               'mayor',
  resultadoSinBalance:           'mayor',
  dependenciaTransferencias:     'menor',
  funcionamientoSobreCorrientes: 'menor',
  servicioDeudaSobreCorrientes:  'menor',
  balanceSobreIngresos:          'menor',
} as const;
export type ClaveSemaforo = keyof typeof SEMAFORO;

export type Tono = 'turquesa' | 'gris' | 'naranja';
export interface Semaforo { etiqueta: string; tono: Tono }

/** Umbrales de alerta que se imponen al percentil. */
export const ALERTA_BALANCE = 25;       // recursos de balance ÷ ingresos, %
export const ALERTA_SERVICIO_DEUDA = 30; // servicio de deuda ÷ corrientes, %

/** Semáforo por percentil favorable: ≥ 70 sobre, ≤ 30 bajo, en medio "en la mediana"; las alertas mandan. */
export function semaforo(clave: ClaveSemaforo, valor: number | null, percentil: number | null): Semaforo {
  if (clave === 'balanceSobreIngresos' && valor != null && valor >= ALERTA_BALANCE) return { etiqueta: 'ALERTA', tono: 'naranja' };
  if (clave === 'servicioDeudaSobreCorrientes' && valor != null && valor > ALERTA_SERVICIO_DEUDA) return { etiqueta: 'ALERTA', tono: 'naranja' };
  if (percentil == null) return { etiqueta: 'SIN COMPARACIÓN', tono: 'gris' };
  const fav = SEMAFORO[clave] === 'mayor' ? percentil : 100 - percentil;
  if (fav >= 70) return { etiqueta: 'SOBRE LA MEDIANA', tono: 'turquesa' };
  if (fav <= 30) return { etiqueta: 'BAJO LA MEDIANA', tono: 'naranja' };
  return { etiqueta: 'EN LA MEDIANA', tono: 'gris' };
}

// ── Rankings y Comparar (Fase 6) ─────────────────────────────────────────────

/** Rótulo corto del ⚠ de una fila excluida de razones; null si entra en las estadísticas. */
export const motivoExcluido = (m: Municipality): string | null =>
  sinLiquidacion(m) ? ROTULO_SIN_LIQUIDACION : notaDatoIncompleto(m);

export interface FilaRanking {
  fila:      Municipality;
  valor:     number | null;
  /** Posición dentro de `visibles` (empates comparten posición: 1, 2, 2, 4); null si excluida o sin dato. */
  posicion:  number | null;
  /** Percentil en su categoría completa del año (comparacionPares, igual que la Ficha). */
  percentil: number | null;
  /** Motivo del ⚠ (excluida de razones); null si no está excluida. Texto corto; la Ficha usa motivoExclusion (largo). */
  motivo:    string | null;
}

/**
 * Ranking de un indicador. `filasAnio`: todo el año (base del percentil por categoría); `visibles`: el filtro
 * (categoría, departamento) sobre el que se cuenta la posición. "Mejor" según SEMAFORO. Orden: rankeadas,
 * luego sin dato y al final las excluidas (excluirDeRazones), ambas sin posición.
 */
export function rankear(filasAnio: Municipality[], visibles: Municipality[], clave: ClaveSemaforo): FilaRanking[] {
  const signo = SEMAFORO[clave] === 'mayor' ? -1 : 1;
  const todas = visibles.map((fila) => ({
    // Sin liquidación: sin valor (un 0 por habitante no es un dato real).
    fila, valor: sinLiquidacion(fila) ? null : indicadoresMunicipio(fila)[clave], posicion: null as number | null,
    percentil: comparacionPares(filasAnio, fila, clave).percentil, motivo: motivoExcluido(fila),
  }));
  const grupo = (r: FilaRanking) => (r.motivo ? 2 : r.valor == null ? 1 : 0);
  todas.sort((a, b) => grupo(a) - grupo(b)
    || (grupo(a) === 0 ? signo * (a.valor! - b.valor!) : 0)
    || (a.fila.name ?? '').localeCompare(b.fila.name ?? '', 'es'));
  todas.forEach((r, i) => {
    if (grupo(r) !== 0) return;
    r.posicion = i > 0 && todas[i - 1].valor === r.valor ? todas[i - 1].posicion : i + 1;
  });
  return todas;
}

/** Filas excluidas de razones, por motivo. */
export function contarExcluidos(filas: Municipality[]) {
  const sinLiq = filas.filter(sinLiquidacion).length;
  const s91 = filas.filter(sinArt91).length;
  const rp = filas.filter(rendicionParcial).length;
  return { total: sinLiq + s91 + rp, sinLiquidacion: sinLiq, sinArt91: s91, rendicionParcial: rp };
}

const mismoMunicipio = (a: Municipality, b: Municipality) => a.department === b.department && a.code === b.code;

/** Pares sugeridos: misma categoría y año, sin excluidos ni los ya elegidos, los más cercanos en población. */
export function paresSugeridos(filasAnio: Municipality[], fila: Municipality, yaElegidos: Municipality[], cuantos: number): Municipality[] {
  const pob = n(fila.population);
  return filasAnio
    .filter((m) => m.year === fila.year && m.category === fila.category && !excluirDeRazones(m)
      && !mismoMunicipio(m, fila) && !yaElegidos.some((y) => mismoMunicipio(m, y)))
    .sort((a, b) => Math.abs(n(a.population) - pob) - Math.abs(n(b.population) - pob) || (a.name ?? '').localeCompare(b.name ?? '', 'es'))
    .slice(0, Math.max(0, cuantos));
}

const pctTxt = (v: number) => `${v.toFixed(1)} %`;

/** Plantillas de fortaleza (percentil favorable ≥ 70), en orden de prioridad. */
const FORTALEZAS: [ClaveSemaforo, (v: number, p: number) => string][] = [
  ['autonomia',                     (v, p) => `autonomía alta (${pctTxt(v)}, P${p} de su categoría)`],
  ['inversionSobreGasto',           (v, p) => `inversión alta (${pctTxt(v)} del gasto, P${p} de su categoría)`],
  ['propiosPerCapita',              (v, p) => `ingresos propios por habitante altos (${fmtL(v)}, P${p})`],
  ['dependenciaTransferencias',     (v, p) => `baja dependencia de transferencias (${pctTxt(v)}, P${p})`],
  ['funcionamientoSobreCorrientes', (v, p) => `gasto de funcionamiento contenido (${pctTxt(v)} de los corrientes, P${p})`],
  ['ibiPerCapita',                  (v, p) => `buena recaudación de IBI (${fmtL(v)} por habitante, P${p})`],
  ['inversionPerCapita',            (v, p) => `inversión por habitante alta (${fmtL(v)}, P${p})`],
];

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * "Lectura automática SIMHO": hasta 2 frases con plantillas fijas (sin IA).
 * Frase 1: hasta 2 fortalezas + alertas. Frase 2: resultado sin balance negativo.
 */
export function lecturaSimho(fila: Municipality, comparaciones: Partial<Record<ClaveSemaforo, Comparacion>>): string {
  const r = indicadoresMunicipio(fila);
  const i = insumos(fila);
  const fortalezas = FORTALEZAS.flatMap(([k, plantilla]) => {
    const v = r[k]; const p = comparaciones[k]?.percentil;
    if (v == null || p == null || semaforo(k, v, p).tono !== 'turquesa') return [];
    return [plantilla(v, p)];
  }).slice(0, 2);
  const alertas: string[] = [];
  const bal = r.balanceSobreIngresos;
  const alertaBalance = bal != null && bal >= ALERTA_BALANCE;
  if (alertaBalance) {
    const p = comparaciones.balanceSobreIngresos?.percentil;
    alertas.push(`acumula ${fmtL(i.recursosBalance)} de recursos de balance, el ${Math.round(bal!)} % de sus ingresos${p != null ? ` (P${p})` : ''}`);
  }
  const deuda = r.servicioDeudaSobreCorrientes;
  if (deuda != null && deuda > ALERTA_SERVICIO_DEUDA) alertas.push(`el servicio de deuda absorbe el ${pctTxt(deuda)} de los ingresos corrientes`);

  const frases: string[] = [];
  const f = fortalezas.join(' y '); const a = alertas.join(' y ');
  if (f && a) frases.push(`${mayuscula(f)}, pero ${a}.`);
  else if (f || a) frases.push(`${mayuscula(f || a)}.`);
  if (r.resultadoSinBalance < 0) {
    const deficit = fmtL(-r.resultadoSinBalance);
    frases.push(alertaBalance ? `Sin ese saldo, el año cierra con un déficit de ${deficit}.` : `Con los ingresos del año, cierra con un déficit de ${deficit}.`);
  }
  return frases.length ? frases.slice(0, 2).join(' ') : 'Indicadores en línea con la mediana de su categoría.';
}

// ── Panorama Nacional y mapas (Fase 4) ───────────────────────────────────────

/** Métricas del selector compartido (Panorama, Mapa nacional y Vista Departamental). */
export type MetricaMapa = 'autonomia' | 'propiosPc' | 'dependencia' | 'inversionPc' | 'categoria';
export type MetricaNumerica = Exclude<MetricaMapa, 'categoria'>;

/** Indicador de cada métrica numérica (fórmulas de calcular()). */
export const CLAVE_METRICA: Record<MetricaNumerica, ClaveSemaforo> = {
  autonomia:   'autonomia',
  propiosPc:   'propiosPerCapita',
  dependencia: 'dependenciaTransferencias',
  inversionPc: 'inversionPerCapita',
};

const CATEGORIAS = ['A', 'B', 'C', 'D'] as const;
const enEstadisticas = (filas: Municipality[]) => filas.filter((m) => !excluirDeEstadisticas(m));

export interface MedianaAgregado { mediana: number | null; agregado: number | null }

/** 5 grupos de autonomía. Se agrupa por el valor MOSTRADO (1 decimal): un "10.0 %" nunca cae en "< 10". */
export const GRUPOS_AUTONOMIA: { etiqueta: string; desde: number; hasta: number }[] = [
  { etiqueta: '< 10 %',  desde: -Infinity, hasta: 10 },
  { etiqueta: '10–25 %', desde: 10, hasta: 25 },
  { etiqueta: '25–50 %', desde: 25, hasta: 50 },
  { etiqueta: '50–75 %', desde: 50, hasta: 75 },
  { etiqueta: '≥ 75 %',  desde: 75, hasta: Infinity },
];

/** Municipios por grupo de autonomía (sin excluidos). `filas` de un solo año. */
export function distribucionAutonomia(filas: Municipality[]): { etiqueta: string; n: number }[] {
  const valores = enEstadisticas(filas)
    .map((m) => indicadoresMunicipio(m).autonomia)
    .filter((v): v is number => v != null)
    .map((v) => Math.round(v * 10) / 10);
  return GRUPOS_AUTONOMIA.map((g) => ({ etiqueta: g.etiqueta, n: valores.filter((v) => v >= g.desde && v < g.hasta).length }));
}

export interface ResumenCategoria {
  categoria: string; n: number; poblacion: number;
  autonomia: number | null; propiosPc: number | null; dependencia: number | null;
}

/** Medianas municipales por categoría SGJD (A–D), sin excluidos. `filas` de un solo año. */
export function resumenPorCategoria(filas: Municipality[]): ResumenCategoria[] {
  return CATEGORIAS.map((c) => {
    const grupo = filas.filter((m) => m.category === c);
    return {
      categoria:   c,
      n:           enEstadisticas(grupo).length,
      poblacion:   sumarTotales(grupo).poblacion, // total: incluye filas sin Art. 91
      autonomia:   mediana(grupo, 'autonomia'),
      propiosPc:   mediana(grupo, 'propiosPerCapita'),
      dependencia: mediana(grupo, 'dependenciaTransferencias'),
    };
  });
}

export interface ResumenNacional {
  anio: number;
  n: number;                  // municipios en estadísticas
  excluidos: string[];        // nombres
  departamentos: number;
  indicadores: Record<'autonomia' | 'propiosPerCapita' | 'dependenciaTransferencias' | 'balanceSobreIngresos', MedianaAgregado>;
  distribucion: { etiqueta: string; n: number }[];
  categorias: ResumenCategoria[];
  /** Nota de los totales (población por categoría) que incluyen filas sin Art. 91 o con rendición parcial. */
  notaTotales: string | null;
}

export function resumenNacional(filas: Municipality[], anio: number): ResumenNacional {
  const delAnio = filas.filter((m) => m.year === anio);
  const en = enEstadisticas(delAnio);
  const agregado = indicadoresAgregados(delAnio);
  const par = (k: keyof Indicadores): MedianaAgregado => ({ mediana: mediana(delAnio, k), agregado: agregado[k] as number | null });
  return {
    anio,
    n: en.length,
    excluidos: delAnio.filter(excluirDeEstadisticas).map((m) => m.name ?? ''),
    departamentos: new Set(en.map((m) => (m.department ?? '').trim().toUpperCase())).size,
    indicadores: {
      autonomia:                 par('autonomia'),
      propiosPerCapita:          par('propiosPerCapita'),
      dependenciaTransferencias: par('dependenciaTransferencias'),
      balanceSobreIngresos:      par('balanceSobreIngresos'),
    },
    distribucion: distribucionAutonomia(delAnio),
    categorias: resumenPorCategoria(delAnio),
    notaTotales: notaTotales(delAnio),
  };
}

export interface ResumenDepartamento {
  department: string;                 // nombre SEFIN (la UI lo muestra con nombreDepartamento)
  valor: number | null;               // métricas numéricas
  categoria?: string;                 // métrica "categoria": predominante
  conteo?: Record<string, number>;    // métrica "categoria": municipios por categoría
}

/**
 * Valor de cada departamento: autonomía = MEDIANA municipal; propios, dependencia e inversión = agregado
 * departamental (Σ/Σ); categoría = la predominante (empate → la más alta). Sin excluidos. `filas` de un año.
 */
export function resumenPorDepartamento(filas: Municipality[], metrica: MetricaMapa): ResumenDepartamento[] {
  const grupos = new Map<string, Municipality[]>();
  filas.forEach((m) => {
    const d = (m.department ?? '').trim().toUpperCase();
    grupos.set(d, [...(grupos.get(d) ?? []), m]);
  });
  return Array.from(grupos.entries()).map(([department, grupo]) => {
    if (metrica === 'categoria') {
      const conteo = Object.fromEntries(CATEGORIAS.map((c) => [c, 0])) as Record<string, number>;
      enEstadisticas(grupo).forEach((m) => { if (m.category && (CATEGORIAS as readonly string[]).includes(m.category)) conteo[m.category]++; });
      const max = Math.max(...Object.values(conteo));
      const categoria = max > 0 ? CATEGORIAS.find((c) => conteo[c] === max) : undefined; // A antes que B…: la más alta
      return { department, valor: null, categoria, conteo };
    }
    const valor = metrica === 'autonomia'
      ? mediana(grupo, 'autonomia')
      : (indicadoresAgregados(grupo)[CLAVE_METRICA[metrica]] as number | null);
    return { department, valor };
  });
}

/** Lectura automática nacional (2 frases, plantillas fijas). */
export function lecturaNacional(r: ResumenNacional): string {
  const med = r.indicadores.autonomia.mediana;
  const agg = r.indicadores.autonomia.agregado;
  if (med == null || !r.n) return 'Sin datos suficientes para la lectura nacional.';
  const bajo25 = r.distribucion.slice(0, 2).reduce((s, g) => s + g.n, 0);
  const total = r.distribucion.reduce((s, g) => s + g.n, 0) || r.n; // mismo denominador que el gráfico
  const frase1 = `La mitad de los municipios financia con recursos propios menos del ${Math.round(med)} % de sus ingresos del año, `
    + `y ${bajo25} de ${total} (${Math.round((100 * bajo25) / total)} %) no llegan al 25 %.`;
  const a = r.categorias.find((c) => c.categoria === 'A')?.propiosPc;
  const d = r.categorias.find((c) => c.categoria === 'D')?.propiosPc;
  const razon = a && d ? a / d : null;
  const veces = razon != null && razon >= 2 ? Math.round(razon) : null; // umbral sobre la razón real, no la redondeada
  let frase2 = '';
  if (agg != null && agg - med >= 15) {
    frase2 = ` El agregado nacional (${agg.toFixed(1)} %) lo sostienen las grandes ciudades`
      + (veces ? `: la categoría A recauda ${veces} veces más por habitante que la D.` : '.');
  } else if (veces) {
    frase2 = ` La categoría A recauda ${veces} veces más por habitante que la D.`;
  }
  return frase1 + frase2;
}

/** Cuantil lineal (tipo 7, como d3.quantile) de valores ordenados. */
function cuantil(ordenados: number[], p: number): number {
  const h = (ordenados.length - 1) * p;
  const i = Math.floor(h);
  return ordenados[i] + (h - i) * ((ordenados[i + 1] ?? ordenados[i]) - ordenados[i]);
}

export interface Clases {
  cortes: number[];                                          // 4 cortes (quintiles)
  clase: (v: number | null | undefined) => number | null;    // 0 (oscuro, peor) … 4 (claro, mejor)
  rangos: { clase: number; desde: number; hasta: number }[]; // para la leyenda, de clase 0 a 4
}

/** 5 clases por quintiles de los valores mostrados. Dirección "menor": se invierte, el tono claro es el mejor. */
export function clasesQuintil(valores: (number | null | undefined)[], direccion: 'mayor' | 'menor'): Clases {
  const v = valores.filter((x): x is number => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return { cortes: [], clase: () => null, rangos: [] };
  const cortes = [0.2, 0.4, 0.6, 0.8].map((p) => cuantil(v, p));
  // "menor": se cuenta en espejo (x <= corte) para que los empates en el mínimo queden en la clase clara (mejor).
  const clase = (x: number | null | undefined) =>
    x == null || !Number.isFinite(x) ? null
      : direccion === 'mayor' ? cortes.filter((c) => x >= c).length : cortes.filter((c) => x <= c).length;
  const limites = [v[0], ...cortes, v[v.length - 1]];
  const porBruta = [0, 1, 2, 3, 4].map((k) => ({ desde: limites[k], hasta: limites[k + 1] }));
  const rangos = [0, 1, 2, 3, 4].map((c) => ({ clase: c, ...porBruta[direccion === 'mayor' ? c : 4 - c] }));
  return { cortes, clase, rangos };
}

// ── Fase 5: Análisis multianual y Base de Datos ───────────────────────────────

/** Monto por habitante; null si la población es ≤ 0 o falta el monto. */
export const porCapita = (monto: number | null | undefined, poblacion: number | null | undefined) =>
  monto == null || poblacion == null || !Number.isFinite(poblacion) || poblacion <= 0 ? null : fin(monto / poblacion);

/** Serie anual del IPC (índice, cualquier base). Años sin dato: null. */
export type SerieIPC = Record<number, number | null | undefined>;

/** Lempiras del año `anio` a precios de `anioBase`: monto × IPC[base] ÷ IPC[año]. null si falta algún IPC. */
export function deflactar(monto: number | null | undefined, anio: number, anioBase: number, ipc: SerieIPC): number | null {
  const a = ipc[anio], b = ipc[anioBase];
  if (monto == null || a == null || b == null || ![monto, a, b].every(Number.isFinite) || !(a > 0) || !(b > 0)) return null;
  return fin((monto * b) / a);
}

/** Variación % entre dos años: (actual − anterior) ÷ |anterior| × 100. null si falta un año o el anterior es 0. */
export function variacionPct(anterior: number | null | undefined, actual: number | null | undefined): number | null {
  if (anterior == null || actual == null || anterior === 0) return null;
  return fin(((actual - anterior) / Math.abs(anterior)) * 100);
}

/** Tasa de crecimiento anual compuesta, en %: ((último ÷ primero)^(1/años) − 1) × 100. null con extremos ≤ 0. */
export function tcac(primero: number | null | undefined, ultimo: number | null | undefined, anios: number): number | null {
  if (primero == null || ultimo == null || ![primero, ultimo, anios].every(Number.isFinite) || !(primero > 0) || !(ultimo > 0) || !(anios >= 1)) return null;
  return fin(((ultimo / primero) ** (1 / anios) - 1) * 100);
}

/** Alcance de Análisis. Departamento: código INE de 2 dígitos ("03"); municipio: INE de 4 ("0318"). */
export type Alcance =
  | { tipo: 'pais' }
  | { tipo: 'departamento'; cod: string }
  | { tipo: 'municipio'; ine: string }
  | { tipo: 'categoria'; categoria: string };

/** Filas (todos los años) que caen en el alcance. Sin filtrar excluidos: eso lo hacen las sumas y medianas. */
export function filasDeAlcance(filas: Municipality[], a: Alcance): Municipality[] {
  if (a.tipo === 'pais') return filas;
  if (a.tipo === 'categoria') return filas.filter((m) => m.category === a.categoria);
  if (a.tipo === 'departamento') return filas.filter((m) => codigoINE(m.department, m.code).slice(0, 2) === a.cod);
  return filas.filter((m) => codigoINE(m.department, m.code) === a.ine);
}

/** Indicadores del bloque por año de Análisis (claves de `Indicadores`). */
export const INDICADORES_ANALISIS = [
  'autonomia', 'dependenciaTransferencias', 'funcionamientoSobreCorrientes', 'inversionSobreGasto',
  'servicioDeudaSobreCorrientes', 'balanceSobreIngresos', 'propiosPerCapita', 'ibiPerCapita', 'inversionPerCapita', 'ejecucion',
] as const;
export type IndicadorAnalisis = typeof INDICADORES_ANALISIS[number];

/**
 * Por año: mediana municipal y agregado (Σ/Σ) de cada indicador, sin excluidos. `filas` ya recortadas al alcance.
 * Un solo municipio: su propio valor en ambas (aunque esté excluido; la UI lo marca con ⚠).
 */
export function indicadoresPorAnio(filas: Municipality[], anios: number[]): Record<number, Record<IndicadorAnalisis, MedianaAgregado>> {
  return Object.fromEntries(anios.map((y) => {
    const delAnio = filas.filter((m) => m.year === y);
    const unico = delAnio.length === 1 ? indicadoresMunicipio(delAnio[0]) : null;
    const agg = unico ?? indicadoresAgregados(delAnio);
    return [y, Object.fromEntries(INDICADORES_ANALISIS.map((k) => [k, {
      mediana:  unico ? unico[k] : mediana(delAnio, k),
      agregado: agg[k],
    }])) as Record<IndicadorAnalisis, MedianaAgregado>];
  }));
}

/** Columna de la Base de Datos para el pie: suma (montos, población) o mediana (razones, per cápita). */
export interface ColumnaPie { clave: string; agregacion: 'suma' | 'mediana' | 'ninguna'; valor: (m: Municipality) => number | null }

/** Fila al pie del grupo filtrado: TOTAL (sin las filas sin liquidación) o MEDIANA (sin ninguna excluida). */
export function pieTabla(filas: Municipality[], columnas: ColumnaPie[]): Record<string, number | null> {
  const enTotales = filas.filter((m) => !excluirDeTotales(m));
  const enRazones = filas.filter((m) => !excluirDeRazones(m));
  return Object.fromEntries(columnas.map((c) => {
    if (c.agregacion === 'ninguna') return [c.clave, null];
    const v = (c.agregacion === 'suma' ? enTotales : enRazones).map(c.valor).filter((x): x is number => x != null && Number.isFinite(x));
    if (!v.length) return [c.clave, null];
    if (c.agregacion === 'suma') return [c.clave, v.reduce((s, x) => s + x, 0)];
    v.sort((a, b) => a - b);
    const h = v.length >> 1;
    return [c.clave, v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2];
  }));
}

/** Nota cuando la mediana del servicio de deuda ÷ corrientes es 0 (más de la mitad sin pagos de deuda en el año). */
export const notaMedianaDeuda = (categoria?: string | null) =>
  `Más de la mitad de los municipios${categoria ? ` de la categoría ${categoria}` : ''} no registra servicio de deuda en el año.`;
