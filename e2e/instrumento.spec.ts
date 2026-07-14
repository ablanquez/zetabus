/**
 * ⚠️ LA CONTRAPRUEBA DEL INSTRUMENTO. EL FICHERO MÁS IMPORTANTE DE ESTA TANDA.
 *
 * Un test visual que no se ha visto ROJO nunca no es un test: es una captura de
 * pantalla con pretensiones.
 *
 * Aquí se rompe la pantalla A PROPÓSITO, de cinco maneras distintas, y se
 * comprueba que el instrumento CAZA CADA UNA. Y luego se arregla, y se comprueba
 * que se calla. Las dos mitades hacen falta:
 *
 *   · si no caza el defecto → el test no prueba nada
 *   · si grita con la pantalla sana → grita siempre, y grita por nada
 *
 * ⚠️ Y HAY UN SEXTO TEST, QUE ES EL QUE DE VERDAD ME QUITA EL SUEÑO:
 *    comprobar que `fullPage` HACE APARECER lo que está fuera de pantalla.
 *    Es el instrumento mintiendo, y se puede demostrar.
 */

import { test, expect } from '@playwright/test';
import { banco } from './lib/banco';
import {
  contraste, contrasteReal, desbordes, seVe, solapes,
  tactilesPequenos, truncados, TACTIL_MINIMO,
} from './lib/medir';

