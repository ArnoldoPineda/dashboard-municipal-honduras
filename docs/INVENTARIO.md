# SIMHO — Inventario técnico (Fase 0)

Fecha: 2026-10-13 · Rama: `rediseno-fase1` · Base: commit `383b9ed`

## 0. Seguridad

| Hallazgo | Estado |
|---|---|
| `.env.local` con `SUPABASE_SERVICE_ROLE_KEY` y anon key commiteado en `590de3a` (2026-06-13), quitado en `d7907e3`. **Sigue en el historial de `origin/main`.** | Ambas claves filtradas devuelven **HTTP 401** contra la API (probado 2026-10-13): están revocadas. Las claves actuales de `.env.local` son distintas. Riesgo residual bajo; reescribir historial es opcional. |
| `.env`, `.env.local`, `.env.*` | Ignorados por `.gitignore` y no trackeados. |
| `.gitignore` | Excluye `node_modules`, `build/` (salida de CRA), `.env*`. **No** excluye `dist/` (CRA no lo genera; se agrega por higiene). |
| Bundles `build/` commiteados en el pasado | Solo contienen la anon key (pública por diseño). No contienen `service_role`. |
| `import_year.py` | Lee `SUPABASE_SERVICE_ROLE_KEY` de `.env.local` (no hardcodeada). Correcto. |
| `.env.local` | Guardado con BOM (no trackeado; quitar BOM por convención). |
| RLS de `municipalities` | **No verificable desde la app**: la anon key no expone catálogos. Requiere correr el SQL de la sección 0.1 en el SQL Editor de Supabase. |

### 0.1 SQL de verificación de RLS (solo lectura)

```sql
select c.relname, c.relrowsecurity as rls_on, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public';

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated');
```

## 1. Páginas y componentes

### 1.1 Rutas activas (`src/App.tsx`, menú en `src/components/Layout.tsx:69`)

| Menú | Ruta | Archivo | Componentes / hooks |
|---|---|---|---|
| Mapa Interactivo | `/` | `src/pages/MapaInteractivo.tsx` | `useSefinYear`, `aggregate`, `groupByDept`, `categoryOf` (`utils/sefin.ts`), `useMunicipiosTopo` |
| (drill-down mapa) | `/departamento/:id` | `src/pages/VistaDepartamental.tsx` | `useSefinYear`, `autonomia`, `categoryOf` |
| (drill-down mapa) | `/municipio/:deptId/:code` | `src/pages/DetalleMunicipio.tsx` | `MuniDetailContent` (`src/components/MuniDetailContent.tsx`) |
| Dashboard Nacional | `/dashboard` | `src/pages/DashboardNacional.tsx` | `useMunicipalitiesMultiYear` |
| Detalle Municipio | `/muni-detalle` | `src/pages/MunicipioDETALLE.tsx` | `useMunicipalitiesMultiYear`, `categoryOf` |
| Datos Financieros | `/financiero` | `src/pages/PresupuestarioPage.tsx` | `categoryOf`, `autonomia` |
| Análisis | `/analisis` | `src/pages/AnalyticsPage.tsx` | `useMunicipalitiesMultiYear` |
| Comparativos | `/comparativos` | `src/pages/ComparativesPage.tsx` | `autonomia` |
| Rankings | `/rankings` | `src/pages/RankingsPage.tsx` | `getCategory` propio |

Compartidos: `src/components/Layout.tsx` (selector de año `FISCAL_YEARS`, selector de indicador), `src/context/NavbarContext.tsx`, `src/utils/sefin.ts`, `src/hooks/useMunicipalities.ts`, `src/data/departamentos.ts`, `src/data/nombresOficiales.ts`.

### 1.2 Código no enrutado (candidato a Fase 2, no se toca ahora)

`src/pages/Dashboard.tsx`, `src/pages/Dashboard_MEJORADO.tsx`, `src/pages/AnalyticsPage_MEJORADA.tsx`, `src/components/{AdvancedAnalysisChart,AnalysisChart,COMPONENTES_ADAPTATIVOS,DashboardLayout*,EnhancedKPICard,ExportButtons,KPICard,Navigation}.tsx`, `src/hooks/{useKPIs,useAnalysisData,useAdvancedAnalysis}.ts`, `src/utils/exportData.ts`, `scripts/updateMunicipios.js`, `SIMHO-Dashboard-standalone.html`, `Dashboard Municipal Honduras_files/`.
\* `DashboardLayout` sí lo importan Datos Financieros, Comparativos y Rankings.

## 2. Supabase

Única tabla consultada: **`public.municipalities`**, desde `src/hooks/useMunicipalities.ts:62` (`select('*')`, paginado de 1 000, filtro `year in (...)`). Escritura solo desde `import_year.py` (service role, borra e inserta un año completo).

Filas por año: 2019 = 0, 2020 = 0, 2021–2025 = 298 c/u.

Columnas (origen: hoja `<año>` de `Base_Financiera_Municipal_2002_2025.xlsx`, columna Excel entre paréntesis):

