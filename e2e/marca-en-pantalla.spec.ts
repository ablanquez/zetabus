/**
 * ⭐ EL NOMBRE DE LA MARCA SE VE EN PANTALLA. El guardián que faltaba.
 *
 * `NOMBRE_MARCA` (en `marca-fuente.ts`) es la fuente única del nombre: lo pinta el
 * wordmark de la cabecera (`Marca.tsx`) y lo antepone la plantilla de título del
 * layout (`ZetaBus | %s`). Pero centralizarlo NO ROMPIÓ NINGÚN TEST — porque no
 * había ninguno que comprobara que el nombre de verdad se PINTA. Fuente única sin
 * guardián: si un refactor deja el wordmark vacío o el título sin marca, nadie se
 * entera. Este spec lo ata.
 *
 * ⚠️⚠️ SE MIDE LA PANTALLA, NO EL CÓDIGO. Se comprueba el TEXTO RENDERIZADO del
 *    wordmark y el `document.title` REAL de la pestaña — no que la constante exista.
 *
 * ⚠️⚠️ Y EL NOMBRE ESPERADO ES UN LITERAL A PROPÓSITO ('ZetaBus'), NO se importa de
 *    `marca-fuente`. Si se importara, vaciar `NOMBRE_MARCA` vaciaría TAMBIÉN lo
 *    esperado, y el test pasaría con la pantalla en blanco: sería verificar el dato
 *    contra sí mismo (L1). El guardián pincha aquí el nombre que el usuario TIENE que
 *    ver; un cambio de nombre DELIBERADO actualiza esta única línea, a conciencia.
 *
 * ⚠️ `global-error.tsx` escribe el nombre a mano (no puede importar `marca-fuente`
 *    por si el módulo que reventó es ése): este test NO lo toca, así que esa
 *    excepción declarada no lo rompe.
 *
 * Con `?fingir=caido` en las de detalle: no se pide nada a Avanza.
 */
import { test, expect, type Page } from '@playwright/test';

// El nombre que el usuario tiene que ver. Literal, independiente de la fuente (ver cabecera).
const MARCA = 'ZetaBus';

const wordmark = (p: Page) => p.locator('[data-papel="marca-wordmark"]');

// Las páginas y el título que la pestaña tiene que enseñar. La marca SIEMPRE delante.
const PAGINAS = [
  { url: '/', titulo: `${MARCA} | Listado de líneas de transporte de Zaragoza` },
  { url: '/linea/38?fingir=caido', titulo: `${MARCA} | Línea 38 | Sentido Valdefierro` },
  { url: '/parada/744?fingir=caido', titulo: `${MARCA} | Plaza San Miguel` },
  { url: '/sobre-los-datos', titulo: `${MARCA} | Sobre los datos` },
];

test('⭐ el WORDMARK de la cabecera PINTA el nombre (está en el layout → toda página)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const w = wordmark(page);
  // Se ve, y lo que se ve es el nombre. `toHaveText` lee el texto RENDERIZADO del DOM.
  await expect(w, 'el wordmark de la marca no está en la cabecera').toBeVisible();
  await expect(w, 'el wordmark no muestra el nombre de la marca').toHaveText(MARCA);
});

test('⭐ el TÍTULO de la pestaña lleva el nombre delante en todas las páginas', async ({ page }) => {
  for (const { url, titulo } of PAGINAS) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    // `page.title()` lee el <title> REAL renderizado (lo que sale en la pestaña).
    expect(await page.title(), `el título de ${url} no es el esperado`).toBe(titulo);
    // Y explícitamente: la marca, delante. Si la plantilla deja de anteponerla, rojo.
    expect(await page.title(), `el título de ${url} no empieza por "${MARCA} | "`).toMatch(
      new RegExp(`^${MARCA} \\| `),
    );
  }
});
