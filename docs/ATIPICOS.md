# SIMHO — Datos atípicos (Fase 1, paso 11)

Fuente: `public.municipalities`, 2021–2025 (1 490 filas), leída el 2026-10-13 con la anon key, solo lectura.
Reglas: `atipicos()` en `src/lib/indicadores.ts`. Una señal no corrige ni excluye la fila; solo marca qué revisar contra la liquidación SEFIN.

**Criterio único de exclusión** (2026-10-13): `excluirDeEstadisticas()` = `sinLiquidacion()` (§2) **o** `datoIncompleto()` (§5–6). Las filas excluidas quedan fuera de totales, agregados nacionales y departamentales (Σ/Σ), medianas y rankings. En las vistas de un solo municipio (ficha del mapa, Detalle Municipio, Análisis por municipio, Comparativos por municipio, Datos Financieros) siguen visibles: con "Sin liquidación", o con sus cifras y ⚠ con tooltip si son dato incompleto. Hay 13 filas excluidas en 2021–2025: 4 sin liquidación, 7 sin transferencia Art. 91 y 2 rendiciones parciales.

Hay dos tipos de dato incompleto, con rótulos distintos:
- **"⚠ Sin transferencia Art. 91 en la fuente (puede ser retención de SEFIN o dato faltante)"**: `sinArt91()` (§5).
- **"Dato incompleto (rendición parcial)"**: `rendicionParcial()` (§6).

## 1. Catálogo de reglas

| Regla | Criterio | Filas 2021–2025 |
|---|---|---|
| Ingresos corrientes negativos | G1 + G2 < 0 | 0 |
| Ingresos corrientes en cero | G1 + G2 = 0 con ingresos totales > 0 | 4 |
| Ingresos del año ≤ 0 | totales − balance − préstamos − bonos ≤ 0, con totales > 0 | 3 |
| Autonomía > 100 % | corrientes > ingresos del año | 0 |
| Sin transferencia Art. 91 en la fuente | `sinArt91()`: con liquidación, Art. 91 + otras = 0 y corrientes > 0 | 7 |
| Dato incompleto (rendición parcial) | `rendicionParcial()`: lista fija según notas del Excel (§6) | 2 |
| Inversión casi nula en la fuente | `inversionCasiNula()`: con liquidación, bienes capitalizables ÷ población < L 50 (§8) | 42 |
| Sin población | `population` ≤ 0 o nula | 0 |
| Sin egresos reportados | `total_egresos` ≤ 0 | 4 |
| Sin ingresos reportados | `ingresos_recaudados` ≤ 0 | 0 |
| Egresos > 2 × presupuesto aprobado | ejecución > 200 % (umbral fijo, ajustable) | 19 |
| Tributarios ≠ suma de renglones | \|G1 − Σ 8 impuestos + tasas + derechos\| > L 1 | 0 |
| Corrientes SEFIN ≠ G1 + G2 | \|col. 14 − (col. 16 + col. 27)\| > L 1 | 0 |
| Funcionamiento ≠ suma de renglones | \|col. 41 − Σ 5 renglones\| > L 1 | 0 |

Las tres reglas de consistencia dan 0: los subtotales SEFIN cuadran con sus renglones en todas las filas.

## 2. Filas sin liquidación (ingresos casi nulos y egresos en cero)

Aparecen en "corrientes en cero", "sin egresos" y, salvo Puerto Lempira, en "ingresos del año ≤ 0". Parecen municipios que no reportaron liquidación y no municipios con finanzas reales en cero.

| Año | Municipio | Ingresos totales | Egresos | Presupuesto aprobado |
|---|---|---|---|---|
| 2021 | Puerto Lempira (Gracias a Dios 01) | L 5.69 M | 0 | L 27.3 M |
| 2023 | San Antonio de Flores (El Paraíso 11) | L 0.03 M | 0 | L 17.0 M |
| 2024 | San Antonio de Flores (El Paraíso 11) | L 0.01 M | 0 | L 18.3 M |
| 2025 | Pespire (Choluteca 11) | L 0.01 M | 0 | L 32.2 M |

**Decisión (2026-10-13): se excluyen y se rotulan "Sin liquidación".**

- `sinLiquidacion()` en `src/lib/indicadores.ts` exige egresos ≤ 0 **y** ingresos corrientes = 0. Marca exactamente estas 4 filas.
- Quedan fuera de todos los totales (presupuesto, población, ingresos, egresos), de los agregados Σ/Σ, de las medianas, de los rankings y de la referencia departamental, vía `excluirDeEstadisticas()`. `sumarInsumos()`, `mediana()` y `aggregate()` las filtran en un solo lugar.
- Se muestran como "Sin liquidación" en la ficha municipal, en Detalle Municipio (sin indicadores), en Datos Financieros (tarjetas y columnas SIMHO), en Análisis (encabezado del año), en la lista de Vista Departamental, en Comparativos (celda de la tabla) y en Rankings (encabezado: "excluidos").
- Efecto en el Dashboard Nacional: "Municipios" cuenta solo los que entran en estadísticas.

