/**
 * ⭐ B7-B14 · LA CABECERA DE PARADA Y LA TARJETA DE LLEGADA.
 *
 * Gran parte de este bloque se clonó en tandas anteriores (los chips de la ficha, el
 * "fuera Dato oficial", el filtro, el pie con MITRAMS). Aquí se VERIFICA con medidas
 * —no se da por hecho— y se prueba lo NUEVO de esta tanda: B13, la flecha de volver.
 *
 * ⚠️ Todo con `?fingir=` para NO pedir nada a Avanza: el nombre y la ficha salen del
 *    artefacto y de los datos fingidos; a la fuente real no se le pregunta para probar.
 */

import { test, expect, type Page } from '@playwright/test';

const filas = (p: Page) => p.locator('[data-papel="llegada"]');

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ B13 · LA FLECHA DE VOLVER ARRIBA, Y FUERA EL ENLACE DE ABAJO', () => {
  test('hay flecha arriba, lleva a la portada, y el "buscar otra parada" del pie NO está', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-buses', { waitUntil: 'domcontentloaded' });

    const flecha = page.locator('[data-papel="volver"]');
    await expect(flecha, 'falta la flecha de volver arriba').toHaveCount(1);

    // ⚠️ Objetivo táctil: WCAG 2.5.8 pide 24×24 mínimo. Se mide, no se supone.
    const caja = (await flecha.boundingBox())!;
    expect(caja.width).toBeGreaterThanOrEqual(24);
    expect(caja.height).toBeGreaterThanOrEqual(24);

    // El enlace de abajo era la MISMA función. Ya no está.
    await expect(page.getByText('buscar otra parada', { exact: false })).toHaveCount(0);

    // Y la flecha lleva a la portada (la búsqueda).
    await flecha.click();
    await page.waitForURL(/\/$|\/\?/);
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('⭐ CONTRAPRUEBA · la flecha NO es un adorno: sin href no llevaría a ningún sitio', async ({ page }) => {
    await page.goto('/parada/744?fingir=sin-buses', { waitUntil: 'domcontentloaded' });
    // Si alguien convirtiera la flecha en un <span> decorativo, este href desaparecería
    // y el test caería. Es lo que ata que la flecha SIRVE, no solo que se ve.
    const href = await page.locator('[data-papel="volver"]').getAttribute('href');
    expect(href, 'la flecha no tiene destino: es un adorno').toBe('/');
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
test.describe('⭐ B7/B8 · LA FICHA EN CHIPS, CON LOS 4 NIVELES DE PROCEDENCIA', () => {
  test('cuatro niveles, cuatro tratamientos distintos, y "Dato oficial" NO aparece', async ({ page }, info) => {
    await page.goto('/parada/744?fingir=sin-verificar', { waitUntil: 'networkidle' });

    // B8: la frase "Dato oficial" era la norma (87%). Ya no se pinta.
    await expect(page.getByText(/Dato oficial/i)).toHaveCount(0);

    // Los cuatro niveles, cada uno con su marca (o sin ella, el oficial).
    const marcas = await page.locator('[data-papel="marca-confianza"]').evaluateAll((els) =>
      els.map((e) => e.textContent?.trim()),
    );
    console.log(`\n  [${info.project.name}] marcas presentes: ${marcas.join(' ')} (oficial no lleva marca)`);
    // Hay al menos una de cada de las tres marcadas (*, †, ?).
    expect(marcas).toContain('*');
    expect(marcas).toContain('†');
    expect(marcas).toContain('?');

    // El oficial (4889) NO lleva marca: su ficha no tiene [data-papel="marca-confianza"].
    const oficial = filas(page).filter({ hasText: '4889' });
    await expect(oficial.locator('[data-papel="marca-confianza"]')).toHaveCount(0);
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
