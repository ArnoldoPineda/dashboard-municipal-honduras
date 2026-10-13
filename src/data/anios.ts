// Rango único de años con datos SEFIN en Supabase (`municipalities`).
// 2019–2020 están en el Excel pero no importados (docs/PLAN_REDISENO.md §3.3).
export const ANIOS_SEFIN = [2021, 2022, 2023, 2024, 2025];
export const RANGO_ANIOS = `${ANIOS_SEFIN[0]}–${ANIOS_SEFIN[ANIOS_SEFIN.length - 1]}`;
