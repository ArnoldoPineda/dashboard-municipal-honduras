import { describe, it, expect, jest } from '@jest/globals';
// Evita cargar supabaseClient (red/env) al importar sefin.ts; solo se prueban funciones puras.
jest.mock('../hooks/useMunicipalities', () => ({ useMunicipalitiesMultiYear: () => undefined }));

import type { Municipality } from '../hooks/useMunicipalities';
import {
  normName, muniKey, deptSlug, muniPath, sumField, autonomia,
  categoryOf, aggregate, groupByDept, aggregateByDept,
} from './sefin';

// Fábrica: todo null salvo lo que se pasa.
const row = (o: Partial<Municipality> = {}): Municipality => {
  const keys = ['code', 'name', 'department', 'population', 'presupuesto_municipal',
    'ingresos_propios', 'ingresos_recaudados', 'transferencias_art91'];
  const base: any = { id: 'x', year: 2024 };
  keys.forEach((k) => { base[k] = null; });
  return { ...base, ...o } as Municipality;
};

describe('normName', () => {
  it('ignora mayúsculas y tildes', () => {
    expect(normName('FRANCISCO MORAZAN')).toBe(normName('Francisco Morazán'));
  });
  it('trim', () => expect(normName('  Copán ')).toBe('copan'));
  it('null/undefined → ""', () => {
    expect(normName(null)).toBe('');
    expect(normName(undefined)).toBe('');
  });
});

describe('muniKey / deptSlug / muniPath', () => {
  it('deptSlug', () => {
    expect(deptSlug('ISLAS DE LA BAHIA')).toBe('islas-de-la-bahia');
    expect(deptSlug(null)).toBe('');
  });
  it('muniPath', () => {
    expect(muniPath({ department: 'ATLANTIDA', code: 1 })).toBe('/municipio/atlantida/1');
  });
  it('muniKey distingue mismo código/nombre en distintos departamentos', () => {
    const a = muniKey({ department: 'COPAN', code: 1 });
    const b = muniKey({ department: 'CORTES', code: 1 });
    expect(a).toBe('COPAN|1');
    expect(a).not.toBe(b);
  });
});

describe('sumField', () => {
  it('suma y trata null como 0', () => {
    const rows = [row({ population: 10 }), row({ population: null }), row({ population: 5 })];
    expect(sumField(rows, 'population')).toBe(15);
  });
  it('lista vacía → 0', () => expect(sumField([], 'population')).toBe(0));
});

describe('autonomia', () => {
  it('La Ceiba 2024 ≈ 92.05', () => {
    expect(autonomia(442436097.94, 480670337.87)).toBeCloseTo(92.05, 2);
  });
  it('recaudados 0 → null', () => expect(autonomia(5, 0)).toBeNull());
  it('recaudados negativo → null', () => expect(autonomia(5, -10)).toBeNull());
  it('propios 0 con recaudados > 0 → 0', () => expect(autonomia(0, 100)).toBe(0));
});

describe('categoryOf', () => {
  it.each([
    [500_000_001, 'A'], [500_000_000, 'B'], [150_000_001, 'B'], [150_000_000, 'C'],
    [50_000_001, 'C'], [50_000_000, 'D'], [0, 'D'],
  ])('%d → %s', (v, c) => expect(categoryOf(v as number)).toBe(c));
  it('negativo → D', () => expect(categoryOf(-1)).toBe('D'));
});

describe('aggregate', () => {
  it('vacío', () => {
    expect(aggregate([])).toEqual({
      count: 0, presupuesto: 0, poblacion: 0, ingresosPropios: 0,
      ingresosRecaudados: 0, transferencias: 0, autonomia: null,
    });
  });
  it('campos null cuentan como 0, sin NaN', () => {
    const a = aggregate([row(), row({ presupuesto_municipal: 100 })]);
    expect(a.count).toBe(2);
    expect(a.presupuesto).toBe(100);
    expect(a.autonomia).toBeNull();
    Object.values(a).forEach((v) => expect(Number.isNaN(v)).toBe(false));
  });
  it('autonomía = razón de sumas, no media de razones', () => {
    const a = aggregate([
      row({ ingresos_propios: 90, ingresos_recaudados: 100 }),
      row({ ingresos_propios: 10, ingresos_recaudados: 900 }),
    ]);
    expect(a.autonomia).toBeCloseTo(10, 10);
  });
  it('suma todos los campos', () => {
    const a = aggregate([
      row({ population: 1, presupuesto_municipal: 2, ingresos_propios: 3, ingresos_recaudados: 4, transferencias_art91: 5 }),
      row({ population: 10, presupuesto_municipal: 20, ingresos_propios: 30, ingresos_recaudados: 40, transferencias_art91: 50 }),
    ]);
    expect(a).toMatchObject({ poblacion: 11, presupuesto: 22, ingresosPropios: 33, ingresosRecaudados: 44, transferencias: 55 });
  });
});

describe('groupByDept / aggregateByDept', () => {
  const rows = [
    row({ department: 'COMAYAGUA', code: 1, presupuesto_municipal: 10 }),
    row({ department: 'Comayagua', code: 2, presupuesto_municipal: 5 }),
    row({ department: 'CORTES', code: 1, presupuesto_municipal: 7 }),
  ];
  it('fusiona COMAYAGUA y Comayagua', () => {
    const g = groupByDept(rows);
    expect(g.size).toBe(2);
    expect(g.get('comayagua')).toHaveLength(2);
  });
  it('department null va al grupo ""', () => {
    expect(groupByDept([row()]).get('')).toHaveLength(1);
  });
  it('aggregateByDept suma por grupo', () => {
    const m = aggregateByDept(rows);
    expect(m.get('comayagua')?.presupuesto).toBe(15);
    expect(m.get('comayagua')?.count).toBe(2);
    expect(m.get('cortes')?.presupuesto).toBe(7);
  });
});
