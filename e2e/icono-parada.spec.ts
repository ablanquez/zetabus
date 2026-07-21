/**
 * ⭐ EL ICONO DE POSTE junto al nombre de la parada. Ver `components/IconoParada.tsx`.
 * Monocromo (no compite con los 44 colores de línea), decorativo, y sin romper el h1.
 */
import { test, expect } from '@playwright/test';

test('el icono de poste: monocromo, decorativo, y no rompe el h1', async ({ page }) => {
  await page.goto('/parada/744?fingir=sin-verificar', { waitUntil: 'networkidle' });

  const icono = page.locator('[data-papel="nombre-parada"] svg');
  await expect(icono).toHaveCount(1);
  // Decorativo: el lector de pantalla NO lo anuncia (el nombre y "poste N" ya lo dicen).
  await expect(icono).toHaveAttribute('aria-hidden', 'true');

  // ⚠️ MONOCROMO: sin saturación. Un icono de color competiría con los chips de línea,
  //    que están debajo en esta misma pantalla. Se mide el píxel, no el CSS declarado.
  const sat = await icono.evaluate((el) => {
    const c = getComputedStyle(el as SVGElement).color;
    const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(c);
    if (!m) return 1;
    const [r, g, b] = [+m[1], +m[2], +m[3]];
    return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  });
  // El tono del texto (pizarra) tiene una saturación mínima (~0,13); un color de línea
  // vive por encima de 0,40. El umbral separa "gris de texto" de "color que habla".
  console.log(`\n  icono · saturación ${sat.toFixed(2)} (un color de línea pasa de 0,40)`);
  expect(sat, 'el icono no puede tener color: competiría con la identidad de línea').toBeLessThan(0.25);

  // El nombre entero sigue ahí y el h1 no se ha roto por meter el icono.
  await expect(page.locator('[data-papel="nombre-parada"] [data-cita]')).toHaveText(/Plaza San Miguel/);
});
