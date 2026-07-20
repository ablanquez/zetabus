/**
 * ⭐⭐ «TE HE OÍDO, VOY» — EL ACUSE QUE SOBREVIVE A SOLTAR EL DEDO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Esto NO se puede probar leyendo el DOM ni renderizando a string: el estado
 *  solo existe ENTRE que sueltas y que llega la pantalla nueva. Hay que PULSAR
 *  de verdad, soltar de verdad, y mirar en ese hueco.
 *
 *  ⚠️ Y la trampa de medirlo: si la navegación es instantánea, el hueco no
 *     existe y no hay nada que ver. Por eso se RALENTIZA la respuesta del
 *     servidor con `route.fulfill` diferido — que es exactamente el caso real
 *     que venimos a arreglar: la red mala de la calle.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, expect, type Page } from '@playwright/test';

const LINEA = '/linea/35?fingir=caido';

const bloque = (p: Page) => p.locator('[data-papel="bloque-parada"]').nth(2);
const enlace = (p: Page) => bloque(p).locator('[data-papel="ir-a-parada"]');

/** El tinte del acuse. Transparente = sin marcar. */
const fondoDe = (p: Page) =>
  bloque(p).evaluate((e) => getComputedStyle(e).backgroundColor);

/**
 * La navegación a /parada/* tarda. Se hace ADREDE para poder mirar el hueco:
 * sin esto la pantalla llega tan rápido que no hay estado intermedio que medir.
 */
async function conRedLenta(page: Page, ms: number) {
  await page.route('**/parada/**', async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ el acuse PERSISTE después de soltar', () => {
  test('se marca al pulsar y SIGUE marcado tras levantar el dedo', async ({ page }) => {
    await page.goto(LINEA, { waitUntil: 'networkidle' });
    await bloque(page).waitFor();
    await conRedLenta(page, 3000);

    const reposo = await fondoDe(page);
    expect(reposo, 'en reposo el bloque no está teñido').toBe('rgba(0, 0, 0, 0)');

    // PULSAR DE VERDAD, y SOLTAR. Lo que importa es lo que pasa DESPUÉS de soltar.
    const caja = (await enlace(page).boundingBox())!;
    await page.mouse.move(caja.x + 20, caja.y + 12);
    await page.mouse.down();
    const pulsando = await fondoDe(page);
    await page.mouse.up();

    // ⭐ EL HUECO MUDO. Aquí es donde antes no había NADA.
    await page.waitForTimeout(400);
    const trasSoltar = await fondoDe(page);
    // ⚠️ DENTRO del bloque hay 3 marcadores (la parada + un chip por transbordo).
    //    Se pide el del ENLACE DE LA PARADA, que es el que se ha pulsado.
    const marcador = enlace(page).locator('[data-papel="acuse-de-toque"]');

    expect(pulsando, 'mientras el dedo está encima se tiñe (el :active de siempre)').not.toBe(reposo);
    expect(trasSoltar, '⛔ SE APAGÓ AL SOLTAR: vuelve el hueco mudo').not.toBe(reposo);
    expect(trasSoltar, 'y es el MISMO tinte: esto extiende el :active, no lo sustituye').toBe(pulsando);
    await expect(marcador, 'el framework dice que sigue navegando').toHaveAttribute('data-pendiente', 'si');

    await page.screenshot({ path: 'capturas/zetabus/ACUSE-tras-soltar.png' });
  });

  test('⭐ CONTRAPRUEBA · sin el marcador de `useLinkStatus`, el acuse muere al soltar', async ({ page }) => {
    await page.goto(LINEA, { waitUntil: 'networkidle' });
    await bloque(page).waitFor();
    await conRedLenta(page, 3000);

    // Se ARRANCAN los marcadores del DOM: es exactamente lo que quedaría si alguien
    // borrara <AcuseDeToque/> del itinerario. El :active seguiría vivo; la
    // PERSISTENCIA, no. Si el test de arriba pasara igual con esto, no estaría
    // midiendo lo que dice medir.
    await page.evaluate(() => {
      document.querySelectorAll('[data-papel="acuse-de-toque"]').forEach((n) => n.remove());
    });

    const caja = (await enlace(page).boundingBox())!;
    await page.mouse.move(caja.x + 20, caja.y + 12);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(400);

    expect(await fondoDe(page), 'sin el marcador TIENE que apagarse al soltar').toBe('rgba(0, 0, 0, 0)');
  });

  test('⚠️ volver atrás NO deja el elemento marcado para siempre', async ({ page }) => {
    await page.goto(LINEA, { waitUntil: 'networkidle' });
    await bloque(page).waitFor();

    await enlace(page).click();
    await page.waitForURL(/\/parada\//);
    await page.goBack();
    await bloque(page).waitFor();

    // Al volver, la pantalla se monta de nuevo: no puede quedar ni rastro.
    expect(await fondoDe(page), 'quedó un bloque marcado tras volver atrás').toBe('rgba(0, 0, 0, 0)');
    await expect(
      enlace(page).locator('[data-papel="acuse-de-toque"]'),
      'el marcador vuelve a estar en reposo',
    ).toHaveAttribute('data-pendiente', 'no');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⚠️ el acuse va donde SE NAVEGA, y solo ahí', () => {
  test('las tarjetas de llegada NO lo llevan: no navegan, seleccionan', async ({ page }) => {
    await page.goto('/parada/744', { waitUntil: 'networkidle' });
    const llegada = page.locator('[data-papel="llegada"]').first();
    if ((await llegada.count()) === 0) test.skip(true, 'sin llegadas ahora mismo');

    // Es un <button> que resalta el bus en el mapa. No hay navegación que acusar,
    // y marcarlo mentiría: su acuse ES la selección (`aria-pressed`).
    await expect(llegada).toHaveJSProperty('tagName', 'BUTTON');
    expect(await llegada.locator('[data-papel="acuse-de-toque"]').count()).toBe(0);
  });

  test('el índice de líneas y el buscador SÍ lo llevan', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const fila = page.locator('[data-acusa="si"]').first();
    await expect(fila.locator('[data-papel="acuse-de-toque"]')).toHaveCount(1);
  });
});
