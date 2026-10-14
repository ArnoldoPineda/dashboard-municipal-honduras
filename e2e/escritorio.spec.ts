// La vista de escritorio (1280 px) no cambia con la versión para celular.
// Línea base generada desde main (ca0e6f2) con `npm run e2e -- --update-snapshots escritorio`.
import { test, expect } from '@playwright/test';
import { RUTAS, abrir } from './rutas';

test.use({ viewport: { width: 1280, height: 900 } });

for (const [nombre, ruta] of RUTAS) {
  test(`escritorio sin cambios: ${nombre}`, async ({ page }) => {
    await abrir(page, ruta);
    await expect(page).toHaveScreenshot(`${nombre}.png`);
  });
}
