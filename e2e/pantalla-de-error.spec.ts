/**
 * ⭐ B-05 · LA PANTALLA DEL 500 (`error.tsx`), POR FIN ALCANZABLE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  El hallazgo era que esta pantalla —la que se ve cuando algo revienta de
 *  verdad— NO LA HABÍA VISTO NADIE: no había forma de provocarla, así que quedó
 *  NO CONSTA. `?fingir=error` (solo en demo) lanza un error en el RENDER DEL
 *  SERVIDOR de la página que ESCAPA hasta el error boundary. Este test convierte
 *  «la vimos una vez» en «sigue alcanzable, Y CON SALIDA».
 *
 *  ⚠️ VIGILA LO QUE IMPORTA, no que haya un `<div>`: que la pantalla aparece y
 *     que TIENE SALIDA. Y visto en ROJO: quitando el `dispararErrorFingido(sp)`
 *     de `parada/[poste]/page.tsx`, el error no llega al boundary, la pantalla no
 *     aparece y este test cae (comprobado en la tanda de B-05).
 *
 *  ⚠️ EL BOTÓN «Volver a intentarlo» EXISTE pero NO recupera de un error de
 *     servidor: usa `reset` (sin re-fetch). La salida que de verdad funciona es el
 *     ENLACE a la home. Por eso el test exige el enlace, no solo el botón. Ver la
 *     bitácora (hallazgo del `unstable_retry`, v16.2.0).
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test';

test('⭐ ?fingir=error (demo) muestra error.tsx CON salida a home', async ({ page }) => {
  // El throw es de servidor → HTTP 500; el boundary (client) se pinta al hidratar.
  const resp = await page.goto('/parada/744?fingir=error', { waitUntil: 'networkidle' });
  expect(resp?.status(), 'un throw de render de servidor devuelve 500').toBe(500);

  await expect(
    page.locator('[data-papel="500"]'),
    'la pantalla de error tiene que aparecer',
  ).toBeVisible();

  // ⭐ CON SALIDA QUE FUNCIONA: el enlace a la home (el botón reset no recupera).
  await expect(
    page.getByRole('link', { name: /Ver todas las líneas/ }),
    'sin una salida que funcione, la pantalla es un callejón sin salida',
  ).toBeVisible();

  // El botón de reintentar está (aunque su reset no re-fetchee): es la afordancia.
  await expect(page.locator('[data-papel="reintentar"]')).toBeVisible();

  // La pestaña lleva la marca, no el título de la página que reventó.
  await expect(page).toHaveTitle(/Algo se ha roto/);
});