| Grupo | Columnas |
|---|---|
| Identificación | `id`, `year`, `department` (4), `code` (3, código municipal dentro del depto.), `name` (5), `category` (6 — ver §4) |
| Población | `population` (7 — "POBLACIÓN AJUSTADA <año>", SEFIN) |
| Presupuesto | `presupuesto_municipal` (9), `gastos_presupuestados` (10) — **idénticas en 2025**, ambas = presupuesto aprobado |
| Agregados SEFIN | `ingresos_propios` (11), `ingresos_recaudados` (12, = ingresos totales incl. balance), `autonomia_financiera` (13, = 11÷12×100), `ingresos_corrientes` (14 = 16 + 27) |
| Tributarios G1 | `ingresos_tributarios` (16) = `impuesto_bi`, `impuesto_personal`, `impuesto_industria`, `impuesto_comercio`, `impuesto_servicios`, `impuesto_pecuario`, `impuesto_extraccion`, `impuesto_telecomunicaciones` (17–24) + `tasas_servicios` (25) + `derechos` (26) |
| No tributarios G2 | `ingresos_no_tributarios` (27) |
| Capital (29 = Σ30–39) | `prestamos`, `venta_activos`, `contribuciones`, `colocacion_bonos`, `transferencias_art91`, `otras_transferencias`, `subsidios`, `herencias_legados`, `otros_ingresos_capital`, `recursos_balance` |
| Funcionamiento (41) | `gastos_funcionamiento` = `servicios_personales`, `servicios_no_personales`, `materiales_suministro`, `transferencias_corrientes`, `otros_gastos` |
| Capital y deuda (48) | `gastos_capital_deuda` = `bienes_capitalizables`, `transferencias_capital`, `activos_financieros`, `servicios_deuda`, `otros_gastos_capital`, `asignaciones_globales` |
| Resultado | `total_egresos` (56), `superavit_deficit` (57 = 12 − 56, **con balance**), `gasto_corriente` (58), `ingreso_corriente_ajustado` (59) |
| Columnas muertas | `budget_amount`, `own_income`, `income_received`, `financial_autonomy`, `current_income`, `data_source` (null); `poblacion_ajustada`, `*_total`, `impuesto_sobre_bi`, `tasas_administrativas`, etc. (0) |

Verificaciones hechas sobre Siguatepeque 2025:
- `ingresos_propios` (169.6 M) = corrientes 148.2 + venta de activos 6.0 + contribuciones 0.1 + otros ingresos de capital 15.4. No es "propios" en sentido estricto.
- `gasto_corriente` = `ingreso_corriente_ajustado` = 195.2 M. **Las columnas 58 y 59 ya son idénticas en el Excel fuente** (todas las filas revisadas). 195.2 = `ingresos_propios` + Art. 91. No es un gasto.

## 3. Indicadores: dónde y cómo se calculan hoy

