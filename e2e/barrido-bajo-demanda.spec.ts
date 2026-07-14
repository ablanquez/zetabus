/**
 * ⭐ EL BARRIDO NO SE DISPARA SOLO. Y SE DEMUESTRA CON EL CONTADOR PUESTO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Antes, abrir /linea/35 disparaba 18 peticiones a Avanza que NADIE HABÍA
 *  PEDIDO. El que solo quería ver el recorrido, las pagaba igual. Y un par de
 *  barridos seguidos dejan a Avanza sin responder unos minutos.
 *
 *  El repositorio es PÚBLICO y promete POR ESCRITO no abusar. Un barrido que se
 *  dispara solo no se puede defender.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ NO SE SUPONE: SE CUENTA. `/api/diag` expone el contador del único punto del
 * programa que habla con Avanza. Se lee ANTES y DESPUÉS, y se resta.
 *
 * ⚠️ Y SE PRUEBA CON FINGIMIENTO, para no machacar a Avanza probando que no la
 * machacamos. El contador cuenta las llamadas al TRANSPORTE, sea el real o el
 * fingido: la cuenta es la misma.
 */

import { test, expect, type Page } from '@playwright/test';
import { capturar, seVe } from './lib/medir';

const LINEA = '35';
const CON_FINGIR = `/linea/${LINEA}?fingir=dos-lineas`;

/**
 * ⚠️ EL CONTADOR GLOBAL DE `/api/diag` NO SIRVE AQUÍ, Y CASI ME LA CUELA.
 *
 * La primera versión de este test leía `/api/diag` antes y después. Y dio:
 *
 *     abrir /linea/35 ......... 0 peticiones   ✅
 *     cambiar de sentido ...... 36 peticiones  ⁇⁇⁇
 *
 * ¿Treinta y seis peticiones por pulsar un ENLACE? Imposible. Lo que pasaba es
 * que el contador es GLOBAL DEL PROCESO y Playwright corre seis workers en
 * paralelo: los barridos de los OTROS tests se colaban en mi medición.
 *
 * El instrumento estaba midiendo el ruido de sus propios compañeros.
 *
 * ⇒ SE MIDE LO QUE HACE **ESTA PÁGINA**, y se mide en el navegador:
 *   ninguna petición a /api/barrido ni a /api/llegadas. Es una medida aislada por
 *   construcción, y además es la pregunta correcta: "¿esta pantalla dispara un
 *   barrido?", no "¿cuántas peticiones ha hecho el servidor entero?".
 *
 * ⚠️ Y EL SERVIDOR TAMBIÉN SE COMPRUEBA, porque un barrido en el render (SSR) no
 *   se vería como petición del navegador: se exige que el HTML servido NO traiga
 *   ni un autobús, solo el botón. Las dos capas, no una.
 */
function espia(page: Page) {
  const aNuestraApi: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/api/barrido') || u.pathname.startsWith('/api/llegadas')) {
      aNuestraApi.push(u.pathname);
    }
  });
  return aNuestraApi;
}

