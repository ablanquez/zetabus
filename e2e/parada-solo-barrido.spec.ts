/**
 * ⭐⭐ LAS 9 PARADAS SOLO-BARRIDO, VISITABLES — EN UN NAVEGADOR DE VERDAD.
 *
 * La Tanda B hace que las 9 dejen de dar 404 y muestren página completa. Aquí se
 * comprueba en el navegador (los Server Components async solo se prueban así):
 *
 *   · /parada/617 → 200, con procedencia avanza-web (NO el aviso "sin confirmar"),
 *     su mapa, y SIN la caja sólida de normales; su zona de líneas dice algo honesto
 *     (la caja punteada de desvío, o la nota tenue si hoy no consta);
 *   · /parada/99999 → sigue 404 (la frontera no se abrió de más);
 *   · /parada/744 (GTFS) → intacta (regresión): su caja sólida "Líneas que pasan".
 *
 * ⚠️ ESTE SPEC ES INDEPENDIENTE DEL ÍNDICE. El índice (`data/generated/…`) es raspado
 *    y gitignorado: en CI NO existe, y aun existiendo, que el 617 tenga un desvío HOY
 *    es dato del día. Así que NO se afirma "la línea 34" ni "Parque de Atracciones"
 *    (los dos dependen del índice): se afirma lo que es cierto SIEMPRE —el 200, la
 *    procedencia, el mapa, y que la zona de líneas dice UNA de las dos cosas honestas—.
 *    Un test que solo pasa con el índice de un día concreto no es un test.
 */
import { test, expect } from '@playwright/test';

test.describe('⭐ parada solo-barrido · visitable y honesta', () => {
  test('/parada/617 → 200, procedencia avanza-web, mapa, sin aviso ni caja sólida', async ({ page }) => {
    const res = await page.goto('/parada/617?fingir=sin-buses', { waitUntil: 'domcontentloaded' });
    expect(res?.status(), '617 debe ser visitable').toBe(200);

    // ⭐ La procedencia del nombre es SIEMPRE avanza-web para una solo-barrido (la fija
    //    la clase, no el índice): por eso el aviso "nombre sin confirmar" NO aplica.
    const h1 = page.locator('[data-papel="nombre-parada"]');
    await expect(h1).toHaveAttribute('data-nombre-fuente', 'avanza-web');
    await expect(h1).toContainText('617'); // el chip del poste, siempre
    await expect(page.locator('[data-papel="nombre-sin-confirmar"]')).toHaveCount(0);

    // ⛔ NO hay caja sólida "Líneas que pasan por aquí": una solo-barrido no tiene normales.
    await expect(page.locator('[data-papel="lineas-que-pasan"]')).toHaveCount(0);

    // La zona de líneas dice UNA de las dos cosas honestas: la caja punteada de desvío
    // (con índice y desvío hoy) o la nota tenue (degradado / sin desvío hoy).
    const zonaDesvio = page.locator(
      '[data-papel="provisionales-que-pasan"], [data-papel="solo-barrido-sin-desvio"]',
    );
    await expect(zonaDesvio).toHaveCount(1);

    // El mapa (su zona existe: el poste tiene coordenada, del fichero o del feed).
    await expect(page.locator('.zona-mapa')).toHaveCount(1);

    await page.screenshot({ path: test.info().outputPath('parada-617.png') });
  });

  test('/parada/617?fingir=mapa → las llegadas en vivo se pintan (mismo canal que una GTFS)', async ({ page }) => {
    await page.goto('/parada/617?fingir=mapa', { waitUntil: 'domcontentloaded' });
    // El feed responde por código de poste: la lista de llegadas se pinta igual que en una GTFS.
    await expect(page.locator('[data-papel="lista-llegadas"]')).toBeVisible();
  });

  test('⛔ /parada/99999 → sigue 404 (la frontera no se abrió de más)', async ({ page }) => {
    const res = await page.goto('/parada/99999', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(404);
    await expect(page.locator('[data-papel="volver-al-indice"]')).toBeVisible();
  });

  test('⭐ REGRESIÓN · /parada/744 (GTFS) sigue con su caja sólida "Líneas que pasan"', async ({ page }) => {
    const res = await page.goto('/parada/744?fingir=sin-buses', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
    // La GTFS conserva su caja sólida de normales (del índice o del GTFS en degradado).
    await expect(page.locator('[data-papel="lineas-que-pasan"]')).toBeVisible();
    // Y no lleva la nota de solo-barrido.
    await expect(page.locator('[data-papel="solo-barrido-sin-desvio"]')).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath('parada-744-gtfs.png') });
  });
});
