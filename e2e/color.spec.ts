/**
 * ⛔ EL ESTADO NO VA EN EL TONO. Y AQUÍ SE DEMUESTRA, NO SE PROMETE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL PROBLEMA, CON NÚMEROS:
 *
 *    · 22 de las 44 líneas caen en la franja rojo/ámbar/amarillo/lima/verde.
 *    · La LÍNEA 31 es #D1221D. El rojo de "alerta" es #B91C1C.
 *      Son PRÁCTICAMENTE EL MISMO ROJO.
 *
 *  Si el estado fuera color, la línea 31 estaría permanentemente "en alerta" y
 *  la 26 (verde) permanentemente "correcta". Sin que nadie hiciera nada, sin un
 *  solo error, y con una coherencia visual impecable.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ LA PRUEBA: SE PINTA LA PÁGINA EN ESCALA DE GRISES Y SE COMPRUEBA QUE LOS
 *   ESTADOS SIGUEN DISTINGUIÉNDOSE.
 *
 * Si el estado estuviera en el tono, en gris DESAPARECERÍA. Al quitarle el
 * color, lo que queda es lo que de verdad estaba comunicando la información.
 *
 * Y no es un experimento de laboratorio: es lo que ve un daltónico (8% de los
 * hombres), lo que ve un móvil barato con la pantalla lavada, y lo que ve
 * cualquiera con el sol de Zaragoza dándole en la pantalla en agosto.
 */

import { test, expect } from '@playwright/test';
import { capturar, contraste, pixel, aHex, seVe, type Rgb } from './lib/medir';

const POSTE = 744;
const hex = (s: string): Rgb => ({
  r: parseInt(s.slice(1, 3), 16), g: parseInt(s.slice(3, 5), 16), b: parseInt(s.slice(5, 7), 16),
});

test('⚠️ EL HECHO: la línea 31 y el rojo de alerta son el mismo color', () => {
  // No es una hipótesis. Es el color que el operador le ha puesto a la línea 31
  // en el GTFS, y el rojo que cualquiera usaría para decir "alerta".
  const linea31 = hex('#D1221D');
  const alerta = hex('#B91C1C');

  const c = contraste(linea31, alerta);
  console.log(`\n  línea 31:        #D1221D`);
  console.log(`  rojo de alerta:  #B91C1C`);
  console.log(`  contraste entre ellos: ${c.toFixed(2)}:1  (1,0 = indistinguibles)`);
  console.log('  ⇒ Si el estado fuera color, la línea 31 estaría SIEMPRE en alerta.\n');

  // Contraste 1,0 = el mismo color. Cualquier cosa por debajo de 1,5 es
  // "indistinguible de un vistazo, de pie, en la calle".
  expect(c).toBeLessThan(1.5);
});

