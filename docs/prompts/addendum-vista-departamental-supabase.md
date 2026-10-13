### ROL
Mismo rol que en `prompt-claude-code-municipios-reales.md`. Seguís en la rama `feat/municipios-reales`.

### OBJETIVO
Resolver el desajuste que encontraste. La vista departamental debe dejar de usar el mock `src/data/municipios.js` y unir la geometría real con **Supabase** (tabla `municipalities`) por `department` + `code`.

### CONTEXTO
- Las 17 diferencias de nombres vienen del mock, no de la geometría. Además el mock tiene municipios que no existen ("La Entrada", "Jutiquile", "El Aguán", "Jano" en El Paraíso, "La Iguala" en Intibucá) y cifras ficticias. Ejemplo: La Ceiba 2024 tiene presupuesto de L 285 M en el mock y L 598.8 M real en Supabase (`presupuesto_municipal`).
- El archivo `public/data/honduras-municipios-topo.json` ya trae `department` y `code` iguales a Supabase, y las 298 claves calzan 1:1 con los datos de 2024.
- `VistaDepartamental.tsx` ya llama a `useMunicipalitiesMultiYear([fiscalYear])` (hoy solo para la autonomía). Usá ese mismo hook como fuente única.
- Supabase tiene datos de 2021 a 2025. 2019 y 2020 no tienen filas.

### INSTRUCCIONES
1. **Solo en `VistaDepartamental.tsx`**, reemplazá `getDepartamento()` / `dept.municipios` por las filas de Supabase del departamento seleccionado. Normalizá el nombre de departamento con la función que ya existe.
2. Mapeo de campos:
   - presupuesto → `presupuesto_municipal`
   - ingresos propios → `ingresos_propios`
   - transferencias → `transferencias_art91`
   - población → `population`
   - categoría → `category`
   - nombre → `name`
   - autonomía → la fórmula que ya existe (`ingresos_propios / ingresos_recaudados × 100`).
3. Unión con la geometría: clave `department|code`. No hagas ninguna unión por nombre.
4. Capital del departamento: si hace falta, resolvela con `code === 1`. En Honduras el municipio 01 de cada departamento es la cabecera.
5. Para el encabezado (nombre y capital) y la navegación del departamento podés seguir usando metadatos del mock (`id`, `nombre`, ruta), pero **ninguna cifra** puede salir del mock.
6. Si un campo que hoy se muestra no existe en Supabase (por ejemplo IDH o área), no lo inventes: quitalo de la vista y listalo en tu reporte.
7. Años sin datos (2019 y 2020): mostrá el mapa en gris neutro con el mensaje "Sin datos SEFIN para este año". No uses cifras del mock.
8. Después continuá con el prompt original: geometría real, Nivel 1 con 18 departamentos, Nivel 2 con los municipios reales y la verificación de 0 desajustes.
9. **No toques** las otras 8 páginas que importan `data/municipios` (AnalyticsPage, ComparativesPage, DashboardNacional, DetalleMunicipio, MapaInteractivo, MunicipioDETALLE, PresupuestarioPage, RankingsPage). Solo listá en el reporte qué cifras toma cada una del mock, para una segunda fase.

### FORMATO DE ENTREGA
- Archivos modificados, con una línea por archivo.
- Verificación: municipios de Supabase sin geometría = 0 y geometrías sin datos = 0, para 2024.
- Comparación de 3 municipios entre lo que muestra la vista y lo que dice Supabase: La Ceiba, Comayagua y Distrito Central.
- Inventario de uso del mock en las otras 8 páginas.
- Commit en `feat/municipios-reales`, sin merge ni push a main.

### RESTRICCIONES
- No modifiques `src/data/municipios.js` ni la tabla de Supabase.
- No agregues credenciales. Usá el cliente Supabase existente con la key publishable.
- No uses `git add -A` ni `git add .`.
