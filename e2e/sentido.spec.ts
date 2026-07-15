/**
 * ⭐ EL SENTIDO DE LA LÍNEA, ARRIBA, SIN CONFUSIÓN.
 *
 * Antonio: «hay mucha confusión con el sentido y lo que tengo seleccionado».
 * Aquí se MIDE en el navegador que:
 *
 *   1) el TÍTULO refleja el sentido activo con una FLECHA (origen → destino), y
 *      cambia de orden al cambiar de sentido —no un guion fijo que dice rango—;
 *   2) el botón ACTIVO se distingue del inactivo SIN DUDA y SIN depender del color
 *      (prueba de escala de grises: el relleno y el peso sobreviven);
 *   3) los botones dicen "Hacia {destino}" y NUNCA dos iguales (la N2 colapsa el
 *      headsign: se cae a la parada real);
 *   4) una CIRCULAR de bucle (Ci3) NO pinta flecha —dice "Circular por ..."—, y un
 *      BÚHO de bucle (N1) enseña su nombre, sin flecha ni "Circular".
 */

import { test, expect, type Page } from '@playwright/test';
import { capturar } from './lib/medir';

/** Luminancia relativa 0..1 de un `rgb(...)`. Para comparar VALOR, no tono. */
async function lumaFondo(page: Page, selector: string): Promise<number> {
  const rgb = await page.locator(selector).first().evaluate((n) => getComputedStyle(n).backgroundColor);
  const m = rgb.match(/(\d+(?:\.\d+)?)/g)!.map(Number);
  const [r, g, b] = m;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ EL TÍTULO REFLEJA EL SENTIDO ACTIVO (flecha, no guion)', () => {
  test('la 35: "origen → destino", y al cambiar de sentido se invierte', async ({ page }, info) => {
    await page.goto('/linea/35', { waitUntil: 'networkidle' });
    const titulo = page.locator('[data-papel="titulo-linea"]');
    await expect(titulo).toBeVisible();

    const t0 = (await titulo.innerText()).trim();
    console.log(`\n  [${info.project.name}] título sentido 0: "${t0}"`);
    // Una flecha, no un guion: dice dirección, no rango.
    expect(t0, 'el título lleva una flecha de dirección').toContain('→');
    expect(t0, 'sus extremos son Parque Goya y Seminario').toMatch(/Parque Goya|Seminario/);

    // Cambiar de sentido invierte el orden origen→destino.
    const pestanas = page.locator('nav[aria-label="Sentido"] a');
    await pestanas.nth(1).click();
    await page.waitForURL(/sentido=/);
    await page.waitForTimeout(300);
    const t1 = (await titulo.innerText()).trim();
    console.log(`  [${info.project.name}] título sentido 1: "${t1}"`);
    expect(t1, 'el título del otro sentido lleva flecha').toContain('→');
    expect(t1, 'y NO es el mismo texto: el rumbo cambió').not.toBe(t0);

    await capturar(page, `capturas/zetabus/SENTIDO-titulo-35-${info.project.name}.png`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ EL BOTÓN ACTIVO SE VE ACTIVO, TAMBIÉN EN GRIS', () => {
  test('la 35: "Hacia X", activo ≠ inactivo por VALOR y peso (no por color)', async ({ page }, info) => {
    await page.goto('/linea/35', { waitUntil: 'networkidle' });
    const botones = page.locator('[data-papel="sentido"]');
    expect(await botones.count(), 'la 35 tiene dos botones de sentido').toBe(2);

    // Dicen "Hacia ...". ⚠️ `innerText` trae también el punto ●/○ (decorativo,
    //    aria-hidden) en su propia línea: el "Hacia" NO está al principio del
    //    nodo, sino en su etiqueta. Se comprueba que ESTÁ, que es lo que importa.
    for (let i = 0; i < 2; i++) {
      const txt = (await botones.nth(i).innerText()).trim();
      expect(txt, `el botón ${i} deja claro que es una dirección`).toMatch(/Hacia \S/);
    }

    const activo = page.locator('[data-papel="sentido"][data-activo="si"]');
    const inactivo = page.locator('[data-papel="sentido"][data-activo="no"]');
    await expect(activo, 'hay exactamente un botón activo').toHaveCount(1);
    await expect(inactivo, 'y uno inactivo').toHaveCount(1);

    // ── PRUEBA DE ESCALA DE GRISES ────────────────────────────────────────────
    // Se le quita TODO el color. Lo que sobreviva es lo que de verdad comunica.
    await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
    await page.waitForTimeout(150);

    // CANAL 1 · VALOR (relleno). El activo va relleno oscuro; el inactivo, claro.
    //   En gris, la diferencia de luminancia SOBREVIVE (no es tono, es valor).
    const lumAct = await lumaFondo(page, '[data-papel="sentido"][data-activo="si"]');
    const lumIna = await lumaFondo(page, '[data-papel="sentido"][data-activo="no"]');
    console.log(`\n  [${info.project.name}] luma fondo · activo ${lumAct.toFixed(2)} · inactivo ${lumIna.toFixed(2)}`);
    expect(Math.abs(lumAct - lumIna), 'activo e inactivo difieren en VALOR, no solo en tono').toBeGreaterThan(0.3);

    // CANAL 2 · PESO. El activo pesa más que el inactivo.
    const pesoAct = await activo.evaluate((n) => Number(getComputedStyle(n).fontWeight));
    const pesoIna = await inactivo.evaluate((n) => Number(getComputedStyle(n).fontWeight));
    console.log(`  [${info.project.name}] peso · activo ${pesoAct} · inactivo ${pesoIna}`);
    expect(pesoAct, 'el activo pesa más').toBeGreaterThan(pesoIna);

    await capturar(page, `capturas/zetabus/SENTIDO-GRIS-botones-35-${info.project.name}.png`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ LA N2: dos sentidos con el MISMO headsign, y aun así distinguibles', () => {
  test('los dos botones "Hacia X" NO dicen lo mismo', async ({ page }, info) => {
    await page.goto('/linea/N2', { waitUntil: 'networkidle' });
    const botones = page.locator('[data-papel="sentido"]');
    expect(await botones.count(), 'la N2 tiene dos sentidos').toBe(2);
    const a = (await botones.nth(0).innerText()).trim();
    const b = (await botones.nth(1).innerText()).trim();
    console.log(`\n  [${info.project.name}] N2 botones:\n     "${a}"\n     "${b}"`);
    // ⛔ Si saliera del headsign a pelo, serían idénticos: no distinguirían nada.
    expect(a, 'los dos botones de la N2 no pueden ser iguales').not.toBe(b);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('⭐ BUCLES: jamás una flecha que mienta', () => {
  test('Ci3 (circular) → "Circular por ...", sin flecha', async ({ page }, info) => {
    await page.goto('/linea/Ci3', { waitUntil: 'networkidle' });
    const titulo = page.locator('[data-papel="titulo-linea"]');
    const t = (await titulo.innerText()).trim();
    console.log(`\n  [${info.project.name}] título Ci3: "${t}"`);
    expect(t, 'una circular NO dibuja flecha').not.toContain('→');
    expect(t, 'lo dice distinto').toMatch(/^Circular por /i);
    // Y no hay botonera de sentido (un solo sentido).
    expect(await page.locator('[data-papel="sentido"]').count(), 'un bucle no tiene selector de sentido').toBe(0);
  });

  test('N1 (búho de bucle) → su nombre, sin flecha ni "Circular"', async ({ page }, info) => {
    await page.goto('/linea/N1', { waitUntil: 'networkidle' });
    const t = (await page.locator('[data-papel="titulo-linea"]').innerText()).trim();
    console.log(`\n  [${info.project.name}] título N1: "${t}"`);
    expect(t, 'un búho de bucle no dibuja flecha').not.toContain('→');
    expect(t, 'y no se le pega la palabra "Circular"').not.toMatch(/circular/i);
    expect(t.length, 'enseña su nombre oficial').toBeGreaterThan(0);
  });
});
