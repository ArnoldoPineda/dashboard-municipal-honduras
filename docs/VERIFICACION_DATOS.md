# SIMHO — Verificación de datos: Supabase vs. Excel fuente

Fecha: 2026-10-13. Solo lectura.

- **Base:** `public.municipalities`, 2021–2025, leída con la anon key (1 490 filas).
- **Fuente:** `Base_Financiera_Municipal_2002_2025.xlsx`, hojas `2021`–`2025`. Los datos empiezan en la fila 7 y el mapeo de columnas es el de `import_year.py` (`COL_MAP`).
- **Clave de cruce:** departamento + código municipal (`department|code`).
- **Campos comparados:** `presupuesto_municipal` (col. 9), `ingresos_recaudados` (12), `ingresos_tributarios` (16), `ingresos_no_tributarios` (27), `total_egresos` (56) y `population` (7). Tolerancia: L 1.

## Resultado

**Todo coincide.** En los cinco años hay los mismos 298 municipios en la base y en el Excel. No falta ni sobra ninguno, y no hay diferencias mayores de L 1 en ninguno de los seis campos. Las sumas de la base también cuadran con la fila TOTALES de cada hoja (diferencia máxima: L 0.0000).

## 1. Filas por año

| Año | Excel | Supabase | Faltan en Supabase | Sobran en Supabase | Diferencias > L 1 |
|---|---|---|---|---|---|
| 2021 | 298 | 298 | 0 | 0 | 0 |
| 2022 | 298 | 298 | 0 | 0 | 0 |
| 2023 | 298 | 298 | 0 | 0 | 0 |
| 2024 | 298 | 298 | 0 | 0 | 0 |
| 2025 | 298 | 298 | 0 | 0 | 0 |

En 2021 y 2022 el primer conteo dio 299 filas en el Excel. La fila de más eran notas al pie que empiezan con número ("1. Puerto Lempira…", "4. Categoría Municipal…"), no un municipio.

## 2. Totales del Excel (fila TOTALES) vs. suma de Supabase

Montos en millones de lempiras.

| Año | Población | Presupuesto | Ingresos recaudados | Tributarios | No tributarios | Egresos | Diferencia máxima (L) |
|---|---|---|---|---|---|---|---|
| 2021 | 9,480,404 | 19,822.3 | 21,420.6 | 7,178.2 | 2,131.3 | 19,251.0 | 0.0000 |
| 2022 | 9,597,743 | 22,203.9 | 20,931.5 | 8,793.6 | 2,569.2 | 18,154.6 | 0.0000 |
| 2023 | 9,745,140 | 28,386.6 | 23,885.1 | 9,582.6 | 2,241.5 | 20,799.2 | 0.0000 |
| 2024 | 9,892,623 | 31,675.5 | 29,816.5 | 10,659.2 | 3,054.6 | 25,619.6 | 0.0000 |
| 2025 | 10,039,850 | 32,761.6 | 28,990.4 | 11,261.0 | 2,509.0 | 26,428.2 | 0.0000 |

## 3. Lo que la base no conserva del Excel

Las notas al pie de las hojas no se importan. Dicen:

- Rendiciones parciales: Puerto Lempira y Wampusirpe (2021, al tercer trimestre); San Antonio de Flores (2022, al primer trimestre; 2024, al tercer trimestre con datos en cero); Pespire (2025, al primer trimestre). El detalle está en `docs/ATIPICOS.md` §6.
- "Categoría Municipal establecida por la SGJD 2020" (hojas 2021 y 2022).

## 4. Casos de autonomía ≥ 99 %

Las transferencias en 0 de La Ceiba 2022, Santa Fé 2022, Esquipulas del Norte 2024, El Triunfo 2025 y San Juan Guarita 2025 están **igual en el Excel**: la fuente no las trae. Ver `docs/ATIPICOS.md` §5.

## Cómo repetirlo

Leer la tabla con la anon key (REST, paginado de 1 000). Leer las hojas con la librería `xlsx` del proyecto (`node_modules/xlsx`). Cruzar por `department|code` usando `COL_MAP`. Ningún paso escribe en Supabase.
