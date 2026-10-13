# SIMHO — Plan de rediseño (Fases 0–1)

Objetivo de la Fase 1: cada indicador se calcula en un solo lugar (`src/lib/indicadores.ts`), con una sola fórmula, y todas las páginas muestran las mismas cifras para el mismo municipio y año.

## 1. Fórmulas oficiales

Todas por municipio y año. Los agregados (departamento, nación) suman numeradores y denominadores; además se reporta la mediana municipal.

| Indicador | Fórmula | Columnas `municipalities` |
|---|---|---|
| ingresos_corrientes | G1 tributarios + G2 no tributarios (sin doble conteo de tasas y derechos) | `ingresos_tributarios` + `ingresos_no_tributarios` |
| ingresos_del_año | ingresos_totales − recursos_de_balance − préstamos − colocación_de_bonos | `ingresos_recaudados` − `recursos_balance` − `prestamos` − `colocacion_bonos` |
| autonomia | ingresos_corrientes ÷ ingresos_del_año | |
| dependencia_transferencias | (Art. 91 + otras) ÷ ingresos_del_año | `transferencias_art91` + `otras_transferencias` |
| propios_per_capita | ingresos_corrientes ÷ población | población: ver §3 |
| ibi_per_capita | IBI ÷ población | `impuesto_bi` |
| funcionamiento_sobre_corrientes | gastos_de_funcionamiento ÷ ingresos_corrientes | `gastos_funcionamiento` |
| inversion_sobre_gasto | bienes_capitalizables ÷ total_egresos | `bienes_capitalizables`, `total_egresos` |
| inversion_per_capita | bienes_capitalizables ÷ población | |
| ahorro_corriente | ingresos_corrientes − gastos_de_funcionamiento | |
| servicio_deuda_sobre_corrientes | servicio_de_deuda ÷ ingresos_corrientes | `servicios_deuda` |
| saldo_deuda_sobre_corrientes | saldo_de_deuda ÷ ingresos_corrientes | **No disponible**: la base no trae saldo |
| balance_sobre_ingresos | recursos_de_balance ÷ ingresos_totales | |
| resultado_con_balance | ingresos_totales − total_egresos | |
| resultado_sin_balance | ingresos_del_año − total_egresos | |
| ejecucion | total_egresos ÷ presupuesto_vigente | **No hay vigente**: se usa `presupuesto_municipal` (aprobado), rotulado "vs. presupuesto aprobado" |

## 2. Caso de prueba — Siguatepeque (Comayagua, 03-18), 2025

Insumos (millones de lempiras): ingresos_totales 303.0; recursos_de_balance 106.7; préstamos 0; G1 134.3 (incluye Tasas 34.7 y Derechos 39.8); G2 13.9; Art. 91 25.6; IBI 12.3; población 122 477; funcionamiento 83.5; bienes_capitalizables 98.9; servicio_deuda 5.7; total_egresos 208.5; presupuesto aprobado 198.7.

| Resultado esperado | Valor |
|---|---|
| ingresos_corrientes | 148.2 |
| ingresos_del_año | 196.3 |
| autonomía | 75.5 % |
| dependencia | 13.0 % |
| propios_pc | L 1 210 |
| ibi_pc | L 100 |
| inversion_pc | L 808 |
| funcionamiento/corrientes | 56.3 % |
| inversión/gasto | 47.4 % |
| servicio deuda/corrientes | 3.8 % |
| ahorro_corriente | 64.7 |
| balance/ingresos | 35.2 % |
| resultado_con_balance | +94.5 |
| resultado_sin_balance | −12.2 |

Tolerancia de las pruebas: ±0.1 en la unidad mostrada.

Verificado contra la fila real de Supabase (2026-10-13): todos los insumos coinciden.

## 3. Decisiones de datos pendientes de aprobación

1. **Población**: fuente objetivo INE – Proyecciones 2013–2050 (base Censo 2013). No está en el repo → `[PENDIENTE]` CSV del INE. Mientras tanto: `population` SEFIN, rotulada "provisional".
2. **Categoría**: usar la columna SEFIN `category` (o la tabla `categoria_municipal` que la reemplace). Criterio y fuente oficial `[PENDIENTE]`.
3. **Años**: la base tiene 2021–2025. El Excel trae 2019–2020; importarlos requiere escritura en Supabase (aprobación aparte).
4. **Saldo de deuda y presupuesto vigente**: no existen; el indicador de saldo queda fuera y la ejecución se rotula contra el aprobado.

## 4. Fase 1 — pasos

6. `src/lib/indicadores.ts` + pruebas (Siguatepeque 2025).
7. Población: tabla `poblacion` + script CSV (SQL a aprobar).
8. Categorías: tabla `categoria_municipal` (SQL a aprobar).
9. Reemplazo de cálculos locales en todas las páginas; bugs 4 y 5.
10. Tasas y Derechos: sin doble conteo; jerarquía en Análisis.
11. Atípicos → `docs/ATIPICOS.md`.
12. Rango de años único.
