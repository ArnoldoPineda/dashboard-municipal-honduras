import { describe, it, expect } from '@jest/globals';
import { codigoINE, nombreDepartamento } from './departamentos';

describe('codigoINE', () => {
  it('DDMM con orden INE (no alfabético)', () => {
    expect(codigoINE('COMAYAGUA', 18)).toBe('0318');
    expect(codigoINE('CHOLUTECA', 6)).toBe('0606');
    expect(codigoINE('Francisco Morazán', 1)).toBe('0801');
    expect(codigoINE('YORO', 11)).toBe('1811');
  });
  it('desconocido o sin código → —', () => {
    expect(codigoINE('NARNIA', 1)).toBe('—');
    expect(codigoINE('COMAYAGUA', null)).toBe('—');
  });
});

describe('nombreDepartamento', () => {
  it('nombre oficial con tildes', () => {
    expect(nombreDepartamento('FRANCISCO MORAZAN')).toBe('Francisco Morazán');
    expect(nombreDepartamento('ISLAS DE LA BAHIA')).toBe('Islas de la Bahía');
    expect(nombreDepartamento(null)).toBe('');
  });
});
