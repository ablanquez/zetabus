/**
 * ⭐ LA NAVEGACIÓN DE VUELTA. Se recorren los caminos DE VERDAD (clicks reales):
 *   · desde el itinerario de una línea → la parada vuelve a ESA línea;
 *   · desde el buscador / un enlace directo → la parada vuelve a la HOME;
 *   · la vista de línea → una flecha nueva a la HOME.
 * La flecha lo resuelve con `?desde=<línea>`: si la línea existe, vuelve a ella; si no
 * (sin parámetro, o inválido), a la home. Y el objetivo táctil es de 44 px.
 */
import { test, expect, type Page } from '@playwright/test';

const flecha = (p: Page) => p.locator('[data-papel="volver"]');

test.describe('⭐ la flecha de volver sabe de dónde vienes', () => {
  test('LÍNEA → la flecha nueva vuelve a la HOME (44 px, y lo dice)', async ({ page }) => {
    await page.goto('/linea/38?fingir=caido', { waitUntil: 'networkidle' });
    await expect(flecha(page)).toHaveAttribute('href', '/');
    await expect(flecha(page)).toHaveAttribute('aria-label', 'Volver al inicio');
    const caja = await flecha(page).evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    expect(caja.w, 'objetivo táctil 44 px').toBeGreaterThanOrEqual(44);
    expect(caja.h).toBeGreaterThanOrEqual(44);
  });

  test('ITINERARIO → PARADA → la flecha vuelve a LA LÍNEA (con su fingir)', async ({ page }) => {
    await page.goto('/linea/38?fingir=caido', { waitUntil: 'networkidle' });
    // El enlace lleva el `?desde=38` que hace posible el regreso.
    const primera = page.locator('[data-papel="ir-a-parada"]').first();
    await expect(primera).toHaveAttribute('href', /desde=38/);
    await Promise.all([page.waitForURL('**/parada/**'), primera.click()]);

    await expect(flecha(page)).toHaveAttribute('href', '/linea/38?fingir=caido');
    await expect(flecha(page)).toHaveAttribute('aria-label', 'Volver a la línea 38');
  });

  test('BUSCADOR → PARADA → la flecha vuelve a la HOME (no vienes de una línea)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('searchbox').fill('744');
    const resultado = page.locator('ul li a', { hasText: 'San Miguel' }).first();
    await Promise.all([page.waitForURL('**/parada/**'), resultado.click()]);

    expect(new URL(page.url()).searchParams.has('desde'), 'el buscador NO pasa desde').toBe(false);
    await expect(flecha(page)).toHaveAttribute('href', '/');
    await expect(flecha(page)).toHaveAttribute('aria-label', /buscar otra parada/i);
  });

  test('ENLACE DIRECTO a una parada → la flecha vuelve a la HOME', async ({ page }) => {
    await page.goto('/parada/744?fingir=caido', { waitUntil: 'networkidle' });
    await expect(flecha(page)).toHaveAttribute('href', '/');
  });

  test('⚠️ ?desde INVÁLIDO no revienta ni enseña una línea que no existe: cae a la HOME', async ({ page }) => {
    for (const desde of ['999', 'abc']) {
      const res = await page.goto(`/parada/744?desde=${desde}`, { waitUntil: 'networkidle' });
      expect(res?.status(), `/parada/744?desde=${desde} debe seguir sirviendo la parada`).toBe(200);
      await expect(flecha(page), `?desde=${desde} → home`).toHaveAttribute('href', '/');
      await expect(flecha(page)).toHaveAttribute('aria-label', /buscar otra parada/i);
    }
  });

  test('?desde=<línea válida> → la flecha vuelve a esa línea', async ({ page }) => {
    await page.goto('/parada/744?desde=21', { waitUntil: 'networkidle' });
    await expect(flecha(page)).toHaveAttribute('href', '/linea/21');
    await expect(flecha(page)).toHaveAttribute('aria-label', 'Volver a la línea 21');
  });
});
