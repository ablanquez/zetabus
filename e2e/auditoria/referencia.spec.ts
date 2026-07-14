/**
 * LA REFERENCIA (00 ZGZ RADAR), ABIERTA DE VERDAD.
 *
 * En la auditoría de diseño escribí: *"NO LO HE ABIERTO EN UN NAVEGADOR"*.
 * Ya no hay excusa. Esto lo abre, lo mide y lo fotografía.
 *
 * ⚠️ CÓMO SE CORRE (necesita SU servidor, no el nuestro):
 *
 *     cd "E:/PROYECTOS WEB/00 ZGZ RADAR" && npx next dev -p 3100
 *     cd zetabus && npx playwright test e2e/referencia.spec.ts
 *
 * Se salta solo si el servidor no está en pie: no se finge una comprobación que
 * no se ha hecho.
 *
 * ⚠️ SALVEDAD HONESTA: se mira contra `next dev`, no contra el build de
 * producción. Para LEER una pantalla ajena vale; para certificar un layout, no.
 * Nuestras propias pantallas SÍ se probarán contra producción, como manda la
 * doc oficial de Next. Aquí solo vengo a mirar.
 *
 * ⚠️ Y OTRA: la página de parada consulta a Avanza EN VIVO. Son 1-2 peticiones
 * por ejecución. No se abusa: por eso este fichero no está en la suite por
 * defecto y hay que pedirlo a mano.
 */

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { contrasteReal, revisar, capturar, seVe } from './lib/medir';

const REF = 'http://localhost:3100';
/** Plaza San Miguel: el poste de la asimetría. Dos líneas, tráfico real. */
const POSTE = 744;

let vivo = false;

test.beforeAll(async ({ request }) => {
  try {
    const r = await request.get(`${REF}/moverme/bus`, { timeout: 5_000 });
    vivo = r.ok();
  } catch {
    vivo = false;
  }
  if (!vivo) {
    console.log('\n  ⚠️  La referencia NO está en pie en :3100. Estos tests se SALTAN.');
    console.log('      No se finge una comprobación que no se ha hecho.');
    console.log('      → cd "E:/PROYECTOS WEB/00 ZGZ RADAR" && npx next dev -p 3100\n');
  }
  mkdirSync('capturas/referencia', { recursive: true });
});

test.beforeEach(() => {
  test.skip(!vivo, 'la referencia no está sirviendo en :3100');
});

test('LISTADO DE LÍNEAS · /moverme/bus', async ({ page }, info) => {
  const v = info.project.name;
  await page.goto(`${REF}/moverme/bus`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // ⚠️ VIEWPORT, NO fullPage. Lo que ve una persona.
  await capturar(page, `capturas/referencia/lineas-${v}.png`);

  const r = await revisar(page, `referencia · líneas · ${v}`);

  // No se afirma que esté bien: se ENSEÑA lo que hay. Es una auditoría, no un
  // examen que la referencia tenga que aprobar.
  console.log(`\n  [${v}] /moverme/bus — desbordes: ${r.fuera.length} · cortados: ${r.cortados.length} · scroll-h: ${r.scroll}px · táctiles pequeños: ${r.tactil.length}`);

  // Lo único que SÍ se exige, porque es inaceptable en cualquier caso:
  expect(r.scroll, 'scroll horizontal en el documento').toBeLessThanOrEqual(0);
});

test('DETALLE DE PARADA · /moverme/bus/parada/744', async ({ page }, info) => {
  const v = info.project.name;
  await page.goto(`${REF}/moverme/bus/parada/${POSTE}`, { waitUntil: 'networkidle' });
  // El mapa Leaflet carga con `dynamic(ssr:false)`: hay que esperarlo o la
  // captura sale con el esqueleto y no con la pantalla.
  await page.waitForTimeout(2_500);

  await capturar(page, `capturas/referencia/parada-${v}.png`);

  const r = await revisar(page, `referencia · parada ${POSTE} · ${v}`);
  console.log(`\n  [${v}] parada ${POSTE} — desbordes: ${r.fuera.length} · cortados: ${r.cortados.length} · scroll-h: ${r.scroll}px · táctiles pequeños: ${r.tactil.length}`);

  // ⭐ LA FILA QUE ME PREOCUPA, MEDIDA EN LUGAR DE INTUIDA.
  //    En la auditoría escribí: "pl-[52px] deja ~308px útiles a 360; aguanta con
  //    flex-wrap, pero va justo". Eso era ARITMÉTICA SOBRE UNA CLASE DE CSS.
  //    Ahora se lo pregunto al navegador.
  const chips = page.locator('.pl-\\[52px\\]').first();
  if (await chips.count() > 0) {
    const caja = await chips.boundingBox();
    if (caja) {
      const ancho = page.viewportSize()!.width;
      console.log(`  ⭐ fila de chips de flota: x ${Math.round(caja.x)} → ${Math.round(caja.x + caja.width)} (pantalla ${ancho}) · alto ${Math.round(caja.height)}px`);
      console.log(`     ${caja.height > 30 ? '⚠️  HA HECHO WRAP: los chips no caben en una línea' : '   cabe en una línea'}`);
    }
  }

  // ⚠️ EL TEXTO DE LA MENTIRA. El que dice "se actualiza cada 20 s" mientras el
  //    refresco puede estar fallando en silencio. Se comprueba que EXISTE, para
  //    que quede en el acta con una captura debajo.
  const aviso = page.getByText(/Se actualiza autom/i);
  if (await aviso.count() > 0) {
    const c = await contrasteReal(page, 'p:has-text("Se actualiza autom")');
    console.log(`\n  ⚠️  "${c.texto}"`);
    console.log(`      contraste real ${c.ratio}:1 (mín ${c.minimo}) · texto ${c.textoPintado} sobre ${c.fondoPintado}`);
    console.log('      ⛔ Y ESTE TEXTO ES UNA AFIRMACIÓN QUE LA APP NO CUMPLE cuando el');
    console.log('         refresco falla: `if (!res.ok) return;` sin decir nada.');
  }

  expect(r.scroll, 'scroll horizontal en el documento').toBeLessThanOrEqual(0);
});

test('RECORRIDO DE LÍNEA · /moverme/bus/21', async ({ page }, info) => {
  const v = info.project.name;
  await page.goto(`${REF}/moverme/bus/21`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await capturar(page, `capturas/referencia/linea21-${v}.png`);

  const r = await revisar(page, `referencia · línea 21 · ${v}`);
  console.log(`\n  [${v}] línea 21 — desbordes: ${r.fuera.length} · cortados: ${r.cortados.length} · scroll-h: ${r.scroll}px`);

  // ⭐ La parada TACHADA. El lenguaje visual que ZetaBus quiere heredar.
  const tachada = page.locator('.line-through').first();
  if (await tachada.count() > 0) {
    const t = await tachada.innerText();
    const ve = await seVe(page, '.line-through');
    console.log(`  ⭐ parada tachada encontrada: "${t}" · ¿se ve? ${ve.visible ? 'sí' : `NO — ${ve.motivo}`}`);
  } else {
    console.log('  (no hay ninguna parada tachada en esta línea ahora mismo)');
  }

  expect(r.scroll).toBeLessThanOrEqual(0);
});
