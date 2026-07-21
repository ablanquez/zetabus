/**
 * ⭐ EL AVISO DE DESVÍO, ACORDEÓN. Ver `components/AvisoDesvio.tsx`.
 *
 * Se usa `?fingir=desviada`, que hace que `get_stops_list` devuelva la ruta oficial
 * MENOS unas paradas (las caídas) y con una PROVISIONAL — un desvío determinista, sin
 * depender de que hoy haya uno de verdad en la calle.
 */
import { test, expect, type Page } from '@playwright/test';

const CON_DESVIO = '/linea/38?fingir=desviada';
const acordeon = (p: Page) => p.locator('details[data-papel="hay-desvio"]');
const summary = (p: Page) => p.locator('[data-papel="hay-desvio"] summary');

test.describe('⭐ el aviso de desvío es un acordeón', () => {
  test('CERRADO: avisa, dice "Mostrar más", y el contenido está en el DOM pero oculto', async ({ page }) => {
    await page.goto(CON_DESVIO, { waitUntil: 'networkidle' });

    const acc = acordeon(page);
    await expect(acc, 'debería haber un desvío fingido').toHaveCount(1);
    await expect(acc).toContainText('DESVIADA hoy');
    await expect(acc).toHaveJSProperty('open', false); // ⭐ empieza cerrado

    // La palabra distingue el estado (no el tono): cerrado enseña "Mostrar más".
    await expect(page.locator('.acordeon-cerrado')).toBeVisible();
    await expect(page.locator('.acordeon-abierto')).toBeHidden();

    // ⭐ El contenido EXISTE en el DOM aunque esté plegado (lector de pantalla, Ctrl+F)…
    const tachadas = page.locator('[data-papel="parada-tachada"]');
    expect(await tachadas.count(), 'las paradas caídas están en el DOM').toBeGreaterThan(0);
    await expect(page.locator('[data-papel="no-detectamos-supresiones"]')).toHaveCount(1);
    // …pero NO se ve mientras está cerrado.
    await expect(tachadas.first()).toBeHidden();

    // ⛔ Y NO queda NINGÚN cuadro suelto fuera del acordeón: el único `paradas-fuera`
    //    del DOM es el que vive DENTRO del <details>.
    const fuera = page.locator('[data-papel="paradas-fuera"]');
    await expect(fuera).toHaveCount(1);
    expect(await fuera.evaluate((n) => !!n.closest('details[data-papel="hay-desvio"]'))).toBe(true);
  });

  test('SE ABRE al pulsar y con teclado (Enter), y se cierra', async ({ page }) => {
    await page.goto(CON_DESVIO, { waitUntil: 'networkidle' });
    const tachada = page.locator('[data-papel="parada-tachada"]').first();
    await expect(tachada).toBeHidden();

    // Pulsar el resumen abre.
    await summary(page).click();
    await expect(acordeon(page)).toHaveJSProperty('open', true);
    await expect(tachada).toBeVisible();
    await expect(page.locator('.acordeon-abierto')).toBeVisible(); // "Mostrar menos"
    await expect(page.locator('.acordeon-cerrado')).toBeHidden();
    await expect(page.locator('[data-papel="no-detectamos-supresiones"]')).toBeVisible();

    // Y el TECLADO lo cierra: foco en el resumen + Enter.
    await summary(page).focus();
    await page.keyboard.press('Enter');
    await expect(acordeon(page)).toHaveJSProperty('open', false);
    await expect(tachada).toBeHidden();
  });

  test('⭐ EL ESPACIO GANADO: cerrado mide bastante menos que abierto', async ({ page }, info) => {
    await page.goto(CON_DESVIO, { waitUntil: 'networkidle' });
    const alto = () => page.evaluate(() => document.body.scrollHeight);

    const cerrado = await alto();
    await summary(page).click();
    await expect(acordeon(page)).toHaveJSProperty('open', true);
    const abierto = await alto();

    const gana = abierto - cerrado;
    console.log(`\n  [${info.project.name}] alto cerrado ${cerrado}px · abierto ${abierto}px · se pliegan ${gana}px`);
    // Cerrado tiene que ahorrar espacio de verdad: el cuadro entero se pliega.
    expect(gana, 'el acordeón cerrado no está ahorrando espacio').toBeGreaterThan(60);
  });

  test('la parada PROVISIONAL sigue marcada en el itinerario', async ({ page }) => {
    await page.goto(CON_DESVIO, { waitUntil: 'networkidle' });
    // El desvío fingido añade una parada que no está en el GTFS: el itinerario la marca.
    await expect(page.locator('[data-papel="parada-provisional"]').first()).toBeVisible();
  });

  test('en ESCALA DE GRISES el estado se sigue distinguiendo (palabra, no tono)', async ({ page }) => {
    await page.goto(CON_DESVIO, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'html{filter:grayscale(1)!important}' });
    // Cerrado: se lee "Mostrar más". Abierto: "Mostrar menos". Es PALABRA: sobrevive al gris.
    await expect(page.locator('.acordeon-cerrado')).toBeVisible();
    await summary(page).click();
    await expect(page.locator('.acordeon-abierto')).toBeVisible();
    await expect(page.locator('.acordeon-cerrado')).toBeHidden();
  });

  test('una línea SIN desvío no muestra ni chip ni acordeón (ni cuadro suelto)', async ({ page }) => {
    // `caido` → no se puede leer la ruta de hoy → veredicto indeterminado, NO desvío.
    await page.goto('/linea/35?fingir=caido', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-papel="hay-desvio"]')).toHaveCount(0);
    await expect(page.locator('[data-papel="paradas-fuera"]')).toHaveCount(0);
    await expect(page.locator('[data-papel="parada-tachada"]')).toHaveCount(0);
  });
});
