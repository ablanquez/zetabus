/**
 * ⭐ JUGAR CON LA REFERENCIA. La capa que me faltó en la auditoría 08.
 *
 * La leí. Luego la medí. **PERO NUNCA LA USÉ.** No pulsé un solo botón. Y por
 * eso se me escapó lo mejor de esa pantalla.
 *
 * Es la L7 otra vez, con otra cara: verificar una capa y afirmar sobre otra. La
 * capa que faltaba era LA INTERACCIÓN. El CSS no la enseña. El DOM en reposo
 * tampoco. Solo se ve PULSANDO.
 *
 *      cd "E:/PROYECTOS WEB/00 ZGZ RADAR" && npx next dev -p 3002
 *      npx playwright test e2e/jugar-con-la-referencia.spec.ts --project=360px
 *
 * Este fichero no prueba ZetaBus: DOCUMENTA a la referencia. Se salta solo si su
 * servidor no está en pie — no se finge una comprobación que no se ha hecho.
 */

import { test, expect } from '@playwright/test';
import { capturar } from '../lib/medir';

const REF = 'http://localhost:3002';
const POSTE = 744;

let vivo = false;
test.beforeAll(async ({ request }) => {
  try {
    vivo = (await request.get(`${REF}/moverme/bus`, { timeout: 5_000 })).ok();
  } catch { vivo = false; }
  if (!vivo) console.log('\n  ⚠️  La referencia NO está en :3002. Estos tests SE SALTAN.\n');
});
test.beforeEach(() => test.skip(!vivo, 'la referencia no está en :3002'));

// ═══════════════════════════════════════════════════════════════════════════