Autonomía municipal sin todas las filas excluidas (sin liquidación + dato incompleto):

| Año | Municipios en estadísticas | Mediana municipal | Agregado nacional (Σ/Σ) |
|---|---|---|---|
| 2021 | 295 | 12.4 % | 54.5 % |
| 2022 | 295 | 13.7 % | 59.8 % |
| 2023 | 296 | 13.7 % | 52.1 % |
| 2024 | 296 | 11.4 % | 52.9 % |
| 2025 | 295 | 17.0 % | 60.1 % |

(Con la regla de la Fase 2, "Art. 91 + otras = 0". En 2023 el agregado baja de 58.4 % a 52.1 % porque sale San Pedro Sula.)

## 3. Egresos mayores que el doble del presupuesto aprobado (19 filas)

| Año | Municipio | Egresos | Aprobado | Ejecución |
|---|---|---|---|---|
| 2021 | La Unión (Lempira 11) | L 58.0 M | L 20.1 M | 289 % |
| 2021 | Santa Fé (Ocotepeque 14) | L 34.5 M | L 16.3 M | 212 % |
| 2021 | Jano (Olancho 12) | L 36.4 M | L 16.9 M | 215 % |
| 2021 | Las Vegas (Santa Bárbara 27) | L 80.4 M | L 23.4 M | 344 % |
| 2022 | La Unión (Lempira 11) | L 43.4 M | L 21.4 M | 203 % |
| 2022 | Patuca (Olancho 23) | L 60.8 M | L 28.2 M | 216 % |
| 2023 | Cucuyagua (Copán 06) | L 62.8 M | L 30.0 M | 209 % |
| 2023 | Erandique (Lempira 05) | L 44.8 M | L 21.1 M | 212 % |
| 2023 | Gualcince (Lempira 06) | L 44.5 M | L 21.1 M | 210 % |
| 2023 | La Unión (Lempira 11) | L 60.7 M | L 21.7 M | 280 % |
| 2023 | Fraternidad (Ocotepeque 05) | L 47.0 M | L 18.3 M | 257 % |
| 2024 | Dolores (Copán 07) | L 39.8 M | L 19.5 M | 205 % |
| 2024 | San Antonio (Copán 15) | L 42.9 M | L 21.4 M | 200 % |
| 2024 | Cantarranas (Francisco Morazán 20) | L 61.4 M | L 28.5 M | 216 % |
| 2024 | Erandique (Lempira 05) | L 55.1 M | L 24.0 M | 229 % |
| 2024 | Gualcince (Lempira 06) | L 50.7 M | L 23.6 M | 215 % |
| 2024 | La Unión (Lempira 11) | L 68.0 M | L 24.3 M | 280 % |
| 2024 | Belén Gualcho (Ocotepeque 02) | L 49.4 M | L 22.1 M | 223 % |
| 2025 | La Unión (Copán 12) | L 194.8 M | L 93.7 M | 208 % |

**Decisión:** la ejecución no se usa en Rankings ni en Comparativos (nunca estuvo en esas páginas) hasta tener el presupuesto vigente. En Detalle Municipio se muestra como "Ejecución (vs. presupuesto aprobado)", con ⚠ por encima de 150 % (`UMBRAL_EJECUCION`).

Lectura probable: la base trae solo el presupuesto **aprobado**; las ampliaciones del año (transferencias extraordinarias, donaciones, recursos de balance incorporados) no están. Por eso la ejecución se rotula "vs. presupuesto aprobado". La Unión (Lempira) se repite cuatro años seguidos.

Otro caso para revisar fuera de reglas: Las Vegas (Santa Bárbara) 2021 tiene tributarios por L 9.2 M y no tributarios por L 47.4 M.

## 4. Siguatepeque 2025

Sin señales.

## 5. Sin transferencia Art. 91 en la fuente (7 filas)

**Regla (Fase 2, 2026-10-13):** `sinArt91()` = con liquidación, Art. 91 + otras transferencias = 0 e ingresos corrientes > 0. Reemplaza a la regla anterior, "autonomía ≥ 99 %". `otras_transferencias` vale 0 en las 1 490 filas, así que en la práctica la regla es "Art. 91 = 0". Rótulo y tooltip: **"⚠ Sin transferencia Art. 91 en la fuente (puede ser retención de SEFIN o dato faltante)"**.

