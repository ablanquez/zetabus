/**
 * ⭐⭐ LA VISTA DE LÍNEA NO TOCA AVANZA. CERO. Y SE CUENTA, NO SE SUPONE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  El barrido de línea está APARCADO (ver `docs/BARRIDO_APARCADO.md`): costaba
 *  67 peticiones y hasta 66 segundos, y no respondía a ninguna pregunta que se
 *  haga alguien esperando el autobús.
 *
 *  ⚠️ PERO "QUITAR EL BOTÓN" NO ES "APARCAR EL BARRIDO".
 *
 *  En la Tanda 5A conté los sitios que lo disparaban y apareció uno que no
 *  llamaba ninguna pantalla: `/api/linea/[linea]`, una URL PÚBLICA E INDEXABLE
 *  que barría la línea entera con un simple GET. Un rastreador la habría
 *  encontrado, y habrían salido 18 peticiones a Avanza sin que nadie pulsara.
 *
 *  ⇒ Por eso esto se mide en DOS capas, y ninguna vale sola:
 *
 *    1. EN EL NAVEGADOR: ni una petición a `/api/*` desde la vista de línea.
 *    2. EN EL SERVIDOR: el contador de `/api/diag` cuenta las llamadas al ÚNICO
 *       punto del programa que habla con Avanza. Si la página barriera en el
 *       render (SSR), la capa 1 no lo vería — pero el contador sí.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, expect, type Page } from '@playwright/test';
import { capturar, revisar } from './lib/medir';

const LINEA = '35';

/** Todo lo que la página pide a NUESTRA api. Tiene que quedarse vacío. */
function espia(page: Page) {
  const aNuestraApi: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/api/')) aNuestraApi.push(u.pathname);
  });
  return aNuestraApi;
}

/**
 * ⚠️⚠️ EL CONTADOR GLOBAL NO SIRVE PARA ESTO, Y ME HA COLADO DOS VECES.
 *
 * `/api/diag` expone el contador del único punto del programa que habla con Avanza.
 * Es tentador leerlo antes y después y restar. Pero **es global del proceso**, y
 * Playwright corre SEIS WORKERS EN PARALELO: mientras esta página no pide nada, los
 * tests de la vista de PARADA sí piden — y su tráfico entra en mi resta.
 *
 * En la Tanda 5A esto me dio "36 peticiones por pulsar un enlace". Lo escribí, y hoy
 * he vuelto a montar la misma resta. El instrumento no ha cambiado: yo me he olvidado.
 *
 * ⇒ LA PREGUNTA CORRECTA NO ES "¿cuántas peticiones ha hecho el servidor entero?"
 *   SINO "¿ESTA PÁGINA dispara un barrido?". Y eso se responde en tres capas, cada
 *   una tapando el agujero de la anterior:
 *
 *     1. EL NAVEGADOR ....... ni una petición a /api/*  (no hay fetch de cliente)
 *     2. EL HTML SERVIDO .... no trae ni un autobús      (no hay barrido en el SSR,
 *                                                         que el navegador NO vería)
 *     3. LA URL A PELO ...... /api/barrido → 404         (no hay endpoint huérfano)
 *
 * El contador se sigue IMPRIMIENDO, porque mirarlo es sano. Pero no se afirma nada
 * sobre él: sería afirmar sobre una medida contaminada, y eso es peor que no medir.
 */
async function peticionesAAvanza(page: Page): Promise<number> {
  const r = await page.request.get('/api/diag');
  const j = (await r.json()) as { avanza?: { peticiones?: number } };
  return j.avanza?.peticiones ?? 0;
}

