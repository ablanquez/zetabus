/**
 * ⭐⭐ <Cita> Y <Toponimo> EN UN NAVEGADOR DE VERDAD. El guardián de unidad
 * (`tests/cita-guardian`) comprueba la ESTRUCTURA sobre los componentes; esto
 * comprueba el CONTRATO REAL: `element.translate === false` es la bandera EXACTA que
 * consulta el traductor de Chrome/Edge/Firefox para saltar un subárbol.
 *
 * Dos marcadores, misma defensa (translate="no"), distinta semántica:
 *   · [data-cita]     → dato externo VERBATIM (nombre de parada, de línea).
 *   · [data-toponimo] → destino CORREGIDO por nosotros (el ucwords del GTFS arreglado).
 *
 * Cubre los sitios que se construyen INLINE en las páginas (el <h1> del rumbo, la
 * botonera "Hacia X", el nombre de parada) o tras interacción (Buscador) —que el
 * guardián de unidad no puede renderizar—. Se prueban las vistas que se pintan SIN
 * Avanza (`?fingir=caido` cae al GTFS oficial), así no depende de datos vivos.
 *
 * ⚠️ Lo único que NO llega aquí es el destino de LlegadasVivas: necesita buses vivos
 *    de Avanza, que en `caido` no hay. Queda cubierto en el código y verificado a
 *    mano; sin clave de API no hay forma honesta de automatizarlo.
 */

import { test, expect, type Page } from '@playwright/test';

/** Todo lo protegido (cita o topónimo) declara translate=no. Y algo NUESTRO, no. */
async function protegidosCongeladosYChromeNo(page: Page) {
  const r = await page.evaluate(() => {
    const prot = [...document.querySelectorAll('[data-cita], [data-toponimo]')];
    return {
      n: prot.length,
      todosFrios: prot.every((e) => (e as HTMLElement).translate === false),
      // element.translate hereda: un hijo de un nodo protegido también es false.
      hijosFrios: prot.every((e) => {
        const hijo = e.querySelector('*') as HTMLElement | null;
        return !hijo || hijo.translate === false;
      }),
    };
  });
  expect(r.n, 'la vista no protege ningún dato externo: ¿se pinta sin Cita/Toponimo?').toBeGreaterThan(0);
  expect(r.todosFrios, 'un nodo protegido NO lleva translate=no: el traductor lo reescribiría').toBe(true);
  expect(r.hijosFrios).toBe(true);
  return r.n;
}

test.describe('⭐ el dato externo va protegido y el traductor no lo toca', () => {
  test('HOME · destinos (topónimo) y nombres de línea (cita) congelados; los rótulos, no', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await protegidosCongeladosYChromeNo(page);

    // Las diurnas de doble sentido pintan sus DOS destinos como TOPÓNIMO (corregidos).
    const destino = page.locator('[data-papel="destinos-home"] [data-toponimo]').first();
    await expect(destino).toHaveJSProperty('translate', false);
    // El resto (circulares, sentido único, búhos…) conservan su nombre como CITA.
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

  test('LÍNEA · el <h1> del rumbo y la botonera (topónimo) y las paradas (cita), protegidos', async ({ page }) => {
    await page.goto('/linea/21?fingir=caido', { waitUntil: 'networkidle' });
    await protegidosCongeladosYChromeNo(page);

    // El h1 del rumbo: origen/destino son DESTINOS corregidos → topónimo.
    const enH1 = await page.locator('[data-papel="titulo-linea"] [data-toponimo]').count();
    expect(enH1, 'el <h1> del rumbo no protege el destino corregido').toBeGreaterThan(0);

    // La botonera "Hacia X" usa el MISMO destino, también topónimo.
    const enBotonera = await page.locator('[data-papel="sentido"] [data-toponimo]').count();
    expect(enBotonera, 'la botonera "Hacia X" no protege el destino').toBeGreaterThan(0);

    // Los nombres de parada del itinerario son cita verbatim.
    const enParada = await page.locator('[data-papel="ir-a-parada"] [data-cita]').count();
    expect(enParada, 'los nombres de parada del itinerario no son cita').toBeGreaterThan(0);
  });

  test('PARADA · el nombre de la parada (h1) es cita', async ({ page }) => {
    await page.goto('/parada/744?fingir=caido', { waitUntil: 'networkidle' });
    const enNombre = await page.locator('[data-papel="nombre-parada"] [data-cita]').count();
    expect(enNombre, 'el nombre de la parada no es cita').toBeGreaterThan(0);
    await protegidosCongeladosYChromeNo(page);
  });
});
