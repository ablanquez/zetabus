/**
 * ⭐ LAS SECCIONES DE LÍNEAS DE LA HOME SON PLEGABLES (<details>/<summary> nativo).
 *
 * Se ata el contrato nuevo:
 *   · abiertas al cargar (no se esconde contenido por defecto);
 *   · el control de plegado es táctil (≥44 px) y de verdad pliega/despliega;
 *   · FUERA el contador "(31)" del rótulo;
 *   · ⚠️ plegar NO rompe el buscador: con una sección plegada, sus líneas siguen
 *     saliendo en la búsqueda (el caso que se olvida — el buscador es independiente
 *     de la rejilla, y esto lo deja clavado).
 */
import { test, expect } from '@playwright/test';

const diurna = '[data-papel="grupo-lineas"][data-grupo="diurna"]';

test.describe('⭐ secciones de líneas plegables en la home', () => {
  test('abierta al cargar, control táctil ≥44 px, y pliega de verdad', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const sec = page.locator(diurna);
    const summary = sec.locator('summary');

    // abierta por defecto
    expect(await sec.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(true);
    await expect(sec.locator('li a').first()).toBeVisible();

    // control táctil ≥44 px (se mide, no se supone)
    const box = (await summary.boundingBox())!;
    expect(box.height, `el control de plegado mide ${Math.round(box.height)} px`).toBeGreaterThanOrEqual(44);

    // pliega de verdad: al pulsar, se cierra y las tarjetas se ocultan
    await summary.click();
    expect(await sec.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
    await expect(sec.locator('li a').first()).toBeHidden();
  });

  test('el rótulo YA NO lleva el contador "(N)"', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const h2 = await page.locator(`${diurna} h2`).textContent();
    expect(h2?.trim()).toBe('Diurnas');
    expect(h2, 'volvió el contador entre paréntesis').not.toMatch(/\(\d+\)/);
  });

  test('⚠️ plegar NO rompe el buscador: una línea de la sección plegada SÍ aparece', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // pliego DIURNAS
    await page.locator(`${diurna} summary`).click();
    expect(await page.locator(diurna).evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);

    // la 21 es diurna; con su sección plegada, el buscador tiene que encontrarla
    await page.locator('#q').fill('21');
    const res = page.locator('a[href="/linea/21"]');
    await expect(res.first(), 'con DIURNAS plegada, el buscador no encuentra la 21').toBeVisible();
  });
});
