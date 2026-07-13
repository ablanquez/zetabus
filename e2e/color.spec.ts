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

  // 1 · INMINENTE — el anillo sigue ahí (es forma, no color)
  const inminente = page.locator('[data-inminente="si"] [data-papel="minutos"]').first();
  expect(await inminente.count(), 'debería haber un autobús inminente').toBeGreaterThan(0);
  const anillo = await inminente.evaluate((n) => {
    const s = getComputedStyle(n);
    return { ancho: s.outlineWidth, estilo: s.outlineStyle };
  });
  console.log(`\n  INMINENTE  → anillo ${anillo.ancho} ${anillo.estilo}  (forma: SOBREVIVE al gris)`);
  expect(parseFloat(anillo.ancho)).toBeGreaterThanOrEqual(3);
  expect(anillo.estilo).not.toBe('none');

  // 2 · Y LA PALABRA. El tercer canal. Ni el color ni el latido van solos.
  const palabra = page.locator('[data-papel="ya-llega"]').first();
  expect(await palabra.count(), 'la palabra "YA LLEGA" tiene que estar').toBeGreaterThan(0);
  const ve = await seVe(page, '[data-papel="ya-llega"]');
  console.log(`  INMINENTE  → la palabra "YA LLEGA": ${ve.visible ? 'SE VE' : `NO — ${ve.motivo}`}`);
  expect(ve.visible).toBe(true);

  // 3 · SIN VERIFICAR — borde punteado, no un chip de color
  const sv = page.locator('[data-confianza="sin_verificar"]').first();
  expect(await sv.count(), 'el fingimiento debería traer un coche sin verificar').toBeGreaterThan(0);
  const borde = await sv.evaluate((n) => getComputedStyle(n).borderStyle);
  console.log(`  SIN VERIFICAR → borde "${borde}"  (forma: SOBREVIVE al gris)`);
  expect(borde).toBe('dashed');

  // 4 · Y la palabra, otra vez. Nunca solo forma, nunca solo color.
  await expect(sv).toContainText(/SIN VERIFICAR/i);

  // 5 · Y el OFICIAL tiene borde SÓLIDO: los dos tratamientos se distinguen
  //     SIN COLOR. Si los dos fueran sólidos y solo cambiara el tono, en gris
  //     serían idénticos y el usuario no podría saber de cuál fiarse.
  const of = page.locator('[data-confianza="oficial"]').first();
  const bordeOf = await of.evaluate((n) => getComputedStyle(n).borderStyle);
  console.log(`  OFICIAL       → borde "${bordeOf}"`);
  expect(bordeOf).toBe('solid');
  expect(bordeOf).not.toBe(borde); // ⭐ distinguibles por FORMA
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
