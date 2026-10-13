### ROL
Sos un desarrollador senior de React/TypeScript con experiencia en D3 y cartografía web (TopoJSON). Trabajás en el repo de SIMHO (dashboard-municipal-honduras, desplegado en Netlify vía GitHub).

### OBJETIVO
Reemplazar las figuras de municipios generadas artificialmente (teselado Voronoi/hexágonos dentro de cada departamento) por los **límites oficiales reales** de los municipios, conservando la navegación en dos niveles:

- **Nivel 1 — Vista nacional (al abrir la app):** mapa de Honduras con **solo los 18 departamentos**. NO se dibujan los 298 municipios en esta vista. Se mantiene la coropleta por departamento como funciona hoy.
- **Nivel 2 — Clic en un departamento:** se muestra **solo ese departamento**, dividido en **sus municipios con la forma real** (ej. Comayagua → 21 municipios, Francisco Morazán → 28, Gracias a Dios → 6), con su coropleta, tooltip y clic al detalle del municipio. El botón "← NACIONAL" regresa al Nivel 1.

### CONTEXTO
- Hoy `public/data/honduras-topo.json` solo trae 18 departamentos (objeto `hnd`, propiedad `name`). Al entrar a un departamento, el código crea polígonos falsos con `Delaunay.from(...).voronoi(...)` recortados al contorno del departamento. Por eso se ven hexágonos.
- Archivos relevantes: `src/pages/MapaInteractivo.tsx` (vista nacional) y `src/pages/VistaDepartamental.tsx` (vista de departamento, donde está el Voronoi). Ambos cargan hoy `/data/honduras-topo.json`.
- El archivo nuevo **ya está en el repo** en `public/data/honduras-municipios-topo.json` (≈640 KB, TopoJSON, sin commitear todavía). Tiene dos objetos:
  - `municipios` (298 geometrías). Propiedades: `department` (MAYÚSCULAS sin tildes, igual que la columna `department` de Supabase), `code` (entero, igual que la columna `code` de la tabla `municipalities`), `name` (mismo nombre que Supabase), `pcode` (código OCHA/INE, ej. HN0301), `dept_code`, `key` = `"DEPARTAMENTO|code"`.
  - `departamentos` (18 geometrías, disueltas de los municipios). Sus bordes calzan exactamente con los municipios.
- Ya verifiqué que las 298 claves `department|code` coinciden 1:1 con la tabla `municipalities` (año 2024).
- Fuente: OCHA COD-AB Honduras (SINIT/SEPLAN), licencia CC BY-IGO. Hay que citarla.

### INSTRUCCIONES
1. Antes de tocar nada, creá una rama `feat/municipios-reales`. Corré `git status` y confirmá que **ningún** archivo `.env*` (en particular `.env.local.bak_pre_rotacion`) aparece como pendiente de agregar. Ya se agregó `.env.*` al `.gitignore`. Nunca uses `git add -A` ni `git add .`: agregá los archivos por nombre.
2. Confirmá que existe `public/data/honduras-municipios-topo.json` con 298 geometrías en `municipios` y 18 en `departamentos`. No lo regeneres ni lo modifiques.
3. En `src/pages/VistaDepartamental.tsx`, reemplazá la generación Voronoi/Delaunay por:
   - Cargar `/data/honduras-municipios-topo.json` una sola vez (caché en memoria o hook).
   - `topojson.feature(topo, topo.objects.municipios)` y filtrar por el departamento seleccionado. Normalizá ambos nombres con la función que ya existe en el código (lowercase + NFD sin tildes).
   - Unir cada feature con su registro de Supabase por `department` + `code`, no por nombre.
   - Proyección: `geoMercator().fitExtent(...)` sobre los features filtrados, para que el departamento llene el panel igual que ahora.
   - Contorno del departamento: usá `topojson.mesh(topo, topo.objects.municipios, (a,b)=>a===b)` del subconjunto, o el feature correspondiente de `departamentos`.
4. Mantené exactamente igual la escala de color (Presupuesto/Población/Autonomía/Categorías), el hover/tooltip, el clic que abre el detalle del municipio, la lista lateral y el selector de año.
5. Eliminá el código de Voronoi/Delaunay que quede sin uso, y la dependencia `d3-delaunay` si ya nadie la importa.
6. Vista nacional (Nivel 1): sigue mostrando **solo los 18 departamentos**. Recomendado: dibujarla con `topo.objects.departamentos` del archivo nuevo, en lugar de `honduras-topo.json`, para que los bordes nacionales y los municipales calcen exactamente. Antes de cambiarlo, confirmá que los nombres de departamento siguen uniéndose con los datos y que el clic en cada departamento sigue funcionando. Por ningún motivo pintes la capa `municipios` en la vista nacional.
7. Agregá a la línea "FUENTE" del mapa: `Límites: OCHA COD-AB / SINIT (CC BY-IGO)`.
8. Agregá una verificación temporal en desarrollo: `console.warn` con cualquier municipio de Supabase que no tenga geometría, y viceversa. Debe dar 0 en ambos sentidos para 2024.
9. Seguí el flujo del `CLAUDE.md` del repo: pasá el cambio por `code-reviewer` y por `qa` antes de darlo por terminado.
10. Corré `npm run build` y probá localmente:
   - Al abrir: se ven solo 18 departamentos y ningún municipio.
   - Clic en Comayagua: 21 municipios con forma real, sin hexágonos. Igual con Francisco Morazán (28), Gracias a Dios (6) e Islas de la Bahía (4).
   - "← NACIONAL" vuelve a los 18 departamentos.
   - Cambiar de año y de indicador (Presupuesto/Población/Autonomía/Categorías) recolorea bien en ambos niveles.

### FORMATO DE ENTREGA
- Lista de archivos modificados con resumen de una línea por archivo.
- Resultado de la verificación del paso 8 (conteos).
- Commit con mensaje descriptivo en la rama `feat/municipios-reales`. No hagas merge ni push a `main` sin mi confirmación.

### RESTRICCIONES
- No cambies la conexión a Supabase, las keys ni las consultas a la tabla `municipalities`.
- No modifiques fórmulas de indicadores ni datos.
- No subas ningún `.env` ni credenciales al repo.
- No cambies estilos/colores fuera del mapa.
- Si algún municipio no calza, detenete y reportalo en vez de inventar una correspondencia.
