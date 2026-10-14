// Flujos en la app real (pendientes de la Fase 6).
import { test, expect } from '@playwright/test';
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
