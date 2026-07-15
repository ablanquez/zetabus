/**
 * ⭐⭐ B3 · B4 · B5 · B6 — EL MAPA. Y AQUÍ EL INSTRUMENTO NO SE FÍA DE MÍ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL ZOOM **SE LEE DEL `src` DE LOS TILES**, NO DE MI CÓDIGO.
 *
 *  Podría preguntarle a Leaflet `map.getZoom()`. Sería mentirme: le estaría
 *  preguntando al mismo objeto al que le he pedido el zoom. Si mi `setView` no se
 *  aplicara —porque otro efecto lo pisa, porque llega tarde, porque el contenedor
 *  aún mide 0 px— el objeto diría "16" tan tranquilo y el usuario vería otra cosa.
 *
 *  Los `<img>` de los tiles llevan la URL `.../{z}/{x}/{y}.png`. **Ese `z` es el
 *  zoom que el navegador ha pedido de verdad**, y es lo único que demuestra qué
 *  está viendo una persona. Es el equivalente a medir el píxel en vez del CSS —
 *  la lección que este proyecto ya ha aprendido nueve veces por las malas.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y NO SE DESCARGA NI UN TILE. Se abortan todas las peticiones a
 *    tile.openstreetmap.org: su política de uso prohíbe el tráfico automatizado a
 *    granel, y cinco viewports × N tests × 20 tiles serían miles de peticiones a un
 *    servidor que alguien paga. El `src` del `<img>` está puesto ANTES de que la
 *    petición salga, así que se mide igual de bien. **El mapa se prueba sin gastarle
 *    ancho de banda a nadie** — la misma regla que con Avanza.
 */

import { test, expect, type Page } from '@playwright/test';
import { capturar, contraste, TACTIL_MINIMO } from './lib/medir';

/**
 * El fingimiento `mapa` trae los tres casos feos a la vez:
 *   4889 · 1 min  · CON GPS  → inminente (late)
 *   4132 · 3 min  · CON GPS  → otra línea, otro color
 *   4845 · 7 min  · SIN GPS  → NO se pinta. Y se dice.
 *   4610 · 12 min · CON GPS  → a 3,6 km: FUERA del encuadre de barrio
 */
const URL = '/parada/744?fingir=mapa';

const ZOOM_SUELO = 14;
const ZOOM_TECHO = 16;

const buses = (p: Page) => p.locator('.zb-bus');
const pin = (p: Page) => p.locator('.zb-parada');
const filas = (p: Page) => p.locator('[data-papel="llegada"]');

/** Ni un byte a OpenStreetMap. Y el `src` se lee igual. */
async function sinGastarTiles(page: Page) {
  await page.route('**/tile.openstreetmap.org/**', (r) => r.abort());
}

async function abrir(page: Page) {
  await sinGastarTiles(page);
  await page.goto(URL, { waitUntil: 'networkidle' });
  // El mapa es `dynamic({ssr:false})`: hay que esperar a que se monte de verdad.
  await pin(page).first().waitFor({ state: 'attached', timeout: 15_000 });
  await page.waitForTimeout(600); // que se asienten fitBounds/setView
}

