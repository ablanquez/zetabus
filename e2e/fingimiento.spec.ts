/**
 * ⭐⭐ EL CONTRATO DEL MODO DEMO, FIJADO. Y ES EL QUE ESTUVO ROTO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Había una banda roja en el layout: "⚠ MODO DEMO ENCENDIDO · LOS DATOS PUEDEN
 *  SER FINGIDOS". Salía con `ZETABUS_DEMO=1`, y **`ZETABUS_DEMO=1` no finge
 *  nada**: solo desbloquea la lectura de `?fingir=`. Sin ese parámetro los datos
 *  son de Avanza en vivo — se comprobó con dos servidores del mismo build
 *  devolviendo llegadas idénticas byte a byte.
 *
 *  ⇒ La banda confundía "la puerta está abierta" con "ha entrado alguien", y
 *    afirmaba algo FALSO sobre datos ciertos. En la app que presume de no
 *    mentir. Y estos 104 e2e corren con el flag encendido: llevaba saliendo
 *    sobre pantallas 100 % reales todo el tiempo.
 *
 * ⚠️ ESTE FICHERO SOLO TIENE SENTIDO PORQUE CORRE CON `ZETABUS_DEMO=1` (lo pone
 *    `playwright.config.ts`). Es decir: la peor condición posible — el flag
 *    encendido — y aun así ninguna pantalla puede decir que finge si no finge.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, expect, type Page } from '@playwright/test';

const marca = (p: Page) => p.locator('[data-papel="fingiendo"]');
/**
 * La banda que se retiró. Si vuelve a aparecer, esto se pone rojo.
 * ⚠️ Dos locators y no uno: Playwright NO deja mezclar CSS con `text=` dentro del
 *    mismo selector separado por comas (lo intenté, y el error fue claro).
 */
const banda = (p: Page) => p.locator('[data-papel="banda-demo"]');
const textoBanda = (p: Page) => p.getByText(/MODO DEMO/i);

const REALES = ['/', '/parada/744', '/linea/35'];

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ con el flag ENCENDIDO y SIN ?fingir= · no se finge, y no se dice', () => {
  for (const url of REALES) {
    test(`${url} · ni banda ni marca: los datos son reales`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'networkidle' });

      expect(await banda(page).count(), '⛔ ha vuelto la banda genérica del layout').toBe(0);
      expect(await textoBanda(page).count(), '⛔ ha vuelto el texto "MODO DEMO"').toBe(0);
      expect(
        await marca(page).count(),
        '⛔ dice que finge y no finge: es la mentira que veníamos a quitar',
      ).toBe(0);
      // Y ni rastro de la palabra por ningún otro camino.
      expect(await page.locator('text=FINGIENDO').count()).toBe(0);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ con ?fingir= · la marca aparece, y dice QUÉ se finge', () => {
  /**
   * ⚠️ LAS DOS PÁGINAS QUE ACEPTAN `?fingir=`. Y `/linea` NO TENÍA MARCA NINGUNA:
   *    mientras existió la banda del layout el agujero quedaba tapado por
   *    accidente. Al quitarla habría empezado a fingir EN SILENCIO — peor que el
   *    problema original. Por eso las dos se prueban aquí, juntas.
   */
  const CASOS = [
    { url: '/parada/744?fingir=caido', que: 'caido', donde: 'parada' },
    { url: '/parada/744?fingir=mapa', que: 'mapa', donde: 'parada' },
    { url: '/linea/35?fingir=caido', que: 'caido', donde: 'linea' },
  ];

  for (const c of CASOS) {
    test(`${c.donde} · «${c.que}» se anuncia por su nombre`, async ({ page }) => {
      await page.goto(c.url, { waitUntil: 'networkidle' });

      await expect(marca(page), `${c.donde} finge y no lo dice`).toBeVisible();
      await expect(marca(page)).toHaveAttribute('data-fingimiento', c.que);
      // ⭐ LO QUE SE FINGE, POR SU NOMBRE. Un "puede ser mentira" genérico no avisa
      //    de nada: solo hace ruido. Este dice cuál de los nueve fingimientos es.
      await expect(marca(page)).toContainText(c.que);
      await expect(marca(page)).toContainText(/inventados/);
    });
  }

  test('⭐ la marca NO va solo en el tono: sobrevive a la escala de grises', async ({ page }) => {
    await page.goto('/parada/744?fingir=caido', { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'html{filter:grayscale(1)!important}' });

    // Tres canales, y ninguno es el color: el SÍMBOLO, la PALABRA y el BORDE.
    await expect(marca(page)).toContainText('⚠');
    await expect(marca(page)).toContainText(/fingiendo/i);
    const borde = await marca(page).evaluate((e) => getComputedStyle(e).borderTopWidth);
    expect(borde, 'sin borde, en gris esto sería un párrafo cualquiera').not.toBe('0px');

    await page.screenshot({ path: 'capturas/zetabus/FINGIENDO-gris.png' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⛔ CONTRAPRUEBA · el detector caza de verdad', () => {
  test('si alguien inyecta la marca en una pantalla real, el guardián se entera', async ({ page }) => {
    await page.goto('/parada/744', { waitUntil: 'networkidle' });
    expect(await marca(page).count(), 'de partida, limpia').toBe(0);

    // Se reconstruye la regresión: una marca puesta sin que haya fingimiento, que
    // es exactamente lo que hacía la banda. El detector TIENE que verla — si no,
    // los tests de arriba estarían pasando por no mirar donde hay que mirar.
    await page.evaluate(() => {
      const p = document.createElement('p');
      p.setAttribute('data-papel', 'fingiendo');
      p.textContent = '⚠ FINGIENDO «demo»';
      document.body.appendChild(p);
    });

    expect(
      await marca(page).count(),
      'el detector NO ve una marca inyectada: los tests de arriba no valdrían nada',
    ).toBe(1);
  });
});
