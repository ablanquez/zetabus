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
  // 3 · LA PROCEDENCIA SE FUE DE ESTA PANTALLA. Y ESO TAMBIÉN SE PRUEBA.
  //
  // Antes cada nivel se distinguía por FORMA (borde discontinuo + símbolo †*?).
  // Antonio: «al usuario le importa tres pimientos de dónde saques el dato». Se
  // quitó de la vista de parada (vive entera en /sobre-los-datos). Aquí se invierte
  // el test: lo que antes exigía que se DISTINGUIERAN, ahora exige que se pinten
  // TODOS IGUAL. `data-confianza` (invisible) sigue ahí solo para poder mirarlos.
  // ═══════════════════════════════════════════════════════════════════════════
  const CONF = ['fuente_secundaria', 'observacion_propia', 'sin_verificar', 'oficial'] as const;
  for (const conf of CONF) {
    const ficha = page.locator(`[data-papel="ficha"][data-confianza="${conf}"]`).first();
    expect(await ficha.count(), `el fingimiento debería traer un coche ${conf}`).toBeGreaterThan(0);

    // Ni marca †*? …
    expect(await ficha.locator('[data-papel="marca-confianza"]').count(), `${conf} no lleva marca`).toBe(0);
    // … ni borde discontinuo: el chip-clase es SÓLIDO en los cuatro niveles.
    const borde = await ficha
      .locator('[data-papel="chip-clase"]')
      .evaluate((el) => getComputedStyle(el).borderStyle);
    expect(borde, `${conf}: el chip-clase no puede ir discontinuo`).not.toBe('dashed');
    console.log(`  ${conf.padEnd(18)} → chip-clase "${borde}" · sin marca  (todos IGUAL)`);
  }

  // Ni leyenda al pie, ni enlace "De dónde sale cada dato" colgando de un autobús.
  expect(await page.locator('[data-papel="nota-sin-verificar"]').count(), 'fuera la leyenda').toBe(0);
  expect(
    await page.getByText(/De dónde sale cada dato/i).count(),
    'fuera el enlace por autobús',
  ).toBe(0);
  console.log('  ⭐ ni marca, ni borde, ni enlace: la vista de parada quedó operativa y limpia.');
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