/** ⭐ EL ZOOM REAL: el que el navegador ha pedido en la URL de los tiles. */
async function zoomDeLosTiles(page: Page): Promise<number[]> {
  const srcs = await page.locator('.leaflet-tile').evaluateAll((els) =>
    els.map((e) => (e as HTMLImageElement).src),
  );
  const zs = srcs
    .map((s) => /tile\.openstreetmap\.org\/(\d+)\//.exec(s)?.[1])
    .filter((z): z is string => !!z)
    .map(Number);
  // ⚠️ Si no hay ni un tile, el test NO puede decir "el zoom está bien": no ha
  //    medido nada. Que reviente aquí y no más adelante con un verde vacío.
  expect(zs.length, 'no se ha cargado ni un tile: el mapa no se ha montado').toBeGreaterThan(0);
  return zs;
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('⭐ B3 · el zoom abre en la parada, no en media provincia', () => {
  test('el zoom real está entre el suelo (14) y el techo (16)', async ({ page }, info) => {
    await abrir(page);

    const zs = await zoomDeLosTiles(page);
    const min = Math.min(...zs);
    const max = Math.max(...zs);
    console.log(
      `\n  [${info.project.name}] zoom LEÍDO DE LOS TILES: ${[...new Set(zs)].sort().join(', ')}`,
    );

    /**
     * ⛔ EL ROJO QUE ESTE TEST ENSEÑA: con el `fitBounds` de antes (sin suelo), el
     *    4610 está a 3,6 km y el encuadre se abría a **zoom 12** — 9,4 km de ancho.
     *    Medio Zaragoza, que es literalmente lo que Antonio vio con los ojos.
     */
    expect(min, `zoom ${min}: el mapa se ha alejado por debajo del suelo`).toBeGreaterThanOrEqual(
      ZOOM_SUELO,
    );
    expect(max, `zoom ${max}: el mapa se ha acercado por encima del techo`).toBeLessThanOrEqual(
      ZOOM_TECHO,
    );
  });

  test('la parada CABE en el encuadre, y no por casualidad', async ({ page }) => {
    await abrir(page);

    /**
     * ⛔ AQUÍ MEDÍA CONTRA `[data-papel="lienzo-mapa"]` Y **NO EXISTÍA**.
     *
     * `MapContainer` no reenvía los `data-*` a su `<div>`. El gancho estaba escrito en
     * el componente desde la Tanda 4 y nunca llegó al DOM. Este test fue el primero en
     * intentar usarlo, y se cayó — que es lo que tenía que pasar. Si lo hubiera usado
     * con un `?.` complaciente, habría medido `null` y aprobado sin mirar nada.
     *
     * Se mide contra `.leaflet-container`, que es lo que Leaflet pone de verdad.
     */
    const lienzo = await page.locator('.leaflet-container').boundingBox();
    const parada = await pin(page).boundingBox();
    expect(lienzo, 'no hay lienzo de mapa que medir').not.toBeNull();
    expect(parada, 'no hay pin de parada').not.toBeNull();

    // La punta del pin (abajo, en el centro) es LA COORDENADA de la parada.
    const px = parada!.x + parada!.width / 2;
    const py = parada!.y + parada!.height;
    expect(px).toBeGreaterThanOrEqual(lienzo!.x);
    expect(px).toBeLessThanOrEqual(lienzo!.x + lienzo!.width);
    expect(py).toBeGreaterThanOrEqual(lienzo!.y);
    expect(py).toBeLessThanOrEqual(lienzo!.y + lienzo!.height);
  });

  test('⚠️ y el precio de B3 SE PAGA A LA VISTA: el bus lejano se cuenta', async ({ page }, info) => {
    await abrir(page);

    const aviso = page.locator('[data-papel="fuera-del-encuadre"]');
    await expect(aviso, 'el 4610 está a 3,6 km: TIENE que quedar fuera y decirse').toBeVisible();
    console.log(`  [${info.project.name}] ${(await aviso.innerText()).split('\n')[0]}`);

    // Y el botón ROMPE el suelo de zoom a propósito: si no, no serviría de nada.
    await page.locator('[data-papel="encuadrar-todos"]').click();
    await page.waitForTimeout(800);

    const zs = await zoomDeLosTiles(page);
    expect(
      Math.min(...zs),
      'ha pulsado «Encuadrarlos» y el mapa NO se ha alejado: el botón no hace nada',
    ).toBeLessThan(ZOOM_SUELO);
    await expect(aviso).toBeHidden();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('⭐ B4 · el marcador de autobús: icono + número + punta', () => {
  test('lleva glifo de autobús, el número, y una punta que SEÑALA', async ({ page }, info) => {
    await abrir(page);
    await expect(buses(page)).toHaveCount(3); // 4 llegadas − 1 sin GPS

    const primero = buses(page).first();
    // El glifo (un `rect` = la carrocería) y la punta (un `path`).
    expect(await primero.locator('svg rect').count(), 'falta el glifo de autobús').toBeGreaterThan(0);
    expect(await primero.locator('svg path').count(), 'falta la punta').toBeGreaterThan(0);
    await expect(primero).toContainText(/\d/); // el número de línea

    // ⚠️ WCAG 2.5.8: esto SE PULSA (aísla el autobús). 24×24 como mínimo.
    const caja = await primero.boundingBox();
    expect(caja!.width).toBeGreaterThanOrEqual(TACTIL_MINIMO);
    expect(caja!.height).toBeGreaterThanOrEqual(TACTIL_MINIMO);
    console.log(`\n  [${info.project.name}] marcador: ${Math.round(caja!.width)}×${Math.round(caja!.height)} px`);
  });

  /**
   * ⭐⭐ EL NÚMERO DEL MARCADOR SE LEE — Y AHORA POR REGLA DE MARCA + CONTORNO.
   *
   * El número de una diurna es SIEMPRE blanco (coherencia de marca), y se lee sobre
   * CUALQUIER color de línea por un TRAZO NEGRO (`.zb-num-contorno`), no oscureciendo
   * el fondo (eso colapsaba 20 pares de líneas al mismo tono). La legibilidad ya NO
   * es "relleno vs fondo" —el blanco solo sobre la 29 da 1,68:1— sino:
   *
   *     sobre un fondo CLARO manda el TRAZO (negro); sobre uno OSCURO, el RELLENO.
   *     ⇒ max(contraste(relleno, fondo), contraste(trazo, fondo)) ≥ AA, garantizado.
   *
   * Aquí se comprueba las dos cosas: que el número blanco LLEVA el trazo (si no, la
   * garantía es papel mojado) y que la garantía se cumple sobre su color real.
   */
  test('⭐ el número del marcador SE LEE (≥ 4,5:1) por relleno o por trazo', async ({ page }, info) => {
    await abrir(page);

    const tonos = await buses(page).evaluateAll((els) =>
      els.map((el) => {
        const pastilla = el.querySelector('span > span') as HTMLElement; // la píldora
        const cs = getComputedStyle(pastilla);
        return {
          fondo: cs.backgroundColor,
          texto: cs.color,
          etiqueta: pastilla.innerText.trim(),
          // El grosor del trazo (0 si no lleva). El número blanco DEBE llevarlo.
          trazo: parseFloat(cs.webkitTextStrokeWidth || '0') || 0,
          trazoColor: cs.webkitTextStrokeColor || 'rgb(0, 0, 0)',
        };
      }),
    );

    const aRgb = (c: string) => {
      const m = c.match(/\d+/g)!.map(Number);
      return { r: m[0], g: m[1], b: m[2] };
    };
    const esBlanco = (c: string) => { const { r, g, b } = aRgb(c); return r > 240 && g > 240 && b > 240; };

    const malos: string[] = [];
    for (const t of tonos) {
      const cRelleno = contraste(aRgb(t.fondo), aRgb(t.texto));
      // Si hay trazo, el número también se lee por su borde: se toma el mejor canal.
      const cTrazo = t.trazo > 0 ? contraste(aRgb(t.fondo), aRgb(t.trazoColor)) : 0;
      const c = Math.max(cRelleno, cTrazo);
      console.log(`  [${info.project.name}] «${t.etiqueta}» ${t.fondo}/${t.texto} relleno ${cRelleno.toFixed(2)} · trazo ${t.trazo}px ${cTrazo.toFixed(2)} → ${c.toFixed(2)}:1`);
      // ⚠️ Un número BLANCO sin trazo sería el bug original (blanco por costumbre).
      if (esBlanco(t.texto) && t.trazo <= 0) malos.push(`«${t.etiqueta}» blanco SIN contorno`);
      if (c < 4.5) malos.push(`«${t.etiqueta}» a ${c.toFixed(2)}:1`);
    }
    expect(tonos.length, 'no hay marcadores que medir').toBeGreaterThan(0);
    expect(malos, `números ilegibles en el mapa: ${malos.join(' · ')}`).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('⭐ B5 · la parada es un PIN, y NUNCA queda debajo de un autobús', () => {
  test('el pin existe, señala con la punta y va POR ENCIMA de los buses', async ({ page }, info) => {
    await abrir(page);
    await expect(pin(page)).toHaveCount(1);

    /**
     * ⚠️ Y ESTO NO ES UN DETALLE ESTÉTICO. En la captura de la REFERENCIA, su
     *    círculo azul de parada queda medio TAPADO por dos marcadores de la 39. El
     *    marcador que contesta «¿dónde estoy YO?» enterrado bajo un autobús. Leaflet
     *    apila por `z-index`, así que se mide el `z-index` de verdad.
     */
    const zParada = await pin(page).evaluate((e) => Number(getComputedStyle(e).zIndex) || 0);
    const zBuses = await buses(page).evaluateAll((els) =>
      els.map((e) => Number(getComputedStyle(e).zIndex) || 0),
    );
    console.log(`\n  [${info.project.name}] z-index → parada ${zParada} · buses ${zBuses.join(', ')}`);
    expect(
      zParada,
      'la parada queda por debajo de un autobús: el usuario pierde su propia posición',
    ).toBeGreaterThan(Math.max(...zBuses));
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('⭐ B6 · pulsar una fila: se marca, el mapa AÍSLA, y sale «Ver todos»', () => {
  test('de la lista al mapa: aísla, y «Ver todos» devuelve LOS FILTRADOS', async ({ page }, info) => {
    await abrir(page);
    const antes = await buses(page).count();
    expect(antes).toBe(3);

    await capturar(page, `capturas/zetabus/mapa-REPOSO-${info.project.name}.png`);

    // Se pulsa la PRIMERA fila (4889, con GPS).
    await filas(page).first().click();
    await page.waitForTimeout(800);

    await expect(page.locator('[data-papel="mapa"]')).toHaveAttribute('data-aislado', 'si');
    await expect(buses(page), 'el mapa NO ha aislado: siguen todos los marcadores').toHaveCount(1);
    await expect(filas(page).first()).toHaveAttribute('data-seleccionado', 'si');
    await expect(page.locator('[data-papel="ver-todos"]')).toBeVisible();

    await capturar(page, `capturas/zetabus/mapa-AISLADO-${info.project.name}.png`);

    /**
     * ⭐ «VER TODOS» DEVUELVE **LOS FILTRADOS**, NO TODOS. Se apaga una línea, se
     *    aísla un bus, se pulsa «Ver todos» — y la línea apagada NO puede resucitar.
     *    Sería el filtro desobedeciéndose a sí mismo.
     */
    await page.locator('[data-papel="ver-todos"]').click();
    await page.waitForTimeout(600);
    await expect(page.locator('[data-papel="mapa"]')).toHaveAttribute('data-aislado', 'no');
    await expect(buses(page)).toHaveCount(antes);
    await expect(page.locator('[data-papel="ver-todos"]')).toBeHidden();
  });

  /**
   * ⭐⭐ EL TEST QUE NACIÓ DE MIRAR UNA CAPTURA, NO DE PENSAR.
   *
   * Los 11 tests pasaban. Abrí la captura de 360 px y el mapa NO ESTABA EN PANTALLA:
   * para tocar una fila hay que bajar, y el mapa —que acababa de aislar el autobús—
   * se quedaba arriba, fuera de la vista. **B6 funcionaba y no se veía funcionar.**
   *
   * ⇒ Se trae a la vista LA VISTA QUE NO HAS TOCADO. Y ahora hay un test que lo exige.
   */
  test('⭐ pulsar una fila trae EL MAPA a la vista (no la fila, que ya la ves)', async ({ page }, info) => {
    await abrir(page);

    // Se baja hasta la lista, como haría cualquiera con un móvil de 360 px.
    const fila = filas(page).nth(1);
    await fila.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const antes = await page.locator('.leaflet-container').evaluate((e) => {
      const r = e.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    });
    console.log(`\n  [${info.project.name}] ¿el mapa se ve ANTES de pulsar? ${antes}`);

    await fila.click();
    await page.waitForTimeout(1200);

    const despues = await page.locator('.leaflet-container').evaluate((e) => {
      const r = e.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    });
    console.log(`  [${info.project.name}] ¿y DESPUÉS? ${despues}`);

    await expect(page.locator('[data-papel="mapa"]')).toHaveAttribute('data-aislado', 'si');
    expect(
      despues,
      'el mapa ha aislado el autobús… fuera de la pantalla. El usuario no ve nada.',
    ).toBe(true);
  });

  test('⭐ «Ver todos» NO resucita una línea apagada en el filtro', async ({ page }) => {
    await abrir(page);

    // Apagamos la 29 (el 4132). Quedan 2 marcadores (4889 y 4610).
    await page.locator('[data-papel="chip-filtro"][data-linea="29"]').click();
    await page.waitForTimeout(400);
    const conFiltro = await buses(page).count();
    expect(conFiltro, 'el filtro no ha quitado el marcador de la 29').toBe(2);

    await filas(page).first().click();
    await page.waitForTimeout(600);
    await expect(buses(page)).toHaveCount(1);

    await page.locator('[data-papel="ver-todos"]').click();
    await page.waitForTimeout(600);
    await expect(
      buses(page),
      '«Ver todos» ha resucitado una línea que el usuario había apagado',
    ).toHaveCount(conFiltro);
  });

  test('del mapa a la lista: pulsar el marcador trae su fila A LA VISTA', async ({ page }, info) => {
    await abrir(page);

    /**
     * ⚠️ EL 4610 ES LA ÚLTIMA FILA (12 min) Y SU MARCADOR EMPIEZA **FUERA DEL
     *    ENCUADRE** — o sea, recortado por el `overflow:hidden` del mapa y por tanto
     *    IMPULSABLE. Mi primera versión de este test hacía `click({force:true})` sobre
     *    él y no pasaba nada, y yo iba a culpar al código.
     *
     *    No: el marcador estaba clipado, que es lo correcto. **El test estaba mal.**
     *    Así que primero se pulsa «Encuadrarlos» —que es justo el botón que existe
     *    para esto— y ENTONCES el marcador es alcanzable. De paso, el test encadena
     *    las dos funciones y prueba que «Encuadrarlos» sirve para algo de verdad.
     */
    const coche = await filas(page).last().getAttribute('data-coche');
    await page.locator('[data-papel="encuadrar-todos"]').click();
    await page.waitForTimeout(900);

    const marcador = buses(page).nth(2); // el más lejano, ya dentro del encuadre
    await marcador.click();
    await page.waitForTimeout(900);

    await expect(page.locator('[data-papel="llegada"][data-seleccionado="si"]')).toHaveCount(1);
    const fila = page.locator(`[data-papel="llegada"][data-coche="${coche}"]`);
    await expect(fila).toHaveAttribute('data-seleccionado', 'si');

    // ⭐ Y LA FILA TIENE QUE ESTAR EN PANTALLA. Sin `scrollIntoView`, el gesto se
    //    queda a medias: el mapa aísla y la fila resaltada está fuera de la vista.
    const dentro = await fila.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    console.log(`\n  [${info.project.name}] la fila del coche ${coche} ¿está a la vista? ${dentro}`);
    expect(dentro, 'la fila seleccionada NO ha venido a la vista: falta scrollIntoView').toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('⛔ NULL ISLAND · un autobús sin coordenadas NO SE PINTA. Y se dice.', () => {
  test('el 4845 no tiene GPS: 4 llegadas, 3 marcadores, y un aviso', async ({ page }, info) => {
    await abrir(page);

    await expect(filas(page)).toHaveCount(4);
    await expect(buses(page), 'un autobús sin GPS se ha pintado: ¿con qué coordenadas?').toHaveCount(3);

    const aviso = page.locator('[data-papel="sin-posicion"]');
    await expect(aviso).toBeVisible();
    console.log(`\n  [${info.project.name}] ${await aviso.innerText()}`);

    /**
     * ⚠️ LA CONTRAPRUEBA DEL GOLFO DE GUINEA. Si alguien pusiera un `?? 0`, el 4845
     *    se pintaría en la isla nula (0,0). El mapa está en Zaragoza, así que ese
     *    marcador ni siquiera aparecería en pantalla… y el test de "3 marcadores"
     *    seguiría en VERDE. Por eso además se comprueba que el aviso EXISTE: es la
     *    única señal que distingue "no lo pintamos porque no lo sabemos" de "no lo
     *    pintamos porque se ha ido al Atlántico".
     */
    await expect(aviso).toContainText(/no da su posición/i);
  });

  test('y si SELECCIONAS ese autobús, el mapa no se queda en blanco: lo dice', async ({ page }) => {
    await abrir(page);

    const sinGps = page.locator('[data-papel="llegada"][data-coche="4845"]');
    await sinGps.click();
    await page.waitForTimeout(600);

    // NO se aísla (no hay nada que aislar) y NO se vacía el mapa.
    await expect(page.locator('[data-papel="mapa"]')).toHaveAttribute('data-aislado', 'no');
    await expect(buses(page), 'el mapa se ha vaciado por seleccionar un bus sin GPS').toHaveCount(3);
    await expect(page.locator('[data-papel="seleccionado-sin-mapa"]')).toBeVisible();
  });
});
