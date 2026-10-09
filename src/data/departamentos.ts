// Metadatos de los 18 departamentos (sin cifras: todas salen de Supabase).
// capital = cabecera departamental (municipio con code 1 en SEFIN), con su grafía oficial.

export interface Departamento {
  id:      string; // slug usado en las rutas /departamento/:id (= deptSlug del nombre SEFIN)
  nombre:  string;
  capital: string;
}

export const DEPARTAMENTOS: Departamento[] = [
  { id: 'atlantida',         nombre: 'Atlántida',         capital: 'La Ceiba' },
  { id: 'choluteca',         nombre: 'Choluteca',         capital: 'Choluteca' },
  { id: 'colon',             nombre: 'Colón',             capital: 'Trujillo' },
  { id: 'comayagua',         nombre: 'Comayagua',         capital: 'Comayagua' },
  { id: 'copan',             nombre: 'Copán',             capital: 'Santa Rosa de Copán' },
  { id: 'cortes',            nombre: 'Cortés',            capital: 'San Pedro Sula' },
  { id: 'el-paraiso',        nombre: 'El Paraíso',        capital: 'Yuscarán' },
  { id: 'francisco-morazan', nombre: 'Francisco Morazán', capital: 'Distrito Central (Tegucigalpa)' },
  { id: 'gracias-a-dios',    nombre: 'Gracias a Dios',    capital: 'Puerto Lempira' },
  { id: 'intibuca',          nombre: 'Intibucá',          capital: 'La Esperanza' },
  { id: 'islas-de-la-bahia', nombre: 'Islas de la Bahía', capital: 'Roatán' },
  { id: 'la-paz',            nombre: 'La Paz',            capital: 'La Paz' },
  { id: 'lempira',           nombre: 'Lempira',           capital: 'Gracias' },
  { id: 'ocotepeque',        nombre: 'Ocotepeque',        capital: 'Ocotepeque' },
  { id: 'olancho',           nombre: 'Olancho',           capital: 'Juticalpa' },
  { id: 'santa-barbara',     nombre: 'Santa Bárbara',     capital: 'Santa Bárbara' },
  { id: 'valle',             nombre: 'Valle',             capital: 'Nacaome' },
  { id: 'yoro',              nombre: 'Yoro',              capital: 'Yoro' },
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function getDepartamento(id: string): Departamento | null {
  return DEPARTAMENTOS.find((d) => d.id === id) ?? null;
}

/** "FRANCISCO MORAZAN" / "Francisco Morazán" → "francisco-morazan" (null si no existe). */
export function deptNameToId(nombre: string): string | null {
  return DEPARTAMENTOS.find((d) => norm(d.nombre) === norm(nombre))?.id ?? null;
}
