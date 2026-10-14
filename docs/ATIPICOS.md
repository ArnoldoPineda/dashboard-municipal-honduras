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
| Inversión en bienes capitalizables casi nula | `inversionCasiNula()`: con liquidación, bienes capitalizables ÷ total egresos < 2 % (§8) | 26 |
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

## 8. Inversión en bienes capitalizables casi nula (Fase 6)

**Regla (2026-10-13):** `inversionCasiNula()` marca las filas con liquidación en las que bienes capitalizables ÷ total egresos es menor a 2 %. Es una señal de atípico y no excluye la fila. El rótulo depende de las Asignaciones globales (`rotuloInversionCasiNula()`):
- **Asignaciones globales ≥ 30 % del gasto:** "Inversión en bienes capitalizables casi nula (< 2 % del gasto). El gasto de capital puede estar registrado en Asignaciones globales (X % del gasto) — verificar con la liquidación", donde X es el porcentaje calculado con 1 decimal. En 2025 aplica a Tomalá (48.7 %), Nueva Frontera (61.4 %), Jano (53.3 %) y Texiguat (58.7 %).
- **En otro caso:** "Inversión en bienes capitalizables casi nula (< 2 % del gasto) — verificar con la liquidación". En 2025 aplica a La Unión (15.3 %).

La primera versión usaba "inversión por habitante < L 50"; se cambió al % del gasto porque marcaba como casi nula a Trojes, que invierte L 2.9 M (7 % de su gasto).

Hay 26 filas marcadas en 2021–2025: 7 en 2021, 8 en 2022, 3 en 2023, 3 en 2024 y 5 en 2025. Lectura de `public.municipalities` del 2026-10-13, con la anon key y solo lectura.

| Municipio (2025) | Bienes capitalizables (M L) | % del gasto | Asignaciones globales (M L) | % del gasto | Total egresos (M L) |
|---|---|---|---|---|---|
| Tomalá (Lempira, C) | 0.008 | 0.03 % | 11.703 | 48.7 % | 24.007 |
| Nueva Frontera (Santa Bárbara, C) | 0.014 | 0.04 % | 19.610 | 61.4 % | 31.943 |
| Jano (Olancho, C) | 0.068 | 0.30 % | 12.012 | 53.3 % | 22.521 |
| La Unión (Olancho, C) | 0.231 | 1.17 % | 3.036 | 15.3 % | 19.818 |
| Texiguat (El Paraíso, D) | 0.417 | 1.54 % | 15.931 | 58.7 % | 27.160 |

**Diagnóstico: el problema está en el dato fuente, no en el cálculo.** En todas las filas los renglones cuadran:
- Bienes capitalizables + transferencias de capital + activos financieros + servicio de deuda + otros gastos de capital + asignaciones globales = gastos de capital y deuda.
- Funcionamiento + gastos de capital y deuda = total egresos.

El gasto de capital queda en Asignaciones globales y no en bienes capitalizables, que es el numerador de la inversión de SIMHO. La Unión es distinta: sus asignaciones son bajas (15 %) y su gasto se concentra en funcionamiento (55 %).

**Top 3 de inversión por habitante 2025: el numerador es correcto.**
- Humuya: bienes capitalizables L 16.864 M, 1 557 habitantes, L 10 831 por habitante, 60 % del gasto.
- Yauyupe: L 13.588 M, 1 523 habitantes, L 8 922 por habitante, 50 % del gasto.
- Lauterique: L 23.330 M, 3 252 habitantes, L 7 174 por habitante, 59 % del gasto.

La mediana nacional de inversión ÷ gasto es 28.5 %. El valor por habitante alto se explica por poblaciones muy pequeñas.

**Dónde se muestra:**
- Comparar: ⚠ en el encabezado, en las barras y en los avisos.
- Rankings: marca "atípico" en los indicadores de inversión (por habitante y ÷ gasto). La fila conserva su posición, y la exportación lo indica en la columna Nota.

## 9. Distrito Central — clasificación de Industria/Comercio/Servicios cambia entre años; usar el subtotal (Fase 7c)

Distrito Central (Francisco Morazán, código INE 0801) registra todo su impuesto sobre industria, comercio y servicios en un solo renglón de la liquidación SEFIN, y el renglón cambia entre años:

| Año | Industria | Comercio | Servicios | Subtotal | Renglón usado |
|---|---|---|---|---|---|
| 2021 | L 520.9 M | 0 | 0 | L 520.9 M | Industria |
| 2022 | L 866.0 M | 0 | L 3,210.58 | L 866.0 M | Industria (Servicios: monto mínimo) |
| 2023 | L 880.1 M | 0 | 0 | L 880.1 M | Industria |
| 2024 | L 1,032.3 M | 0 | 0 | L 1,032.3 M | Industria |
| 2025 | 0 | L 1,093.2 M | 0 | L 1,093.2 M | Comercio |

