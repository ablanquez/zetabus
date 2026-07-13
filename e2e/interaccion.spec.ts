/**
 * ⭐ PROBAR LA INTERACCIÓN. La capa que me faltó al auditar la referencia.
 *
 * La leí. La medí. **Y NUNCA LA USÉ.** Se me escapó lo mejor de su pantalla —el
 * filtro que apaga la lista y el mapa A LA VEZ— porque nunca pulsé un botón.
 *
 * No se puede probar la geometría de una pantalla y decir que está probada.
 * Una pantalla no es una foto: es lo que HACE cuando la tocas.
 *
 * ⚠️ Y EL FILTRO ES EL CANDIDATO PERFECTO A MENTIR EN SILENCIO:
 * si apagara la lista pero NO el mapa (Tanda 5), el usuario vería 2 autobuses
 * en la lista y 4 pines en el mapa. Coherente, precioso, y falso. Por eso el
 * estado es UNO SOLO, y por eso este test existe desde ANTES de que haya mapa.
 */

import { test, expect } from '@playwright/test';
import { capturar } from './lib/medir';

const POSTE = 744;
/** Un poste con DOS líneas distintas para poder filtrar de verdad. */
const URL = `/parada/${POSTE}?fingir=dos-lineas`;

const filas = (p: import('@playwright/test').Page) => p.locator('[data-papel="llegada"]');
const chips = (p: import('@playwright/test').Page) => p.locator('[data-papel="chip-filtro"]');

test.describe('⭐ EL FILTRO DE LÍNEAS (clonado de la referencia)', () => {
  test('apagar una línea la quita de la lista', async ({ page }, info) => {
    await page.goto(URL, { waitUntil: 'networkidle' });

    const n0 = await filas(page).count();
    const nChips = await chips(page).count();
    console.log(`\n  [${info.project.name}] inicio: ${n0} autobuses · ${nChips} chips de filtro`);
    expect(nChips, 'hacen falta al menos dos líneas para poder filtrar').toBeGreaterThan(1);

    await capturar(page, `capturas/zetabus/filtro-ANTES-${info.project.name}.png`);

    const chip = chips(page).first();
    const linea = await chip.getAttribute('data-linea');
    await chip.click();
    await page.waitForTimeout(200);

    const n1 = await filas(page).count();
    const quedan = await page.locator(`[data-papel="llegada"] [data-linea="${linea}"]`).count();
    const apagada = await chip.getAttribute('data-apagada');

    console.log(`  apago la línea ${linea}: ${n0} → ${n1} autobuses · quedan ${quedan} de esa línea · chip apagado: ${apagada}`);
    await capturar(page, `capturas/zetabus/filtro-UNA-APAGADA-${info.project.name}.png`);

    expect(n1, 'apagar una línea tiene que quitar filas').toBeLessThan(n0);
    expect(quedan, 'no puede quedar NI UNA fila de la línea apagada').toBe(0);
    expect(apagada).toBe('si');
    // Y el chip apagado se distingue por FORMA (tachado + borde discontinuo).
    const deco = await chip.evaluate((n) => getComputedStyle(n).textDecorationLine);
    expect(deco).toContain('line-through');

    // ⚠️ Y SE DICE CUÁNTOS SE ESTÁN OCULTANDO. Si no, la lista corta parecería
    //    "no hay más autobuses" — un silencio falso fabricado por la interfaz.
    await expect(page.locator('[data-papel="ocultos-por-filtro"]')).toBeVisible();
  });

  test('volver a pulsarla la enciende (vuelve al estado exacto)', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'networkidle' });
    const n0 = await filas(page).count();
    const chip = chips(page).first();
    await chip.click();
    await page.waitForTimeout(150);
    await chip.click();
    await page.waitForTimeout(150);
    expect(await filas(page).count()).toBe(n0);
    expect(await page.locator('[data-papel="ocultos-por-filtro"]').count()).toBe(0);
  });

  test('"Ninguna" apaga TODO — y NO dice "no hay autobuses"', async ({ page }, info) => {
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Ninguna' }).click();
    await page.waitForTimeout(200);

    expect(await filas(page).count()).toBe(0);
    await capturar(page, `capturas/zetabus/filtro-NINGUNA-${info.project.name}.png`);

    // ⭐ LA TRAMPA, Y ES EXACTAMENTE EL FALLO QUE PERSIGUE ESTE PROYECTO:
    //    "has apagado todas las líneas" NO ES "no hay autobuses". Si la pantalla
    //    dijera lo segundo, estaría fabricando un silencio falso ELLA MISMA —
    //    con el motor diciendo la verdad justo debajo.
    await expect(page.locator('[data-papel="todas-apagadas"]')).toBeVisible();
    await expect(page.locator('body')).toContainText(/Has ocultado todas las líneas/);
    await expect(page.locator('body')).toContainText(/Sí hay autobuses viniendo/);
    await expect(page.locator('body')).not.toContainText(/no viene ningún autobús/i);
  });

  test('"Todas" vuelve al estado inicial exacto', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'networkidle' });
    const n0 = await filas(page).count();
    await page.getByRole('button', { name: 'Ninguna' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Todas' }).click();
    await page.waitForTimeout(150);
    expect(await filas(page).count()).toBe(n0);
  });

  test('⚠️ el filtro SOBREVIVE al refresco de 15 s', async ({ page }) => {
    // En la referencia, el filtro y la selección sobreviven al refresco. Lo medí
    // pulsando. Si aquí se reseteara, el usuario apagaría una línea y la vería
    // reaparecer sola quince segundos después. Nadie reportaría eso: pensaría
    // que se ha equivocado al pulsar.
    await page.goto(URL, { waitUntil: 'networkidle' });
    const n0 = await filas(page).count();

    await chips(page).first().click();
    await page.waitForTimeout(150);
    const filtrado = await filas(page).count();
    expect(filtrado).toBeLessThan(n0);

    // Se fuerza un refresco real.
    await page.locator('button[aria-label="Actualizar ahora"]').click();
    await page.waitForTimeout(1_200);

    console.log(`\n  tras refrescar: ${await filas(page).count()} autobuses (antes del refresco: ${filtrado})`);
    expect(await filas(page).count(), 'el filtro NO puede resetearse solo').toBe(filtrado);
    expect(await chips(page).first().getAttribute('data-apagada')).toBe('si');
  });

  test('⭐ CONTRAPRUEBA: si el filtro no filtrara, la lista no cambiaría', async ({ page }) => {
    await page.goto(URL, { waitUntil: 'networkidle' });
    const n0 = await filas(page).count();
    // No se pulsa nada: la lista tiene que seguir igual. Si este test y el de
    // arriba dieran el mismo número, el "filtro" no estaría filtrando nada y los
    // demás tests estarían pasando por el motivo equivocado.
    await page.waitForTimeout(200);
    expect(await filas(page).count()).toBe(n0);
    expect(n0).toBeGreaterThan(1); // y tiene que haber algo que filtrar
  });
});

