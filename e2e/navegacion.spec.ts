/**
 * ⭐ LA SALIDA DE LAS PANTALLAS DE DETALLE ES LA MARCA, NO UNA FLECHA.
 *
 * Se retiraron las flechas "←" de /linea y /parada: eran una salida redundante (un
 * icono más que interpretar) cuando la marca "ZetaBus" de la cabecera —presente en
 * TODA pantalla— ya enlaza a `/`. Este spec ata el contrato que las sustituye:
 *
 *   · desde CUALQUIER pantalla de detalle hay una salida VISIBLE a la home;
 *   · esa salida es la marca de la cabecera, y de verdad enlaza (no es un adorno);
 *   · su zona pulsable es CÓMODA (≥ 44 px de alto, WCAG 2.5.5), porque es la única.
 *
 * ⚠️ Con `?fingir=` para NO pedir nada a Avanza al probar.
 */
import { test, expect, type Page } from '@playwright/test';

const marca = (p: Page) => p.locator('[data-papel="marca"]');

// Las dos pantallas de detalle, cada una por un camino distinto de llegada.
const PANTALLAS = [
  { nombre: 'LÍNEA', url: '/linea/38?fingir=caido' },
  { nombre: 'PARADA (enlace directo)', url: '/parada/744?fingir=caido' },
];

test.describe('⭐ la marca de la cabecera es la salida de las pantallas de detalle', () => {
  for (const { nombre, url } of PANTALLAS) {
    test(`${nombre} · la marca enlaza a la home y es táctil (≥44 px)`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'networkidle' });

      // 1) Enlaza a la home (la salida existe y tiene destino, no es un <span>).
      await expect(marca(page), 'la marca no enlaza: la pantalla quedaría sin salida').toHaveAttribute(
        'href',
        '/',
      );

      // 2) Zona pulsable cómoda. Se mide, no se supone (WCAG 2.5.5 = 44 px).
      const caja = (await marca(page).boundingBox())!;
      expect(caja.height, `la marca mide ${Math.round(caja.height)} px de alto: por debajo de 44`).toBeGreaterThanOrEqual(44);
      expect(caja.width).toBeGreaterThanOrEqual(44);

      // 3) Y de verdad lleva allí al pulsarla.
      await marca(page).click();
      await page.waitForURL(/\/(\?|$)/);
      expect(new URL(page.url()).pathname).toBe('/');
    });
  }

  test('⛔ YA NO HAY FLECHA "←": la salida no se duplica', async ({ page }) => {
    // Si alguien reintroduce una flecha de volver, esto se pone rojo: la decisión
    // fue que la salida sea UNA (la marca), no un icono extra que interpretar.
    await page.goto('/parada/744?fingir=caido', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-papel="volver"]')).toHaveCount(0);
    await page.goto('/linea/38?fingir=caido', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-papel="volver"]')).toHaveCount(0);
  });

  test('el enlace del itinerario a una parada NO arrastra `?desde=` (murió con la flecha)', async ({ page }) => {
    await page.goto('/linea/38?fingir=caido', { waitUntil: 'networkidle' });
    const primera = page.locator('[data-papel="ir-a-parada"]').first();
    const href = (await primera.getAttribute('href'))!;
    expect(href, 'sigue pasando ?desde=, un parámetro que ya no lee nadie').not.toContain('desde=');
  });
});