| Indicador | Archivo:línea | Fórmula actual | Columnas |
|---|---|---|---|
| Autonomía | `utils/sefin.ts:26` (`autonomia()`), usada en `MapaInteractivo.tsx:55` vía `aggregate`, `VistaDepartamental.tsx:297`, `DetalleMunicipio.tsx:74`, `PresupuestarioPage.tsx:872`, `ComparativesPage.tsx:146` | propios ÷ recaudados (Σ/Σ) | `ingresos_propios`, `ingresos_recaudados` |
| Autonomía | `ComparativesPage.tsx:115,197,221`, `RankingsPage.tsx:44`, `AnalyticsPage.tsx:86` | propios ÷ recaudados (copias locales) | ídem |
| Autonomía | `DashboardNacional.tsx:130-131` (KPI), `:171` (tendencia) | **promedio simple** de `autonomia_financiera` | `autonomia_financiera` |
| Autonomía | `DashboardNacional.tsx:403-406` (tabla Top), `MunicipioDETALLE.tsx:328`, `PresupuestarioPage.tsx:641,1021` | valor SEFIN almacenado | `autonomia_financiera` |
| Autonomía (donut ficha) | `MuniDetailContent.tsx:104-105` | propios ÷ (propios + Art. 91) | `ingresos_propios`, `transferencias_art91` |
| Población | `MapaInteractivo.tsx:104`, `VistaDepartamental.tsx:290`, `DashboardNacional.tsx:127,169`, `MuniDetailContent.tsx:304`, `MunicipioDETALLE.tsx:317,670`, `PresupuestarioPage.tsx:42,655,884`, `RankingsPage.tsx:61`, `ComparativesPage.tsx:118` | `population` (SEFIN ajustada del año). Etiqueta errónea "POBLACION AJUSTADA 2002" en `PresupuestarioPage.tsx:42` | `population` |
| Categoría A–D | `utils/sefin.ts:31` `categoryOf()`: presupuesto > 500 / 150 / 50 M. Usada en `MapaInteractivo.tsx:31,36`, `VistaDepartamental.tsx:279`, `MunicipioDETALLE.tsx:316`, `PresupuestarioPage.tsx:154,1006` | regla propia por presupuesto | `presupuesto_municipal` |
| Categoría A–D | `RankingsPage.tsx:13` `getCategory()`: > 3 000 / 1 200 / 400 M | otra regla propia | `presupuesto_municipal` |
| Categoría A–D | — (no usada) | columna SEFIN `category` | `category` |
| Superávit/déficit | `MunicipioDETALLE.tsx:408`, `PresupuestarioPage.tsx:341-344,565,605-615,648`, `AnalyticsPage.tsx:109,163,317`, `RankingsPage.tsx:47,66` | valor SEFIN = recaudados − egresos (incluye balance) | `superavit_deficit` |
| Gasto corriente | `MunicipioDETALLE.tsx:409`, `PresupuestarioPage.tsx:87,1061` | columna `gasto_corriente` (= ingreso corriente ajustado; **bug 4**) | `gasto_corriente` |
| Ingresos corrientes | `MunicipioDETALLE.tsx:281-291` (G1 = Σ impuestos + tasas + derechos; G2 = no tributarios), `:329` (columna) | correcto en suma; tasas/derechos se repiten en G2 "→ G1" (`:357-358`) | columnas 14, 16–27 |
| Jerarquía ingresos | `AnalyticsPage.tsx:135-139` | Tributarios, Tasas y Derechos cuelgan los tres de Corrientes; No tributarios como fila principal | — |
| Per cápita | no existe en ninguna página | — | — |
| Transferencias | `MuniDetailContent.tsx:291`, `PresupuestarioPage.tsx:882`, `AnalyticsPage.tsx:93,300` | Art. 91 solo (sin `otras_transferencias`) | `transferencias_art91` |
| Dependencia, ahorro corriente, servicio de deuda/corrientes, inversión/gasto | no existen | — | — |
| Ejecución presupuestaria | `AnalyticsPage.tsx:442` (título), `PresupuestarioPage.tsx:211-212` (presupuesto vs egresos) | contra presupuesto aprobado, sin cociente explícito | `presupuesto_municipal`, `total_egresos` |
| Rango de años | `Layout.tsx:86` (2019–2025, selector global), `Layout.tsx:173` texto "2019–2025", `ComparativesPage.tsx:26` (2019–2025), `MunicipioDETALLE.tsx:510` y `RankingsPage.tsx:206` (2019–2025), `DashboardNacional.tsx:10`, `DetalleMunicipio.tsx:9`, `MunicipioDETALLE.tsx:12`, `PresupuestarioPage.tsx:132,764`, `AnalyticsPage.tsx:12` (2021–2025) | listas fijas duplicadas | — |

## 4. Columnas disponibles para los indicadores pedidos

| Necesidad | ¿Existe? | Columna |
|---|---|---|
| Gasto de funcionamiento | Sí | `gastos_funcionamiento` (+ 5 desgloses) |
| Inversión | Sí | `bienes_capitalizables` |
| Servicio de deuda | Sí | `servicios_deuda` |
| **Saldo de deuda** | **No** | — (no está en el Excel SEFIN) |
| **Presupuesto vigente/modificado** | **No** | Solo `presupuesto_municipal` = `gastos_presupuestados` (aprobado) |
| Población | Sí (SEFIN) | `population` = "POBLACIÓN AJUSTADA <año>" del Excel SEFIN. No hay población INE en el repo. |
| Categoría | Sí (SEFIN) | `category` = columna CATEGORÍA del Excel. Coincide 100 % con el Excel 2021–2025. Distribución idéntica 2020–2025 (A 43, B 40, C 173, D 42); 2019 distinta (A 23, B 32, C 107, D 136). Criterio no documentado en la base. |
| Recursos de balance, préstamos, bonos | Sí | `recursos_balance`, `prestamos`, `colocacion_bonos` |
| Transferencias | Sí | `transferencias_art91`, `otras_transferencias` (`subsidios` y `herencias_legados` aparte) |

### 4.1 Categoría para un mismo municipio según la página (2025)

| Municipio | SEFIN (`category`) | Mapa / Depto. / Detalle / Datos Fin. (`categoryOf`) | Rankings (`getCategory`) | Presupuesto |
|---|---|---|---|---|
| Distrito Central | A | A | A | L 10.0 mil M |
| San Pedro Sula | A | A | A | L 4.6 mil M |
| El Progreso | A | A | C | L 1 020.0 M |
| Roatán | A | B | C | L 415.5 M |
| Choluteca | A | B | D | L 400.0 M |
| Comayagua | A | B | D | L 351.4 M |
| Siguatepeque | A | B | D | L 198.7 M |
| Juticalpa | A | B (C en 2023–2024) | D | L 194.0 M |
| Esquipulas del Norte | D | D | D | L 29.3 M |

## 5. Datos fuera de Supabase

- `Base_Financiera_Municipal_2002_2025.xlsx` (ignorado por git): hojas 2002–2025. **Hay datos 2019 y 2020** que no se importaron.
