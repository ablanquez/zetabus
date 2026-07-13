/**
 * ⭐ LA LÍNEA DE FLOTACIÓN. La métrica que Antonio definió y que nadie mide.
 *
 * "El usuario está EN LA CALLE, DE PIE, CON PRISA."
 *
 * Entonces la pregunta no es "¿está el dato en la página?". Es:
 *      ⇒ ¿SE VE EL DATO SIN HACER SCROLL?
 *
 * Esto NO se puede saber leyendo el código. Yo leí el código de la referencia y
 * escribí que su pantalla de parada estaba "bien resuelta". Con un navegador
 * delante, a 360 px, resulta que LAS LLEGADAS NO SALEN EN LA PRIMERA PANTALLA.
 */
import { test, expect } from '@playwright/test';
const REF = 'http://localhost:3100';

test('⭐ ¿se ven las LLEGADAS sin hacer scroll? (referencia, parada 744)', async ({ page }, info) => {
  const r = await page.request.get(`${REF}/moverme/bus`).catch(() => null);
  test.skip(!r?.ok(), 'la referencia no está en :3100');

  await page.goto(`${REF}/moverme/bus/parada/744`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const alto = page.viewportSize()!.height;
  const partes: [string, string][] = [
    ['cabecera (nombre de la parada)', 'h1'],
    ['barra "Guardar esta parada"', 'text=Guardar esta parada'],
    ['el MAPA', '.leaflet-container'],
    ['filtro "Líneas en esta parada"', 'text=Líneas en esta parada'],
    ['⭐ "Próximas llegadas"', 'text=Próximas llegadas'],
    ['⭐ el PRIMER TIEMPO de llegada', '.tabular-nums'],
  ];

  console.log(`\n  ══ ${info.project.name} · viewport de ${alto} px de alto ══\n`);
  let llegadasVisibles = true;
  for (const [nombre, sel] of partes) {
    const el = page.locator(sel).first();
    if (await el.count() === 0) { console.log(`     ${nombre.padEnd(36)} (no está)`); continue; }
    const c = await el.boundingBox();
    if (!c) continue;
    const dentro = c.y < alto;
    const marca = dentro ? '✅ SE VE' : '⛔ HAY QUE HACER SCROLL';
    console.log(`     ${nombre.padEnd(36)} y=${String(Math.round(c.y)).padStart(4)}  alto=${String(Math.round(c.height)).padStart(3)}  ${marca}`);
    if (nombre.startsWith('⭐') && !dentro) llegadasVisibles = false;
  }

  const tiempo = page.locator('.tabular-nums').first();
  if (await tiempo.count() > 0) {
    const c = await tiempo.boundingBox();
    if (c && c.y >= alto) {
      console.log(`\n  ⛔ EL TIEMPO DE LLEGADA ESTÁ ${Math.round(c.y - alto)} px POR DEBAJO DE LA PANTALLA.`);
      console.log('     El usuario está en la marquesina, de pie, con prisa,');
      console.log('     y lo primero que ve es un mapa y un botón de "Guardar".');
    }
  }
  expect(llegadasVisibles, 'las llegadas deberían verse sin scroll').toBe(true);
});