test('⭐ abrir · cambiar de sentido · recargar · esperar → CERO peticiones a Avanza', async ({ page }, info) => {
  const llamadas = espia(page);
  const antes = await peticionesAAvanza(page);

  // 1 · Abrir la vista de línea.
  await page.goto(`/linea/${LINEA}`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-papel="itinerario"]')).toBeVisible();
  console.log(`\n  [${info.project.name}]`);
  console.log(`  abrir /linea/${LINEA} ............ ${llamadas.length} peticiones`);

  // ⛔ Y NO HAY BOTÓN. Ni apagado, ni con un "próximamente".
  expect(await page.locator('[data-papel="boton-barrer"]').count(), 'sin botón').toBe(0);
  expect(await page.locator('[data-papel="hallazgo"]').count()).toBe(0);
  await expect(page.locator('body')).not.toContainText(/próximamente/i);

  // 2 · Cambiar de sentido.
  const pestanas = page.locator('nav[aria-label="Sentido"] a');
  if ((await pestanas.count()) > 1) {
    await pestanas.nth(1).click();
    await page.waitForURL(/sentido=/);
    await page.waitForLoadState('networkidle');
  }
  console.log(`  cambiar de sentido .............. ${llamadas.length} acumuladas`);

  // 3 · Recargar.
  await page.reload({ waitUntil: 'networkidle' });
  console.log(`  recargar ........................ ${llamadas.length} acumuladas`);

  // 4 · Esperar más de un ciclo de refresco (el TTL de la caché son 15 s).
  await page.waitForTimeout(20_000);
  console.log(`  esperar 20 s sin tocar nada ..... ${llamadas.length} acumuladas`);

  const despues = await peticionesAAvanza(page);
  console.log('  ─────────────────────────────────────────────────');
  console.log(`  TOTAL desde el navegador ........ ${llamadas.length} peticiones`);
  console.log(`  contador GLOBAL del proceso ..... ${antes} → ${despues}  (⚠️ contaminado:`);
  console.log('                                     son los OTROS 5 workers de Playwright,');
  console.log('                                     mirando paradas. Por eso no se afirma nada');
  console.log('                                     sobre él. Ver la nota de arriba.)');

  await capturar(page, `capturas/zetabus/linea-limpia-${info.project.name}.png`);

  // ⛔ CAPA 1 · EL NAVEGADOR. Ni una petición a nuestra API desde esta pantalla.
  expect(llamadas, 'la vista de línea NO puede pedirle NADA a nuestra API').toEqual([]);

  // ⛔ CAPA 2 · EL HTML SERVIDO. Un barrido en el render (SSR) no se vería como
  //    petición del navegador — así que se mira el HTML que el servidor manda.
  //    Si hubiera barrido, traería autobuses dentro. No trae ninguno.
  const html = await (await page.request.get(`/linea/${LINEA}`)).text();
  expect(html, 'el HTML no puede traer un resultado de barrido').not.toMatch(/data-papel="hallazgo"/);
  expect(html, 'ni un autobús').not.toMatch(/data-papel="grupo-flota"|data-coche=/);
  expect(html, 'pero el recorrido SÍ va, y sale del GTFS').toMatch(/data-papel="itinerario"/);
});

test('⚠️ el endpoint de barrido YA NO EXISTE: /api/barrido/35 → 404', async ({ page }) => {
  // ⚠️ ESTA ES LA COMPROBACIÓN QUE HABRÍA CAZADO EL ENDPOINT HUÉRFANO.
  //    Que la interfaz no lo llame no significa nada: es una URL pública. Se pide
  //    a pelo, como lo haría un rastreador, y tiene que no estar.
  const r = await page.request.get(`/api/barrido/${LINEA}`, { failOnStatusCode: false });
  console.log(`\n  GET /api/barrido/${LINEA} → HTTP ${r.status()}`);
  expect(r.status(), 'el barrido no puede ser alcanzable por URL').toBe(404);

  // Y el otro huérfano, el de la Tanda 3, que barría Y calculaba desvíos con un GET.
  const viejo = await page.request.get(`/api/linea/${LINEA}`, { failOnStatusCode: false });
  expect(viejo.status()).toBe(404);
});

test('la vista de línea, limpia, aguanta a este tamaño', async ({ page }, info) => {
  await page.goto(`/linea/${LINEA}`, { waitUntil: 'networkidle' });
  const r = await revisar(page, `línea limpia · ${info.project.name}`);
  expect(r.fuera).toEqual([]);
  expect(r.cortados).toEqual([]);
  expect(r.scroll).toBeLessThanOrEqual(0);
  expect(r.tactil).toEqual([]);
});