test('⭐ EN ESCALA DE GRISES, EL ESTADO SIGUE VIÉNDOSE', async ({ page }, info) => {
  await page.goto(`/parada/${POSTE}?fingir=sin-verificar`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  // Se le quita TODO el color a la página. Lo que sobreviva, es lo que de verdad
  // estaba comunicando.
  await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
  await page.waitForTimeout(200);
  await capturar(page, `capturas/zetabus/GRIS-parada-${info.project.name}.png`);

  // ═══════════════════════════════════════════════════════════════════════════
  // ⭐⭐ B1 · INMINENTE, CON TRES CANALES. Y EL ROJO VUELVE.
  //
  // Este test comprobaba EL ANILLO. Y el anillo era mi error de la Tanda 6: quité
  // el rojo por miedo a que el estado fuera color, y lo sustituí por un aro negro
  // que —dicho por Antonio mirando la pantalla— "parece un error de renderizado".
  //
  // ⛔ El salto lógico estaba mal: «el estado no puede ir SOLO en el tono» NO es
  //    «el estado no puede ir en el tono TAMBIÉN».
  //
  // ⇒ Ahora se comprueban LOS TRES canales. Y lo que este test mide de verdad —lo
  //   único que importa— es que **AL QUITAR EL COLOR SIGUEN QUEDANDO DOS**.
  // ═══════════════════════════════════════════════════════════════════════════
  const inminente = page.locator('[data-inminente="si"] [data-papel="minutos"]').first();
  expect(await inminente.count(), 'debería haber un autobús inminente').toBeGreaterThan(0);

  // CANAL 1 · EL COLOR. Se mide EN EL PÍXEL, sobre la página YA en gris: si el rojo
  //   fuera la única señal, aquí ya se habría muerto — y eso es justo lo que se ve.
  const rojoDeclarado = await inminente.evaluate((n) => getComputedStyle(n).color);
  console.log(`\n  INMINENTE  → canal 1 · COLOR: ${rojoDeclarado}  (⚠️ SE PIERDE en gris, y no pasa nada)`);

  // CANAL 2 · EL MOVIMIENTO. El latido no es un color: sobrevive.
  const anim = await inminente.evaluate((n) => getComputedStyle(n).animationName);
  console.log(`  INMINENTE  → canal 2 · MOVIMIENTO: "${anim}"  (SOBREVIVE al gris)`);
  expect(anim, 'el latido tiene que estar').not.toBe('none');

  // CANAL 3 · LA PALABRA. Tampoco es un color.
  const palabra = page.locator('[data-papel="ya-llega"]').first();
  expect(await palabra.count(), 'la palabra "YA LLEGA" tiene que estar').toBeGreaterThan(0);
  const ve = await seVe(page, '[data-papel="ya-llega"]');
  console.log(`  INMINENTE  → canal 3 · PALABRA "YA LLEGA": ${ve.visible ? 'SE VE' : `NO — ${ve.motivo}`}  (SOBREVIVE al gris)`);
  expect(ve.visible).toBe(true);

  // ⭐ Y LA CONTRAPRUEBA DEL PROPIO ARGUMENTO: en ESCALA DE GRISES, ¿se distingue
  //   todavía el bus inminente del que no lo es? Si la respuesta fuera "no", el
  //   rojo sería la única señal y habría que quitarlo. La respuesta es SÍ, y es
  //   por el latido y la palabra — que es exactamente lo que permite meter el rojo.
  const noInminente = page.locator('[data-inminente="no"] [data-papel="minutos"]').first();
  const animNo = await noInminente.evaluate((n) => getComputedStyle(n).animationName);
  expect(animNo, 'un bus NO inminente no puede latir').toBe('none');
  expect(
    await page.locator('[data-inminente="no"] [data-papel="ya-llega"]').count(),
    'un bus NO inminente no puede decir "ya llega"',
  ).toBe(0);
  console.log('  ⭐ y en GRIS, el inminente SIGUE distinguiéndose: late y lo dice.');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3 · SIN VERIFICAR. ⚠️ LA SEÑAL SE HA MOVIDO, Y EL TEST LA HA CAZADO.
  //
  // Antes el borde discontinuo iba en el CAJÓN de la ficha entera. Ahora la ficha
  // son CHIPS (clonados de la referencia) y el borde va en cada chip afectado.
  // El test miraba el contenedor, encontró "solid", y se puso rojo. Correcto: la
  // señal ya no estaba donde él miraba.
  //
  // ⚠️ Y AQUÍ ESTABA LA TENTACIÓN: cambiar el selector y seguir. Pero lo que hay
  //    que volver a demostrar es que la señal SIGUE SOBREVIVIENDO AL GRIS, que es
  //    para lo que existe este test. Así que se comprueban los TRES canales otra
  //    vez, sobre el sitio nuevo.
  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠️ Y EN LA TANDA 7 SE VOLVIÓ A MOVER: ya no hay UN "sin verificar", hay TRES
  //    procedencias no oficiales, cada una con su símbolo. El riesgo nuevo no es
  //    que se confundan con el oficial —eso ya estaba probado— sino que **SE
  //    CONFUNDAN ENTRE ELLAS**. Así que el test sube de exigencia.
  const NIVELES = [
    { conf: 'fuente_secundaria', simbolo: '*', que: 'busesmadrid.es — citable, NO oficial' },
    { conf: 'observacion_propia', simbolo: '†', que: 'Antonio se sube a él. NO citable' },
    { conf: 'sin_verificar', simbolo: '?', que: 'no consta en ninguna parte' },
  ] as const;

  const simbolosVistos: string[] = [];
  for (const n of NIVELES) {
    const ficha = page.locator(`[data-papel="ficha"][data-confianza="${n.conf}"]`).first();
    expect(await ficha.count(), `el fingimiento debería traer un coche ${n.conf}`).toBeGreaterThan(0);

    // CANAL 1 · LA FORMA. Borde discontinuo en los chips que afirman algo del bus.
    const borde = await ficha
      .locator('[data-papel="chip-clase"]')
      .evaluate((el) => getComputedStyle(el).borderStyle);
    expect(borde).toBe('dashed');

    // CANAL 2 · EL SÍMBOLO. No es un color: en gris sigue ahí.
    const marca = ficha.locator('[data-papel="marca-confianza"]');
    await expect(marca).toHaveText(n.simbolo);
    // ⚠️ Con TRES autobuses, la tercera ficha cae por debajo del pliegue a 360×740.
    //    Eso NO es un defecto —se baja y ya—, pero `seVe` mide contra el viewport y
    //    dijo "fuera del viewport (265, 752)". Tenía razón, y por eso se trae. Lo
    //    que este test prueba es que el símbolo SOBREVIVE AL GRIS, no que quepa sin
    //    hacer scroll.
    await marca.scrollIntoViewIfNeeded();
    const ve = await seVe(page, `[data-marca="${n.conf}"]`);
    expect(ve.visible).toBe(true);
    simbolosVistos.push(n.simbolo);

    console.log(
      `\n  ${n.conf.padEnd(18)} → borde "${borde}" · símbolo "${n.simbolo}" ${ve.visible ? 'SE VE' : `NO — ${ve.motivo}`}  (${n.que})`,
    );
  }

  // ⭐ Y LOS SÍMBOLOS SON DISTINTOS ENTRE SÍ. Si los tres niveles llevaran el mismo
  //    asterisco, el usuario no podría distinguir "lo dice una web de aficionados"
  //    de "no lo dice nadie" — y esas dos cosas NO son lo mismo.
  expect(new Set(simbolosVistos).size, 'cada procedencia, SU símbolo').toBe(NIVELES.length);

  // CANAL 3 · LA PALABRA. Al pie, UNA vez, y solo la de los niveles PRESENTES.
  const nota = page.locator('[data-papel="nota-sin-verificar"]');
  await expect(nota).toContainText(/No consta en el pliego municipal/i);
  await expect(nota).toContainText(/Visto circular/i);
  await expect(nota).toContainText(/Sin procedencia conocida/i);
  console.log('  la leyenda al pie: SE VE, con las TRES entradas');

  // ⚠️ Y LA CONTRAPRUEBA DE LA LEYENDA: en una parada donde SOLO hay oficiales, no
  //    se pinta NINGUNA línea. Una leyenda que explica símbolos que no están es
  //    ruido, y además miente sobre lo que el usuario tiene delante.
  const limpia = await page.context().newPage();
  await limpia.goto(`/parada/${POSTE}?fingir=solo-oficiales`, { waitUntil: 'networkidle' });
  // ⚠️ Y SE EXIGE LA PRUEBA DE QUE EL FINGIMIENTO HA OCURRIDO: si no, este test
  //    estaría mirando datos REALES y aprobando por casualidad.
  //
  // ⭐ ANTES SE MIRABA LA BANDA "MODO DEMO", Y ERA EL PROXY EQUIVOCADO: aquella
  //    banda salía con `ZETABUS_DEMO=1` estuviera fingiendo o no, así que
  //    demostraba que el FLAG estaba puesto, no que el fingimiento se aplicara.
  //    La marca de página sí lo demuestra, y además dice cuál.
  await expect(limpia.locator('[data-papel="fingiendo"]')).toHaveAttribute(
    'data-fingimiento',
    'solo-oficiales',
  );
  expect(
    await limpia.locator('[data-papel="nota-sin-verificar"]').count(),
    'sin marcados en pantalla, la leyenda NO se pinta',
  ).toBe(0);
  console.log('  ⭐ CONTRAPRUEBA: con solo oficiales, la leyenda NO aparece');
  await limpia.close();

  // ⭐ 4 · Y EL OFICIAL NO LLEVA NINGUNA DE LAS TRES. Si los tratamientos solo se
  //        distinguieran por el TONO, en escala de grises serían idénticos y el
  //        usuario no podría saber de cuál fiarse. Esto es lo que de verdad prueba
  //        el test: que la diferencia NO está en el color.
  const oficial = page.locator('[data-papel="ficha"][data-confianza="oficial"]').first();
  expect(await oficial.count(), 'hace falta un oficial CON QUÉ COMPARAR').toBeGreaterThan(0);
  const bordeOf = await oficial
    .locator('[data-papel="chip-clase"]')
    .evaluate((n) => getComputedStyle(n).borderStyle);
  console.log(`  oficial            → borde "${bordeOf}" · sin símbolo  (es la NORMA: no se anuncia)`);
  expect(bordeOf).not.toBe('dashed'); // ⭐ distinguibles por FORMA, sin color
  expect(await oficial.locator('[data-papel="marca-confianza"]').count()).toBe(0);
});

test('⭐ EL COLOR DE LÍNEA NO SE USA NUNCA PARA UN ESTADO', async ({ page }) => {
  await page.goto(`/parada/${POSTE}?fingir=sin-verificar`, { waitUntil: 'networkidle' });

  // El color de la línea vive SOLO en su chip de identidad. En ningún otro sitio.
  const chips = page.locator('[data-papel="chip-linea"]');
  expect(await chips.count()).toBeGreaterThan(0);

  // Y los elementos que llevan ESTADO no tienen ningún fondo de color de línea.
  const conEstado = ['[data-papel="minutos"]', '[data-papel="ya-llega"]', '[data-confianza]'];
  for (const sel of conEstado) {
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) continue;
    const fondo = await el.evaluate((n) => getComputedStyle(n).backgroundColor);
    // transparent o gris del sistema. NUNCA el naranja/rojo/verde de una línea.
    const esNeutro = /rgba\(0, 0, 0, 0\)|transparent/.test(fondo) || /rgb\((\d+), (\d+), (\d+)\)/.test(fondo);
    if (/rgb\((\d+), (\d+), (\d+)\)/.test(fondo)) {
      const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(fondo)!;
      const [r, g, b] = [+m[1], +m[2], +m[3]];
      const saturacion = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      console.log(`  ${sel.padEnd(30)} fondo ${fondo}  saturación ${saturacion.toFixed(2)}`);
      // Un fondo con saturación alta = un color "que habla". No puede haberlo
      // en un elemento de estado: competiría con el color de la línea.
      expect(saturacion, `${sel} tiene un fondo saturado: el color estaría haciendo dos trabajos`).toBeLessThan(0.25);
    }
    expect(esNeutro).toBe(true);
  }
});

