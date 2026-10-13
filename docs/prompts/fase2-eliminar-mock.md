### ROL
Desarrollador senior React/TypeScript del repo SIMHO (dashboard-municipal-honduras). Seguí el CLAUDE.md del repo (code-reviewer + qa antes de dar por terminado).

### OBJETIVO
Que ninguna cifra que se muestre en SIMHO salga del mock `src/data/municipios.js`. Todas las cifras fiscales y de población deben venir de Supabase (tabla `municipalities`), igual que ya se hizo en `VistaDepartamental.tsx`.

### CONTEXTO
- La fase 1 ya está en main: `VistaDepartamental.tsx` usa Supabase y une los datos por `department` + `code`.
- Hay 8 páginas que todavía toman cifras del mock: MapaInteractivo, DashboardNacional, DetalleMunicipio, MunicipioDETALLE, PresupuestarioPage, AnalyticsPage, ComparativesPage y RankingsPage. Usá el inventario que generaste al cerrar la fase 1.
- El mock tiene montos ficticios (La Ceiba 2024: L 285 M en el mock, L 598.8 M real) y municipios que no existen ("La Entrada", "Jutiquile", "El Aguán").
- Supabase tiene datos de 2021 a 2025. 2019 y 2020 no tienen filas.
- Hooks existentes: `useMunicipalities` / `useMunicipalitiesMultiYear`. Los campos ya mapeados están en VistaDepartamental.tsx.

### INSTRUCCIONES
1. Rama nueva `feat/eliminar-mock` desde main.
2. Trabajá **una página por commit**, en este orden de riesgo: MapaInteractivo → DashboardNacional → RankingsPage → ComparativesPage → AnalyticsPage → PresupuestarioPage → DetalleMunicipio → MunicipioDETALLE.
3. En cada página, reemplazá toda cifra del mock por su equivalente de Supabase. Si un indicador no existe en Supabase (por ejemplo IDH, área o "otros"), quitalo y anotalo en el reporte. No lo calcules ni lo inventes.
4. En los años sin datos (2019 y 2020), mostrá "Sin datos SEFIN para este año" y no uses el mock.
5. Si necesitás agregados (por departamento o nacionales), calculalos desde las filas de Supabase con una función utilitaria compartida, no duplicada en cada página.
6. En cada página, verificá contra Supabase 3 cifras de control (La Ceiba, Comayagua, Distrito Central) e incluí la comparación en el reporte.
7. Al terminar, `src/data/municipios.js` solo puede quedar importado para metadatos no numéricos (id, slug, nombre, departamento). Si ya no lo usa nadie, proponé borrarlo, pero no lo borres.
8. Corré `npm run build` y `npm start`, y avisame para la revisión visual.

### FORMATO DE ENTREGA
- Tabla con una fila por página: qué cifras cambiaron, qué indicadores se eliminaron y resultado de las 3 cifras de control.
- Lista de commits de la rama.

### RESTRICCIONES
- No hagas merge ni push a main sin mi confirmación.
- No modifiques datos ni el esquema de Supabase, ni las fórmulas ya validadas (por ejemplo, autonomía = ingresos_propios / ingresos_recaudados × 100).
- No uses `git add -A` ni `git add .`. No subas ningún `.env*`.
- No cambies el diseño visual más allá de lo necesario para quitar indicadores inexistentes.
