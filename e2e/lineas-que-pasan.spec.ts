/**
 * ⭐ "LÍNEAS QUE PASAN POR ESTA PARADA" — el camino de vuelta de la pantalla de
 * parada (la marca solo va al home). Se retiró la flecha; esto la sustituye, mejor:
 * lleva a CUALQUIER línea que sirve la parada, con su destino, no solo a la de
 * procedencia. Se verifica en el navegador, a tamaño real.
 *
 * ⚠️ EL DATO SALE DEL ÍNDICE DIARIO (engine/correspondencias). Pero ese fichero es
 *    RASPADO y gitignorado: EN CI NO EXISTE, así que el servidor corre en MODO
 *    DEGRADADO (normales del GTFS, SIN provisionales). Estos tests atan lo que es
 *    cierto en degradado —el caso base— para que pasen con y sin índice. El reparto
 *    normal/provisional se ata en unidad (`tests/lineas-que-pasan.test.ts`, con
 *    fixture) y el recuadro de provisionales se comprueba abajo SOLO si hay índice.
 *
 * ⚠️ `?fingir=` para no pedir nada a Avanza.
 */
import { test, expect, type Page } from '@playwright/test';

const seccion = (p: Page) => p.locator('[data-papel="lineas-que-pasan"]');
const filas = (p: Page) => p.locator('[data-papel="linea-que-pasa"]');

test.describe('⭐ las líneas que pasan por la parada, con su sentido', () => {
  test('el rótulo es NEUTRO: ni "habitualmente" ni "ahora"', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-verificar', { waitUntil: 'networkidle' });
    await expect(seccion(page)).toBeVisible();
    // El índice es de HOY, así que el rótulo ya no matiza "habitualmente". Y NO promete
    // "ahora": en degradado (sin índice) sería mentira. El título vale en los dos modos.
    const h2 = seccion(page).locator('h2');
    await expect(h2).toHaveText('Líneas que pasan por aquí');
    await expect(h2).not.toContainText(/habitualmente/i);
  });

  test('una línea en LOS DOS sentidos → dos entradas, dos destinos, dos enlaces', async ({ page }) => {
    // poste 15: la 36 pasa en los dos sentidos.
    await page.goto('/parada/15?fingir=sin-verificar', { waitUntil: 'networkidle' });
    const del36 = filas(page).filter({ has: page.locator('[data-linea="36"]') });
    await expect(del36).toHaveCount(2);
    const hrefs = await del36.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs.some((h) => /[?&]sentido=0(\b|&)/.test(h!))).toBe(true);
    expect(hrefs.some((h) => /[?&]sentido=1(\b|&)/.test(h!))).toBe(true);
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

  test('SI hay índice: el recuadro de provisionales lleva su palabra y su sentido', async ({ page }) => {
    // ⚠️ Solo corre cuando la máquina tiene índice fresco con el 1228 aún desviado. En
    //    CI (sin índice) NO hay recuadro → se salta. Es una comprobación de FORMA del
    //    recuadro, no de que un poste concreto esté desviado hoy.
    await page.goto('/parada/1228?fingir=sin-verificar', { waitUntil: 'networkidle' });
    const recuadro = page.locator('[data-papel="provisionales-que-pasan"]');
    test.skip((await recuadro.count()) === 0, 'sin índice (modo degradado): no hay recuadro de provisionales');

    // Forma + palabra (nunca forma sola): el recuadro NOMBRA su condición.
    await expect(recuadro.locator('[data-papel="provisionales-rotulo"]')).toHaveText('Hoy, por un desvío');
    // Borde punteado (forma).
    await expect(recuadro).toHaveCSS('border-style', 'dashed');
    // Las filas provisionales conservan su SENTIDO ("Hacia X" / enlace con ?sentido=).
    const prov = recuadro.locator('[data-papel="linea-que-pasa"][data-provisional="si"]');
    expect(await prov.count()).toBeGreaterThan(0);
    const conSentido = prov.filter({ hasText: /Hacia/ }).first();
    if (await conSentido.count()) {
      expect(await conSentido.getAttribute('href')).toMatch(/[?&]sentido=[01]/);
    }
  });
});
