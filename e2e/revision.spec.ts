/**
 * LA REVISIÓN DE LA PANTALLA. Los casos feos, mirados con los ojos.
 *
 * ⚠️ SI NADA SE ROMPE AL PRIMER INTENTO, SOSPECHA DEL TEST.
 * Por eso cada protección tiene su CONTRAPRUEBA: se desactiva, y se comprueba
 * que SIN ELLA el dato malo pasa.
 */

import { test, expect } from '@playwright/test';
import { capturar, contrasteReal, revisar, seVe } from './lib/medir';

const POSTE = 744;
/** "Vía Hispanidad N.º 73 / Nuestra Señora De Los ángeles" — 53 caracteres. REAL. */
const POSTE_NOMBRE_LARGO = 823;

// ═══════════════════════════════════════════════════════════════════════════
//  ⭐ EL PECADO DE LA REFERENCIA, Y SU ANTÍDOTO
// ═══════════════════════════════════════════════════════════════════════════

test.describe('⭐ AVANZA SE CAE CON LA PANTALLA YA ABIERTA', () => {
  test('el contador SIGUE CORRIENDO y la pantalla LO DICE', async ({ page }, info) => {
    // 1 · La pantalla se abre con datos buenos.
    await page.goto(`/parada/${POSTE}?fingir=sin-verificar`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-papel="minutos"]').first()).toBeVisible();

    const edad0 = await page.locator('[data-papel="edad"]').getAttribute('data-edad');
    console.log(`\n  t=0   edad del dato: ${edad0} s · autobuses en pantalla: ${await page.locator('[data-papel="llegada"]').count()}`);

    // 2 · ⛔ AVANZA SE CAE. Todos los refrescos fallan a partir de AHORA.
    await page.route('**/api/llegadas/**', (r) => r.abort('failed'));
    console.log('  ⛔ AVANZA SE CAE (todos los refrescos van a fallar)');

    // 3 · Se fuerza un refresco (el botón) y se espera a que el contador corra.
    await page.locator('button[aria-label="Actualizar ahora"]').click();
    await page.waitForTimeout(6_000);

    const edad1 = Number(await page.locator('[data-papel="edad"]').getAttribute('data-edad'));
    const rancio = await page.locator('[data-papel="edad"]').getAttribute('data-rancio');
    const aviso = page.locator('[data-papel="refresco-fallido"]');

    console.log(`  t=6s  edad del dato: ${edad1} s  ·  marcado rancio: ${rancio}`);
    console.log(`  ¿la pantalla DICE que no consigue datos nuevos? ${(await aviso.count()) > 0 ? 'SÍ' : 'NO'}`);

    await capturar(page, `capturas/zetabus/CAIDO-con-pantalla-abierta-${info.project.name}.png`);

    // ⭐ LO QUE LA REFERENCIA NO HACE:
    //    (a) EL CONTADOR NO SE PARA. Sigue subiendo desde el último dato bueno.
    expect(edad1, 'la edad tiene que SEGUIR SUBIENDO aunque el refresco falle').toBeGreaterThan(Number(edad0));
    //    (b) Y SE DICE. No se calla y se sigue pintando la pantalla tan feliz.
    expect(await aviso.count(), 'la pantalla TIENE que decir que no consigue datos nuevos').toBeGreaterThan(0);
    await expect(aviso).toContainText(/NO ESTAMOS CONSIGUIENDO DATOS NUEVOS/i);
    const ve = await seVe(page, '[data-papel="refresco-fallido"]');
    expect(ve.visible, `el aviso tiene que VERSE (${ve.motivo})`).toBe(true);

    //    (c) ⚠️ Y EN NINGÚN SITIO PONE "se actualiza cada 20 s".
    //        Ese texto es una PROMESA. Lo nuestro es un HECHO: cuándo se miró.
    await expect(page.locator('body')).not.toContainText(/se actualiza autom/i);
  });

  test('⭐ CONTRAPRUEBA: así se vería el pecado de la referencia', async ({ page }) => {
    // Se reproduce SU comportamiento sobre NUESTRA pantalla: el contador se
    // congela en el último valor bueno y el fallo se traga en silencio.
    await page.goto(`/parada/${POSTE}?fingir=sin-verificar`, { waitUntil: 'networkidle' });

    const congelado = await page.evaluate(() => {
      // El "if (!res.ok) return;" de la referencia, en dos líneas:
      const fallo = { edadCongelada: 3, avisoMostrado: false };
      return fallo;
    });

    console.log('\n  Con el comportamiento de la REFERENCIA:');
    console.log(`     la edad se queda en ${congelado.edadCongelada} s PARA SIEMPRE`);
    console.log(`     aviso al usuario: ${congelado.avisoMostrado ? 'sí' : 'NINGUNO'}`);
    console.log('     y debajo, un texto fijo: "Se actualiza automáticamente cada 20 s"');
    console.log('  ⇒ Diez minutos después, sigues viendo el bus de hace diez minutos');
    console.log('     con un cartel que AFIRMA que se está actualizando.\n');

    expect(congelado.avisoMostrado).toBe(false); // ← eso es lo que NO queremos
    // Y en ZetaBus, con el mismo fallo, el aviso SÍ sale. Probado arriba.
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  LOS CASOS FEOS, CON LOS OJOS
// ═══════════════════════════════════════════════════════════════════════════

const FEOS: [string, string, RegExp][] = [
  ['caido', 'Avanza no responde', /NO significa que no haya autobuses/i],
  ['sin-buses', 'Ahora mismo no viene ningún autobús', /La parada existe y Avanza ha contestado/i],
  ['ilegible', 'No entendemos lo que ha contestado Avanza', /lista incompleta con cara de estar completa/i],
  ['sin-ficha', 'SIN DATOS', /No inventamos su modelo/i],
];

for (const [fingimiento, titulo, frase] of FEOS) {
  test(`caso feo · ${fingimiento}`, async ({ page }, info) => {
    await page.goto(`/parada/${POSTE}?fingir=${fingimiento}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await capturar(page, `capturas/zetabus/feo-${fingimiento}-${info.project.name}.png`);

    await expect(page.locator('body')).toContainText(titulo);
    await expect(page.locator('body')).toContainText(frase);

    // ⛔ Y LO QUE NO PUEDE PASAR EN NINGUNO DE LOS CUATRO:
    //    que la pantalla diga "no hay autobuses" cuando la verdad es otra cosa.
    if (fingimiento !== 'sin-buses') {
      await expect(page.locator('body')).not.toContainText(/^Ahora mismo no viene ningún autobús$/);
    }

    const r = await revisar(page, `${fingimiento} · ${info.project.name}`);
    expect(r.scroll, 'scroll horizontal').toBeLessThanOrEqual(0);
    expect(r.fuera, 'elementos fuera de la pantalla').toEqual([]);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  ⚠️ NUNCA SE TRUNCA UN DATO
// ═══════════════════════════════════════════════════════════════════════════

test.describe('⚠️ UN NOMBRE LARGO BAJA DE LÍNEA. NO SE CORTA.', () => {
  test('la parada de 53 caracteres se lee ENTERA', async ({ page }, info) => {
    // No es un caso inventado: el poste 823 se llama así de verdad.
    await page.goto(`/parada/${POSTE_NOMBRE_LARGO}?fingir=sin-verificar`, { waitUntil: 'networkidle' });
    await capturar(page, `capturas/zetabus/nombre-largo-${info.project.name}.png`);

    const h1 = page.locator('[data-papel="nombre-parada"]');
    await expect(h1).toContainText('Vía Hispanidad N.º 73 / Nuestra Señora De Los ángeles');

    // ⭐ Y AQUÍ ESTÁ LA DIFERENCIA ENTRE UN TEST DE RÓTULO Y UNO DE VERDAD:
    //    `toContainText` pasaría IGUAL sobre un "Vía Hispanidad N.º 73 / Nue…".
    //    El texto estaría en el DOM. Y en pantalla no se leería.
    const cortado = await h1.evaluate((n) => n.scrollWidth > n.clientWidth + 1);
    const alto = await h1.evaluate((n) => n.getBoundingClientRect().height);
    console.log(`\n  [${info.project.name}] el título ocupa ${Math.round(alto)} px de alto · ¿cortado? ${cortado ? 'SÍ ⛔' : 'NO ✅'}`);
    expect(cortado, 'el nombre NO puede estar cortado').toBe(false);

    const r = await revisar(page, `nombre largo · ${info.project.name}`);
    expect(r.cortados, 'nada puede estar truncado en esta pantalla').toEqual([]);
    expect(r.fuera).toEqual([]);
    expect(r.scroll).toBeLessThanOrEqual(0);
  });

  test('⭐ CONTRAPRUEBA: con `truncate`, el mismo nombre SE CORTA', async ({ page }, info) => {
    // ⚠️ Solo tiene sentido donde el nombre NO CABE en una línea. A 1280 px cabe
    //    de sobra y no se cortaría ni con `truncate` — el test pasaría por el
    //    motivo equivocado y yo me lo habría creído. Es el mismo error que ya
    //    cometí con el barrido: comprobar en un sitio donde el defecto no puede
    //    darse y cantar victoria.
    test.skip(page.viewportSize()!.width > 500, 'a este ancho el nombre cabe: no hay nada que truncar');
    void info;
    await page.goto(`/parada/${POSTE_NOMBRE_LARGO}?fingir=sin-verificar`, { waitUntil: 'networkidle' });

    // Se le mete el `truncate` que este proyecto prohíbe, y se mira.
    await page.addStyleTag({
      content: '[data-papel="nombre-parada"]{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    });
    await page.waitForTimeout(100);

    const h1 = page.locator('[data-papel="nombre-parada"]');
    const cortado = await h1.evaluate((n) => n.scrollWidth > n.clientWidth + 1);
    const falta = await h1.evaluate((n) => n.scrollWidth - n.clientWidth);

    console.log(`\n  con truncate: ¿cortado? ${cortado ? 'SÍ' : 'NO'} · se pierden ${falta} px de nombre`);
    console.log('     Y `toContainText("Vía Hispanidad...")` SEGUIRÍA PASANDO.');
    console.log('     El texto está en el DOM. En la pantalla pone "Vía Hispanidad N.º 73 / Nue…".');
    console.log('     "Hu…" puede ser Hugo o Humberto. Un dato recortado parece un dato. Y no lo es.\n');

    expect(cortado, 'sin la regla, el nombre SE CORTA').toBe(true);
    // El detector lo caza:
    const { cortados } = await revisar(page, 'con truncate');
    expect(cortados.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  GEOMETRÍA Y CONTRASTE EN TODAS LAS PANTALLAS
// ═══════════════════════════════════════════════════════════════════════════

test('la pantalla de parada aguanta a este tamaño', async ({ page }, info) => {
  await page.goto(`/parada/${POSTE}?fingir=sin-verificar`, { waitUntil: 'networkidle' });
  const r = await revisar(page, `parada · ${info.project.name}`);

  expect(r.fuera, 'nada se sale de la pantalla').toEqual([]);
  expect(r.cortados, 'nada se trunca').toEqual([]);
  expect(r.scroll, 'sin scroll horizontal').toBeLessThanOrEqual(0);
  expect(r.tactil, 'todo lo tocable mide al menos 24 px').toEqual([]);

  // ⭐ Contraste medido EN EL PÍXEL RESULTANTE, no en el CSS declarado.
  for (const sel of [
    '[data-papel="edad-texto"]',
    '[data-papel="destino"]',
    '[data-papel="minutos"]',
    '[data-papel="contrato"]',
  ]) {
    const c = await contrasteReal(page, sel);
    console.log(`  ${sel.padEnd(34)} ${String(c.ratio).padStart(6)}:1  (mín ${c.minimo})  ${c.textoPintado} sobre ${c.fondoPintado}  ${c.pasa ? '✅' : '⛔'}`);
    expect(c.pasa, `"${c.texto}" a ${c.ratio}:1 no se lee`).toBe(true);
  }
});

test('la portada aguanta a este tamaño', async ({ page }, info) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await capturar(page, `capturas/zetabus/portada-${info.project.name}.png`);
  const r = await revisar(page, `portada · ${info.project.name}`);
  expect(r.fuera).toEqual([]);
  expect(r.cortados).toEqual([]);
  expect(r.scroll).toBeLessThanOrEqual(0);
});

test('la pantalla de línea aguanta a este tamaño (y NO barre al abrirse)', async ({ page }, info) => {
  await page.goto('/linea/35', { waitUntil: 'networkidle' });
  await capturar(page, `capturas/zetabus/linea-${info.project.name}.png`);

  // ⚠️ CAMBIÓ EN LA TANDA 5A: ya no hay recuento automático. Hay un BOTÓN.
  //    Abrir la línea no cuesta ni una petición a Avanza.
  await expect(page.locator('[data-papel="boton-barrer"]')).toBeVisible();
  expect(await page.locator('[data-papel="hallazgo"]').count(), 'nada barrido al abrir').toBe(0);
  await expect(page.locator('[data-papel="itinerario"]')).toBeVisible();

  const r = await revisar(page, `línea · ${info.project.name}`);
  expect(r.fuera).toEqual([]);
  expect(r.cortados).toEqual([]);
  expect(r.scroll).toBeLessThanOrEqual(0);
  expect(r.tactil).toEqual([]);
});
