// Grafía oficial (con tildes) de los municipios cuyo nombre en SEFIN/Supabase y en la
// geometría OCHA viene sin ella. Se aplica solo al mostrar: la tabla `municipalities`
// no se modifica porque se reimporta desde los Excel de SEFIN.
// Clave = "DEPARTAMENTO|code", igual que muniKey() y la geometría.

export const NOMBRES_OFICIALES: Record<string, string> = {
  'CHOLUTECA|9':          'Namasigüe',
  'COMAYAGUA|4':          'Esquías',
  'COMAYAGUA|9':          'Lejamaní',
  'COMAYAGUA|10':         'Meámbar',
  'COMAYAGUA|17':         'San Sebastián',
  'COPAN|5':              'Corquín',
  'COPAN|14':             'San Agustín',
  'COPAN|19':             'San Nicolás',
  'EL PARAISO|1':         'Yuscarán',
  'EL PARAISO|3':         'Danlí',
  'EL PARAISO|5':         'Güinope',
  'FRANCISCO MORAZAN|2':  'Alubarén',
  'FRANCISCO MORAZAN|4':  'Curarén',
  'FRANCISCO MORAZAN|26': 'Valle de Ángeles',
  'INTIBUCA|7':           'Jesús de Otoro',
  'LEMPIRA|2':            'Belén',
  'LEMPIRA|21':           'San Sebastián',
  'LEMPIRA|28':           'San Marcos de Caiquín',
  'OCOTEPEQUE|2':         'Belén Gualcho',
  'OLANCHO|16':           'Salamá',
  'SANTA BARBARA|9':      'El Níspero',
  'SANTA BARBARA|22':     'San Nicolás',
  // Diferencias de grafía o de nombre respecto de SEFIN (aprobadas en revisión)
  'COLON|6':              'Santa Fe',
  'OCOTEPEQUE|14':        'Santa Fe',
  'EL PARAISO|2':         'Alauca',
  'GRACIAS A DIOS|5':     'Ramón Villeda Morales',
  'GRACIAS A DIOS|6':     'Wampusirpi',
  'SANTA BARBARA|19':     'San José de Colinas',
  'FRANCISCO MORAZAN|20': 'San Juan de Flores (Cantarranas)',
  // TODO: INTIBUCA|14 — SEFIN usa "San Miguel Guancapala" y "San Miguelito" según el año;
  // falta verificar el nombre oficial contra el INE antes de agregarlo aquí.
};

/** Nombre a mostrar: el oficial si está en el diccionario, si no el original. */
export function nombreOficial(department: string | null | undefined, code: number | null | undefined, name: string | null | undefined): string {
  return NOMBRES_OFICIALES[`${department}|${code}`] ?? name ?? '';
}
