/**
 * ⭐ EL CHIP DE LÍNEA DE LA HOME: MARGEN UNIFORME POR SUS TRES LADOS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Antonio lo veía "centrado": el chip flotaba a ~24 px del borde IZQUIERDO y a
 *  solo 8 del de ARRIBA. Y de esos 24, la mitad era un `gap-3` FANTASMA — el
 *  <AcuseDeToque> es un <span> sin tamaño, pero dentro de un `flex` es un ÍTEM que
 *  se come una ranura de `gap` antes del chip. Se quitó el `gap` y el padding bajó
 *  a 8 en los cuatro lados: el chip queda con el MISMO hueco arriba, abajo e
 *  izquierda, y los 44 chips de la rejilla arrancan en la MISMA vertical.
 *
 *  ⚠️ ESTO SE MIDE EN PÍXELES REALES, NO EN EL DOM. Un `gap` que reaparece, un
 *     padding que alguien "redondea", o un acuse al que se le da tamaño: todo eso
 *     rompe el margen sin cambiar una sola clase que se lea a ojo. Solo la caja
 *     medida lo caza. (Antes de arreglar: arriba/abajo=9, izq=25 → habría fallado.)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, expect, type Page } from '@playwright/test';

interface Fila {
  linea: string;
  arriba: number;
  abajo: number;
  izq: number;
  chipX: number;
  cardTop: number;
}

async function filasPorGrupo(page: Page): Promise<{ clave: string; filas: Fila[] }[]> {
  return page.evaluate(() => {
    const grupos = [...document.querySelectorAll('[data-papel="grupo-lineas"]')];
    return grupos.map((g) => ({
      clave: g.getAttribute('data-grupo') ?? '',
      filas: [...g.querySelectorAll('li > a')].map((a) => {
        const chip = a.querySelector('[data-papel="chip-indice"]')!;
        const ra = a.getBoundingClientRect();
        const rc = chip.getBoundingClientRect();
        return {
          linea: chip.getAttribute('data-linea') ?? '',
          arriba: +(rc.top - ra.top).toFixed(1),
          abajo: +(ra.bottom - rc.bottom).toFixed(1),
          izq: +(rc.left - ra.left).toFixed(1),
          chipX: +rc.left.toFixed(1),
          cardTop: +ra.top.toFixed(1),
        };
      }),
    }));
  });
}

test.describe('⭐ el chip del índice tiene margen uniforme y arranca alineado', () => {
  test('arriba = abajo = izquierda en TODAS las tarjetas, en los cuatro grupos', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const grupos = await filasPorGrupo(page);

    // Los cuatro grupos existen (diurna, circular, lanzadera, buho): el mismo componente.
    expect(grupos.map((g) => g.clave).sort()).toEqual(['buho', 'circular', 'diurna', 'lanzadera']);

    for (const g of grupos) {
      for (const f of g.filas) {
        // Margen UNIFORME: el hueco izquierdo iguala al vertical (± subpíxel).
        expect(Math.abs(f.izq - f.arriba), `${g.clave}/${f.linea} izq≠arriba`).toBeLessThanOrEqual(1);
        expect(Math.abs(f.arriba - f.abajo), `${g.clave}/${f.linea} arriba≠abajo`).toBeLessThanOrEqual(1);
      }
    }
  });

  test('todos los chips de una columna arrancan en la MISMA x', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const grupos = await filasPorGrupo(page);

    for (const g of grupos) {
      // 1, 2, 3 o 4 columnas según el viewport (la rejilla es `auto-fill minmax(280px,1fr)`,
      // ya no un `sm:grid-cols-2` fijo). Las COLUMNAS REALES = las tarjetas de la fila de más
      // arriba, que comparten `top`. La invariante que se vigila NO es "hay 2 columnas", es que
      // cada columna arranca en UNA sola x: el nº de x distintas ha de ser EXACTAMENTE el nº de
      // columnas. Un chip desalineado mete una x de más y lo caza. Y nunca más de 4 (el tope).
      const topMin = Math.min(...g.filas.map((f) => f.cardTop));
      const columnas = g.filas.filter((f) => Math.abs(f.cardTop - topMin) < 2).length;
      const xs = [...new Set(g.filas.map((f) => Math.round(f.chipX)))];
      expect(xs.length, `${g.clave}: los chips no arrancan alineados (${xs.join(', ')})`).toBe(columnas);
      expect(columnas, `${g.clave}: más de 4 columnas`).toBeLessThanOrEqual(4);
    }
  });

  test('⭐ el icono de giro ↻/↺ es accesible, va a la DERECHA y no empuja el chip', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Una circular numerada (30) lleva icono; el chip sigue pegado al borde izquierdo.
    const carta30 = page.locator('[data-papel="grupo-lineas"] li a', {
      has: page.locator('[data-linea="30"]'),
    });
    const giro30 = carta30.locator('[data-papel="giro"]');
    await expect(giro30).toHaveAttribute('role', 'img');
    await expect(giro30).toHaveAttribute('aria-label', /circular/i); // no es un glifo mudo
    await expect(giro30).toHaveAttribute('data-giro', 'horario');

    // El icono cae DESPUÉS del nombre (su izquierda ≥ el borde derecho del chip).
    const cajas = await carta30.evaluate((a) => {
      const chip = a.querySelector('[data-papel="chip-indice"]')!.getBoundingClientRect();
      const giro = a.querySelector('[data-papel="giro"]')!.getBoundingClientRect();
      return { chipRight: chip.right, giroLeft: giro.left };
    });
    expect(cajas.giroLeft).toBeGreaterThan(cajas.chipRight);

    // Ci2 gira al otro lado (↺, antihorario).
    const ci2 = page
      .locator('[data-papel="grupo-lineas"] li a', { has: page.locator('[data-linea="Ci2"]') })
      .locator('[data-papel="giro"]');
    await expect(ci2).toHaveAttribute('data-giro', 'antihorario');

    // Una diurna de doble sentido (21) NO gira: sin icono, y con sus dos destinos.
    const carta21 = page.locator('[data-papel="grupo-lineas"] li a', {
      has: page.locator('[data-linea="21"]'),
    });
    await expect(carta21.locator('[data-papel="giro"]')).toHaveCount(0);
    await expect(carta21.locator('[data-papel="destinos-home"] [data-toponimo]')).toHaveCount(2);
  });

  test('⭐ fuera los subtítulos de grupo: el <h2> es lo único que rotula', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Los textos de antaño ("las de todos los días", "de madrugada"…) ya no se pintan.
    await expect(page.getByText('las de todos los días')).toHaveCount(0);
    await expect(page.getByText('de madrugada')).toHaveCount(0);
    // La sección de diurnas tiene su <h2> y, debajo, directamente la rejilla (sin <p>).
    const diurnas = page.locator('[data-papel="grupo-lineas"][data-grupo="diurna"]');
    await expect(diurnas.locator('h2')).toHaveCount(1);
    await expect(diurnas.locator(':scope > p')).toHaveCount(0);
  });
});
