/**
 * ⭐ C6-C10 · EL RECORRIDO Y EL FUNCIONAMIENTO DE TERMINAL, EN PANTALLA.
 *
 * Casi todo esto se clonó en tandas anteriores (los nodos con cuatro formas, los
 * búhos al final, el bloque de terminal). Aquí NO se da por hecho: se MIDE en el
 * navegador —y en algunos casos en el píxel— que la distinción se ve de verdad, y
 * que la hora de madrugada nunca sale como "25:29".
 *
 *   C6/C7 · las cuatro formas del nodo se distinguen a simple vista (tamaño Y
 *           relleno/hueco: se mira el píxel del centro, no la clase).
 *   C9    · la densidad de la lista se mide y se reporta.
 *   C10   · el terminal de una línea que cruza medianoche (la 35) pinta "1:29 ·
 *           del día siguiente", y NUNCA una hora ≥ 24.
 *   BACKTEST · una circular de bucle (Ci3) tiene cabecera y final en la misma
 *              parada, y la pantalla no revienta.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';
import { capturar, pixel, aHex, type Rgb } from './lib/medir';

const dist = (a: Rgb, b: Rgb) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

/**
 * El color del CENTRO de un nodo, mirado en el píxel. ⚠️ Se hace scroll a cada
 * nodo ANTES de mirar: en una línea de 34 paradas, el final y el punto simple caen
 * DEBAJO de la pantalla, y una captura de viewport no los contiene. Mirar ahí daría
 * un píxel fantasma (el error que este helper existe para no cometer).
 */
