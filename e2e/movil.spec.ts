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
  // Tocar la página en la que ya estás también cierra el menú y devuelve el foco al ☰.
  const boton = page.getByRole('button', { name: 'Abrir menú' });
  await boton.click();
  await menu.getByRole('link', { name: 'Rankings' }).click();
  await expect(menu).toBeHidden();
  await expect(boton).toBeFocused();
  // Objetivos táctiles de al menos 44 px en el drawer.
  await boton.click();
  for (const alto of await menu.getByRole('link').evaluateAll((ls) => ls.map((l) => l.getBoundingClientRect().height))) {
    expect(alto).toBeGreaterThanOrEqual(44);
  }
});

for (const [nombre, ruta] of RUTAS.filter(([n]) => ['rankings', 'base-datos', 'ficha', 'departamento', 'mapa'].includes(n))) {
  test(`390 px: el pie de fuente va al final del contenido, sin tapar nada: ${nombre}`, async ({ page }) => {
    await abrir(page, ruta);
    const pie = page.locator('footer.pie-fuente');
    const medida = () => page.evaluate(() => {
      const main = document.querySelector('main')!;
      const f = main.querySelector('footer.pie-fuente')!;
      const contenido = f.previousElementSibling!;
      return { pieArriba: f.getBoundingClientRect().top, contenidoAbajo: contenido.getBoundingClientRect().bottom,
        alto: window.innerHeight, scrollMain: main.scrollHeight > main.clientHeight, scrollPagina: contenido.scrollHeight > contenido.clientHeight + 1 };
    });
    const arriba = await medida();
    expect(arriba.scrollMain).toBe(true);          // main es quien se desplaza
    expect(arriba.scrollPagina).toBe(false);       // la página ya no tiene scroll propio
    expect(arriba.pieArriba).toBeGreaterThanOrEqual(arriba.alto); // al inicio el pie no está en pantalla
    await page.evaluate(() => { const m = document.querySelector('main')!; m.scrollTop = m.scrollHeight; });
    await expect(pie).toBeInViewport();
    const abajo = await medida();
    expect(abajo.pieArriba).toBeGreaterThanOrEqual(abajo.contenidoAbajo - 0.5); // después del contenido, sin superponerse
  });
}
