import { describe, it, expect } from '@jest/globals';
import { fmtL } from './formato';

describe('fmtL', () => {
  it.each([
    [31_675_451_406.19, 'L 31.7 mil M'],
    [167_200_000, 'L 167.2 M'],
    [426_994.73, 'L 426,995'],
    [0, 'L 0'],
    [-12_200_000, '−L 12.2 M'],
    [999_999, 'L 999,999'],
    [1_000_000, 'L 1.0 M'],
    ['148169116.66', 'L 148.2 M'],
  ])('%p → %s', (n, s) => expect(fmtL(n as number)).toBe(s));

  it('nulo, vacío y no finito → —', () => {
    [null, undefined, '', NaN, Infinity, 'abc'].forEach((v) => expect(fmtL(v as any)).toBe('—'));
  });

  it('completo: entero con miles, sin decimales', () => {
    expect(fmtL(65_779_074.4, { completo: true })).toBe('L 65,779,074');
    expect(fmtL(-94_507_898.72, { completo: true })).toBe('−L 94,507,899');
    expect(fmtL(0.3, { completo: true })).toBe('L 0');
  });
});
