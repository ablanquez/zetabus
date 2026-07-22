/**
 * ⭐ LA LÍNEA DE FLOTACIÓN. EL TEST QUE CIERRA O NO CIERRA LA TANDA.
 *
 *      "El usuario está EN LA CALLE, DE PIE, CON PRISA."
 *
 * Entonces la pregunta no es "¿está el dato en la página?". Es:
 *
 *      ⇒ ¿SE VE EL TIEMPO DE LLEGADA SIN TOCAR LA PANTALLA?
 *
 * ⚠️ ESTO NO SE PUEDE SABER LEYENDO EL CÓDIGO. Leyendo el de la referencia
 * escribí que su pantalla de parada estaba "bien resuelta". Con un Chromium de
 * 360 px delante:
 *
 *     el MAPA               y=249  alto=288 px  (39% del viewport)
 *     EL PRIMER TIEMPO      y=789  ⛔ 49 px POR DEBAJO DE LA PANTALLA
 *
 * El orden de sus componentes era defendible. Lo que ese orden producía a
 * 360 px, no.
 *
 * ⚠️ Y ESTE TEST SE EJECUTA EN CADA TANDA. Cuando llegue el mapa (Tanda 5), si
 * empuja el primer tiempo fuera de la pantalla, ESTO SE PONE ROJO. No se confía
 * a la buena voluntad de nadie, y menos a la mía.
 */

import { test, expect } from '@playwright/test';
import { capturar } from './lib/medir';

/** Plaza San Miguel: dos líneas, tráfico real. */
const POSTE = 744;

test('⭐ EL PRIMER TIEMPO DE LLEGADA CABE EN LA PANTALLA', async ({ page }, info) => {
  // Se FUERZA el caso bueno para que el test no dependa de que a las 4 de la
  // mañana no pase ningún autobús. Un test visual que solo pasa en hora punta no
  // es un test. El fingimiento se marca en pantalla con una banda roja, así que
  // no hay forma de que un dato falso se cuele como si fuera real.
  await page.goto(`/parada/${POSTE}?fingir=sin-verificar`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const alto = page.viewportSize()!.height;
  const v = info.project.name;

  const piezas: [string, string][] = [
    ['nombre de la parada', '[data-papel="nombre-parada"]'],
    ['⭐ la EDAD del dato', '[data-papel="edad"]'],
    ['⭐ EL PRIMER TIEMPO', '[data-papel="minutos"]'],
    ['la ficha del vehículo', '[data-confianza]'],
  ];

  console.log(`\n  ══ ${v} · viewport de ${alto} px de alto ══\n`);
  let tiempoDentro = false;
  for (const [nombre, sel] of piezas) {
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) { console.log(`     ${nombre.padEnd(28)} (no está)`); continue; }
    const c = await el.boundingBox();
    if (!c) continue;
    const dentro = c.y + c.height <= alto;
    console.log(
      `     ${nombre.padEnd(28)} y=${String(Math.round(c.y)).padStart(4)}  alto=${String(Math.round(c.height)).padStart(3)}  ` +
        `${dentro ? '✅ SE VE ENTERO' : c.y < alto ? '◐ asoma' : '⛔ FUERA'}`,
    );
    if (nombre.includes('EL PRIMER TIEMPO')) tiempoDentro = dentro;
  }

  await capturar(page, `capturas/zetabus/parada-${v}.png`);

  // ⛔ LA CONDICIÓN QUE CIERRA LA TANDA.
  expect(tiempoDentro, 'el primer tiempo de llegada TIENE que verse sin scroll').toBe(true);
});

test('la EDAD va ANTES que las llegadas, y también se ve sin scroll', async ({ page }) => {
  await page.goto(`/parada/${POSTE}?fingir=sin-verificar`, { waitUntil: 'networkidle' });
  const alto = page.viewportSize()!.height;

  const edad = await page.locator('[data-papel="edad"]').first().boundingBox();
  const minutos = await page.locator('[data-papel="minutos"]').first().boundingBox();
  expect(edad, 'la barra de edad tiene que existir').not.toBeNull();
  expect(minutos, 'el tiempo tiene que existir').not.toBeNull();

  // Si el dato es viejo, hay que saberlo ANTES de creerse el "3 min".
  expect(edad!.y).toBeLessThan(minutos!.y);
  expect(edad!.y + edad!.height).toBeLessThanOrEqual(alto);
});
