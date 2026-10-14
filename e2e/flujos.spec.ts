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

test('Análisis: G1 de Siguatepeque 2021 desglosado en Impuestos (con IBI), Tasas y Derechos', async ({ page }) => {
  await abrir(page, '/analisis');
  await page.getByRole('group', { name: 'Alcance' }).getByRole('button', { name: 'Municipio' }).click();
  await page.getByRole('combobox').fill('Siguatepeque');
  await page.getByRole('option', { name: /Siguatepeque/ }).first().click();
  await page.waitForFunction(() => !/Cargando/.test(document.body.innerText));
  const cuadro = page.getByRole('region', { name: 'Cuadro presupuestario' });
  const anios = await cuadro.locator('thead th').allInnerTexts();
  const col = anios.findIndex((t) => t.trim().startsWith('2021'));
  expect(col).toBeGreaterThan(0);
  const celda = (concepto: string) => cuadro.locator('tbody tr', { has: page.getByRole('rowheader', { name: concepto, exact: true }) }).locator('th, td').nth(col);
  const nb = ' ';
  const filas = await cuadro.getByRole('rowheader').allInnerTexts();
  const iG1 = filas.findIndex((t) => t.includes('Ingresos Tributarios (G1)'));
  expect(filas.slice(iG1, iG1 + 5).map((t) => t.replace(/ /g, ' ').trim())).toEqual([
    '↳ Ingresos Tributarios (G1)', '↳ de los cuales: Impuestos', '↳ IBI (bienes inmuebles)', '↳ de los cuales: Tasas por Servicios', '↳ de los cuales: Derechos',
  ]);
  // En pantalla los montos van abreviados (fmtL); la cifra exacta se verifica en el CSV exportado.
  await expect(celda(`${nb.repeat(4)}↳ de los cuales: Impuestos`)).toHaveText('L 30.8 M');
  await expect(celda(`${nb.repeat(8)}↳ IBI (bienes inmuebles)`)).toHaveText('L 4.8 M');
  await cuadro.screenshot({ path: test.info().outputPath('cuadro-siguatepeque.png') });
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV' }).click()]);
  const csv = fs.readFileSync((await descarga.path())!, 'utf8').replace(/^\uFEFF/, '');
  const lineas = csv.split(/\r?\n/).map((l) => l.split(/[;,](?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '')));
  const cab = lineas.find((l) => l.some((c) => c.trim() === '2021'))!;
  const i2021 = cab.findIndex((c) => c.trim() === '2021');
  const valor = (concepto: string) => Number(lineas.find((l) => l.some((c) => c.trim() === concepto))![i2021].replace(/[^\d.-]/g, ''));
  expect(Math.round(valor('↳ de los cuales: Impuestos'))).toBe(30797096);
  expect(Math.round(valor('↳ IBI (bienes inmuebles)'))).toBe(4815328);
});
