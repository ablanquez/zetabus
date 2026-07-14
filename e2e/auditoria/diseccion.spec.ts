/**
 * ⭐⭐ LA DISECCIÓN PÍXEL A PÍXEL. LA REFERENCIA CONTRA ZETABUS, A 360 px.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ⚠️ ESTO NO ES UN TEST. Es un INSTRUMENTO DE MEDIDA. No afirma: informa.
 *
 * Se salta solo si la referencia no está en :3002, y no rompe la suite. Su salida
 * es la tabla comparativa. Se lanza a mano:
 *
 *     npx playwright test e2e/diseccion.spec.ts --project=360px
 *
 * ⚠️ Y MIDE EL PÍXEL RESULTANTE, NO EL DECLARADO. `getComputedStyle().color`
 * ignora el `opacity` del elemento y de sus padres: negro al 6% de opacidad
 * puntúa 20:1 de contraste mientras es invisible. Los colores salen de la
 * CAPTURA, no del CSS.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { aHex, pixel } from '../lib/medir';

const REF = 'http://localhost:3002';
/** El 674: una parada con VARIAS líneas. La eligió Antonio. */
const POSTE = 674;

let vivo = false;
test.beforeAll(async ({ request }) => {
  try {
    vivo = (await request.get(`${REF}/moverme/bus`, { timeout: 20_000 })).ok();
  } catch {
    vivo = false;
  }
});
test.beforeEach(() => test.skip(!vivo, 'la referencia no está sirviendo en :3002'));

test('⭐ TABLA COMPARATIVA · pantalla de parada · 360 px', async ({ page, browser }, info) => {
  test.setTimeout(180_000);

  // ── LA REFERENCIA ─────────────────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const ref = await ctx.newPage();
  await ref.goto(`${REF}/moverme/bus/parada/${POSTE}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await ref.waitForTimeout(2_500); // que el mapa y las llegadas asienten
  await ref.screenshot({ path: `capturas/comparadas/REF-parada-${POSTE}-360.png` });

  // ⭐ SE VUELCA SU DOM. No adivino sus selectores: los LEO.
  const anatomia = await ref.evaluate(() => {
    const out: { tag: string; clases: string; texto: string; w: number; h: number; y: number }[] = [];
    for (const e of [...document.querySelectorAll('main *')].slice(0, 220)) {
      const el = e as HTMLElement;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.width === 0) continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        clases: el.className?.toString().slice(0, 90) ?? '',
        texto: (el.childElementCount === 0 ? el.textContent ?? '' : '').trim().slice(0, 34),
        w: Math.round(r.width),
        h: Math.round(r.height),
        y: Math.round(r.y),
      });
    }
    return out;
  });

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log(`║  ANATOMÍA DE LA REFERENCIA · /moverme/bus/parada/${POSTE} · 360 px            ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
  console.log('     y    w×h      tag    clases / texto');
  console.log('  ────  ───────    ────   ───────────────────────────────────────────────');
  for (const a of anatomia) {
    console.log(
      `  ${String(a.y).padStart(4)}  ${`${a.w}×${a.h}`.padEnd(9)}${a.tag.padEnd(6)} ` +
        `${a.clases.padEnd(60)} ${a.texto}`,
    );
  }

  // ── ZETABUS ───────────────────────────────────────────────────────────────
  await page.goto(`/parada/${POSTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: `capturas/comparadas/ZETA-parada-${POSTE}-360.png` });

  const mias = await page.evaluate(() => {
    const out: { papel: string; w: number; h: number; y: number; tam: string; peso: string }[] = [];
    for (const e of document.querySelectorAll('[data-papel]')) {
      const el = e as HTMLElement;
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      out.push({
        papel: el.getAttribute('data-papel')!,
        w: Math.round(r.width),
        h: Math.round(r.height),
        y: Math.round(r.y),
        tam: c.fontSize,
        peso: c.fontWeight,
      });
    }
    return out;
  });

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log(`║  ZETABUS · /parada/${POSTE} · 360 px                                          ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
  console.log('     y    w×h        tam    peso   papel');
  console.log('  ────  ─────────    ─────  ─────  ──────────────────────');
  for (const m of mias) {
    console.log(
      `  ${String(m.y).padStart(4)}  ${`${m.w}×${m.h}`.padEnd(11)}${m.tam.padEnd(7)}${m.peso.padEnd(7)}${m.papel}`,
    );
  }

  // ── LO QUE HAY QUE IGUALAR ────────────────────────────────────────────────
  console.log('\n  ── ALTURA DE UNA TARJETA DE LLEGADA (el fallo B5) ──');
  const alturaRef = await ref.evaluate(() => {
    // Se busca por CONTENIDO, no por clase: las clases de Tailwind cambian y el
    // contenido no. Una fila de llegada tiene un tiempo en minutos dentro.
    const cand = [...document.querySelectorAll('li, div')].filter((e) => {
      const t = e.textContent ?? '';
      return /\b\d+\s*min\b/i.test(t) && t.length < 90 && (e as HTMLElement).offsetHeight > 30;
    });
    const alturas = cand.map((e) => (e as HTMLElement).offsetHeight).sort((a, b) => a - b);
    return { n: cand.length, alturas: alturas.slice(0, 8) };
  });
  const alturaZeta = await page.evaluate(() =>
    [...document.querySelectorAll('[data-papel="llegada"]')].map((e) => (e as HTMLElement).offsetHeight),
  );
  console.log(`  referencia: ${alturaRef.n} filas → alturas ${alturaRef.alturas.join(' ')} px`);
  console.log(`  zetabus:    ${alturaZeta.length} filas → alturas ${alturaZeta.join(' ')} px`);

  // ── EL FONDO, MEDIDO EN EL PÍXEL (no en el CSS) ───────────────────────────
  const cRef = aHex(await pixel(ref, 4, 400));
  const cZeta = aHex(await pixel(page, 4, 400));
  console.log(`\n  fondo referencia (píxel): ${cRef}   ·   fondo zetabus: ${cZeta}`);

  console.log(`\n  ⇒ capturas en capturas/comparadas/ (${info.project.name})`);
  await ctx.close();
  expect(true).toBe(true);
});
