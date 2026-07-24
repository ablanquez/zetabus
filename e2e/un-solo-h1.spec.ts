/**
 * ⭐⭐ TODA PÁGINA TIENE EXACTAMENTE UN `<h1>`. Y ESTE TEST EXISTE POR CÓMO SE ENCONTRÓ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA CICATRIZ: **la home no tenía NINGÚN `<h1>`**, y llevaba así toda la semana. No lo
 *  cazó ningún test: lo cazó el BARRIDO TOTAL de las 1.012 páginas (Parte B, Capa 1),
 *  y fue el ÚNICO hallazgo real de 2.024 cargas.
 *
 *  ⚠️ Y el motivo de que ninguna de las ~30 specs lo viera es la lección: **todas miran
 *  páginas CONCRETAS y ninguna hacía la pregunta general.** Un test por pantalla nunca
 *  encuentra lo que le falta a una pantalla que nadie pensó en mirar.
 *
 *  ⇒ Por eso este test NO comprueba "la home tiene un h1": comprueba **la regla**, sobre
 *    un ejemplar de CADA tipo de página. Si mañana nace una pantalla nueva sin encabezado,
 *    basta con añadir su URL aquí y la regla ya está escrita.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ SE CUENTA EN EL ÁRBOL DE ACCESIBILIDAD, no en el CSS ni en el HTML crudo. Un `<h1>`
 *    con `display:none` está en el DOM y NO existe para quien navega por encabezados: la
 *    pregunta que importa es "¿lo ANUNCIA?", no "¿está escrito?". Por eso `getByRole`.
 *
 * ⚠️ Y por eso mismo un `<h1>` en `sr-only` SÍ cuenta —y debe—: está fuera del flujo
 *    visual pero DENTRO del árbol. Es justo lo que hace la home.
 */
import { test, expect } from '@playwright/test';

/** Un ejemplar de cada tipo de página. El 404 va aparte (abajo). */
const PAGINAS = [
  { url: '/', que: 'la home' },
  { url: '/sobre-los-datos', que: 'sobre los datos' },
  { url: '/interno/sistema-visual', que: 'la guía de estilo' },
  { url: '/linea/35?sentido=0&fingir=desviada', que: 'una línea' },
  { url: '/linea/N7?sentido=0&fingir=desviada', que: 'un búho circular' },
  { url: '/parada/744?fingir=solo-oficiales', que: 'una parada' },
  { url: '/parada/744?fingir=caido', que: 'una parada con Avanza caída' },
  { url: '/esta-ruta-no-existe-jamas', que: 'el 404' },
] as const;

for (const p of PAGINAS) {
  test(`⭐ ${p.que} anuncia EXACTAMENTE un <h1>`, async ({ page }) => {
    // Nada sale de localhost: ni teselas, ni fuentes. El encabezado no depende de eso.
    await page.route('**/*', (r) => {
      const u = r.request().url();
      return u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')
        ? r.continue() : r.abort();
    });
    await page.goto(p.url, { waitUntil: 'load' });

    const n = await page.getByRole('heading', { level: 1 }).count();
    expect(n, `${p.que} (${p.url}) anuncia ${n} encabezados de nivel 1`).toBe(1);

    // Y que no esté vacío: un <h1> sin texto es tan inútil como no tenerlo.
    const texto = (await page.getByRole('heading', { level: 1 }).first().textContent())?.trim() ?? '';
    expect(texto.length, `el <h1> de ${p.que} está vacío`).toBeGreaterThan(0);
  });
}

test('⭐ el <h1> de la home está en el ÁRBOL pero NO ocupa sitio (oculto ≠ a medias)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  // 1 · EN EL ÁRBOL: lo anuncia. Esto es lo que ve un lector de pantalla.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Listado de líneas de transporte de Zaragoza');

  // 2 · FUERA DEL FLUJO VISUAL: no puede empujar nada. Un `sr-only` mal hecho —una
  //     caja de alto real metida arriba del todo— bajaría el buscador y la rejilla.
  //     Se mide la CAJA, que es lo que empuja; no la clase, que es lo que promete.
  const caja = await page.locator('h1').first().boundingBox();
  expect(caja, 'el <h1> no tiene caja').not.toBeNull();
  expect(caja!.height, `el <h1> ocupa ${caja!.height}px de alto: empujaría la página`).toBeLessThanOrEqual(1);
  expect(caja!.width, `el <h1> ocupa ${caja!.width}px de ancho`).toBeLessThanOrEqual(1);

  // 3 · Y NO DESCOLOCA LA CABECERA: el logo sigue centrado en su banda.
  // ⚠️ El selector es `marca` (glifo + palabra), NO `marca-wordmark`. Mi primera versión
  //    midió solo la PALABRA y cantó "se ha descentrado" a los dos anchos: claro, la
  //    palabra está a la derecha del glifo, así que su centro NUNCA es el de la ventana.
  //    Era mi medida la que estaba mal, no la cabecera. Se usa el mismo selector que
  //    `navegacion.spec`, que es el que ya vigila esta pieza.
  const marca = await page.locator('[data-papel="marca"]').boundingBox();
  expect(marca, 'no está la marca').not.toBeNull();
  const centroMarca = marca!.x + marca!.width / 2;
  const centroVentana = page.viewportSize()!.width / 2;
  expect(Math.abs(centroMarca - centroVentana), 'la marca se ha descentrado').toBeLessThanOrEqual(2);
});

test('⭐ el <h1> de la home dice lo que su pestaña promete', async ({ page }) => {
  // ⚠️ La coherencia que se ata: el <h1> es la parte ESPECÍFICA del <title>, igual que en
  //    "Sobre los datos" y "Sistema visual". Si alguien cambia uno y no el otro, la página
  //    prometería en la pestaña algo distinto de lo que anuncia por dentro.
  await page.goto('/', { waitUntil: 'load' });
  const titulo = await page.title();
  const h1 = (await page.getByRole('heading', { level: 1 }).textContent())?.trim() ?? '';
  expect(titulo).toBe(`ZetaBus | ${h1}`);
});
