/**
 * ⭐ LA GUÍA DE ESTILO VIVA, ABIERTA Y MIRADA. Y LA PRUEBA DE QUE ESTÁ VIVA:
 * la app y la guía LEEN EL MISMO TOKEN. No hay dos verdades que sincronizar.
 */

import { test, expect } from '@playwright/test';
import { capturar } from './lib/medir';

const RUTA = '/interno/sistema-visual';

test.describe('⭐ /interno/sistema-visual · LEE, no describe', () => {
  test('la paleta LEE los tokens del CSS (getComputedStyle), no un array a mano', async ({ page }, info) => {
    await page.goto(RUTA, { waitUntil: 'networkidle' });

    // La paleta se rellena al hidratar (lee el stylesheet). Esperamos a que haya swatches.
    const swatches = page.locator('[data-papel="token-color"]');
    await expect(swatches.first()).toBeVisible();
    const n = await swatches.count();
    expect(n, 'hay tokens de color leídos').toBeGreaterThan(8);
    // ⚠️ Y son SOLO los nuestros: Tailwind vuelca su paleta (~220 tokens) al :root.
    //    Si se colara, habría decenas de swatches y aparecería un --color-amber-*.
    expect(n, 'solo los tokens de ZetaBus, no la paleta de Tailwind').toBeLessThan(20);
    expect(await page.locator('[data-token*="amber"], [data-token*="-500"]').count(),
      'no puede colarse la paleta por defecto de Tailwind').toBe(0);

    // ⭐ El valor MOSTRADO es el LEÍDO: para --color-alerta, el data-valor tiene que
    //    ser el mismo hex que la app usa (#b91c1c). Si fuera un array a mano, podría
    //    mentir; aquí sale de getComputedStyle.
    const alerta = page.locator('[data-token="--color-alerta"]');
    await expect(alerta).toHaveCount(1);
    const valor = (await alerta.getAttribute('data-valor'))!.toLowerCase();
    console.log(`\n  [${info.project.name}] --color-alerta leído: ${valor}`);
    expect(valor).toBe('#b91c1c');

    // La escala tipográfica: cada muestra usa su utilidad real y mide su tamaño.
    const dato = page.locator('[data-papel="muestra-tipo"]').first();
    await expect(dato).toBeVisible();

    await capturar(page, `capturas/zetabus/GUIA-sistema-visual-${info.project.name}.png`);
  });

  test('⭐⭐ VIVA · la app Y la guía leen el MISMO --color-tinta (una sola fuente)', async ({ page }) => {
    // En la guía: el swatch de --color-tinta muestra su valor leído.
    await page.goto(RUTA, { waitUntil: 'networkidle' });
    const tinta = page.locator('[data-token="--color-tinta"]');
    await expect(tinta).toHaveCount(1);
    const valorGuia = (await tinta.getAttribute('data-valor'))!.toLowerCase();

    // La marca de la guía (wordmark) se pinta con var(--color-tinta): su color
    // computado tiene que resolver al MISMO valor.
    const colorMarca = await page
      .locator('[data-papel="marca-wordmark"]')
      .first()
      .evaluate((el) => getComputedStyle(el).color);

    // En la APP pública (la cabecera), la misma marca, el mismo token.
    await page.goto('/', { waitUntil: 'networkidle' });
    const colorApp = await page
      .locator('header [data-papel="marca-wordmark"]')
      .evaluate((el) => getComputedStyle(el).color);

    console.log(`\n  --color-tinta (guía): ${valorGuia}`);
    console.log(`  marca en la guía: ${colorMarca}`);
    console.log(`  marca en la app:  ${colorApp}`);

    // #0f172a = rgb(15, 23, 42). Guía y app, el mismo color, del mismo token.
    expect(valorGuia).toBe('#0f172a');
    expect(colorMarca).toBe('rgb(15, 23, 42)');
    expect(colorApp, 'app y guía leen el mismo token: cambia el token, cambian los dos').toBe(colorMarca);
  });

  test('⭐ radios y alturas de control se LEEN (los nuestros, no los de Tailwind)', async ({ page }, info) => {
    await page.goto(RUTA, { waitUntil: 'networkidle' });

    // Radios: exactamente los 4 nuestros (chip/caja/tarjeta/panel), con valor leído.
    const radios = page.locator('[data-papel="token-radio"]');
    await radios.first().scrollIntoViewIfNeeded();
    const nombresRadio = await radios.evaluateAll((els) => els.map((e) => e.getAttribute('data-token')));
    console.log(`\n  [${info.project.name}] radios: ${nombresRadio.join(', ')}`);
    expect(nombresRadio.sort()).toEqual(['--radius-caja', '--radius-chip', '--radius-panel', '--radius-tarjeta']);
    // La caja se dibuja con SU radio real: --radius-caja lee 8px.
    const caja = page.locator('[data-token="--radius-caja"]');
    expect((await caja.getAttribute('data-valor'))).toBe('8px');
    await page.locator('[data-papel="radios-vivos"]').scrollIntoViewIfNeeded();
    await capturar(page, `capturas/zetabus/GUIA-radios-control-${info.project.name}.png`);

    // Alturas de control: los 4 táctiles, con su valor.
    const controles = page.locator('[data-papel="token-control"]');
    const nombresCtl = await controles.evaluateAll((els) => els.map((e) => e.getAttribute('data-token')));
    console.log(`  control: ${nombresCtl.join(', ')}`);
    expect(nombresCtl).toContain('--control-min');
    expect(nombresCtl).toContain('--control');
    const min = page.locator('[data-token="--control-min"]');
    expect((await min.getAttribute('data-valor'))).toBe('24px');
  });

  test('la contraprueba del gris está, y el estado sobrevive (forma, no tono)', async ({ page }) => {
    await page.goto(RUTA, { waitUntil: 'networkidle' });
    const toggle = page.locator('[data-papel="toggle-gris"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    const zona = page.locator('[data-papel="zona-gris"]');
    await expect(zona).toHaveAttribute('data-gris', 'si');
    // En gris, el "ya llega" sigue teniendo su palabra (canal que sobrevive al gris).
    await expect(page.getByText('ya llega', { exact: false }).first()).toBeVisible();
  });
});
