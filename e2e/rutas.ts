import type { Page } from '@playwright/test';

export const RUTAS: [string, string][] = [
  ['mapa', '/'],
  ['departamento', '/departamento/francisco-morazan'],
  ['panorama', '/dashboard'],
  ['ficha', '/municipio/francisco-morazan/1'],
  ['base-datos', '/base-datos'],
  ['analisis', '/analisis'],
  ['comparar', '/comparativos?municipio=0801'],
  ['rankings', '/rankings'],
];

/** Abre la ruta y espera a que terminen los datos (sin "Cargando…"), las fuentes y la animación de entrada. */
export async function abrir(page: Page, ruta: string) {
  await page.goto(ruta);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !/Cargando/.test(document.body.innerText), null, { timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
}