test.describe('⭐ EL INSTRUMENTO CAZA LO QUE DICE CAZAR', () => {
  test('SANO: la pantalla correcta no dispara NINGUNA alarma', async ({ page }) => {
    await page.setContent(banco([]));

    // Si esto fallara, el instrumento gritaría por todo y no valdría para nada.
    expect(await desbordes(page), 'nada se sale de la pantalla').toEqual([]);
    expect(await truncados(page), 'nada se corta').toEqual([]);
    expect(await solapes(page, '#destino, #tiempo'), 'nada se pisa').toEqual([]);
    expect(await tactilesPequenos(page), 'el botón se puede tocar').toEqual([]);

    const c = await contrasteReal(page, '#confianza');
    expect(c.pasa, `contraste ${c.ratio}:1 sobre ${c.fondoPintado}`).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════

  test('⛔ ROTO 1 · un chip FUERA DE PANTALLA → el instrumento lo caza', async ({ page }, info) => {
    await page.setContent(banco(['fuera-de-pantalla']));

    const fuera = await desbordes(page);
    console.log(`\n  [${info.project.name}] elementos fuera de pantalla: ${fuera.length}`);
    for (const f of fuera) console.log(`     ${f.etiqueta} · ${f.detalle} · "${f.texto}"`);

    // ⚠️ A 360 px el chip empieza en x=340 y mide 120: se sale por la derecha.
    //    En 768/1280/1920 CABE, y el instrumento tiene que callarse. Que un
    //    defecto dependa del viewport es justo el motivo de probar cinco.
    const ancho = page.viewportSize()!.width;
    if (ancho < 460) {
      expect(fuera.length, 'a este ancho el chip SE SALE y hay que verlo').toBeGreaterThan(0);
      expect(fuera.some((f) => f.texto.includes('SIN DATOS'))).toBe(true);
    } else {
      expect(fuera, 'a este ancho el chip cabe: no debe haber falsa alarma').toEqual([]);
    }
  });

  /**
   * ⚠️⚠️ EL DETECTOR ME CAZÓ SIETE FALSOS POSITIVOS, Y TODOS ERAN `sr-only`.
   *
   * Un `sr-only` es un elemento de 1×1 px con `overflow:hidden` — exactamente la
   * firma geométrica de "texto recortado". El detector medía bien y concluía mal.
   *
   * ⇒ Se excluye lo VISUALMENTE OCULTO. Pero excluir algo de un detector es abrir
   *   un agujero, así que hay que demostrar las DOS cosas: que se calla con el
   *   `sr-only` Y que sigue gritando con un truncado de verdad. Si solo probara lo
   *   primero, podría haber desactivado el detector entero sin enterarme.
   */
  test('⭐ un sr-only NO es un texto truncado (y el detector sigue cazando los de verdad)', async ({ page }) => {
    await page.setContent(`
      <div style="width:200px">
        <!-- (a) sr-only: NO está en la pantalla. No se juzga. -->
        <span style="position:absolute;width:1px;height:1px;overflow:hidden;white-space:nowrap">
          cabecera de línea, esto lo lee un lector de pantalla y no ocupa píxeles
        </span>
        <!-- (b) UN TRUNCADO DE VERDAD: sí está en pantalla, y se amputa. -->
        <p id="real" style="width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          Vía Hispanidad N.º 73 / Nuestra Señora De Los Ángeles
        </p>
      </div>
    `);

    const c = await truncados(page);
    console.log(`\n  cazados: ${c.length}`);
    for (const x of c) console.log(`     "${x.texto}" · ${x.detalle}`);

    // ⭐ EL VERDE: caza el de verdad...
    expect(c.length, 'el truncado real tiene que salir').toBe(1);
    expect(c[0].texto).toContain('Vía Hispanidad');
    // ...y SOLO el de verdad. El sr-only no aparece.
    expect(c.some((x) => /lector de pantalla/.test(x.texto)), 'un sr-only NO es un truncado').toBe(false);
  });

  test('⛔ ROTO 2 · TEXTO CORTADO → el instrumento lo caza', async ({ page }) => {
    await page.setContent(banco(['texto-cortado']));

    const cortados = await truncados(page);
    console.log(`\n  texto cortado: ${cortados.length}`);
    for (const c of cortados) console.log(`     "${c.texto}" · ${c.detalle}`);

    expect(cortados.length).toBeGreaterThan(0);
    expect(cortados[0].texto).toContain('PARQUE GOYA');

    // ⭐ Y AQUÍ ESTÁ EL PUNTO. Un test de rótulo diría que esto ESTÁ BIEN:
    await expect(page.locator('#destino')).toContainText('PARQUE GOYA / ACTUR SUR');
    // ...el texto está en el DOM, entero, y `toContainText` pasa tan contento.
    // En pantalla pone "PARQUE GO…". El rótulo existe. NO SE LEE.
    // Por eso los tests visuales miden GEOMETRÍA y no rótulos.
  });

  test('⛔ ROTO 3 · CONTRASTE ILEGIBLE → se mide el PÍXEL, no el CSS', async ({ page }) => {
    await page.setContent(banco(['contraste-ilegible']));

    const c = await contrasteReal(page, '#confianza');
    console.log(`\n  el CSS declara:   color = ${c.colorDeclarado}, opacity = ${c.opacidad}`);
    console.log(`                    ("hay verde, el dato está, el color está")`);
    console.log(`  EL PÍXEL dice:    texto ${c.textoPintado} sobre fondo ${c.fondoPintado}`);
    console.log(`  contraste REAL:   ${c.ratio}:1   (mínimo ${c.minimo}:1)`);

    // ⛔ El texto está. El color está. Y no se lee.
    expect(c.pasa, `"sin verificar" a ${c.ratio}:1 es ILEGIBLE`).toBe(false);
    expect(c.ratio).toBeLessThan(2);
  });

  test('⭐ ROTO 3-bis · EL CSS DECLARA 21:1 (EL MÁXIMO) Y NO SE VE NADA', async ({ page }) => {
    // ⚠️ ESTE TEST NACIÓ DE UN FALLO DE MI PROPIO INSTRUMENTO.
    //
    // La primera versión de `contrasteReal` leía el color con `getComputedStyle`
    // —que NO incluye el `opacity` del elemento— y lo comparaba contra el píxel
    // del fondo. Con texto #000 sobre #FFF al 6% de opacidad habría dicho:
    //
    //         "rgb(0,0,0) sobre #FDFDFD → 20,4:1 → ✅ APROBADO"
    //
    // Sobre un texto que NO SE VE. Mi detector tenía exactamente la enfermedad
    // que persigue: preguntarle al CSS y afirmar sobre la pantalla.
    await page.setContent(banco(['contraste-perfecto-en-el-css-invisible-en-pantalla']));

    const c = await contrasteReal(page, '#confianza');

    // Lo que habría calculado el instrumento VIEJO, reproducido a mano:
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c.colorDeclarado)!;
    const viejo = contraste({ r: +m[1], g: +m[2], b: +m[3] }, { r: 253, g: 253, b: 253 });

    console.log(`\n  el CSS declara:    color = ${c.colorDeclarado}   opacity = ${c.opacidad}`);
    console.log(`  ⛔ instrumento VIEJO (getComputedStyle): ${viejo.toFixed(1)}:1  → habría APROBADO`);
    console.log(`  ✅ instrumento NUEVO (píxel real):       ${c.ratio}:1  → ${c.pasa ? 'aprueba' : 'SUSPENDE'}`);
    console.log(`     texto pintado ${c.textoPintado} · fondo pintado ${c.fondoPintado}`);

    expect(viejo, 'el CSS declara el contraste MÁXIMO posible').toBeGreaterThan(15);
    expect(c.pasa, 'y en pantalla NO SE VE').toBe(false); // ⭐ el nuevo lo caza
    expect(c.ratio).toBeLessThan(2);
  });

  test('⛔ ROTO 4 · DOS ELEMENTOS PISÁNDOSE → el instrumento lo caza', async ({ page }) => {
    await page.setContent(banco(['solape']));

    const pisados = await solapes(page, '#destino, #tiempo');
    console.log(`\n  solapes: ${pisados.length}`);
    for (const s of pisados) console.log(`     ${s.etiqueta} · ${s.detalle} · ${s.texto}`);

    expect(pisados.length).toBeGreaterThan(0);

    // Y además: el destino deja de VERSE, aunque siga en el DOM.
    const v = await seVe(page, '#destino');
    console.log(`  ¿se ve el destino? ${v.visible ? 'sí' : `NO — ${v.motivo}`}`);
    expect(v.visible).toBe(false);
  });

  test('⛔ ROTO 5 · BOTÓN DIMINUTO → el pulgar no lo acierta', async ({ page }) => {
    await page.setContent(banco(['tactil-diminuto']));

    const malos = await tactilesPequenos(page);
    console.log(`\n  áreas táctiles por debajo de ${TACTIL_MINIMO}px: ${malos.length}`);
    for (const m of malos) console.log(`     <${m.etiqueta}> ${m.detalle}`);

    expect(malos.length).toBeGreaterThan(0);
    expect(malos[0].detalle).toContain('16×16');
  });

  // ═══════════════════════════════════════════════════════════════════════════

  test('⭐ ROTO 6 · EL INSTRUMENTO MINTIENDO: `fullPage` HACE APARECER lo que no se ve', async ({ page }) => {
    // Este test no prueba la aplicación. Prueba POR QUÉ `fullPage` está prohibido
    // en `medir.ts`, y lo demuestra en lugar de pedir que me creas.
    await page.setContent(banco(['fuera-de-pantalla']));
    await page.setViewportSize({ width: 360, height: 740 });

    const ancho = page.viewportSize()!.width;
    const caja = (await page.locator('#fuera').boundingBox())!;
    const seSale = caja.x + caja.width > ancho;

    console.log(`\n  viewport: ${ancho} px`);
    console.log(`  el chip ocupa x: ${Math.round(caja.x)} → ${Math.round(caja.x + caja.width)}`);
    console.log(`  ⛔ SE SALE DE LA PANTALLA: ${seSale}`);

    expect(seSale, 'el chip está fuera del viewport: el usuario NO LO VE').toBe(true);

    const conFullPage = await page.screenshot({ fullPage: true });
    const soloViewport = await page.screenshot({ fullPage: false });
    const { PNG } = await import('pngjs');
    const a = PNG.sync.read(conFullPage);
    const b = PNG.sync.read(soloViewport);

    console.log(`\n  captura fullPage:  ${a.width} px de ancho`);
    console.log(`  captura viewport:  ${b.width} px de ancho`);
    console.log(`  ⇒ fullPage ENSANCHÓ el documento ${a.width - b.width} px para que "cupiera"`);
    console.log('     Ese chip SALE ENTERO Y PRECIOSO en la captura fullPage.');
    console.log('     Y en el móvil de una persona está CORTADO. La captura mentiría.');

    // ⭐ LA PRUEBA: fullPage produce una imagen MÁS ANCHA que el viewport, y en
    //    esa anchura de más es donde vive lo que el usuario NO ve.
    expect(a.width).toBeGreaterThan(b.width);
  });
});
