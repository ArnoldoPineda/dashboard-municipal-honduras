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
  const cuerpo = opts.completo ? miles(a)
    : a >= 1e9 ? `${(a / 1e9).toFixed(1)} mil M`
    : a >= 1e6 ? `${(a / 1e6).toFixed(1)} M`
    : miles(a);
  return `${v < 0 && Math.round(a) > 0 ? '−' : ''}L ${cuerpo}`;
}
