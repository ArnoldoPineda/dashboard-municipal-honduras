# SIMHO — Plan de rediseño (Fases 0–6)

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
| ingresos_del_año | 196.2 |
| autonomía | 75.5 % |
| dependencia | 13.0 % |
| propios_pc | L 1 210 |
| ibi_pc | L 100 |
| inversion_pc | L 807 |
| funcionamiento/corrientes | 56.4 % |
| inversión/gasto | 47.4 % |
| servicio deuda/corrientes | 3.9 % |
| ahorro_corriente | 64.7 |
| balance/ingresos | 35.2 % |
| resultado_con_balance | +94.5 |
| resultado_sin_balance | −12.2 |
| ejecución (vs. aprobado) | 104.9 % |

Tolerancia de las pruebas: ±0.1 en la unidad mostrada.

Verificado contra la fila real de Supabase (2026-10-13): todos los insumos coinciden. Los valores esperados se calculan con la fila exacta (fijada en `src/lib/indicadores.test.ts`); con los insumos redondeados de arriba, cuatro cifras cambian en el último dígito.

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

## 5. Pendientes para la Fase 2

- ~~**Regla de "dato incompleto"**~~ → hecho en la Fase 2: `sinArt91()` (Art. 91 + otras = 0, corrientes > 0). Juticalpa 2025 no entra (tiene Art. 91 por L 2.06 M). Ver `ATIPICOS.md` §5.
- Código no enrutado (inventario §1.2): `Dashboard.tsx`, `Dashboard_MEJORADO.tsx` y similares, que todavía tienen años fijos y fórmulas antiguas.
- `RENDICION_PARCIAL` es una lista fija: actualizarla con las notas al pie del Excel en cada importación.

## 6. Fase 6 — Comparar y Rankings ✅ completada (2026-10-14, PR #7, merge `3d91f55`)

- `rankear()`, `contarExcluidos()`, `paresSugeridos()` y `motivoExcluido()` en `src/lib/indicadores.ts` (sin fórmulas nuevas). Pruebas: `rankings.test.ts` y `rankings.bordes.test.ts`.
- **Comparar** (`/comparativos`): hasta 5 municipios. La tabla muestra valor, percentil en su categoría y semáforo, con una columna "Mediana cat. X" por cada categoría presente. Debajo van barras por indicador con la línea de mediana. La ejecución va "sin dirección" (no está en `SEMAFORO`). El ahorro corriente y el resultado sin balance van solo aquí. Se eliminó el modo Departamentos, que ahora remite a Panorama Nacional.
- **Rankings** (`/rankings`): solo indicadores per cápita y razones; los montos absolutos no se rankean. La posición se cuenta dentro del filtro y el percentil en la categoría completa. Los excluidos (`excluirDeRazones`) van al final con ⚠ y sin posición. El ordenar por columna solo cambia la vista.
- Verificación 2025: 295 rankeados en autonomía y 3 ⚠ (Pespire sin liquidación; El Triunfo y San Juan Guarita sin Art. 91). Siguatepeque tiene P65 y la mediana de la categoría A es 68.3 %, igual que en la Ficha.

- Atípico de inversión: bienes capitalizables por debajo del 2 % del gasto total. La fila se marca pero no se excluye. Si las Asignaciones globales son ≥ 30 % del gasto, el rótulo las nombra con su %. Hay 26 filas en 2021–2025 y 5 en 2025 (`ATIPICOS.md` §8).

## 7. Fase 5b — Modo "Real" con IPC del BCH ✅ completada (2026-10-14, PR #8, merge `41c2770`)

- `src/data/ipc.ts`: IPC promedio anual del BCH 2021–2025 (77.12 / 84.13 / 89.74 / 93.87 / 98.18), base dic-2025 = 100. Fuente: `docs/fuentes/IPC_BCH_serie_mensual_promedio_anual.xlsx` (ignorado por git).
- Análisis, toggle "Real":
  - Precios constantes de 2025: monto × IPC2025 ÷ IPCaño. El año base es fijo.
  - Solo se deflactan los montos y los valores per cápita; las razones no.
  - Rótulos:
    - Pie de fuente: "Precios constantes de 2025 — IPC promedio anual BCH (dic-2025 = 100)".
    - Títulos de los gráficos de montos: "(precios constantes 2025)".
- Verificación, presupuesto País real 2021–2025 (mil M): 25.2 / 25.9 / 31.0 / 33.1 / 32.7. El factor de 2021 es 1.2731.

## 8. Pendientes menores para la Fase 7

- El texto "2 %" del atípico de inversión está escrito a mano en `indicadores.ts` y `RankingsPage.tsx`; debe salir de `UMBRAL_INVERSION_GASTO`.
- Color fijo fuera de la paleta: `#1a1610` (fondo de las filas ⚠ en Rankings) debe pasar a `C` en `components/ficha/estilo.ts`.
- `?municipio=` en Comparar se lee solo al montar la página: si ya estás en `/comparativos`, un nuevo parámetro no se vuelve a leer.
- Falta una prueba de render del pie de fuente: que aparezca el rótulo de precios constantes con "Real" y que desaparezca al volver a "Nominal" o al salir de Análisis.
