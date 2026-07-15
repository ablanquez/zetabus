/**
 * ⭐⭐ A1 · LOS NOMBRES DE PARADA, MIRADOS CON LOS OJOS EN UN NAVEGADOR.
 *
 * El GTFS trae el 80,4 % rotos por el exportador de Avanza. La capa de nombres pide
 * los buenos al operador. Aquí se comprueba que:
 *   · un nombre que Avanza da sale BIEN escrito (no "Av. De Cataluña", sí "Av. de…")
 *   · un nombre que Avanza NO da (Avenida Valencia, en desvío) sale marcado
 *   · en NINGÚN caso se trunca
 *
 * ⚠️ ESTO DEPENDE DE LA TABLA DEL BUILD (src/generated/nombres.json). Si no se ha
 *    generado, todas las paradas serían gtfs-marcado y estos tests lo dirían. NO se
 *    pide nada a Avanza aquí: se lee lo ya horneado en el artefacto.
 *
 * ⚠️ Y TODAS LAS NAVEGACIONES LLEVAN `?fingir=sin-buses`. El NOMBRE sale del artefacto
 *    (build), no de la respuesta viva, así que da igual lo que devuelva el cuerpo —
 *    pero SIN el fingimiento la página llamaría a Avanza de verdad, 5 viewports × N
 *    tests. El nombre es lo que probamos; a Avanza no se le pide nada para probarlo.
 */

import { test, expect, type Page } from '@playwright/test';
import artefacto from '../src/generated';

const SIN_RED = '?fingir=sin-buses';

interface StopArt {
  id: string;
  name: string;
  nombreProc: { fuente: 'avanza-web' | 'gtfs-marcado'; fecha: string | null };
}
const A = artefacto as unknown as { stops: StopArt[]; posteByStopId: Record<string, number> };

const posteDe = (id: string) => A.posteByStopId[id];
const porPoste = new Map<number, StopArt>();
for (const s of A.stops) {
  const p = posteDe(s.id);
  if (p !== undefined) porPoste.set(p, s);
}

const nombre = (page: Page) => page.locator('[data-papel="nombre-parada"]');
const marca = (page: Page) => page.locator('[data-papel="nombre-sin-confirmar"]');

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ A1 · el nombre bueno se pide al operador', () => {
  test('poste 55 · "Av. de Cataluña" (no "Av. De Cataluña" del GTFS roto)', async ({ page }, info) => {
    const s = porPoste.get(55);
    test.skip(!s || s.nombreProc.fuente !== 'avanza-web', 'la tabla no cubre el 55: genera nombres:build');

    await page.goto('/parada/55' + SIN_RED, { waitUntil: 'domcontentloaded' });
    const txt = (await nombre(page).innerText()).trim();
    console.log(`\n  [${info.project.name}] poste 55 → "${txt}"`);

    // El exportador rompía la "de" a "De". El operador la escribe bien.
    expect(txt).toContain('Av. de Cataluña');
    expect(txt).not.toContain('Av. De Cataluña');
    await expect(nombre(page)).toHaveAttribute('data-nombre-fuente', 'avanza-web');
    await expect(marca(page), 'un nombre confirmado NO lleva la marca de sin-confirmar').toHaveCount(0);
  });

  test('poste 623 · "Pedro III" (no "Pedro Iii" — el romano que el ucwords destrozaba)', async ({ page }) => {
    const s = porPoste.get(623);
    test.skip(!s || s.nombreProc.fuente !== 'avanza-web', 'la tabla no cubre el 623');

    await page.goto('/parada/623' + SIN_RED, { waitUntil: 'domcontentloaded' });
    const txt = (await nombre(page).innerText()).trim();
    expect(txt).toContain('Pedro III');
    expect(txt).not.toContain('Pedro Iii');
  });

  test('⭐ las DOS paradas de Violante llevan la MISMA tilde (Hungría, no Hungria)', async ({ page }) => {
    // El usuario pidió expresamente: "la MISMA en las dos paradas que la tienen".
    const violantes = [...porPoste.entries()].filter(
      ([, s]) => /violante/i.test(s.name) && s.nombreProc.fuente === 'avanza-web',
    );
    test.skip(violantes.length < 2, 'la tabla no cubre dos paradas Violante');

    for (const [poste, s] of violantes) {
      expect(s.name, `poste ${poste} debería llevar "Hungría" con tilde`).toContain('Hungría');
      expect(s.name).not.toMatch(/Hungria\b/); // sin tilde = roto
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⚠️ A1 · lo que NO se puede arreglar, marcado en pantalla', () => {
  test('Avenida de Valencia (suprimida por desvío) → GTFS roto, MARCADO', async ({ page }, info) => {
    // Avanza no da las paradas suprimidas. Si HOY no está en desvío, esto podría venir
    // de avanza-web; el test se salta solo, y lo dice, en vez de mentir.
    const candidatos = [262, 263, 264, 265]
      .map((p) => [p, porPoste.get(p)] as const)
      .filter(([, s]) => s && s.nombreProc.fuente === 'gtfs-marcado');
    test.skip(candidatos.length === 0, 'hoy Avanza SÍ da Avenida Valencia (no está en desvío)');

    const [poste, s] = candidatos[0];
    console.log(`\n  [${info.project.name}] poste ${poste} → "${s!.name}" (gtfs-marcado)`);

    await page.goto(`/parada/${poste}${SIN_RED}`, { waitUntil: 'domcontentloaded' });
    await expect(nombre(page)).toHaveAttribute('data-nombre-fuente', 'gtfs-marcado');

    // ⭐ LA MARCA EXISTE, es visible, y dice por qué. No se tapa el nombre roto: se avisa.
    const m = marca(page);
    await expect(m).toBeVisible();
    await expect(m).toContainText(/sin confirmar/i);
    await expect(m).toContainText(/Avanza no lo da/i);
  });

  test('⚠️ "Asín y Palacios" NO se arregla: Avanza también lo escribe con Y mayúscula', async () => {
    // El usuario lo avisó: es de los que solo se comprueban en la calle. Documentamos
    // que sigue con la Y, y que eso NO es un fallo nuestro — es lo que da la fuente.
    const asin = [...porPoste.values()].find((s) => /As[íi]n Y Palacios/.test(s.name));
    if (!asin) test.skip(true, 'no hay ninguna parada Asín y Palacios en la tabla');
    else {
      // Con Y mayúscula, venga de donde venga: es un caso que el operador tampoco arregla.
      expect(asin.name).toMatch(/As[íi]n Y Palacios/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⚠️ A1 · el nombre NO se trunca jamás', () => {
  test('el nombre más largo cabe entero, bajando de línea si hace falta', async ({ page }, info) => {
    // El poste 823: "Vía Hispanidad n.º 73 / Nuestra Señora de los Ángeles" — real, 53+ car.
    let masLargo = { poste: 0, name: '' };
    for (const [poste, s] of porPoste) if (s.name.length > masLargo.name.length) masLargo = { poste, name: s.name };
    console.log(`\n  [${info.project.name}] el más largo: poste ${masLargo.poste} · ${masLargo.name.length} car.`);

    await page.goto(`/parada/${masLargo.poste}${SIN_RED}`, { waitUntil: 'domcontentloaded' });
    const txt = (await nombre(page).innerText()).replace(/\s+/g, ' ').trim();
    // Ni "…" ni recorte: el texto pintado es el nombre completo.
    expect(txt).not.toContain('…');
    expect(txt.length).toBeGreaterThanOrEqual(masLargo.name.replace(/\s+/g, ' ').trim().length - 1);
  });
});
