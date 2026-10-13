// Formato único de montos en lempiras para toda la UI.

const miles = (v: number) => Math.round(v).toLocaleString('en-US');

/**
 * Lempiras. Compacto (tarjetas, gráficos, tooltips, textos): "L 31.7 mil M", "L 167.2 M", "L 426,995".
 * `completo` (tablas de datos): "L 65,779,074". Nulo o no finito → "—"; negativo → "−L 12.2 M".
 */
export function fmtL(n: number | string | null | undefined, opts: { completo?: boolean } = {}): string {
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  // La unidad se elige después de redondear, para que 999,999.5 no salga "L 1,000,000" ni 999.95 M "L 1000.0 M".
  const millones = Math.round(a / 1e5) / 10;
  const cuerpo = opts.completo || Math.round(a) < 1e6 ? miles(a)
    : millones >= 1000 ? `${(Math.round(a / 1e8) / 10).toFixed(1)} mil M`
    : `${millones.toFixed(1)} M`;
  return `${v < 0 && Math.round(a) > 0 ? '−' : ''}L ${cuerpo}`;
}

/** fmtL para ejes y etiquetas de gráficos: espacios no separables, para que Recharts no parta "L 150.0 M". */
export const fmtLGrafico = (n: number | string | null | undefined) => fmtL(n).replace(/ /g, ' ');
