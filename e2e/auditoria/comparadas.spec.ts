/**
 * ⭐ LAS CAPTURAS COMPARADAS. La referencia y ZetaBus, la misma parada, el mismo
 * ancho, el mismo instante. Es lo único que deja ver si "se parece" o no.
 *
 *     npm run auditoria
 *
 * ⚠️ NADA de `fullPage`: eso ensancha el documento y esconde justo el desborde que
 * queremos ver. Se captura EL VIEWPORT, que es lo que ve el usuario.
 */
import { test, expect } from '@playwright/test';

const REF = 'http://localhost:3002';
const POSTE = 674;
const ANCHOS = [360, 390, 768, 1280, 1920];

let vivo = false;
test.beforeAll(async ({ request }) => {
  try {
    vivo = (await request.get(`${REF}/moverme/bus`, { timeout: 20_000 })).ok();
  } catch {
    vivo = false;
  }
});

test('⭐ ZetaBus en los cinco anchos', async ({ browser }) => {
  test.setTimeout(240_000);
  for (const w of ANCHOS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const p = await ctx.newPage();
    for (const [nombre, url] of [
      ['parada', `http://localhost:3000/parada/${POSTE}`],
      ['linea', 'http://localhost:3000/linea/35'],
      ['indice', 'http://localhost:3000/'],
    ] as const) {
      await p.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
      await p.waitForTimeout(2_500); // el mapa tiene que asentar
      await p.screenshot({ path: `capturas/zetabus/${nombre}-${w}px.png` });
    }
    await ctx.close();
    console.log(`  ✅ ${w}px`);
  }
  expect(true).toBe(true);
});

test('⭐ LADO A LADO · la misma parada, el mismo ancho', async ({ browser }) => {
  test.skip(!vivo, 'la referencia no está en :3002');
  test.setTimeout(240_000);

  for (const w of [360, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();

    await p.goto(`${REF}/moverme/bus/parada/${POSTE}`, { waitUntil: 'networkidle', timeout: 90_000 });
    await p.waitForTimeout(3_000);
    await p.screenshot({ path: `capturas/comparadas/REF-parada-${w}px.png` });

    await p.goto(`http://localhost:3000/parada/${POSTE}`, { waitUntil: 'networkidle', timeout: 60_000 });
    await p.waitForTimeout(3_000);
    await p.screenshot({ path: `capturas/comparadas/ZETA-parada-${w}px.png` });

    // ── LA TABLA. Se mide lo MISMO en las dos, con el mismo instrumento. ──────
    const medir = async (url: string, selFila: string) => {
      await p.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
      await p.waitForTimeout(2_500);
      return p.evaluate((sel) => {
        const filas = [...document.querySelectorAll<HTMLElement>(sel)];
        const alturas = filas.map((e) => e.offsetHeight);
        // El chip de línea: un cuadrado con el número dentro.
        const chip = filas[0]?.querySelector<HTMLElement>('div,span');
        const c = chip ? getComputedStyle(chip) : null;
        return {
          filas: filas.length,
          alturas,
          media: alturas.length ? Math.round(alturas.reduce((a, b) => a + b, 0) / alturas.length) : 0,
          chip: chip ? `${Math.round(chip.getBoundingClientRect().width)}×${Math.round(chip.getBoundingClientRect().height)}` : '—',
          radioChip: c?.borderRadius ?? '—',
        };
      }, selFila);
    };

    const suyo = await medir(`${REF}/moverme/bus/parada/${POSTE}`, 'button.flex.flex-col');
    const mio = await medir(`http://localhost:3000/parada/${POSTE}`, '[data-papel="llegada"]');

    console.log(`\n  ── ${w} px · ALTURA DE LA FILA DE LLEGADA ──`);
    console.log(`     referencia: ${suyo.filas} filas · alturas ${suyo.alturas.join(' ')} · media ${suyo.media} px`);
    console.log(`     zetabus:    ${mio.filas} filas · alturas ${mio.alturas.join(' ')} · media ${mio.media} px`);

    await ctx.close();
  }
  expect(true).toBe(true);
});