Efecto en el agregado País 2025 (cuadro de Análisis, precios corrientes):
- Industria: −72.5 %.
- Comercio: +101.4 %.
- Subtotal Industria, comercio y servicios: +5.4 %.
- Sin Distrito Central, Industria cambiaría +3.4 % (L 372.9 M a L 385.7 M) y Comercio +6.6 % (L 1,153.0 M a L 1,228.8 M).

**Regla:** para comparar en el tiempo se usa el subtotal Industria, comercio y servicios, no sus tres renglones. El dato no se corrige ni se excluye: SIMHO muestra la cifra tal como la reporta SEFIN.

**Dónde se muestra:** en el cuadro de Análisis aparece ⚠, con un aviso, en las filas Industria, Comercio y Servicios cuando el alcance incluye a Distrito Central. Eso ocurre con el municipio, con Francisco Morazán, con País y con la categoría A.

**Otros municipios con el mismo patrón (revisión 2021–2025):** ninguno. La regla fue: una de las tres filas en 0 un año que el año siguiente concentra al menos el 90 % del subtotal, con subtotal > L 1 M. El resultado no cambia si se exige el subtotal solo en el año siguiente, ni si se acepta "casi 0" (< 1 % del subtotal) en lugar de 0 exacto.

## 10. Asignaciones globales junto a la inversión (Fase 7e)

**Pregunta:** ¿la inversión por habitante (bienes capitalizables ÷ población) subestima la inversión real porque parte del gasto de capital queda en Asignaciones globales? Datos de `public.municipalities` 2021–2025, leídos el 2026-10-14 con la anon key y solo lectura. Se aplicaron las mismas exclusiones que en SIMHO: totales sin las filas sin liquidación; medianas, correlaciones y quintiles sin las filas excluidas de estadísticas (§7).

**Peso nacional:**

| Año | Asignaciones globales (M L) | % del gasto total | % de gastos de capital y deuda | Bienes capitalizables (M L) | Asignaciones ÷ bienes capitalizables |
|---|---|---|---|---|---|
| 2021 | 1,801 | 9.4 % | 14.1 % | 4,770 | 0.38 |
| 2022 | 1,773 | 9.8 % | 15.7 % | 4,013 | 0.44 |
| 2023 | 1,895 | 9.1 % | 14.2 % | 5,496 | 0.34 |
| 2024 | 2,487 | 9.7 % | 14.2 % | 7,084 | 0.35 |
| 2025 | 2,296 | 8.7 % | 12.7 % | 6,390 | 0.36 |

- **Por categoría (2025, mediana / agregado del % del gasto):** A 13.4 % / 3.8 %; B 13.2 % / 15.5 %; C 20.9 % / 19.8 %; D 23.5 % / 22.8 %. El peso está en las categorías C y D; en la A, las ciudades grandes casi no usan este renglón.
- **Distribución 2025 (295 municipios en estadísticas):** 212 con asignaciones ≥ 10 % del gasto, 54 con ≥ 30 % y 7 con ≥ 50 %.
- **Sustitución:** la correlación entre el % de asignaciones globales y el % de bienes capitalizables es de **−0.65** (Pearson y Spearman, 2021–2025 juntos; entre −0.62 y −0.68 en cada año). La suma de los dos porcentajes varía menos entre municipios que cada uno por separado.
- **Escenario "inversión ampliada" 2025** ((bienes capitalizables + asignaciones globales) ÷ población): la mediana nacional pasa de L 635 a L 1,151 por habitante (**+81 %**), y **148 de 295 municipios** cambiarían de quintil en el mapa (65 suben, 83 bajan, 36 saltan dos quintiles o más).

**Decisión (2026-10-14):** (b) fila aparte; (c) inversión ampliada queda pendiente de verificar el contenido de Asignaciones globales con liquidaciones de muestra. El indicador, el mapa y los rankings no cambian.

**Dónde se muestra:**
- Análisis: la fila «Asignaciones Globales» va debajo de «Bienes Capitalizables», al mismo nivel; hereda per cápita, Real, Var. %, crecimiento anual y exportación.
- Ficha Municipal (pestaña Pares): bajo «Inversión por habitante», «Asignaciones globales: X % del gasto (L Y por habitante)». Desde el 30 % del gasto (`UMBRAL_ASIGNACIONES_GLOBALES`, el mismo umbral de §8) se agrega como texto visible, también en celular: "Parte del gasto de capital puede estar registrado en Asignaciones globales; la inversión por habitante podría estar subestimada." Ejemplo: Ahuas 2025, con 47.5 % del gasto y L 2,015 por habitante.
