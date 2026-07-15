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

  test('la 35 cruza medianoche: pinta "1:29⁺¹", NUNCA "25:29" ni la línea "del día siguiente"', async ({ page }, info) => {
    await page.goto('/linea/35', { waitUntil: 'networkidle' });
    const terminal = page.locator('[data-papel="terminal"]');
    await expect(terminal, 'la 35 tiene bloque de terminal').toBeVisible();
    await terminal.scrollIntoViewIfNeeded();

    const texto = (await terminal.innerText());
    console.log(`\n  [${info.project.name}] terminal de la 35:\n${texto.split('\n').map((l) => '     ' + l).join('\n')}`);

    // ⭐ El superíndice ⁺¹ SE QUEDA (ata la 1:29 a la madrugada), pero la LÍNEA
    //    explicativa "del día siguiente" se ha ido: con "0:31⁺¹" ya se entiende.
    await expect(terminal.locator('[data-papel="marca-dia-siguiente"]').first(), 'el ⁺¹ tiene que estar').toBeVisible();
    expect(texto, 'ya no está la línea "del día siguiente"').not.toMatch(/del día siguiente/i);

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
test.describe('⭐ EMPIEZA / ACABA EN … · se ENSEÑA cada salida y se marca, no se filtra', () => {
  /**
   * Para un `data-papel="dia-terminal"`: cada marca de la tabla (¹ ² …) casa con una
   * entrada de leyenda, y al revés. Una marca es (acción + lugar): la acción sale de
   * `data-accion` del superíndice; el lugar, de `data-origen` (empieza) o `data-destino`
   * (acaba) de su salida. Devuelve el conjunto de índices y cuántas salidas normales hay.
   */
  async function cuadraElDia(dia: Locator) {
    const salidas = dia.locator('[data-papel="salida"]');
    const idxTabla = new Map<string, string>(); // índice → "accion en lugar"
    let normales = 0;
    for (let i = 0; i < (await salidas.count()); i++) {
      const s = salidas.nth(i);
      const origen = await s.getAttribute('data-origen');
      const destino = await s.getAttribute('data-destino');
      const sup = s.locator('[data-papel="indice-parcial"]');
      const nSup = await sup.count();
      const marcasEsperadas = (origen ? 1 : 0) + (destino ? 1 : 0);
      expect(nSup, 'un superíndice por extremo parcial (empieza/acaba)').toBe(marcasEsperadas);
      if (marcasEsperadas === 0) normales++;
      for (let j = 0; j < nSup; j++) {
        const accion = await sup.nth(j).getAttribute('data-accion');
        const indice = await sup.nth(j).getAttribute('data-indice');
        expect(await sup.nth(j).innerText(), 'el dígito pintado == su data-indice').toBe(indice);
        const lugar = accion === 'empieza' ? origen : destino;
        idxTabla.set(indice!, `${accion} en ${lugar}`);
      }
    }
    const leyenda = dia.locator('[data-papel="leyenda-parcial"]');
    const idxLeyenda = new Set<string>();
    for (let i = 0; i < (await leyenda.count()); i++) {
      const li = leyenda.nth(i);
      const indice = (await li.getAttribute('data-indice'))!;
      const txt = (await li.innerText()).replace(/\s+/g, ' ');
      expect(txt, `la leyenda ${indice} dice su acción y lugar`).toContain(idxTabla.get(indice) ?? '∅');
      idxLeyenda.add(indice);
    }
    // ⛔ CONTRAPRUEBA: los índices de la TABLA y los de la LEYENDA son EL MISMO
    //    conjunto. Un ¹ sin entrada, o una entrada sin ¹, revienta.
    expect([...idxLeyenda].sort(), 'tabla y leyenda cuadran').toEqual([...idxTabla.keys()].sort());
    return { indices: [...idxTabla.keys()], normales };
  }

  test('la 35 →Seminario: las de madrugada se ENSEÑAN con "acaba en Coso n.º 126"', async ({ page }, info) => {
    await page.goto('/linea/35?sentido=0', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-papel="titulo-linea"]'), 'es →Seminario').toContainText(/Seminario/);
    const terminal = page.locator('[data-papel="terminal"]');
    await terminal.scrollIntoViewIfNeeded();
    const lab = terminal.locator('[data-papel="dia-terminal"][data-tipo="laborable"]');
    await cuadraElDia(lab);

    // ⭐ La 0:11 (1451) y la 0:51 (1491) NO desaparecen: se ven, marcadas "acaba en Coso".
    for (const min of [1451, 1491]) {
      const s = lab.locator(`[data-papel="salida"][data-minuto="${min}"]`);
      expect(await s.getAttribute('data-destino'), `la ${min} acaba en Coso`).toMatch(/Coso/);
      expect(await s.locator('[data-papel="indice-parcial"][data-accion="acaba"]').count(), 'con su ¹ de "acaba"').toBe(1);
    }
    // La 0:27 (1467) SÍ llega: sin marca.
    const completa = lab.locator('[data-papel="salida"][data-minuto="1467"]');
    expect(await completa.getAttribute('data-destino'), 'la 0:27 llega, sin marca').toBeNull();
    await expect(lab.locator('[data-papel="leyenda-parcial"]').filter({ hasText: /acaba en Coso/i })).toHaveCount(1);

    // ⛔ El ¹ (parcial, gris) NO es el ⁺¹ (madrugada, ámbar): conviven en la 0:11.
    const s011 = lab.locator('[data-papel="salida"][data-minuto="1451"]');
    expect(await s011.locator('[data-papel="marca-dia-siguiente"]').count(), 'lleva ⁺¹').toBe(1);
    expect(await s011.locator('[data-papel="indice-parcial"]').count(), 'y ¹, distinto').toBe(1);

    await capturar(page, `capturas/zetabus/MARCA-35-Seminario-${info.project.name}.png`);
  });

  test('la 35 →Parque Goya: las de madrugada con "empieza en Coso n.º 126"', async ({ page }, info) => {
    await page.goto('/linea/35?sentido=1', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-papel="titulo-linea"]'), 'es →Parque Goya').toContainText(/Parque Goya/);
    const terminal = page.locator('[data-papel="terminal"]');
    await terminal.scrollIntoViewIfNeeded();
    const lab = terminal.locator('[data-papel="dia-terminal"][data-tipo="laborable"]');
    await cuadraElDia(lab);
    for (const min of [1471, 1509]) {
      const s = lab.locator(`[data-papel="salida"][data-minuto="${min}"]`);
      expect(await s.getAttribute('data-origen'), `la ${min} empieza en Coso`).toMatch(/Coso/);
      expect(await s.locator('[data-papel="indice-parcial"][data-accion="empieza"]').count(), 'con su ¹ de "empieza"').toBe(1);
    }
    await expect(lab.locator('[data-papel="leyenda-parcial"]').filter({ hasText: /empieza en Coso/i })).toHaveCount(1);
    await capturar(page, `capturas/zetabus/MARCA-35-ParqueGoya-${info.project.name}.png`);
  });

  test('la Ci2: mismo LUGAR, dos ACCIONES → "empieza en …" y "acaba en …", DOS entradas', async ({ page }, info) => {
    await page.goto('/linea/Ci2?sentido=1', { waitUntil: 'networkidle' });
    const terminal = page.locator('[data-papel="terminal"]');
    await expect(terminal).toBeVisible();
    await terminal.scrollIntoViewIfNeeded();
    const lab = terminal.locator('[data-papel="dia-terminal"][data-tipo="laborable"]');
    await cuadraElDia(lab);
    const leyenda = lab.locator('[data-papel="leyenda-parcial"]');
    const textos = (await leyenda.allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
    console.log(`\n  [${info.project.name}] Ci2 leyenda: ${JSON.stringify(textos)}`);
    // ⭐ "empieza en Camino de Las Torres n.º 3" y "acaba en …" el MISMO sitio: dos entradas.
    expect(textos.some((t) => /empieza en Camino de Las Torres/i.test(t)), 'hay "empieza en"').toBe(true);
    expect(textos.some((t) => /acaba en Camino de Las Torres/i.test(t)), 'y "acaba en" el mismo lugar').toBe(true);
    await capturar(page, `capturas/zetabus/MARCA-Ci2-${info.project.name}.png`);
  });

  test('OTRA LÍNEA · la 32 dir0: "1 · empieza en Plaza de España" y "2 · acaba en San Vicente"', async ({ page }, info) => {
    await page.goto('/linea/32?sentido=0', { waitUntil: 'networkidle' });
    const terminal = page.locator('[data-papel="terminal"]');
    await expect(terminal).toBeVisible();
    await terminal.scrollIntoViewIfNeeded();
    const lab = terminal.locator('[data-papel="dia-terminal"][data-tipo="laborable"]');
    const { indices } = await cuadraElDia(lab);
    console.log(`\n  [${info.project.name}] 32 dir0 índices: ${JSON.stringify(indices)}`);
    const textos = (await lab.locator('[data-papel="leyenda-parcial"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
    expect(textos.some((t) => /empieza en Plaza de España/i.test(t)), 'empieza en Plaza de España').toBe(true);
    expect(textos.some((t) => /acaba en San Vicente/i.test(t)), 'acaba en San Vicente').toBe(true);
    await capturar(page, `capturas/zetabus/MARCA-32-${info.project.name}.png`);
  });

  test('⚠️ una línea SIN parciales (la 22): ni números, ni leyenda, ni nota', async ({ page }, info) => {
    await page.goto('/linea/22', { waitUntil: 'networkidle' });
    const terminal = page.locator('[data-papel="terminal"]');
    await expect(terminal).toBeVisible();
    await terminal.scrollIntoViewIfNeeded();
    const nIdx = await terminal.locator('[data-papel="indice-parcial"]').count();
    const nLey = await terminal.locator('[data-papel="leyenda-parciales"]').count();
    const nNota = await terminal.locator('[data-papel="nota-parciales"]').count();
    console.log(`\n  [${info.project.name}] la 22 · superíndices ${nIdx} · leyendas ${nLey} · notas ${nNota}`);
    expect(nIdx, 'ni un superíndice').toBe(0);
    expect(nLey, 'ni una leyenda').toBe(0);
    expect(nNota, 'ni la nota de consecuencia').toBe(0);
    expect(await terminal.locator('[data-papel="salida"]').count(), 'pero sí hay salidas').toBeGreaterThan(0);
  });

  test('la CONSECUENCIA, una sola línea al pie, cubre empieza y acaba', async ({ page }) => {
    await page.goto('/linea/35?sentido=0', { waitUntil: 'networkidle' });
    const nota = page.locator('[data-papel="terminal"] [data-papel="nota-parciales"]');
    await expect(nota, 'una sola vez').toHaveCount(1);
    await expect(nota).toContainText(/empieza en/i);
    await expect(nota).toContainText(/acaba en/i);
  });

  test('⚠️ la 44 (dos terminales) YA NO es un caso especial: enseña y marca sin más', async ({ page }, info) => {
    await page.goto('/linea/44?sentido=0', { waitUntil: 'networkidle' });
    const terminal = page.locator('[data-papel="terminal"]');
    await expect(terminal).toBeVisible();
    await terminal.scrollIntoViewIfNeeded();
    // No revienta y cuadra como cualquier otra (al no filtrar, su ambigüedad da igual).
    const lab = terminal.locator('[data-papel="dia-terminal"][data-tipo="laborable"]');
    await cuadraElDia(lab);
    expect(await lab.locator('[data-papel="salida"]').count(), 'la 44 enseña sus salidas').toBeGreaterThan(0);
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
