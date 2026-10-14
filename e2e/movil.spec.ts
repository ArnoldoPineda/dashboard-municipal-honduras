// Versión para celular (390 px): ningún contenido más ancho que la pantalla.
// Las tablas con scroll horizontal intencional (.tabla-scroll) cuentan por su caja, no por su interior.
import { test, expect } from '@playwright/test';
import { RUTAS, abrir } from './rutas';

const ANCHO = 390;
test.use({ viewport: { width: ANCHO, height: 844 }, isMobile: true, hasTouch: true });

const medir = () => {
  let max = 0;
  const desbordes: string[] = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('.tabla-scroll') !== el && el.closest('.tabla-scroll')) return;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    max = Math.max(max, r.right);
    // Scroll horizontal fuera de las tablas: cualquier contenedor más ancho por dentro que por fuera.
    // (Se ignoran los textos recortados con elipsis y los rótulos solo para lectores de pantalla, de 1 px.)
    const cs = getComputedStyle(el);
    if (!el.classList.contains('tabla-scroll') && cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis'
      && el.clientWidth > 1 && el.scrollWidth > el.clientWidth + 1) {
      desbordes.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} ${el.scrollWidth}>${el.clientWidth}`);
    }
  });
  return { max: Math.round(max), desbordes };
};

for (const [nombre, ruta] of RUTAS) {
  test(`390 px sin desborde: ${nombre}`, async ({ page }, info) => {
    await abrir(page, ruta);
    const { max, desbordes } = await page.evaluate(medir);
    info.annotations.push({ type: 'ancho', description: `${nombre} ${max}` });
    console.log(`ANCHO ${nombre} ${max}`);
    expect(desbordes).toEqual([]);
    expect(max).toBeLessThanOrEqual(ANCHO);
  });
}

test('390 px: el menú ☰ abre el drawer con los nombres completos', async ({ page }) => {
  await abrir(page, '/');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const menu = page.getByRole('dialog', { name: 'Navegación' });
  await expect(menu.getByRole('link', { name: 'Panorama Nacional' })).toBeVisible();
  await menu.getByRole('link', { name: 'Rankings' }).click();
  await expect(page).toHaveURL(/\/rankings$/);
  await expect(menu).toBeHidden();
});