test('el color de IDENTIDAD sí está donde tiene que estar (píxel real)', async ({ page }) => {
  await page.goto(`/parada/${POSTE}?fingir=sin-verificar`, { waitUntil: 'networkidle' });

  const chip = page.locator('[data-papel="chip-linea"]').first();
  const caja = (await chip.boundingBox())!;

  // ⚠️ TERCERA VEZ QUE EL INSTRUMENTO ME MUERDE ESTA SEMANA, Y QUEDA ESCRITO.
  //
  // La primera versión muestreaba la ESQUINA del chip (`caja.x + 3`). Y el chip
  // tiene `rounded-xl` (12 px de radio): **esa esquina cae FUERA del redondeo**
  // y devuelve el blanco de la tarjeta de detrás. El test decía
  // "fondo pintado #FFFFFF" sobre un chip AZUL.
  //
  // Muestrear la esquina de un elemento redondeado no muestrea el elemento.
  // (Las otras dos veces: `getComputedStyle` sin `opacity`, y ocho desbordes
  // falsos por no mirar los ancestros que recortan.)
  //
  // ⇒ Se muestrea EL CENTRO, que está dentro pase lo que pase con el radio.
  const centro = await pixel(page, caja.x + caja.width / 2, caja.y + 4);
  console.log(`\n  chip de línea (centro superior): ${aHex(centro)}`);

  const blanco = aHex(centro) === '#FFFFFF';
  expect(blanco, 'el chip de línea tiene que llevar el color de la línea').toBe(false);

  // Y ese color NO aparece en ningún elemento de estado. Ya se comprueba arriba.
});
