# SIMHO — Datos atípicos (Fase 1, paso 11)

Fuente: `public.municipalities`, 2021–2025 (1 490 filas), leída el 2026-10-13 con la anon key, solo lectura.
Reglas: `atipicos()` en `src/lib/indicadores.ts`. Una señal no corrige ni excluye la fila; solo marca qué revisar contra la liquidación SEFIN.

## 1. Catálogo de reglas

| Regla | Criterio | Filas 2021–2025 |
|---|---|---|
| Ingresos corrientes negativos | G1 + G2 < 0 | 0 |
| Ingresos corrientes en cero | G1 + G2 = 0 con ingresos totales > 0 | 4 |
| Ingresos del año ≤ 0 | totales − balance − préstamos − bonos ≤ 0, con totales > 0 | 3 |
| Autonomía > 100 % | corrientes > ingresos del año | 0 |
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

Efecto en SIMHO: autonomía 0 % o vacía, resultado ≈ 0, y la fila entra en los agregados departamentales y nacionales como si hubiera reportado. Decisión pendiente: `[PENDIENTE]` excluir estas filas de agregados y medianas, o mostrarlas con la etiqueta "sin liquidación".

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

Lectura probable: la base trae solo el presupuesto **aprobado**; las ampliaciones del año (transferencias extraordinarias, donaciones, recursos de balance incorporados) no están. Por eso la ejecución se rotula "vs. presupuesto aprobado". La Unión (Lempira) se repite cuatro años seguidos.

Otro caso para revisar fuera de reglas: Las Vegas (Santa Bárbara) 2021 tiene tributarios por L 9.2 M y no tributarios por L 47.4 M.

## 4. Siguatepeque 2025

Sin señales.