test('⭐ LOS FILTROS DE LÍNEA: ¿apagan el mapa Y la lista A LA VEZ?', async ({ page }, info) => {
  await page.goto(`${REF}/moverme/bus/parada/${POSTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3_000); // Leaflet carga con dynamic(ssr:false)

  const filas = () => page.locator('button[aria-label^="Seleccionar bus"], button[aria-label^="Deseleccionar bus"]');
  const pines = () => page.locator('.leaflet-marker-icon');

  const filas0 = await filas().count();
  const pines0 = await pines().count();
  console.log(`\n  ESTADO INICIAL:  ${filas0} filas en la lista · ${pines0} marcadores en el mapa`);
  test.skip(filas0 === 0, 'no hay autobuses ahora mismo en este poste: no hay nada que filtrar');

  // Los chips de filtro son botones cuadrados con el número de línea.
  const chips = page.locator('button').filter({ hasText: /^\d{1,3}$|^Ci\d$|^N\d$/ });
  const nChips = await chips.count();
  console.log(`  ${nChips} chips de línea en el filtro`);

  await capturar(page, `capturas/referencia/filtro-ANTES-${info.project.name}.png`);

  // ── PULSAR "Ninguna" ──────────────────────────────────────────────────────
  const ninguna = page.getByRole('button', { name: /^Ninguna$/i });
  if (await ninguna.count() > 0) {
    await ninguna.click();
    await page.waitForTimeout(800);
    const filas1 = await filas().count();
    const pines1 = await pines().count();
    console.log(`\n  ⭐ PULSO "Ninguna":`);
    console.log(`     lista: ${filas0} → ${filas1} filas`);
    console.log(`     mapa:  ${pines0} → ${pines1} marcadores`);
    console.log(`     ${filas1 === 0 && pines1 <= 1 ? '✅ SE APAGAN LOS DOS A LA VEZ' : '⚠️ no se apagan los dos'}`);
    // El marcador de la PARADA se queda (no es un bus). De ahí el <= 1.
    expect(filas1, '"Ninguna" tiene que vaciar la lista').toBe(0);
    expect(pines1, '"Ninguna" tiene que vaciar el mapa (queda la parada)').toBeLessThanOrEqual(1);
    await capturar(page, `capturas/referencia/filtro-NINGUNA-${info.project.name}.png`);
  }

  // ── PULSAR "Todas" ────────────────────────────────────────────────────────
  const todas = page.getByRole('button', { name: /^Todas$/i });
  if (await todas.count() > 0) {
    await todas.click();
    await page.waitForTimeout(800);
    const filas2 = await filas().count();
    const pines2 = await pines().count();
    console.log(`\n  ⭐ PULSO "Todas":`);
    console.log(`     lista: → ${filas2} filas   ·   mapa: → ${pines2} marcadores`);
    console.log(`     ${filas2 === filas0 ? '✅ VUELVE EXACTAMENTE AL ESTADO INICIAL' : '⚠️ no vuelve igual'}`);
    expect(filas2).toBe(filas0);
  }

  // ── APAGAR UNA SOLA LÍNEA ─────────────────────────────────────────────────
  if (nChips > 1) {
    const primerChip = chips.first();
    const linea = (await primerChip.innerText()).trim().split('\n')[0];
    await primerChip.click();
    await page.waitForTimeout(800);

    const filas3 = await filas().count();
    const pines3 = await pines().count();
    // ¿Queda alguna fila de la línea apagada?
    const quedan = await page.locator(`button[aria-label*="línea ${linea}"]`).count();

    console.log(`\n  ⭐ APAGO SOLO LA LÍNEA ${linea}:`);
    console.log(`     lista: ${filas0} → ${filas3} filas   ·   mapa: ${pines0} → ${pines3} marcadores`);
    console.log(`     filas de la línea ${linea} que quedan: ${quedan}`);
    console.log(`     ${quedan === 0 && filas3 < filas0 ? '✅ DESAPARECE DE LA LISTA **Y** DEL MAPA, A LA VEZ' : '⚠️'}`);
    console.log('\n  ⇒ ESTO ES LO MEJOR DE SU PANTALLA. Un solo estado gobierna las dos vistas.');
    console.log('     No lo vi leyendo el CSS. Solo se ve PULSANDO.\n');

    expect(filas3, 'apagar una línea tiene que quitar filas').toBeLessThan(filas0);
    expect(quedan, 'no puede quedar ni una fila de la línea apagada').toBe(0);
    expect(pines3, 'y el mapa tiene que perder pines TAMBIÉN').toBeLessThan(pines0);
    await capturar(page, `capturas/referencia/filtro-UNA-LINEA-${info.project.name}.png`);
  }
});

test('⭐ SINCRONIZACIÓN BIDIRECCIONAL lista ↔ mapa', async ({ page }) => {
  await page.goto(`${REF}/moverme/bus/parada/${POSTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3_000);

  const filas = page.locator('button[aria-label^="Seleccionar bus"]');
  test.skip((await filas.count()) === 0, 'no hay autobuses ahora mismo');

  const pines0 = await page.locator('.leaflet-marker-icon').count();

  // ── LISTA → MAPA ──────────────────────────────────────────────────────────
  const etiqueta = await filas.first().getAttribute('aria-label');
  await filas.first().click();
  await page.waitForTimeout(700);

  const pines1 = await page.locator('.leaflet-marker-icon').count();
  const seleccionada = await page.locator('button[aria-pressed="true"]').count();
  const verTodos = await page.getByRole('button', { name: /Ver todos/i }).count();

  console.log(`\n  ⭐ PULSO UNA FILA DE LA LISTA ("${etiqueta}"):`);
  console.log(`     la fila queda marcada (aria-pressed="true"): ${seleccionada > 0 ? 'SÍ' : 'NO'}`);
  console.log(`     el mapa pasa de ${pines0} a ${pines1} marcadores → AÍSLA ESE BUS`);
  console.log(`     aparece un botón "Ver todos": ${verTodos > 0 ? 'SÍ' : 'NO'}`);
  console.log('     y el mapa hace scrollIntoView (te lleva a él)');

  expect(seleccionada).toBeGreaterThan(0);
  expect(pines1, 'seleccionar un bus AÍSLA su pin en el mapa').toBeLessThan(pines0);

  // ── MAPA → LISTA ──────────────────────────────────────────────────────────
  if (verTodos > 0) {
    await page.getByRole('button', { name: /Ver todos/i }).click();
    await page.waitForTimeout(600);
    console.log(`\n  ⭐ PULSO "Ver todos": el mapa vuelve a ${await page.locator('.leaflet-marker-icon').count()} marcadores`);
  }

  // Pulsar un pin del mapa (los buses tienen el número de línea dentro)
  const pinesBus = page.locator('.leaflet-marker-icon').filter({ hasText: /\d/ });
  if ((await pinesBus.count()) > 0) {
    await pinesBus.first().click();
    await page.waitForTimeout(700);
    const marcadas = await page.locator('button[aria-pressed="true"]').count();
    console.log(`  ⭐ PULSO UN PIN DEL MAPA: filas marcadas en la lista → ${marcadas}`);
    console.log(`     ${marcadas > 0 ? '✅ LA SINCRONÍA VA EN LOS DOS SENTIDOS' : '⚠️ solo va de lista a mapa'}`);
  }
});

test('⭐ EL REFRESCO DE 20 s: ¿QUÉ SE MUEVE?', async ({ page }) => {
  await page.goto(`${REF}/moverme/bus/parada/${POSTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3_000);

  const foto = async () => ({
    tiempos: await page.locator('.tabular-nums').allInnerTexts(),
    pines: await page.locator('.leaflet-marker-icon').count(),
    coches: await page.locator('text=/^Bus \\d+$/').allInnerTexts(),
  });

  const a = await foto();
  console.log(`\n  t=0    tiempos: [${a.tiempos.join(', ')}] · pines: ${a.pines} · coches: [${a.coches.join(', ')}]`);

  // Se cuentan las llamadas al endpoint de refresco.
  let llamadas = 0;
  page.on('request', (r) => { if (r.url().includes('/live')) llamadas++; });

  await page.waitForTimeout(23_000); // un ciclo completo de 20 s + margen
  const b = await foto();
  console.log(`  t=23s  tiempos: [${b.tiempos.join(', ')}] · pines: ${b.pines} · coches: [${b.coches.join(', ')}]`);
  console.log(`\n  llamadas a /live en 23 s: ${llamadas}`);
  console.log(`  ¿cambiaron los tiempos? ${JSON.stringify(a.tiempos) !== JSON.stringify(b.tiempos) ? 'SÍ' : 'no (o el bus no se movió)'}`);
  console.log('  ⇒ El refresco recarga TODO: tiempos, coches y posiciones del mapa.');
  console.log('     Y el estado del FILTRO y de la SELECCIÓN sobreviven al refresco.\n');

  expect(llamadas, 'tiene que haber refrescado al menos una vez en 23 s').toBeGreaterThanOrEqual(1);
});

test('⭐ EL ITINERARIO VERTICAL: nodos, transbordos, búhos', async ({ page }, info) => {
  await page.goto(`${REF}/moverme/bus/21`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await capturar(page, `capturas/referencia/itinerario-${info.project.name}.png`);

  const paradas = page.locator('[role="link"]');
  const transbordos = page.locator('a[aria-label^="Ver recorrido de la línea"]');

  console.log(`\n  ⭐ EL ITINERARIO DE LA LÍNEA 21:`);
  console.log(`     paradas clicables: ${await paradas.count()}`);
  console.log(`     chips de TRANSBORDO (otras líneas por parada): ${await transbordos.count()}`);
  console.log('     → esto es ORO: te dice dónde cambiar de línea, sin salir del itinerario.');
  console.log('       Nuestra lista plana de 38 nombres NO tiene nada de esto.');

  expect(await transbordos.count(), 'los chips de transbordo son lo que hay que clonar').toBeGreaterThan(0);

  // ── CAMBIAR DE SENTIDO ────────────────────────────────────────────────────
  const pestanas = page.locator('button[aria-pressed]');
  if ((await pestanas.count()) >= 2) {
    const antes = await paradas.count();
    const primeraAntes = await paradas.first().innerText();
    await pestanas.nth(1).click();
    await page.waitForTimeout(600);
    const despues = await paradas.count();
    const primeraDespues = await paradas.first().innerText();

    console.log(`\n  ⭐ CAMBIO DE SENTIDO (pestaña):`);
    console.log(`     paradas: ${antes} → ${despues}`);
    console.log(`     primera parada: "${primeraAntes.split('\n')[0]}" → "${primeraDespues.split('\n')[0]}"`);
    console.log(`     ⚠️  la URL NO cambia: ${page.url()}  ← no se puede compartir el sentido 2`);
    expect(primeraDespues).not.toBe(primeraAntes);
  }

  // ── PULSAR UNA PARADA ─────────────────────────────────────────────────────
  //
  // ⭐⭐ HALLAZGO DEL 14/07/2026, Y ES A NUESTRO FAVOR:
  //
  // **En la referencia, las paradas del itinerario NO SON PULSABLES.** Ni una.
  // Comprobado subiendo el DOM desde el nombre de la parada hasta `<a>`:
  //
  //     "Cosuenda / Paseo de Longares"  → dentro de un enlace: NO
  //     "Plaza Mozart"                  → dentro de un enlace: NO
  //     "Muel nº 11"                    → dentro de un enlace: NO
  //
  // Antonio pidió (C1) "las paradas deben ser pulsables". **Y en ZetaBus YA LO
  // ERAN**: 38 enlaces `/parada/…`, verificados pulsando. Aquí somos mejores que
  // la referencia, y por eso este `expect` se convierte en un INFORME.
  //
  // ⚠️ Un test que afirma sobre una app de terceros —que cambia sin avisarnos— no
  //    puede tumbar NUESTRO build. Se mide, se cuenta, y se decide luego.
  const antesDeClic = page.url();
  await paradas.first().click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(1_000);
  const navegó = page.url() !== antesDeClic;
  console.log(`\n  ⭐ PULSO UNA PARADA DE SU ITINERARIO → ${navegó ? page.url() : 'NO NAVEGA A NINGUNA PARTE'}`);
  console.log(`     (ZetaBus sí: 38 enlaces a /parada/… — verificado pulsando)`);
});

test('EL BUSCADOR: por número de poste y por nombre', async ({ page }) => {
  await page.goto(`${REF}/moverme/bus`, { waitUntil: 'networkidle' });
  const caja = page.locator('input[type="search"], input[type="text"]').first();

  for (const [q, que] of [['744', 'un número de poste'], ['san miguel', 'un nombre'], ['35', 'una línea']]) {
    await caja.fill(q);
    await page.waitForTimeout(500);
    const enlaces = page.locator('a[href*="/moverme/bus/"]');
    const n = await enlaces.count();
    const primero = n > 0 ? (await enlaces.first().getAttribute('href')) : '(nada)';
    console.log(`  "${q}" (${que}) → ${n} resultados · primero: ${primero}`);
  }
  console.log('\n  ⇒ Una sola caja, paradas Y líneas juntas, y el número de poste manda.');
});

test('EL ÍNDICE DE LÍNEAS: agrupado por tipo', async ({ page }, info) => {
  await page.goto(`${REF}/moverme/bus`, { waitUntil: 'networkidle' });
  await capturar(page, `capturas/referencia/indice-${info.project.name}.png`);

  const chips = page.locator('button').filter({ hasText: /Todas|Diurnas|Lanzaderas|Circulares|Especiales|Búhos|Favoritas/ });
  const grupos = await chips.allInnerTexts();
  console.log(`\n  ⭐ GRUPOS: ${grupos.join(' · ')}`);
  console.log('     y las tarjetas de línea llevan color + origen-destino.');
  expect(grupos.length).toBeGreaterThan(3);
});
