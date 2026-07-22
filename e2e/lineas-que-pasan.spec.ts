/**
 * ⭐ "LÍNEAS QUE PASAN POR ESTA PARADA" — el camino de vuelta de la pantalla de
 * parada (la marca solo va al home). Se retiró la flecha; esto la sustituye, mejor:
 * lleva a CUALQUIER línea que sirve la parada, con su destino, no solo a la de
 * procedencia. Se verifica en el navegador, a tamaño real.
 *
 * ⚠️ `?fingir=` para no pedir nada a Avanza.
 */
import { test, expect, type Page } from '@playwright/test';

const seccion = (p: Page) => p.locator('[data-papel="lineas-que-pasan"]');
const filas = (p: Page) => p.locator('[data-papel="linea-que-pasa"]');

test.describe('⭐ las líneas que pasan por la parada, con su sentido', () => {
  test('el rótulo dice "habitualmente" (dato oficial, no la ruta de hoy)', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-verificar', { waitUntil: 'networkidle' });
    await expect(seccion(page)).toBeVisible();
    // El matiz NO es adorno: es ruta oficial, y una línea desviada hoy podría no
    // pasar. Si esta palabra desaparece, la sección empieza a poder mentir.
    await expect(seccion(page).locator('h2')).toContainText(/habitualmente/i);
  });

  test('una línea en LOS DOS sentidos → dos entradas, dos destinos, dos enlaces', async ({ page }) => {
    // poste 15: la 36 pasa en los dos sentidos.
    await page.goto('/parada/15?fingir=sin-verificar', { waitUntil: 'networkidle' });
    const del36 = filas(page).filter({ has: page.locator('[data-linea="36"]') });
    await expect(del36).toHaveCount(2);
    const hrefs = await del36.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    // dos sentidos distintos, no uno repetido ni uno inventado
    expect(hrefs.some((h) => /[?&]sentido=0(\b|&)/.test(h!))).toBe(true);
    expect(hrefs.some((h) => /[?&]sentido=1(\b|&)/.test(h!))).toBe(true);
    // y destinos distintos en el texto
    const textos = await del36.evaluateAll((els) => els.map((e) => e.textContent?.replace(/\s+/g, ' ').trim()));
    expect(textos[0]).not.toBe(textos[1]);
  });

  test('una CIRCULAR → un enlace PELADO, sin sentido inventado', async ({ page }) => {
    // poste 20: la 30 es circular.
    await page.goto('/parada/20?fingir=sin-verificar', { waitUntil: 'networkidle' });
    const del30 = filas(page).filter({ has: page.locator('[data-linea="30"]') });
    await expect(del30).toHaveCount(1);
    const href = await del30.getAttribute('href');
    expect(href, 'la circular NO debe llevar ?sentido=').not.toMatch(/sentido=/);
    expect(href).toMatch(/\/linea\/30(\?|$)/);
    await expect(del30).toContainText(/circular/i);
  });

  test('cada entrada es táctil (≥44 px de alto). Se mide, no se supone', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-verificar', { waitUntil: 'networkidle' });
    const n = await filas(page).count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const box = (await filas(page).nth(i).boundingBox())!;
      expect(box.height, `la entrada ${i} mide ${Math.round(box.height)} px`).toBeGreaterThanOrEqual(44);
    }
  });

  test('va DEBAJO de las llegadas: no le roba sitio al primer minuto', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-verificar', { waitUntil: 'networkidle' });
    const yLlegada = (await page.locator('[data-papel="llegada"]').first().boundingBox())!.y;
    const ySeccion = (await seccion(page).boundingBox())!.y;
    expect(ySeccion, 'la sección debe caer por debajo de la primera llegada').toBeGreaterThan(yLlegada);
  });
});