En todas estas filas, Art. 91 y otras transferencias valen 0, **tanto en Supabase como en el Excel fuente** (hoja del año, columnas 34 y 35). No es un error de importación: la fuente SEFIN no trae la transferencia, sea por retención o por dato faltante. El Excel no tiene notas sobre estos municipios.

Cambio respecto de la regla anterior:
- **Entran 2:** La Ceiba 2021 (autonomía 89.6 %, ingresos L 411.0 M, egresos L 403.3 M) y **San Pedro Sula 2023** (97.6 %, ingresos L 3 421.5 M, egresos L 3 048.6 M). San Pedro Sula recibió Art. 91 en los demás años: L 121.1 M (2021), L 28.0 M (2022), L 403.1 M (2024) y L 179.2 M (2025).
- **Salen 0:** las 5 filas de la regla anterior siguen dentro.
- **Juticalpa 2025** (autonomía 98.7 %) **no entra**: trae Art. 91 por L 2.06 M. Con la regla nueva es un dato válido.

| Año | Municipio | Autonomía | Ingresos totales | Egresos | Art. 91 del año anterior | Lectura |
|---|---|---|---|---|---|---|
| 2021 | La Ceiba (Atlántida 01) | 89.6 % | L 411.0 M | L 403.3 M | — | Entra con la regla de la Fase 2. |
| 2022 | La Ceiba (Atlántida 01) | 99.1 % | L 385.0 M | L 360.3 M | 0 (2021) | Art. 91 en 0 también en 2021; desde 2023 trae Art. 91 (L 3.4 M, L 10.4 M, L 2.3 M). |
| 2023 | San Pedro Sula (Cortés 01) | 97.6 % | L 3 421.5 M | L 3 048.6 M | L 28.0 M (2022) | Entra con la regla de la Fase 2. |
| 2022 | Santa Fé (Ocotepeque 14) | 100.0 % | L 2.4 M | L 17.8 M | — | Ingresos solo corrientes; egresos 7.6 × ingresos. |
| 2024 | Esquipulas del Norte (Olancho 07) | 100.0 % | L 1.8 M | L 31.5 M | — | Ingresos solo corrientes; egresos 17 × ingresos. |
| 2025 | El Triunfo (Choluteca 06) | 100.0 % | L 17.8 M | L 17.4 M | L 17.0 M (2024) | Recibió entre L 17.0 M y L 28.5 M de Art. 91 en 2021–2024. |
| 2025 | San Juan Guarita (Lempira 18) | 100.0 % | L 0.9 M | L 19.1 M | L 31.4 M (2024) | Ingresos solo corrientes; egresos 22 × ingresos. |

**Decisión (2026-10-13, revisada):** igual tratamiento que las filas sin liquidación, mediante `excluirDeEstadisticas()`. Quedan fuera de todos los rankings (no solo del de autonomía), de las medianas y de los agregados nacional y departamental. Siguen visibles con ⚠ y tooltip en la ficha del mapa, en Detalle Municipio, en Análisis por municipio y en la tabla de Comparativos. Rankings los lista en el encabezado por separado: "⚠ Sin transferencia Art. 91 en la fuente (…) (excluidos)" y "⚠ Dato incompleto (rendición parcial) (excluidos)", además de "Sin liquidación (excluidos)".

## 6. Rendiciones parciales según las notas del Excel fuente

Las hojas 2021, 2022, 2024 y 2025 traen notas al pie que la base no conserva:

| Año | Nota del Excel | Tratamiento en SIMHO |
|---|---|---|
| 2021 | Puerto Lempira: rendición al tercer trimestre | Sin liquidación (§2) |
| 2021 | Wampusirpe: rendición al tercer trimestre | Dato incompleto (rendición parcial): ingresos L 20.4 M, egresos L 10.3 M |
| 2022 | San Antonio de Flores: rendición al primer trimestre | Dato incompleto (rendición parcial): ingresos L 0.43 M, egresos L 0.48 M |
| 2024 | San Antonio de Flores: información al tercer trimestre con datos en cero | Sin liquidación (§2) |
| 2025 | Pespire: información al primer trimestre | Sin liquidación (§2) |

**Decisión (2026-10-13):** Wampusirpe 2021 y San Antonio de Flores 2022 se marcan como "Dato incompleto (rendición parcial)", con el mismo tratamiento que §5. La lista está fija en `RENDICION_PARCIAL` (`src/lib/indicadores.ts`), porque la base no conserva las notas: hay que actualizarla al importar un año nuevo.

