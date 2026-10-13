// Metadatos de los 18 departamentos (sin cifras: todas salen de Supabase).
// capital = cabecera departamental (municipio con code 1 en SEFIN), con su grafía oficial.

export interface Departamento {
  id:      string; // slug usado en las rutas /departamento/:id (= deptSlug del nombre SEFIN)
  nombre:  string;
  capital: string;
  cod:     string; // código INE de 2 dígitos (no es orden alfabético: Choluteca = 06)
}

export const DEPARTAMENTOS: Departamento[] = [
  { id: 'atlantida',         nombre: 'Atlántida',         capital: 'La Ceiba', cod: '01' },
  { id: 'choluteca',         nombre: 'Choluteca',         capital: 'Choluteca', cod: '06' },
  { id: 'colon',             nombre: 'Colón',             capital: 'Trujillo', cod: '02' },
  { id: 'comayagua',         nombre: 'Comayagua',         capital: 'Comayagua', cod: '03' },
  { id: 'copan',             nombre: 'Copán',             capital: 'Santa Rosa de Copán', cod: '04' },
  { id: 'cortes',            nombre: 'Cortés',            capital: 'San Pedro Sula', cod: '05' },
  { id: 'el-paraiso',        nombre: 'El Paraíso',        capital: 'Yuscarán', cod: '07' },
  { id: 'francisco-morazan', nombre: 'Francisco Morazán', capital: 'Distrito Central (Tegucigalpa)', cod: '08' },
  { id: 'gracias-a-dios',    nombre: 'Gracias a Dios',    capital: 'Puerto Lempira', cod: '09' },
  { id: 'intibuca',          nombre: 'Intibucá',          capital: 'La Esperanza', cod: '10' },
  { id: 'islas-de-la-bahia', nombre: 'Islas de la Bahía', capital: 'Roatán', cod: '11' },
  { id: 'la-paz',            nombre: 'La Paz',            capital: 'La Paz', cod: '12' },
  { id: 'lempira',           nombre: 'Lempira',           capital: 'Gracias', cod: '13' },
  { id: 'ocotepeque',        nombre: 'Ocotepeque',        capital: 'Ocotepeque', cod: '14' },
  { id: 'olancho',           nombre: 'Olancho',           capital: 'Juticalpa', cod: '15' },
  { id: 'santa-barbara',     nombre: 'Santa Bárbara',     capital: 'Santa Bárbara', cod: '16' },
  { id: 'valle',             nombre: 'Valle',             capital: 'Nacaome', cod: '17' },
  { id: 'yoro',              nombre: 'Yoro',              capital: 'Yoro', cod: '18' },
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function getDepartamento(id: string): Departamento | null {
  return DEPARTAMENTOS.find((d) => d.id === id) ?? null;
}

/** "FRANCISCO MORAZAN" / "Francisco Morazán" → "francisco-morazan" (null si no existe). */
export function deptNameToId(nombre: string): string | null {
  return DEPARTAMENTOS.find((d) => norm(d.nombre) === norm(nombre))?.id ?? null;
}

/** Código INE de 4 dígitos (DDMM) de un municipio SEFIN: "COMAYAGUA" + 18 → "0318". */
export function codigoINE(department: string | null | undefined, code: number | null | undefined): string {
  const d = DEPARTAMENTOS.find((x) => norm(x.nombre) === norm(department ?? ''));
  return d && code != null ? d.cod + String(code).padStart(2, '0') : '—';
}
