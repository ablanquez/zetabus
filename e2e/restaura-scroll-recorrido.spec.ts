/**
 * ⭐ VOLVER DE UNA PARADA SIN PERDER EL SITIO — el camino REAL, no la recarga.
 *
 * Arriba del corte (880) el recorrido tiene scroll INTERNO (la isla `RecorridoVivo`
 * le pone un `max-height`), y el navegador NO restaura solo la posición de un
 * contenedor con scroll interno —solo la del documento—. Por eso la isla la guarda
 * en `sessionStorage` por `línea:sentido` y la devuelve al montar. Este spec ata el
 * caso para el que el feature EXISTE:
 *
 *     bajar por el recorrido → pulsar una parada → volver con ATRÁS → seguir ahí.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ POR QUÉ EL OBJETIVO DEL CLIC TIENE QUE ESTAR A LA VISTA. NO ES UN DETALLE.
 *
 * Este test nació de un FALSO ROJO. La primera versión pulsaba `.first()` —la
 * PRIMERA parada del recorrido—. Con el `<ol>` bajado, esa parada está FUERA DE
 * VISTA, arriba. Y `locator.click()` de Playwright, antes de pulsar, hace
 * scroll-into-view del objetivo: **subía el `<ol>` a 0 para poder pulsar la primera
 * parada**. La app guardaba fielmente ese 0, y al volver restauraba… 0. El test
 * "demostraba" un bug que el usuario NO TIENE: nadie con ratón pulsa una parada que
 * no ve.
 *
 * ⇒ EL INSTRUMENTO MOVIÓ LO QUE IBA A MEDIR. Preguntarle al scroll después de
 *   haberlo desplazado da una respuesta correcta a una situación que no ocurre.
 *
 * Por eso aquí se elige a propósito una parada DENTRO DEL PLIEGUE (visible sin
 * desplazar nada) y se AFIRMA que lo está antes de pulsarla: así el clic no mueve
 * el `<ol>`, y medimos el camino del usuario, no el del instrumento.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Con `?fingir=caido` para NO pedir nada a Avanza: el recorrido se pinta del GTFS
 *    (horneado), que es lo único que este test necesita —una lista larga que scrollee—.
 */
import { test, expect, type Page } from '@playwright/test';

const URL = '/linea/38?fingir=caido';
const CORTE = 880;

const ol = (p: Page) => p.locator('[data-papel="itinerario"]');

/**
 * El índice de una parada VISIBLE dentro del `<ol>` (con margen, para que quepa
 * entera y Playwright no tenga que desplazar nada al pulsarla). `-1` si ninguna.
 */
async function indiceParadaVisible(page: Page): Promise<number> {
  return page.evaluate(() => {
    const caja = document.querySelector('[data-papel="itinerario"]')!;
    const r = caja.getBoundingClientRect();
    const enlaces = [...caja.querySelectorAll('a[href*="/parada/"]')];
    for (let i = 0; i < enlaces.length; i++) {
      const b = enlaces[i].getBoundingClientRect();
      if (b.top >= r.top + 40 && b.bottom <= r.bottom - 40) return i;
    }
    return -1;
  });
}

test('⭐ el recorrido devuelve el sitio al volver de una parada (con ATRÁS)', async ({ page }, info) => {
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Solo ≥880: debajo del corte el <ol> no scrollea por dentro (scrollea el
  // documento, que el navegador ya restaura solo). La isla no hace nada ahí.
  const ancho = page.viewportSize()!.width;
  test.skip(ancho < CORTE, 'debajo del corte el scroll lo restaura el navegador, no la isla');

  // Hace falta que el recorrido SCROLLEE de verdad para que haya sitio que perder.
  const scrollea = await ol(page).evaluate((e) => e.scrollHeight > e.clientHeight + 1);
  test.skip(!scrollea, 'el recorrido cabe entero a este alto: no hay scroll que restaurar');

  // 1) Bajar por el recorrido, como el usuario: la rueda sobre el <ol>.
  await ol(page).hover();
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(200); // deja asentar el scroll y que la isla lo guarde
  const antes = await ol(page).evaluate((e) => e.scrollTop);
  expect(antes, 'no se llegó a bajar el recorrido: no hay nada que probar').toBeGreaterThan(0);

  // 2) Elegir una parada QUE SE ESTÉ VIENDO (ver la cabecera de este fichero) y
  //    AFIRMAR que está dentro del pliegue, para que el clic no mueva el <ol>.
  const idx = await indiceParadaVisible(page);
  expect(idx, 'no hay ninguna parada visible en el pliegue: el clic desplazaría el <ol>').toBeGreaterThanOrEqual(0);
  const parada = ol(page).locator('a[href*="/parada/"]').nth(idx);

  // 3) Pulsarla → llegar a la parada.
  await parada.click();
  await page.waitForURL('**/parada/**');

  // 4) ATRÁS (el botón del navegador, que es lo que hace el usuario).
  await page.goBack();
  await page.waitForURL('**/linea/38**');

  // 5) Seguimos donde estábamos. Se mide LA COSA (el scrollTop del <ol>), no un proxy.
  const despues = await ol(page).evaluate((e) => e.scrollTop);
  console.log(`\n  [${info.project.name}] recorrido: bajado a ${antes}px · al volver ${despues}px`);
  expect(despues, `se bajó a ${antes}px y al volver el recorrido está en ${despues}px`).toBe(antes);
});
