/**
 * ⭐⭐ <Cita> EN UN NAVEGADOR DE VERDAD. El guardián de unidad (`tests/cita-guardian`)
 * comprueba la ESTRUCTURA (data-cita) sobre los componentes; esto comprueba el
 * CONTRATO REAL: `element.translate === false` es la bandera EXACTA que consulta el
 * traductor de Chrome/Edge/Firefox para saltar un subárbol. Si es false, no lo toca.
 *
 * Cubre los sitios que se construyen INLINE en las páginas (el <h1> del rumbo, el
 * nombre de parada) o tras interacción (resultados del Buscador) —que el guardián de
 * unidad no puede renderizar—. Se prueban las vistas que se pintan SIN Avanza
 * (`?fingir=caido` cae al GTFS oficial), así el test no depende de datos vivos.
 *
 * ⚠️ Lo único que NO llega aquí es el destino de LlegadasVivas: necesita buses vivos
 *    de Avanza, que en `caido` no hay. Queda cubierto por el <Cita> en el código y
 *    verificado a mano; sin clave de API no hay forma honesta de automatizarlo.
 */

import { test, expect, type Page } from '@playwright/test';

/** Toda cita pintada declara translate=no (el traductor la salta). Y algo NUESTRO, no. */
async function citasCongeladasYChromeNo(page: Page) {
  const r = await page.evaluate(() => {
    const citas = [...document.querySelectorAll('[data-cita]')];
    return {
      nCitas: citas.length,
      todasFrias: citas.every((e) => (e as HTMLElement).translate === false),
      // element.translate hereda: un hijo de la cita también es false.
      hijosFrios: citas.every((e) => {
        const hijo = e.querySelector('*') as HTMLElement | null;
        return !hijo || hijo.translate === false;
      }),
    };
  });
  expect(r.nCitas, 'la vista no tiene ninguna cita: ¿se pinta el dato externo?').toBeGreaterThan(0);
  expect(r.todasFrias, 'una cita NO lleva translate=no: el traductor la reescribiría').toBe(true);
  expect(r.hijosFrios).toBe(true);
  return r.nCitas;
}

test.describe('⭐ el dato externo va en <Cita> y el traductor no lo toca', () => {
  test('HOME · nombres de línea citados; los rótulos nuestros SÍ se traducen', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await citasCongeladasYChromeNo(page);

    // El nombre de línea de cada tarjeta es cita.
    const nombre = page.locator('[data-papel="grupo-lineas"] li a [data-cita]').first();
    await expect(nombre).toHaveJSProperty('translate', false);

    // Un rótulo NUESTRO (el encabezado de grupo, "DIURNAS") SÍ es traducible.
    const chrome = await page
      .locator('[data-papel="grupo-lineas"] h2')
      .first()
      .evaluate((e) => (e as HTMLElement).translate);
    expect(chrome, 'un rótulo nuestro no debería estar congelado').toBe(true);
  });

  test('BUSCADOR · el título del resultado (nombre de parada/línea) es cita', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('searchbox').fill('plaza');
    // Espera a que salga algún resultado.
    const titulo = page.locator('ul li a [data-cita]').first();
    await expect(titulo).toBeVisible();
    await expect(titulo).toHaveJSProperty('translate', false);
  });

  test('LÍNEA · el <h1> del rumbo y los nombres de parada del itinerario, citados', async ({ page }) => {
    await page.goto('/linea/21?fingir=caido', { waitUntil: 'networkidle' });
    await citasCongeladasYChromeNo(page);

    // El h1 del rumbo CONTIENE cita (origen/destino son nombres de parada del GTFS).
    const enH1 = await page.locator('[data-papel="titulo-linea"] [data-cita]').count();
    expect(enH1, 'el <h1> del rumbo no tiene cita: el nombre no está protegido').toBeGreaterThan(0);

    // Los nombres de parada del itinerario son cita.
    const enParada = await page.locator('[data-papel="ir-a-parada"] [data-cita]').count();
    expect(enParada, 'los nombres de parada del itinerario no son cita').toBeGreaterThan(0);
  });

  test('PARADA · el nombre de la parada (h1) es cita', async ({ page }) => {
    await page.goto('/parada/744?fingir=caido', { waitUntil: 'networkidle' });
    const enNombre = await page.locator('[data-papel="nombre-parada"] [data-cita]').count();
    expect(enNombre, 'el nombre de la parada no es cita').toBeGreaterThan(0);
    await citasCongeladasYChromeNo(page);
  });
});
