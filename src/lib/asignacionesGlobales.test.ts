import { describe, it, expect } from '@jest/globals';
import type { Municipality } from '../hooks/useMunicipalities';
import { asignacionesGlobales, AVISO_ASIGNACIONES_GLOBALES, UMBRAL_ASIGNACIONES_GLOBALES, rotuloInversionCasiNula } from './indicadores';

const row = (o: Partial<Municipality>) => o as Municipality;

// Ahuas (Gracias a Dios, 09-03) 2025 real (Supabase, solo lectura): asignaciones globales L 13.222 M de L 27.831 M, 6 563 hab.
const ahuas = row({
  name: 'Ahuas', year: 2025, asignaciones_globales: 13_222_135.33, total_egresos: 27_831_104.63,
  population: 6563, bienes_capitalizables: 3_769_248,
});

describe('asignacionesGlobales', () => {
  it('Ahuas 2025: 47.5 % del gasto, L 2 015 por habitante y aviso de inversión subestimada', () => {
    const ag = asignacionesGlobales(ahuas);
    expect(ag.pctGasto).toBeCloseTo(47.51, 2);
    expect(ag.porHabitante).toBeCloseTo(2014.65, 1);
    expect(ag.aviso).toBe('Parte del gasto de capital puede estar registrado en Asignaciones globales; la inversión por habitante podría estar subestimada.');
  });

  it('el aviso usa el mismo umbral que rotuloInversionCasiNula (30 % justo sí; 29.9 % no)', () => {
    expect(UMBRAL_ASIGNACIONES_GLOBALES).toBe(30);
    const en = (a: number) => row({ asignaciones_globales: a, total_egresos: 1000, population: 10, bienes_capitalizables: 0 });
    expect(asignacionesGlobales(en(300)).aviso).toBe(AVISO_ASIGNACIONES_GLOBALES);
    expect(asignacionesGlobales(en(299)).aviso).toBeNull();
    // Los dos avisos se encienden juntos: el rótulo de inversión casi nula nombra las asignaciones desde el mismo %.
    expect(rotuloInversionCasiNula(en(300))).toContain('Asignaciones globales (30.0 % del gasto)');
    expect(rotuloInversionCasiNula(en(299))).not.toContain('Asignaciones globales');
  });

  it('bordes: sin egresos → sin %, ni aviso; sin población → sin per cápita; nulos cuentan como 0', () => {
    expect(asignacionesGlobales(row({ asignaciones_globales: 5, total_egresos: 0, population: 10 }))).toEqual({ pctGasto: null, porHabitante: 0.5, aviso: null });
    expect(asignacionesGlobales(row({ asignaciones_globales: 5, total_egresos: 10, population: 0 })).porHabitante).toBeNull();
    expect(asignacionesGlobales(row({ asignaciones_globales: null, total_egresos: 10, population: 10 }))).toEqual({ pctGasto: 0, porHabitante: 0, aviso: null });
  });
});