async function centroDe(page: Page, nodo: Locator): Promise<Rgb> {
  await nodo.scrollIntoViewIfNeeded();
  const b = (await nodo.boundingBox())!;
  return pixel(page, b.x + b.width / 2, b.y + b.height / 2);
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ C6/C7 · LAS CUATRO FORMAS DEL NODO SE DISTINGUEN A SIMPLE VISTA', () => {
  test('cabecera RELLENA ≠ final HUECO, y anillo (transbordo) ≠ punto (simple): medido en el píxel', async ({ page }, info) => {
    // La 21 tiene cabecera, final, y muchas paradas con transbordo. Buscamos además
    // una parada SIN transbordo para el punto simple; si en la 21 no hubiera, se
    // dice y se mide lo que haya (no se inventa un caso).
    await page.goto('/linea/21', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-papel="itinerario"]')).toBeVisible();

    const cabecera = page.locator('[data-papel="nodo-cabecera"]').first();
    const final = page.locator('[data-papel="nodo-final"]').first();
    const anillo = page.locator('[data-papel="nodo-transbordo"]').first();
    const punto = page.locator('[data-papel="nodo-simple"]').first();

    await expect(cabecera, 'hay nodo de cabecera').toHaveCount(1, { timeout: 5_000 });
    await expect(final, 'hay nodo final').toHaveCount(1);
    await expect(anillo, 'hay al menos un nodo con transbordo').not.toHaveCount(0);

    const bCab = (await cabecera.boundingBox())!;
    const bAni = (await anillo.boundingBox())!;

    // ── TAMAÑO · las categorías no miden lo mismo (no es la "señal de 2 px" que
    //    tenía la referencia: cabecera/final 18, anillo 14, punto 9).
    console.log(`\n  [${info.project.name}] tamaños de nodo:`);
    console.log(`     cabecera ${Math.round(bCab.width)}×${Math.round(bCab.height)}  anillo ${Math.round(bAni.width)}×${Math.round(bAni.height)}`);
    expect(bCab.width, 'la cabecera es un cuadrado grande (~18)').toBeGreaterThan(bAni.width + 1);

    // ── RELLENO vs HUECO · aquí está la señal de verdad, y se mira EL PÍXEL, no el
    //    CSS. Se mide el CENTRO de cada nodo (con scroll individual: el final y el
    //    punto caen bajo la pantalla en una línea de 34 paradas).
    const pxCab = await centroDe(page, cabecera);
    const pxFin = await centroDe(page, final);
    const pxAni = await centroDe(page, anillo);
    const hayPunto = (await punto.count()) > 0;
    const pxPun = hayPunto ? await centroDe(page, punto) : null;
    const bPun = hayPunto ? (await punto.boundingBox())! : null;

    console.log(`     centro cabecera ${aHex(pxCab)} · centro final ${aHex(pxFin)} · centro anillo ${aHex(pxAni)}` +
      (pxPun ? ` · centro punto ${aHex(pxPun)}` : ' · (sin punto simple en la 21)'));

    // ⭐ CABECERA RELLENA ≠ FINAL HUECO. Dos formas del mismo tamaño; lo que las
    //    separa es el relleno. Si alguien rellenara el final, esto se pone rojo.
    expect(dist(pxCab, pxFin), 'cabecera (rellena) y final (hueco) deben verse distintas').toBeGreaterThan(60);

    // ⭐ C6 · ANILLO (hueco) ≠ PUNTO (relleno). El centro del anillo es fondo papel;
    //    el del punto, color de línea. Es la distinción "con/sin transbordo".
    if (pxPun && bPun) {
      expect(dist(pxAni, pxPun), 'el anillo (hueco) y el punto (relleno) deben verse distintos').toBeGreaterThan(60);
      // El punto simple, además, es más pequeño que el anillo.
      expect(bPun.width, 'el punto simple es más pequeño que el anillo').toBeLessThan(bAni.width);
    } else {
      console.log('     ⚠️ la 21 no tiene ninguna parada sin transbordo; el punto simple se');
      console.log('        cubre en el test unidad (Nodo) y en otra línea con paradas de borde.');
    }

    await cabecera.scrollIntoViewIfNeeded();
    await capturar(page, `capturas/zetabus/C6-nodos-${info.project.name}.png`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ C10 · EL FUNCIONAMIENTO DE TERMINAL, EN LA PANTALLA REAL', () => {
  // 24:00 y para arriba. La misma regla que el test unidad del render.
  const HORA_IMPOSIBLE = /\b(2[4-9]|[3-9]\d):[0-5]\d\b/;

  test('la 35 cruza medianoche: pinta "1:29" limpio (por su sitio), NUNCA "25:29"', async ({ page }, info) => {
    await page.goto('/linea/35', { waitUntil: 'networkidle' });
    const terminal = page.locator('[data-papel="terminal"]');
    await expect(terminal, 'la 35 tiene bloque de terminal').toBeVisible();
    await terminal.scrollIntoViewIfNeeded();

    const texto = (await terminal.innerText());
    console.log(`\n  [${info.project.name}] terminal de la 35:\n${texto.split('\n').map((l) => '     ' + l).join('\n')}`);

    // ⭐ HORAS LIMPIAS: nada cuelga de la cifra (ni "del día siguiente" ni el ⁺¹).
    //    La 1:29 se entiende por su SITIO: va en las últimas, tras las 23:xx.
    expect(await terminal.locator('[data-papel="marca-dia-siguiente"]').count(), 'ya no hay ⁺¹').toBe(0);
    expect(texto, 'ni la línea "del día siguiente"').not.toMatch(/del día siguiente/i);

    // ⛔ Y en NINGUNA parte del bloque puede leerse una hora ≥ 24.
    expect(texto, 'en pantalla no puede salir "25:29" ni ninguna hora ≥ 24').not.toMatch(HORA_IMPOSIBLE);

    // ⭐ HAY 5+5 salidas de verdad, no un rango: la 35 tiene muchas expediciones.
    const salidas = terminal.locator('[data-papel="salida"]');
    expect(await salidas.count(), 'se pintan salidas concretas, no un rango').toBeGreaterThan(5);
    await expect(terminal.locator('[data-papel="fila-salidas"][data-etiqueta="Primeras"]').first()).toBeVisible();
    await expect(terminal.locator('[data-papel="fila-salidas"][data-etiqueta="Últimas"]').first()).toBeVisible();

    // ⭐ ORDEN: al menos una salida cruza medianoche (data-minuto ≥ 1440) y sale
    //    en las ÚLTIMAS, marcada, leída como madrugada (0–5), no como 25:xx.
    const cruces = terminal.locator('[data-papel="salida"][data-siguiente="si"]');
    expect(await cruces.count(), 'la 35 cruza medianoche en sus últimas salidas').toBeGreaterThan(0);
    const min = Number(await cruces.first().getAttribute('data-minuto'));
    const hora = (await cruces.first().innerText()).match(/^\d{1,2}:\d{2}/)?.[0] ?? ''; // sin el "+1"
    console.log(`     cruce: minuto GTFS ${min} → "${hora}"`);
    expect(min, 'el minuto GTFS de un cruce pasa de 1440').toBeGreaterThanOrEqual(24 * 60);
    expect(hora, 'pintada como madrugada, no 25:xx').toMatch(/^[0-5]:[0-5]\d$/);

    await capturar(page, `capturas/zetabus/C10-terminal-35-${info.project.name}.png`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ SALIDAS PARCIALES · el índice según la SECCIÓN (1 en primeras, 2 en últimas)', () => {
  /** Los índices de una fila, por salida: {min, noViene, noLlega, indices}. */
  async function filaSalidas(fila: Locator) {
    const salidas = fila.locator('[data-papel="salida"]');
    const out: { min: number; noViene: boolean; noLlega: boolean; indices: string[] }[] = [];
    for (let i = 0; i < (await salidas.count()); i++) {
      const s = salidas.nth(i);
      out.push({
        min: Number(await s.getAttribute('data-minuto')),
        noViene: (await s.getAttribute('data-noviene')) !== null,
        noLlega: (await s.getAttribute('data-nollega')) !== null,
        indices: await s.locator('[data-papel="indice-parcial"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-indice') ?? '')),
      });
    }
    return out;
  }

  test('la 35 →Seminario: primeras con 1 (no 2), últimas con 2 (no 1)', async ({ page }, info) => {
    await page.goto('/linea/35?sentido=0', { waitUntil: 'networkidle' });
    const terminal = page.locator('[data-papel="terminal"]');
    await terminal.scrollIntoViewIfNeeded();
    const lab = terminal.locator('[data-papel="dia-terminal"][data-tipo="laborable"]');

    // PRIMERAS: el índice es 1 sii noViene; JAMÁS el 2 (aunque una no llegue).
    for (const s of await filaSalidas(lab.locator('[data-etiqueta="Primeras"]'))) {
      expect(s.indices, `primera ${s.min}: 1 ⇔ noViene, nunca 2`).toEqual(s.noViene ? ['1'] : []);
    }
    // ÚLTIMAS: el índice es 2 sii noLlega; JAMÁS el 1 (los que dan la vuelta se callan).
    for (const s of await filaSalidas(lab.locator('[data-etiqueta="Últimas"]'))) {
      expect(s.indices, `última ${s.min}: 2 ⇔ noLlega, nunca 1`).toEqual(s.noLlega ? ['2'] : []);
    }
    // Concretos: 6:40 (primera, no viene) → 1; 0:11/0:51/1:29 (últimas, no llegan) → 2.
    expect(await lab.locator('[data-etiqueta="Primeras"] [data-minuto="400"] [data-indice="1"]').count()).toBe(1);
    for (const m of [1451, 1491, 1529]) {
      expect(await lab.locator(`[data-etiqueta="Últimas"] [data-minuto="${m}"] [data-indice="2"]`).count(), `${m} → 2`).toBe(1);
    }

    // Leyenda fija, sin nombres.
    const ley = terminal.locator('[data-papel="leyenda-parciales"]');
    await expect(ley.locator('[data-indice="1"]')).toHaveText(/^1\s*·\s*No viene desde principio de línea$/);
    await expect(ley.locator('[data-indice="2"]')).toHaveText(/^2\s*·\s*No llega a final de línea$/);
    expect(await ley.innerText(), 'ni Coso ni cabeceras').not.toMatch(/Coso|Seminario|Parque Goya/i);
    // Horas limpias.
    expect(await terminal.locator('[data-papel="marca-dia-siguiente"]').count()).toBe(0);

    await terminal.screenshot({ path: `capturas/zetabus/SECCION-35-Seminario-${info.project.name}.png` });
  });

  test('⭐ la 35 →Parque Goya: las 0:31/1:09 (dan la vuelta pero LLEGAN) van LIMPIAS en últimas', async ({ page }, info) => {
    await page.goto('/linea/35?sentido=1', { waitUntil: 'networkidle' });
    const terminal = page.locator('[data-papel="terminal"]');
    await terminal.scrollIntoViewIfNeeded();
    const lab = terminal.locator('[data-papel="dia-terminal"][data-tipo="laborable"]');

    // Las 0:31 (1471) y 1:09 (1509) EMPIEZAN a mitad (noViene) pero llegan al final
    // (noLlega=false). En ÚLTIMAS eso NO pinta el 1 (era el fallo) NI el 2. Limpias.
    for (const m of [1471, 1509]) {
      const s = lab.locator(`[data-etiqueta="Últimas"] [data-minuto="${m}"]`);
      expect(await s.getAttribute('data-noviene'), `${m} da la vuelta`).toBe('si');
      expect(await s.getAttribute('data-nollega'), `${m} sí llega`).toBeNull();
      expect(await s.locator('[data-papel="indice-parcial"]').count(), `${m} en últimas va limpia`).toBe(0);
    }
    // Primeras (4:40/5:11/5:40 empiezan a mitad) → índice 1.
    for (const m of [280, 311, 340]) {
      expect(await lab.locator(`[data-etiqueta="Primeras"] [data-minuto="${m}"] [data-indice="1"]`).count(), `${m} → 1`).toBe(1);
    }
    await terminal.screenshot({ path: `capturas/zetabus/SECCION-35-ParqueGoya-${info.project.name}.png` });
  });

  test('⛔ CONTRAPRUEBA · en NINGÚN sitio hay un 1 en últimas ni un 2 en primeras', async ({ page }) => {
    // Se barren varias líneas afectadas, los tres días.
    for (const url of ['/linea/35?sentido=0', '/linea/35?sentido=1', '/linea/23?sentido=0', '/linea/39']) {
      await page.goto(url, { waitUntil: 'networkidle' });
      const terminal = page.locator('[data-papel="terminal"]');
      await terminal.scrollIntoViewIfNeeded();
      expect(await terminal.locator('[data-etiqueta="Últimas"] [data-indice="1"]').count(), `${url}: ningún 1 en últimas`).toBe(0);
      expect(await terminal.locator('[data-etiqueta="Primeras"] [data-indice="2"]').count(), `${url}: ningún 2 en primeras`).toBe(0);
    }
  });

  test('⚠️ una línea SIN parciales (la 22): ni índices ni leyenda', async ({ page }, info) => {
    await page.goto('/linea/22', { waitUntil: 'networkidle' });
    const terminal = page.locator('[data-papel="terminal"]');
    await expect(terminal).toBeVisible();
    await terminal.scrollIntoViewIfNeeded();
    console.log(`\n  [${info.project.name}] la 22 · índices ${await terminal.locator('[data-papel="indice-parcial"]').count()} · leyenda ${await terminal.locator('[data-papel="leyenda-parciales"]').count()}`);
    expect(await terminal.locator('[data-papel="indice-parcial"]').count(), 'sin índices').toBe(0);
    expect(await terminal.locator('[data-papel="leyenda-parciales"]').count(), 'sin leyenda').toBe(0);
    expect(await terminal.locator('[data-papel="salida"]').count(), 'pero sí hay salidas').toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ C9 · DENSIDAD DE LA LISTA (medida y reportada)', () => {
  test('el alto por parada es compacto y estable', async ({ page }, info) => {
    await page.goto('/linea/21', { waitUntil: 'networkidle' });
    const nodos = page.locator('[data-papel="nodo"]');
    const n = await nodos.count();
    expect(n).toBeGreaterThan(20);

    const alturas = await nodos.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    const total = alturas.reduce((a, b) => a + b, 0);
    const media = Math.round(total / alturas.length);
    const min = Math.min(...alturas);
    const max = Math.max(...alturas);
    console.log(`\n  [${info.project.name}] C9 · densidad de la 21: ${n} paradas · ` +
      `alto medio ${media}px (min ${min}, max ${max})`);
    console.log('     ⚠️ El cara a cara con la referencia VIVA (su densidad exacta) es el');
    console.log('        entregable de cierre; aquí se fija que la nuestra es compacta y no se dispara.');

    // ⚠️ NO hay medida viva de la referencia ahora mismo, así que NO se afirma "igual
    // que la suya": se afirma lo que SÍ se puede medir sin ella. La media real medida
    // es ~87px (una parada = nombre + chip de poste + chips de transbordo). El techo
    // se pone para cazar el bloat —la enfermedad del "160px, ocupa el doble" que ya
    // matamos en la tarjeta—, no para adornar: 110 pasa hoy y revienta si algo se
    // hincha. La homogeneidad evita que una fila rota se dispare sola.
    expect(media, 'una parada no debería gastar más de ~110px (eso sería bloat)').toBeLessThan(110);
    expect(max - min, 'las filas sin transbordo y con transbordo varían, pero no sin control').toBeLessThan(160);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ BACKTEST · UNA CIRCULAR DE BUCLE (Ci3)', () => {
  test('empieza y acaba en la misma parada: cabecera + final, sin reventar', async ({ page }, info) => {
    await page.goto('/linea/Ci3', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-papel="itinerario"]')).toBeVisible();

    const cabecera = page.locator('[data-papel="nodo-cabecera"]');
    const final = page.locator('[data-papel="nodo-final"]');
    await expect(cabecera, 'una circular de bucle SÍ tiene cabecera').toHaveCount(1);
    await expect(final, 'y SÍ tiene final (la misma parada, cerrando la vuelta)').toHaveCount(1);

    // El bucle: la primera y la última fila del itinerario son EL MISMO poste.
    const primeraLi = page.locator('[data-papel="nodo"]').first();
    const ultimaLi = page.locator('[data-papel="nodo"]').last();
    const posteIni = await primeraLi.getAttribute('data-poste');
    const posteFin = await ultimaLi.getAttribute('data-poste');
    console.log(`\n  [${info.project.name}] Ci3 · empieza en poste ${posteIni}, acaba en poste ${posteFin}`);
    expect(posteFin, 'el bucle cierra donde abrió').toBe(posteIni);

    // Y no hay scroll horizontal ni nada roto (la Ci3 no tiene trazado y lo dice).
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(scroll, 'sin scroll horizontal').toBeLessThanOrEqual(0);

    await capturar(page, `capturas/zetabus/BACKTEST-Ci3-bucle-${info.project.name}.png`);
  });
});
