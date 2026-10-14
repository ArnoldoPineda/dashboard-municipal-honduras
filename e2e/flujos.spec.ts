// Flujos en la app real (pendientes de la Fase 6).
import { test, expect } from '@playwright/test';
import fs from 'fs';
import { abrir } from './rutas';

const PRECIOS = 'Precios constantes de 2025';

test('pie de fuente: rótulo de precios constantes con Real, sin él con Nominal y al salir de Análisis', async ({ page }) => {
  await abrir(page, '/analisis');
  const pie = page.locator('footer');
  const precios = page.getByRole('group', { name: 'Precios' });
  await expect(pie).not.toContainText(PRECIOS);
  await precios.getByRole('button', { name: 'Real' }).click();
  await expect(pie).toContainText(PRECIOS);
  await precios.getByRole('button', { name: 'Nominal' }).click();
  await expect(pie).not.toContainText(PRECIOS);
  await precios.getByRole('button', { name: 'Real' }).click();
  await expect(pie).toContainText(PRECIOS);
  await page.getByRole('link', { name: 'Rankings' }).click();
  await expect(page).toHaveURL(/\/rankings$/);
  await expect(page.locator('footer')).not.toContainText(PRECIOS);
});

test('Comparar: un ?municipio= nuevo se lee estando ya en la página (sin duplicar)', async ({ page }) => {
  await abrir(page, '/comparativos?municipio=0801');
  const elegidos = page.getByRole('region', { name: 'Municipios a comparar' }).getByRole('listitem');
  await expect(elegidos).toHaveCount(1);
  // Navegación del router (como un enlace desde otra Ficha) sin recargar la página.
  const ir = (q: string) => page.evaluate((url) => { window.history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate')); }, q);
  await ir('/comparativos?municipio=0501');
  await expect(elegidos).toHaveCount(2);
  await expect(elegidos.nth(1)).toContainText('San Pedro Sula');
  await ir('/comparativos?municipio=0801');
  await expect(elegidos).toHaveCount(2);
});

// Cuadro de Análisis de un municipio + su CSV exportado (todas las filas, incluidas las ocultas en 0).
async function cuadroDe(page: import('@playwright/test').Page, municipio: string) {
  await abrir(page, '/analisis');
  await page.getByRole('group', { name: 'Alcance' }).getByRole('button', { name: 'Municipio' }).click();
  await page.getByRole('combobox').fill(municipio);
  await page.getByRole('option', { name: new RegExp(municipio) }).first().click();
  await page.waitForFunction(() => !/Cargando/.test(document.body.innerText));
  const cuadro = page.getByRole('region', { name: 'Cuadro presupuestario' });
  const conceptos = (await cuadro.getByRole('rowheader').allInnerTexts()).map((t) => t.replace(/ /g, ' ').trim());
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV' }).click()]);
  const csv = fs.readFileSync((await descarga.path())!, 'utf8').replace(/^\uFEFF/, '');
  const lineas = csv.split(/\r?\n/).map((l) => l.split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '')));
  const cab = lineas.find((l) => l.some((c) => c.trim() === '2021'))!;
  const valor = (concepto: string, anio: number) => {
    const fila = lineas.find((l) => l.some((c) => c.trim() === concepto));
    if (!fila) throw new Error(`Sin fila en el CSV: ${concepto}`);
    return Math.round(Number(fila[cab.findIndex((c) => c.trim() === String(anio))].replace(/[^\d.-]/g, '')) || 0);
  };
  return { cuadro, conceptos, valor };
}

test('Análisis: Siguatepeque — G1 con los 8 impuestos desglosados (Pecuario oculto en pantalla, presente en el CSV)', async ({ page }) => {
  const { cuadro, conceptos, valor } = await cuadroDe(page, 'Siguatepeque');
  const iG1 = conceptos.indexOf('↳ Ingresos Tributarios (G1)');
  expect(conceptos.slice(iG1, iG1 + 13)).toEqual([
    '↳ Ingresos Tributarios (G1)', '↳ de los cuales: Impuestos', '↳ IBI (bienes inmuebles)', '↳ Industria, comercio y servicios',
    '↳ Industria', '↳ Comercio', '↳ Servicios', '↳ Personal o vecinal', '↳ Telecomunicaciones', '↳ Extracción o explotación de recursos',
    '↳ de los cuales: Tasas por Servicios', '↳ de los cuales: Derechos', '↳ Ingresos No Tributarios (G2)',
  ]);
  expect(conceptos).not.toContain('↳ Pecuario');
  await expect(cuadro.getByText('Se ocultan impuestos sin recaudación en los años mostrados.')).toBeVisible();

  const esperado: Record<number, Record<string, number>> = {
    2021: { 'IBI (bienes inmuebles)': 4815328, 'Personal o vecinal': 1773151, Industria: 4216775, Comercio: 9358377, Servicios: 8804318,
      'Extracción o explotación de recursos': 77353, Telecomunicaciones: 1751795, Pecuario: 0 },
    2022: { 'IBI (bienes inmuebles)': 10519206, 'Personal o vecinal': 2531045, Industria: 5101116, Comercio: 12796753, Servicios: 11767588,
      'Extracción o explotación de recursos': 104299, Telecomunicaciones: 2746749, Pecuario: 0 },
  };
  for (const [anio, filas] of Object.entries(esperado)) {
    for (const [concepto, v] of Object.entries(filas)) expect([anio, concepto, valor(`↳ ${concepto}`, Number(anio))]).toEqual([anio, concepto, v]);
    const y = Number(anio);
    expect(valor('↳ Industria, comercio y servicios', y)).toBe(filas.Industria + filas.Comercio + filas.Servicios);
    expect(Math.abs(valor('↳ de los cuales: Impuestos', y) - Object.values(filas).reduce((a, b) => a + b, 0))).toBeLessThanOrEqual(1);
  }
  expect(valor('↳ de los cuales: Impuestos', 2021)).toBe(30797096);
  await cuadro.screenshot({ path: test.info().outputPath('cuadro-siguatepeque.png') });
});