// ═══════════════════════════════════════════════════════════════════════════

test.describe('⭐ EL ITINERARIO (clonado: nodos + transbordos)', () => {
  test('tiene nodos, transbordos, y se puede pulsar una parada', async ({ page }, info) => {
    await page.goto('/linea/21', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1_500);
    await capturar(page, `capturas/zetabus/itinerario-${info.project.name}.png`);

    const nodos = page.locator('[data-papel="nodo"]');
    const transbordos = page.locator('[data-papel="transbordos"] a');
    const n = await nodos.count();
    const t = await transbordos.count();

    console.log(`\n  [${info.project.name}] itinerario de la 21: ${n} paradas · ${t} chips de transbordo`);
    console.log('     (en la referencia, jugando con ella: 34 paradas · 61 transbordos)');

    expect(n, 'el itinerario tiene paradas').toBeGreaterThan(20);
    expect(t, '⭐ LOS TRANSBORDOS son lo mejor que se les ha copiado').toBeGreaterThan(20);

    // Un transbordo LLEVA a la otra línea.
    const href = await transbordos.first().getAttribute('href');
    expect(href).toMatch(/^\/linea\//);

    // Y una parada lleva a sus llegadas. (Se ESPERA a la URL: la página de parada
    // consulta a Avanza y tarda; un `waitForTimeout` fijo pasaría o fallaría según
    // lo lenta que esté la red — un test que depende de la suerte no es un test.)
    await nodos.first().locator('a').first().click();
    await page.waitForURL(/\/parada\//, { timeout: 20_000 });
    expect(page.url()).toContain('/parada/');
  });

  test('el SENTIDO se puede compartir por URL (la referencia no podía)', async ({ page }) => {
    // Su `?sentido=` se leía y NUNCA se generaba: no se podía enlazar al sentido 2.
    // Lo comprobé pulsando: la lista cambiaba y la URL no.
    await page.goto('/linea/21', { waitUntil: 'networkidle' });
    const primera0 = await page.locator('[data-papel="nodo"]').first().innerText();

    const pestanas = page.locator('nav[aria-label="Sentido"] a');
    expect(await pestanas.count()).toBe(2);
    await pestanas.nth(1).click();
    await page.waitForURL(/sentido=/);
    await page.waitForTimeout(800);

    const primera1 = await page.locator('[data-papel="nodo"]').first().innerText();
    console.log(`\n  sentido 0 empieza en: "${primera0.split('\n')[0]}"`);
    console.log(`  sentido 1 empieza en: "${primera1.split('\n')[0]}"`);
    console.log(`  ⭐ la URL SÍ lo lleva: ${page.url()}  ← se puede compartir`);

    expect(primera1).not.toBe(primera0);
    expect(page.url()).toContain('sentido=');
  });
});

// ═══════════════════════════════════════════════════════════════════════════

test('⭐ EL AVISO NO PUEDE GRITAR MÁS QUE EL DATO', async ({ page }, info) => {
  // ⚠️ EL BLOQUE DE AVISOS DE /linea/35 ESTABA ROTO: tres avisos de timeout que
  //    ocupaban MÁS que el recuento, repetían tres veces la misma explicación, y
  //    enseñaban la URL del endpoint de Avanza.
  //
  //    Y el daño no es estético: un aviso que grita más que el dato hace que se
  //    dejen de leer LOS DOS. El usuario aprende a saltarse los avisos, y
  //    entonces el día que el aviso IMPORTA tampoco lo lee.
  await page.goto('/linea/35', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2_500);
  await capturar(page, `capturas/zetabus/linea-avisos-${info.project.name}.png`);

  // ⚠️ AVANZA SE CAE. HOY MISMO, MIENTRAS ESCRIBÍA ESTO, SE CAYÓ:
  //
  //     curl -X POST gps.avanzabus.com/.../fRefrescaEmpresaExternos
  //     → HTTP 000, timeout a los 20 s
  //
  // Y la pantalla hizo lo correcto: "No hemos podido contar los autobuses de la
  // línea 35. Esto NO significa que no haya autobuses: significa que no lo
  // sabemos."  Ese es un estado LEGÍTIMO, no un fallo del test.
  //
  // ⇒ Un test que solo pasa cuando la fuente AJENA está sana NO ES UN TEST: es
  //   un test de Avanza. Y nosotros no controlamos Avanza. Se comprueban LOS DOS
  //   caminos, y en los dos la pantalla tiene que ser honesta.
  const fallido = page.locator('[data-papel="recuento-fallido"]');
  if ((await fallido.count()) > 0) {
    console.log(`
  [${info.project.name}] Avanza NO responde ahora mismo.`);
    await expect(fallido).toContainText(/NO significa que no haya autobuses/);
    await expect(page.locator('body')).not.toContainText('gps.avanzabus.com');
    // ⛔ Y NUNCA, JAMÁS, "no hay autobuses en esta línea".
    await expect(page.locator('body')).not.toContainText(/no detectamos ningún autobús/i);
    return;
  }

  const recuento = page.locator('[data-papel="recuento"]');
  await expect(recuento).toBeVisible();
  const cajaRec = (await recuento.boundingBox())!;

  const avisos = page.locator('[data-papel="avisos-barrido"]');
  if ((await avisos.count()) === 0) {
    console.log(`\n  [${info.project.name}] (ningún poste falló: no hay aviso que medir)`);
    return;
  }
  const cajaAv = (await avisos.boundingBox())!;

  console.log(`\n  [${info.project.name}] recuento: ${Math.round(cajaRec.height)} px de alto`);
  console.log(`               aviso:    ${Math.round(cajaAv.height)} px de alto`);

  // ⭐ EL RECUENTO MANDA. Siempre.
  expect(cajaAv.height, 'el aviso NO puede ser más alto que el recuento').toBeLessThan(cajaRec.height);

  // El detalle está PLEGADO por defecto.
  expect(await page.locator('[data-papel="avisos-detalle"]').count()).toBe(0);

  // ⛔ Y LA URL DEL ENDPOINT DE AVANZA NO SE ENSEÑA. Eso es para el log.
  await expect(page.locator('body')).not.toContainText('gps.avanzabus.com');

  // ⭐ Y LA PANTALLA NO PUEDE CONTRADECIRSE CONSIGO MISMA.
  //    Llegó a decir, a la vez: "Detectamos 4 autobuses" y "17 de 17 postes NO
  //    RESPONDIERON". Si no respondió ninguno, ¿de dónde salían los cuatro?
  //    De la caché — y servirlos estaba bien. Lo que estaba mal era el resumen,
  //    que contaba como "fallido" a todo poste que generase un aviso, incluidos
  //    los que SÍ dieron dato, solo que viejo.
  const detectados = Number(await recuento.getAttribute('data-total'));
  const texto = await page.locator('[data-papel="avisos-barrido"]').innerText();
  const m = /(\d+) de (\d+) postes no respondieron/.exec(texto);
  if (m && detectados > 0) {
    const [, fallidos, consultados] = m.map(Number);
    console.log(`  detectados: ${detectados} · postes fallidos: ${fallidos}/${consultados}`);
    expect(
      fallidos,
      `⛔ dice que detecta ${detectados} autobuses Y que NINGÚN poste respondió. Imposible.`,
    ).toBeLessThan(consultados);
  }

  // Pero si alguien lo pide, está.
  await avisos.locator('button').click();
  await page.waitForTimeout(200);
  await expect(page.locator('[data-papel="avisos-detalle"]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('gps.avanzabus.com'); // ni desplegado
  console.log('  ✅ el detalle se despliega si se pide · la URL de Avanza NO aparece ni desplegada');
});
