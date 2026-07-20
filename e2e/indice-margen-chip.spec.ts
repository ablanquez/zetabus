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
      // Una o dos columnas según el viewport (Tailwind `sm:grid-cols-2`). Sea cual
      // sea, el número de x distintas = número de columnas, y cada columna una sola x.
      const xs = [...new Set(g.filas.map((f) => Math.round(f.chipX)))];
      expect(xs.length, `${g.clave}: los chips no arrancan alineados (${xs.join(', ')})`).toBeLessThanOrEqual(2);
    }
  });
});
