/**
 * ⭐ B7-B14 · LA CABECERA DE PARADA Y LA TARJETA DE LLEGADA.
 *
 * Gran parte de este bloque se clonó en tandas anteriores (los chips de la ficha, el
 * "fuera Dato oficial", el filtro, el pie con MITRAMS). Aquí se VERIFICA con medidas
 * —no se da por hecho—. La salida de la pantalla se prueba en `navegacion.spec.ts`
 * (es la marca de la cabecera; la flecha de volver se retiró).
 *
 * ⚠️ Todo con `?fingir=` para NO pedir nada a Avanza: el nombre y la ficha salen del
 *    artefacto y de los datos fingidos; a la fuente real no se le pregunta para probar.
 */

import { test, expect, type Page } from '@playwright/test';

const filas = (p: Page) => p.locator('[data-papel="llegada"]');

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ B13 · SIN FLECHA ARRIBA NI ENLACE DE VUELTA ABAJO (la salida es la marca)', () => {
  test('no hay flecha de volver arriba, ni "buscar otra parada" en el pie', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-buses', { waitUntil: 'domcontentloaded' });

    // La flecha "←" se retiró: la marca de la cabecera es la única salida (ver
    // `navegacion.spec.ts`). Aquí solo se ata que NO ha vuelto por ningún lado.
    await expect(page.locator('[data-papel="volver"]'), 'volvió una flecha de volver').toHaveCount(0);

    // El enlace del pie era la MISMA función que la flecha. Tampoco está.
    await expect(page.getByText('buscar otra parada', { exact: false })).toHaveCount(0);
  });

  test('⭐ B14 · el pie corto ENLAZA a /sobre-los-datos, con la atribución MITRAMS', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-buses', { waitUntil: 'domcontentloaded' });
    const pie = page.locator('[data-papel="pie"]');
    await expect(pie.locator('[data-papel="atribucion-mitrams"]')).toContainText(/MITRAMS/);
    await expect(pie.getByRole('link', { name: /Sobre los datos/i })).toHaveAttribute('href', '/sobre-los-datos');
    await expect(pie, 'el pie debe decir que el dato está procesado').toContainText(/procesados/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ B10 · LA TARJETA DE LLEGADA MIDE LO QUE LA REFERENCIA (≈102 px), no el doble', () => {
  test('la fila de llegada ronda los 102 px de la referencia, no los 160 de antes', async ({ page }, info) => {
    await page.goto('/parada/744?fingir=sin-verificar', { waitUntil: 'networkidle' });
    const alturas = await filas(page).evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().height)),
    );
    console.log(`\n  [${info.project.name}] alturas de fila: ${alturas.join(' ')} px (referencia: 102)`);
    expect(alturas.length).toBeGreaterThan(0);
    // La referencia mide 102. Se permite un margen, pero NO el doble (160, el de antes).
    for (const h of alturas) {
      expect(h, `una fila mide ${h} px: se acerca al doble de la referencia`).toBeLessThan(130);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ LA FICHA EN CHIPS, TODOS LOS NIVELES IGUAL (la procedencia se fue)', () => {
  test('ni "Dato oficial", ni marca de procedencia en ningún autobús', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-verificar', { waitUntil: 'networkidle' });

    // La frase "Dato oficial" era la norma (87%). Ya no se pinta (se quitó antes).
    await expect(page.getByText(/Dato oficial/i)).toHaveCount(0);

    // Y AHORA tampoco la marca †*?: la procedencia salió de esta pantalla operativa.
    // Con `fingir=sin-verificar` hay buses de los cuatro niveles; NINGUNO lleva marca.
    await expect(page.locator('[data-papel="marca-confianza"]')).toHaveCount(0);
    // Ni el enlace por autobús.
    await expect(page.getByText(/De dónde sale cada dato/i)).toHaveCount(0);
  });

  test('⚠️ un bus SIN ficha lo dice, no se lo inventa', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-ficha', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-papel="chip-sin-datos"]')).toBeVisible();
    await expect(page.locator('[data-papel="chip-sin-datos"]')).toContainText(/Sin datos/i);
  });

  test('⚠️ el destino NO se trunca (nombre largo baja de línea)', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-verificar', { waitUntil: 'networkidle' });
    // Estructural: el destino lleva `sin-recortar` y NINGÚN truncate/ellipsis. Un
    // destino largo (los hay: "Vía Hispanidad / Nuestra Señora...") baja de línea.
    const destino = filas(page).first().locator('[data-papel="destino"]');
    const estilo = await destino.evaluate((e) => {
      const cs = getComputedStyle(e);
      return { textOverflow: cs.textOverflow, whiteSpace: cs.whiteSpace, clase: e.className };
    });
    expect(estilo.textOverflow, 'el destino tiene text-overflow: se truncaría').not.toBe('ellipsis');
    expect(estilo.clase).toContain('sin-recortar');
  });
});