Las hojas 2021 y 2022 también dicen: "Categoría Municipal establecida por la SGJD 2020". Es la fuente de la columna `category`. El rótulo pasa a ser "Categoría SGJD 2020 (según nota del Excel SEFIN)" y `sql/002_categoria_municipal.sql` usa `criterio = 'SGJD 2020'`.

## 7. Dos niveles de exclusión (Fase 5)

Corrige el criterio de la Fase 2, que sacaba de los totales en lempiras a las filas sin Art. 91 y a las rendiciones parciales.

| Nivel | Función | Qué excluye | Dónde aplica |
|---|---|---|---|
| Totales | `excluirDeTotales` | Sin liquidación (§2) | Sumas de montos y población: totales nacionales, departamentales y de categoría, hoja Resumen del Excel, cuadro de Análisis, tarjetas de montos de la Vista Departamental, tira del Mapa y Comparativos |
| Razones | `excluirDeRazones` (= `excluirDeEstadisticas`) | Sin liquidación + sin Art. 91 (§5) + rendición parcial (§6) | Razones agregadas, medianas, percentiles, distribución, semáforo y rankings |

Donde un total incluye filas sin Art. 91 se muestra: "Incluye N municipio(s) sin transferencia Art. 91 en la fuente; las transferencias pueden estar subestimadas" (`notaTotales`). Con rendiciones parciales se agrega "Incluye N municipio(s) con rendición parcial (dato incompleto)".

Efecto: el presupuesto nacional 2023 pasa de L 23.2 a L 28.4 mil M (San Pedro Sula vuelve al total); la autonomía agregada 2023 sigue en 52.1 % y la mediana en 13.7 %.

## 8. Inversión casi nula en la fuente (Fase 6)

Revisión pedida en la Fase 6: municipios 2025 con inversión por habitante menor a L 50. Datos leídos de `public.municipalities` el 2026-10-13 (anon key, solo lectura). Montos en millones de lempiras.

| Municipio (2025) | Pob. | Bienes capitalizables | Transf. de capital | Asignaciones globales | Gastos de capital y deuda | Total egresos | Inversión pc |
|---|---|---|---|---|---|---|---|
| Nueva Frontera (Santa Bárbara, C) | 14 313 | 0.014 | 5.048 | 19.610 | 24.672 | 31.943 | L 0.98 |
| Tomalá (Lempira, C) | 7 213 | 0.008 | 7.101 | 11.703 | 19.348 | 24.007 | L 1.07 |
| Jano (Olancho, C) | 6 267 | 0.068 | 6.026 | 12.012 | 18.106 | 22.521 | L 10.78 |
| La Unión (Olancho, C) | 8 773 | 0.231 | 5.595 | 3.036 | 8.862 | 19.818 | L 26.34 |
| Texiguat (El Paraíso, D) | 8 940 | 0.417 | 4.067 | 15.931 | 20.416 | 27.160 | L 46.68 |
| Trojes (El Paraíso, B) | 58 891 | 2.894 | 6.734 | 16.223 | 25.851 | 41.223 | L 49.15 |

**Diagnóstico: dato fuente, no cálculo.** En las seis filas los renglones cuadran: bienes capitalizables + transferencias de capital + activos financieros + servicio de deuda + otros gastos de capital + asignaciones globales = gastos de capital y deuda, y funcionamiento + gastos de capital y deuda = total egresos. El gasto de capital está casi todo en **Asignaciones globales** y no en bienes capitalizables, que es el numerador de la inversión de SIMHO (§1 del plan). La inversión real puede estar subregistrada por clasificación; hay que verificarlo con la liquidación.

Contraste con el top 3 de 2025 (el numerador es correcto): Humuya tiene bienes capitalizables por L 16.864 M y una población de 1 557, lo que da L 10 831 por habitante; las asignaciones globales son 0. Yauyupe tiene L 13.588 M y 1 523 habitantes (L 8 922). Lauterique tiene L 23.330 M y 3 252 habitantes (L 7 174). En los tres, los bienes capitalizables equivalen al 50–60 % del gasto total (la mediana nacional es 28.5 %). El per cápita alto viene de poblaciones muy pequeñas, no de un error.

**Decisión (2026-10-13):** no se excluyen. `inversionCasiNula()` agrega a `atipicos()` la señal "Inversión casi nula en la fuente — verificar con la liquidación". Comparar la muestra con ⚠ en el encabezado, en las barras y en los avisos. Rankings la muestra como "atípico" en los indicadores de inversión (por habitante y ÷ gasto), sin quitarle la posición. Hay 42 filas en 2021–2025 y 6 en 2025. El umbral está en lempiras nominales y es fijo.
