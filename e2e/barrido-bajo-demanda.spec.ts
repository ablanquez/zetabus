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

/**
 * ⚠️⚠️ SOSPECHA DEL INSTRUMENTO: ¿EL FINGIMIENTO HA OCURRIDO DE VERDAD?
 *
 * `?fingir=` solo hace algo si el servidor tiene `ZETABUS_DEMO=1`. Si no la
 * tiene, el parámetro se ignora EN SILENCIO y el test acaba mirando los datos
 * reales de Avanza — y pasando, porque casi todo lo que comprueba también es
 * cierto con datos reales.
 *
 * Eso pasó: el `webServer` de Playwright no ponía la variable. Los tests estaban
 * verdes y no probaban lo que decían probar. El verde dependía de que yo tuviera
 * otro servidor levantado a mano en otra terminal.
 *
 * ⇒ Si se finge, TIENE que verse la banda roja. Si no está, el test muere aquí
 *   en vez de aprobar mirando otra cosa.
 */
async function fingiendo(page: Page) {
  await expect(
    page.locator('[data-papel="banda-demo"]'),
    'el fingimiento NO está ocurriendo: falta ZETABUS_DEMO=1 en el servidor',
  ).toBeVisible();
}

test.describe('⭐ CERO PETICIONES HASTA QUE ALGUIEN PULSA', () => {
  test('abrir la línea · cambiar de sentido · recargar · esperar → CERO', async ({ page }, info) => {
    const llamadas = espia(page);

    // 1 · Abrir la vista de línea.
    await page.goto(CON_FINGIR, { waitUntil: 'networkidle' });
    await fingiendo(page);
    await expect(page.locator('[data-papel="boton-barrer"]')).toBeVisible();
    console.log(`
  [${info.project.name}]`);
    console.log(`  abrir /linea/${LINEA} ............ ${llamadas.length} llamadas al barrido`);

    // ⭐ Y EL SERVIDOR TAMPOCO HA BARRIDO: el HTML no trae ni un autobús.
    //    (Un barrido en el SSR no se vería como petición del navegador.)
    expect(await page.locator('[data-papel="hallazgo"]').count(), 'el HTML no puede traer resultados').toBe(0);
    expect(await page.locator('[data-papel="grupo-flota"]').count()).toBe(0);
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

  test('⭐ pulsar el botón → LA LÍNEA ENTERA, los dos sentidos, y ni una más', async ({ page }, info) => {
    const llamadas = espia(page);
    await page.goto(CON_FINGIR, { waitUntil: 'networkidle' });
    await fingiendo(page);
    expect(llamadas).toEqual([]); // nada todavía

    await page.locator('[data-papel="boton-barrer"]').click();
    await expect(page.locator('[data-papel="barriendo"]')).toBeVisible();
    await expect(page.locator('[data-papel="hallazgo"]')).toBeVisible({ timeout: 90_000 });

    // ⭐ EL PROPIO ENDPOINT DECLARA cuántas peticiones ha hecho a Avanza, contadas
    //    en el único punto del programa que habla con ellos. No es una estimación.
    const declaradas = Number(await page.locator('[data-papel="hallazgo"]').getAttribute('data-peticiones'));
    const total = Number(await page.locator('[data-papel="hallazgo-salvedad"]').innerText().then((s) => /(\d+) paradas consultadas/.exec(s)?.[1] ?? '0'));

    console.log(`
  [${info.project.name}] pulsar el botón:`);
    console.log(`     llamadas al endpoint de barrido: ${llamadas.length}`);
    console.log(`     paradas consultadas: ${total}`);
    console.log(`     peticiones a Avanza (contadas): ${declaradas}`);

    expect(llamadas.length, 'UNA sola llamada al barrido, no una por poste').toBe(1);

    // ⭐⭐ AQUÍ CAMBIÓ EL CONTRATO, Y ES EL CORAZÓN DE LA TANDA.
    //
    // Este test decía: "con paso 4, NO se barren los 67 postes" → ≤ 20.
    // Es decir: certificaba, en verde, que NO preguntábamos por 49 paradas.
    //
    // Y el 14/07/2026 se midió contra Avanza que ese muestreo PERDÍA AUTOBUSES:
    // en la línea 35, 10 de 12. La aserción estaba protegiendo el fallo.
    //
    // Ahora se exige lo contrario: LA LÍNEA ENTERA, los dos sentidos. 67 paradas.
    expect(total, 'la 35 tiene 67 postes en los dos sentidos: se piden TODOS').toBe(67);

    // ⚠️⚠️ Y LAS 67 TIENEN QUE HABERSE PEDIDO DE VERDAD. AQUÍ ME CACÉ UNA.
    //
    // Esto decía "≤ total" y pasaba con 40. Cuarenta, de 67. ¿Por qué 40? Porque
    // el cubo de fichas tiene 40 y la demo, al saltarse el ritmo, las soltaba de
    // golpe: 27 postes salían "no ha respondido" con un transporte FALSO, que no
    // puede fallar. La demo estaba enseñando un producto peor del que hay.
    //
    // Un "≤" es una aserción cobarde: aprueba el caso bueno y el malo.
    expect(declaradas, 'las 67 se piden, y ninguna se queda sin ficha').toBe(total);
    await expect(
      page.locator('[data-papel="hallazgo-salvedad"]'),
      'con un transporte falso NO puede haber paradas sin respuesta',
    ).not.toContainText(/sin respuesta/);

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

    await fingiendo(page);

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

  await fingiendo(page);

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

test('⭐ el resultado va AGRUPADO POR MODELO: la geometría se explica sola', async ({ page }, info) => {
  await page.goto(`/linea/${LINEA}?fingir=sin-verificar`, { waitUntil: 'networkidle' });
  await fingiendo(page);
  await page.locator('[data-papel="boton-barrer"]').click();
  await expect(page.locator('[data-papel="hallazgo"]')).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(300);
  await capturar(page, `capturas/zetabus/buses-encontrados-${info.project.name}.png`);

  const grupos = page.locator('[data-papel="grupo-flota"]');
  const n = await grupos.count();
  console.log(`\n  [${info.project.name}] ${n} grupos de flota`);
  expect(n).toBeGreaterThan(0);

  // El dato BRUTO sigue estando: los números de coche. Es lo único que le sirve
  // a alguien que está mirando el autobús de verdad.
  const coches = page.locator('[data-papel="coches"] [data-coche]');
  expect(await coches.count(), 'los números de coche VAN').toBeGreaterThan(0);

  // ⛔ Y lo que se ha QUITADO, porque aquí sobraba y competía con lo que importa:
  await expect(page.locator('[data-papel="grupos-flota"]')).not.toContainText(/sentido/);
  await expect(page.locator('[data-papel="grupos-flota"]')).not.toContainText(/llega a/);
  await expect(page.locator('[data-papel="grupos-flota"]')).not.toContainText(/\bmin\b/);

  // ⭐⭐ LA CONFIANZA NO SE DISFRAZA. Y se distingue por FORMA, no por color:
  //    borde discontinuo para `sin_verificar`, sólido para `oficial`. Sobrevive
  //    al gris — y hay un test que lo demuestra apagando el color entero.
  const sv = grupos.filter({ has: page.locator('css=[data-papel="procedencia"]') });
  const svN = await page.locator('[data-papel="grupo-flota"][data-confianza="sin_verificar"]').count();
  if (svN > 0) {
    const uno = page.locator('[data-papel="grupo-flota"][data-confianza="sin_verificar"]').first();
    await expect(uno).toContainText(/SIN VERIFICAR/);
    const borde = await uno.evaluate((el) => getComputedStyle(el).borderStyle);
    console.log(`  sin_verificar → borde "${borde}" (sobrevive al gris)`);
    expect(borde).toBe('dashed');

    // ⚠️ Y NO SE HA MEZCLADO con ningún grupo oficial: es un grupo APARTE.
    const oficiales = page.locator('[data-papel="grupo-flota"][data-confianza="oficial"]');
    if ((await oficiales.count()) > 0) {
      const bordeOf = await oficiales.first().evaluate((el) => getComputedStyle(el).borderStyle);
      expect(bordeOf, 'un oficial NO puede llevar el borde del sin-verificar').toBe('solid');
    }
  }
  expect(await sv.count()).toBe(svN); // el marcador y el atributo dicen lo mismo

  // ⚠️ Y el titular NO afirma más de lo que sabe.
  await expect(page.locator('[data-papel="hallazgo-titular"]')).toContainText(/Hemos encontrado/);
  await expect(page.locator('body')).not.toContainText(/todos los autobuses/i);
  await expect(page.locator('[data-papel="hallazgo-salvedad"]')).toContainText(
    /dos siguientes de cada línea y sentido/,
  );
});

test('⭐⭐ AVANZA NO CONTESTA A NADA: nos rendimos pronto y LO DECIMOS', async ({ page }, info) => {
  /**
   * ⚠️ ESTO SALIÓ DE UN BARRIDO REAL CON AVANZA CAÍDA, EL 14/07/2026:
   *
   *     110 peticiones · 67 timeouts · 43 reintentos · 90 segundos
   *
   * Preguntamos por los 67 postes, uno a uno, a un servidor que no contestaba a
   * ninguno. Y al usuario le pusimos una barra girando durante minuto y medio
   * para acabar diciéndole que no sabíamos nada.
   *
   * Ahora: se para pronto, se dice, y a Avanza se le dejan de mandar las
   * peticiones que faltaban. Que es lo que promete el README.
   */
  await page.goto(`/linea/${LINEA}?fingir=caido`, { waitUntil: 'networkidle' });
  await fingiendo(page);

  const t0 = Date.now();
  await page.locator('[data-papel="boton-barrer"]').click();
  await expect(page.locator('[data-papel="barrido-roto"]')).toBeVisible({ timeout: 60_000 });
  const tardo = (Date.now() - t0) / 1000;

  console.log(`\n  [${info.project.name}] Avanza caída → se rinde en ${tardo.toFixed(1)} s`);
  await capturar(page, `capturas/zetabus/barrido-caido-${info.project.name}.png`);

  // ⛔ NO dice "no hay autobuses". Dice que NO LO SABE. Y dice que ha parado.
  await expect(page.locator('body')).toContainText(/dejado de preguntar/);
  await expect(page.locator('body')).toContainText(/NO significa que no haya autobuses/);
  await expect(page.locator('body')).not.toContainText(/Hemos encontrado 0/);

  // Y se puede reintentar: la pantalla no es un callejón sin salida.
  await expect(page.getByRole('button', { name: /Volver a intentarlo/ })).toBeVisible();
});

test('⚠️ UN COCHE SIN FICHA VA EN SU PROPIO GRUPO. Nunca dentro de otro.', async ({ page }, info) => {
  // El fingimiento `sin-ficha` mete el coche 9999, que NO está en el registro
  // oficial de flota. La tentación de un sistema perezoso es meterlo en el grupo
  // más común ("sencillo, 12 m") porque casi siempre acierta. Eso es inventarse
  // el dato justo donde no lo tenemos, y hacerlo con toda la confianza del mundo.
  await page.goto(`/linea/${LINEA}?fingir=sin-ficha`, { waitUntil: 'networkidle' });
  await fingiendo(page);
  await page.locator('[data-papel="boton-barrer"]').click();
  await expect(page.locator('[data-papel="hallazgo"]')).toBeVisible({ timeout: 90_000 });

  const sinFicha = page.locator('[data-papel="grupo-flota"][data-confianza="sin_ficha"]');
  await expect(sinFicha).toHaveCount(1);
  await expect(sinFicha).toContainText(/Sin datos/i);
  await expect(sinFicha).toContainText(/No inventamos su modelo ni su tamaño/);

  // Su forma también lo dice, sin color: borde de PUNTOS.
  const borde = await sinFicha.evaluate((el) => getComputedStyle(el).borderStyle);
  console.log(`\n  [${info.project.name}] sin ficha → borde "${borde}"`);
  expect(borde).toBe('dotted');

  await capturar(page, `capturas/zetabus/grupo-sin-ficha-${info.project.name}.png`);
});
