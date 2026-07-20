/**
 * ⭐⭐ C1-C5 · EL BLOQUE DE PARADA EN LA VISTA DE LÍNEA, PULSADO DE VERDAD.
 *
 * Lo que importa aquí NO se puede comprobar leyendo el DOM: hay que PULSAR. El
 * bloque entero lleva a la parada; los chips de transbordo, dentro del bloque,
 * llevan a su línea. Y —la miga— sin un solo <a> anidado dentro de otro <a>.
 *
 * ⚠️ `?fingir=caido` hace que el fetch de la ruta de hoy falle → el itinerario cae a
 *    la ruta oficial del GTFS (horneada, sin red). Así se prueba la interacción SIN
 *    pedirle NADA a Avanza. La navegación (los <Link> de Next) es real igualmente.
 */

import { test, expect, type Page } from '@playwright/test';
import { capturar } from './lib/medir';

const LINEA = '/linea/35?fingir=caido';

const itinerario = (p: Page) => p.locator('[data-papel="itinerario"]');
/** Un nodo que TENGA transbordos: es el único donde se puede probar chip vs bloque. */
const nodoConChips = (p: Page) =>
  p.locator('[data-papel="nodo"]').filter({ has: p.locator('[data-papel="chip-transbordo"]') }).first();

async function abrir(page: Page) {
  await page.goto(LINEA, { waitUntil: 'networkidle' });
  await itinerario(page).waitFor();
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⛔ C4 · NI UN <a> ANIDADO DENTRO DE OTRO <a> (la miga)', () => {
  test('el itinerario NO contiene ningún <a> descendiente de otro <a>', async ({ page }) => {
    await abrir(page);
    // `a a` = un ancla dentro de otra. HTML inválido, y el navegador lo "arregla"
    // partiendo el DOM: al pulsar el chip se dispararían los dos destinos.
    const anidados = await itinerario(page).locator('a a').count();
    expect(anidados, 'hay un <a> dentro de otro <a>: se dispararían los dos enlaces').toBe(0);
  });

  test('⭐ CONTRAPRUEBA · si YO anido un <a> en otro, el detector lo caza', async ({ page }) => {
    await abrir(page);

    // ⚠️ Y AQUÍ APRENDÍ ALGO PROBÁNDOLO: NO se puede anidar un <a> escribiendo HTML.
    //    El parser del navegador REESCRIBE `<a><a>` a dos <a> HERMANOS —cierra el
    //    primero antes de abrir el segundo—, así que `page.setContent` nunca produce
    //    la anidación. Pero React NO escribe HTML: construye el DOM con appendChild,
    //    que SÍ deja meter un <a> dentro de otro. Ése es el <a> anidado que de verdad
    //    aparece cuando alguien mete un <Link> dentro de otro <Link>. Se reproduce
    //    con la misma API que usa React, para que el rojo sea el rojo de verdad.
    const anidadosDetectados = await page.evaluate(() => {
      // El contenedor NO es un <a> (como el <ol> del itinerario real). Dentro, un <a>
      // con otro <a> dentro — la anidación que el detector debe cazar.
      const caja = document.createElement('div');
      caja.setAttribute('data-papel', 'anidado-falso');
      const fuera = document.createElement('a');
      fuera.href = '/parada/1';
      const dentro = document.createElement('a');
      dentro.href = '/linea/2';
      dentro.textContent = '2';
      fuera.appendChild(dentro); // ⛔ <a> dentro de <a>, como haría un <Link> en <Link>
      caja.appendChild(fuera);
      document.body.appendChild(caja);
      return document.querySelectorAll('[data-papel="anidado-falso"] a a').length;
    });

    expect(anidadosDetectados, 'el detector NO caza un <a> anidado hecho por DOM: no vale como prueba')
      .toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ C2 · TODO EL BLOQUE LLEVA A LA PARADA', () => {
  test('pulsar el NOMBRE → /parada', async ({ page }) => {
    await abrir(page);
    const nodo = nodoConChips(page);
    const poste = await nodo.getAttribute('data-poste');
    await nodo.locator('[data-papel="ir-a-parada"]').click();
    await page.waitForURL(/\/parada\//);
    expect(page.url()).toContain(`/parada/${poste}`);
  });

  test('⭐ pulsar el CHIP DE POSTE (que no es un enlace) → también /parada, por la zona estirada', async ({ page }) => {
    await abrir(page);
    const nodo = nodoConChips(page);
    const poste = await nodo.getAttribute('data-poste');
    const chip = nodo.locator('[data-papel="chip-poste"]');

    // ⭐ LA PRUEBA DIRECTA DE LA ZONA ESTIRADA: en el CENTRO del chip de poste, el
    //    elemento que recibe el clic es el ENLACE DE LA PARADA, no el chip. Es lo que
    //    Playwright llama "intercepts pointer events" — y aquí es EXACTAMENTE lo que
    //    se quiere: el ::after del enlace cubre el chip. Se comprueba con la propia
    //    API del navegador (elementFromPoint), que es la que decide quién recibe el clic.
    const caja = (await chip.boundingBox())!;
    const quienRecibeElClic = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('a')?.getAttribute('data-papel') ?? el?.tagName ?? 'nada';
    }, { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 });
    expect(quienRecibeElClic, 'el chip de poste NO está cubierto por la zona de la parada').toBe('ir-a-parada');

    // Y al pulsar ahí (forzando, porque el chip está cubierto — que es el punto), se navega a la parada.
    await chip.click({ force: true });
    await page.waitForURL(new RegExp(`/parada/${poste}\\b`));
    expect(page.url()).toContain(`/parada/${poste}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ C4 · LOS CHIPS DE TRANSBORDO LLEVAN A SU LÍNEA, NO A LA PARADA', () => {
  test('pulsar un chip → /linea/X · y NO acaba en /parada', async ({ page }, info) => {
    await abrir(page);
    const nodo = nodoConChips(page);
    const posteParada = await nodo.getAttribute('data-poste');
    const chip = nodo.locator('[data-papel="chip-transbordo"]').first();
    const etiqueta = (await chip.getAttribute('data-linea')) ?? (await chip.innerText()).trim();
    console.log(`\n  [${info.project.name}] chip "${etiqueta}" en la parada del poste ${posteParada}`);

    await chip.click();
    // ⚠️ Se espera el DESTINO CONCRETO (/linea/42), no un /linea/ cualquiera: ya
    //    estábamos EN /linea/35, así que un `waitForURL(/linea/)` casaría al instante
    //    sin que hubiera navegado nada. Ese fue el fallo de mi primera versión.
    await page.waitForURL(new RegExp(`/linea/${etiqueta}\\b`), { timeout: 10_000 });

    const url = decodeURIComponent(page.url());
    // ⭐ LO QUE IMPORTA: fue a la LÍNEA del chip, y NO a la parada. Si se dispararan
    //    los dos (por un <a> anidado), acabaríamos en /parada, el enlace exterior.
    expect(url).toContain(`/linea/${etiqueta}`);
    expect(url, `el chip acabó en la parada ${posteParada}: se dispararon los dos enlaces`)
      .not.toContain(`/parada/${posteParada}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⚠️ BACKTEST · el borde entre el chip y el área de la parada', () => {
  test('DENTRO del chip gana el chip; UN PÍXEL FUERA gana la parada', async ({ page }, info) => {
    await abrir(page);
    const nodo = nodoConChips(page);
    const chip = nodo.locator('[data-papel="chip-transbordo"]').first();
    const caja = (await chip.boundingBox())!;

    const quien = (x: number, y: number) =>
      page.evaluate(({ x, y }) => {
        const a = document.elementFromPoint(x, y)?.closest('a');
        return a?.getAttribute('data-papel') ?? a?.getAttribute('data-linea') ?? 'chip-transbordo-o-parada';
      }, { x, y });

    // Centro del chip → el chip (que flota por encima de la zona estirada).
    const dentro = await quien(caja.x + caja.width / 2, caja.y + caja.height / 2);
    // 6 px por debajo del borde inferior del chip → ya es zona de la parada.
    const fuera = await quien(caja.x + caja.width / 2, caja.y + caja.height + 6);

    console.log(`\n  [${info.project.name}] dentro del chip → "${dentro}" · fuera → "${fuera}"`);
    // Dentro NO puede ganar la parada; fuera SÍ es la parada. El límite es nítido.
    expect(dentro, 'dentro del chip ha ganado la parada: el chip no captura su propio clic').not.toBe('ir-a-parada');
    expect(fuera, 'justo fuera del chip debería ganar la zona de la parada').toBe('ir-a-parada');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ C3 · FEEDBACK TÁCTIL: al pulsar, el bloque cambia', () => {
  test('mantener pulsado el bloque le cambia el fondo (y soltar lo devuelve)', async ({ page }, info) => {
    await abrir(page);
    const nodo = nodoConChips(page);
    const bloque = nodo.locator('[data-papel="bloque-parada"]');

    const fondo = () => bloque.evaluate((el) => getComputedStyle(el).backgroundColor);
    const enReposo = await fondo();

    // Se pulsa (mousedown) sobre el nombre y se mide el fondo SIN soltar.
    const caja = await nodo.locator('[data-papel="ir-a-parada"]').boundingBox();
    await page.mouse.move(caja!.x + 20, caja!.y + caja!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(80);
    const pulsado = await fondo();
    await capturar(page, `capturas/zetabus/BLOQUE-pulsado-${info.project.name}.png`);
    await page.mouse.up();
    await page.waitForTimeout(80);
    const trasSoltar = await fondo();

    console.log(`\n  [${info.project.name}] fondo reposo=${enReposo} · pulsado=${pulsado} · soltado=${trasSoltar}`);
    expect(pulsado, 'al pulsar el bloque NO cambia el fondo: sin feedback táctil').not.toBe(enReposo);

    /**
     * ⚠️ AQUÍ ANTES SE EXIGÍA LO CONTRARIO: `expect(trasSoltar).toBe(enReposo)`,
     * o sea "el feedback SE RETIRA al soltar". Y ESTE TEST HIZO SU TRABAJO: se
     * puso rojo el día que cambiamos el contrato, en vez de dejarlo pasar.
     *
     * ⭐ EL CONTRATO NUEVO ES EL OPUESTO, Y A PROPÓSITO: al soltar, el bloque SE
     * QUEDA MARCADO hasta que llega la pantalla nueva. Apagarlo al soltar dejaba
     * un hueco mudo —entre el dedo y la pantalla— en el que una persona con mala
     * cobertura vuelve a pulsar porque cree que no ha entrado. Ver
     * `components/AcuseDeToque.tsx` y `e2e/acuse-de-toque.spec.ts`, que es donde
     * se prueba la persistencia y la vuelta a reposo al navegar atrás.
     *
     * Lo que este test sigue guardando es lo suyo: que el toque SE ACUSA.
     */
    expect(trasSoltar, 'la marca desapareció al soltar: vuelve el hueco mudo').not.toBe(enReposo);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ C1 · TRES LÍNEAS, Y EL POSTE ES UN CHIP DE LA MISMA FAMILIA', () => {
  test('nombre, chip de poste y transbordos están cada uno en su altura', async ({ page }, info) => {
    await abrir(page);
    const nodo = nodoConChips(page);
    const y = async (sel: string) =>
      (await nodo.locator(sel).first().boundingBox())!.y;

    const yNombre = await y('[data-papel="ir-a-parada"]');
    const yPoste = await y('[data-papel="chip-poste"]');
    const yChip = await y('[data-papel="chip-transbordo"]');
    console.log(`\n  [${info.project.name}] nombre y=${Math.round(yNombre)} · poste y=${Math.round(yPoste)} · chip y=${Math.round(yChip)}`);

    // Tres líneas: cada bloque estrictamente por debajo del anterior.
    expect(yPoste).toBeGreaterThan(yNombre);
    expect(yChip).toBeGreaterThan(yPoste);
  });

  test('el chip de poste es de la familia chip-meta (la misma que "provisional · desvío")', async ({ page }) => {
    await abrir(page);
    // C1: poste y "provisional · desvío" son del mismo rango → misma familia visual.
    // El poste está SIEMPRE; el provisional solo en desvío (fotografiado en vivo en el
    // backtest, poste 1248 de la línea 21). Ambos comparten la clase base `chip-meta`
    // en el código, así que basta con anclar aquí el poste: si alguien rompe la familia,
    // este ancla salta. Y si HAY un provisional en pantalla, se comprueba también.
    const clasePoste = await page.locator('[data-papel="chip-poste"]').first().getAttribute('class');
    expect(clasePoste).toContain('chip-meta');

    const prov = page.locator('[data-papel="parada-provisional"]');
    if (await prov.count() > 0) {
      expect(await prov.first().getAttribute('class')).toContain('chip-meta');
    }
  });

  test('⚠️ una parada SIN transbordos no deja una tercera línea vacía', async ({ page }) => {
    await abrir(page);
    // Un nodo que NO tenga chips de transbordo: la lista de transbordos no debe
    // existir (no un <ul> vacío ocupando sitio).
    const sinChips = page.locator('[data-papel="nodo"]')
      .filter({ hasNot: page.locator('[data-papel="chip-transbordo"]') })
      .first();
    const cuenta = await sinChips.count();
    test.skip(cuenta === 0, 'esta línea no tiene ninguna parada sin transbordos');
    await expect(sinChips.locator('[data-papel="transbordos"]')).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ C5 · FUERA LA LEYENDA DE LOS CUADRADITOS', () => {
  test('la vista de línea ya NO explica los cuadraditos con un rótulo', async ({ page }) => {
    await abrir(page);
    const html = await page.content();
    expect(html, 'la leyenda de los cuadraditos sigue ahí: geometría, no rótulos')
      .not.toContain('cuadraditos de colores');
  });
});