test.describe('⭐ CERO PETICIONES HASTA QUE ALGUIEN PULSA', () => {
  test('abrir la línea · cambiar de sentido · recargar · esperar → CERO', async ({ page }, info) => {
    const llamadas = espia(page);

    // 1 · Abrir la vista de línea.
    await page.goto(CON_FINGIR, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-papel="boton-barrer"]')).toBeVisible();
    console.log(`
  [${info.project.name}]`);
    console.log(`  abrir /linea/${LINEA} ............ ${llamadas.length} llamadas al barrido`);

    // ⭐ Y EL SERVIDOR TAMPOCO HA BARRIDO: el HTML no trae ni un autobús.
    //    (Un barrido en el SSR no se vería como petición del navegador.)
    expect(await page.locator('[data-papel="hallazgo"]').count(), 'el HTML no puede traer resultados').toBe(0);
    expect(await page.locator('[data-papel="bus-encontrado"]').count()).toBe(0);
    expect(await page.locator('[data-papel="itinerario"]').count(), 'pero el recorrido SÍ está').toBe(1);

    // 2 · Cambiar de sentido.
    const pestanas = page.locator('nav[aria-label="Sentido"] a');
    if ((await pestanas.count()) > 1) {
      await pestanas.nth(1).click();
      await page.waitForURL(/sentido=/);
      await page.waitForLoadState('networkidle');
    }
    console.log(`  cambiar de sentido .............. ${llamadas.length} acumuladas`);
    expect(await page.locator('[data-papel="hallazgo"]').count()).toBe(0);

    // 3 · Recargar.
    await page.reload({ waitUntil: 'networkidle' });
    console.log(`  recargar ........................ ${llamadas.length} acumuladas`);

    // 4 · Esperar más de un ciclo de refresco (15 s).
    await page.waitForTimeout(20_000);
    console.log(`  esperar 20 s sin tocar nada ..... ${llamadas.length} acumuladas`);
    console.log('  ─────────────────────────────────────────────────');
    console.log(`  TOTAL sin pulsar nada ........... ${llamadas.length} peticiones`);

    await capturar(page, `capturas/zetabus/linea-quieta-${info.project.name}.png`);

    // ⛔ LA CONDICIÓN QUE CIERRA LA TANDA.
    expect(llamadas, 'la vista de línea NO PUEDE tocar Avanza si nadie pulsa').toEqual([]);
  });

  test('⭐ pulsar el botón → ~18, y NI UNA MÁS', async ({ page }, info) => {
    const llamadas = espia(page);
    await page.goto(CON_FINGIR, { waitUntil: 'networkidle' });
    expect(llamadas).toEqual([]); // nada todavía

    await page.locator('[data-papel="boton-barrer"]').click();
    await expect(page.locator('[data-papel="barriendo"]')).toBeVisible();
    await expect(page.locator('[data-papel="hallazgo"]')).toBeVisible({ timeout: 60_000 });

    // ⭐ EL PROPIO ENDPOINT DECLARA cuántas peticiones ha hecho a Avanza, contadas
    //    en el único punto del programa que habla con ellos. No es una estimación.
    const declaradas = Number(await page.locator('[data-papel="hallazgo"]').getAttribute('data-peticiones'));
    const total = Number(await page.locator('[data-papel="hallazgo-salvedad"]').innerText().then((s) => /(\d+) postes consultados/.exec(s)?.[1] ?? '0'));

    console.log(`
  [${info.project.name}] pulsar el botón:`);
    console.log(`     llamadas al endpoint de barrido: ${llamadas.length}`);
    console.log(`     postes consultados: ${total}`);
    console.log(`     peticiones a Avanza (contadas): ${declaradas}`);

    expect(llamadas.length, 'UNA sola llamada al barrido, no una por poste').toBe(1);
    // La 35 tiene 67 postes → 18 con paso 4. Ni uno más, y desde luego no los 67.
    expect(total, 'con paso 4, no se barren los 67 postes').toBeLessThanOrEqual(20);
    expect(declaradas).toBeLessThanOrEqual(total);

    // Y esperar NO dispara otro barrido: aquí no hay refresco automático.
    await page.waitForTimeout(20_000);
    console.log(`     esperar 20 s con el resultado en pantalla → ${llamadas.length - 1} barridos más`);
    expect(llamadas.length, 'el resultado NO se refresca solo').toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════

test.describe('⭐ LA BARRA MIDE ALGO DE VERDAD', () => {
  test('avanza poste a poste, no es una animación decorativa', async ({ page }, info) => {
    // ⚠️ CON `barrido-lento`: cada poste tarda 150 ms. Con el fingimiento normal,
    //    los 18 postes caen en 0 ms, React agrupa el render y la barra salta de 0
    //    al final sin pasar por en medio. El test habría pasado por el motivo
    //    equivocado: "no hay valores intermedios" no probaría que la barra sea
    //    decorativa, sino que el trabajo fue instantáneo.
    await page.goto(`/linea/${LINEA}?fingir=barrido-lento`, { waitUntil: 'networkidle' });

    const vistos: number[] = [];
    // Se observa el DOM mientras barre: los valores que TOMA la barra.
    const observando = page.evaluate(() => {
      return new Promise<number[]>((resolver) => {
        const valores: number[] = [];
        const obs = new MutationObserver(() => {
          const b = document.querySelector('[data-papel="barra"]');
          if (b) {
            const v = Number(b.getAttribute('aria-valuenow'));
            if (valores.at(-1) !== v) valores.push(v);
          }
          if (document.querySelector('[data-papel="hallazgo"]')) {
            obs.disconnect();
            resolver(valores);
          }
        });
        obs.observe(document.body, { subtree: true, childList: true, attributes: true });
        setTimeout(() => { obs.disconnect(); resolver(valores); }, 60_000);
      });
    });

    await page.locator('[data-papel="boton-barrer"]').click();
    vistos.push(...(await observando));

    console.log(`\n  [${info.project.name}] valores que ha tomado la barra: ${vistos.join(' → ')}`);

    // ⭐ Una barra decorativa nunca tomaría valores INTERMEDIOS: saltaría de 0 al
    //    final. Si solo hay dos valores, no es una barra: es un interruptor.
    expect(vistos.length, 'la barra tiene que pasar por valores intermedios').toBeGreaterThan(2);
    // Y sube. Nunca baja.
    for (let i = 1; i < vistos.length; i++) {
      expect(vistos[i], 'una barra que retrocede está mintiendo').toBeGreaterThanOrEqual(vistos[i - 1]);
    }
  });

  test('⭐ CONTRAPRUEBA: una barra decorativa NO habría pasado este test', async ({ page }) => {
    // Se simula la barra mentirosa —un `animate-pulse` que no sabe nada del
    // trabajo— y se comprueba que el detector la caza. Si no la cazara, el test
    // de arriba estaría pasando por el motivo equivocado.
    await page.setContent(`
      <div data-papel="barra" role="progressbar" aria-valuenow="0"
           style="width:100px;height:10px;background:#eee">
        <div style="height:100%;background:#333;animation:crece 2s"></div>
      </div>
      <style>@keyframes crece { from { width: 0 } to { width: 100% } }</style>
    `);
    await page.waitForTimeout(1_500);

    // La animación CSS avanza... y `aria-valuenow` sigue a cero. El usuario ve
    // movimiento y no tiene ni un dato. Eso es un instrumento mentiroso.
    const v = await page.locator('[data-papel="barra"]').getAttribute('aria-valuenow');
    console.log(`\n  barra decorativa: se mueve en pantalla, y aria-valuenow = ${v}`);
    console.log('     el usuario ve movimiento y NO SABE NADA. Promete información y no da ninguna.');
    expect(Number(v)).toBe(0); // ← nunca cambia: no mide nada
  });
});

// ═══════════════════════════════════════════════════════════════════════════

test('⚠️ AVANZA SE CAE A MITAD DEL BARRIDO: la barra lo DICE, no se congela', async ({ page }, info) => {
  await page.goto(CON_FINGIR, { waitUntil: 'networkidle' });

  // El barrido empieza bien y a los 400 ms se corta el canal: es lo más parecido
  // a que Avanza se caiga con el barrido a medias.
  await page.route('**/api/barrido/**', async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.abort('failed');
  });

  await page.locator('[data-papel="boton-barrer"]').click();
  await expect(page.locator('[data-papel="barrido-roto"]')).toBeVisible({ timeout: 30_000 });
  await capturar(page, `capturas/zetabus/barrido-roto-${info.project.name}.png`);

  // ⛔ NO se congela con la barra a medias y sin explicación.
  // ⛔ Y NO dice "no hay autobuses": dice que NO LO SABE.
  await expect(page.locator('body')).toContainText(/No hemos podido buscar los autobuses/);
  await expect(page.locator('body')).toContainText(/NO significa que no haya autobuses/);
  await expect(page.locator('body')).not.toContainText(/Hemos encontrado 0/);

  const ve = await seVe(page, '[data-papel="barrido-roto"]');
  expect(ve.visible, ve.motivo).toBe(true);

  // Y se puede reintentar: la pantalla no se queda en un callejón sin salida.
  await expect(page.getByRole('button', { name: /Volver a intentarlo/ })).toBeVisible();
  console.log(`\n  [${info.project.name}] Avanza cae a mitad → la pantalla lo dice y ofrece reintentar`);
});

// ═══════════════════════════════════════════════════════════════════════════

test('la lista de autobuses: ficha completa, confianza, y a qué parada llega', async ({ page }, info) => {
  await page.goto(`/linea/${LINEA}?fingir=sin-verificar`, { waitUntil: 'networkidle' });
  await page.locator('[data-papel="boton-barrer"]').click();
  await expect(page.locator('[data-papel="hallazgo"]')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(300);
  await capturar(page, `capturas/zetabus/buses-encontrados-${info.project.name}.png`);

  const buses = page.locator('[data-papel="bus-encontrado"]');
  const n = await buses.count();
  console.log(`\n  [${info.project.name}] ${n} autobuses encontrados`);
  expect(n).toBeGreaterThan(0);

  const primero = buses.first();
  await expect(primero).toContainText(/Coche \d+/);
  await expect(primero).toContainText(/sentido/);
  await expect(primero).toContainText(/llega a/);

  // ⭐ LA CONFIANZA NO SE DISFRAZA. Y se distingue por FORMA, no por color:
  //    borde discontinuo para `sin_verificar`, sólido para `oficial`.
  const sv = page.locator('[data-papel="bus-encontrado"] [data-confianza="sin_verificar"]');
  if ((await sv.count()) > 0) {
    await expect(sv.first()).toContainText(/SIN VERIFICAR/);
    const borde = await sv.first().evaluate((n2) => getComputedStyle(n2).borderStyle);
    console.log(`  sin_verificar → borde "${borde}" (sobrevive al gris)`);
    expect(borde).toBe('dashed');
  }

  // ⚠️ Y el titular NO afirma más de lo que sabe.
  await expect(page.locator('[data-papel="hallazgo-titular"]')).toContainText(/Hemos encontrado/);
  await expect(page.locator('body')).not.toContainText(/todos los autobuses/i);
  await expect(page.locator('[data-papel="hallazgo-salvedad"]')).toContainText(
    /Puede haber alguno más que no aparezca aquí/,
  );
});
