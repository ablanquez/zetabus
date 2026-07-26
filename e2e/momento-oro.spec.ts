/**
 * ⭐ MOMENTO ORO — la transición «Avanza cae → ZetaBus dice "no lo sé"», capturada.
 *
 * NO es una maqueta: usa el `?fingir=` REAL (con ZETABUS_DEMO=1 que pone el webServer)
 * y captura el copy REAL de la app —incluida la banda de demo y la coletilla técnica,
 * que se dejan A PROPÓSITO: son el mecanismo de honestidad en acción—.
 *
 * Estado normal  → /parada/744?fingir=solo-oficiales  (dos autobuses, con su edad)
 * Avanza cae     → /parada/744?fingir=caido           («Avanza no responde… no lo sabemos»)
 *
 * Deja dos PNG por viewport en `capturas/zetabus/momento-oro/` (dir de scratch,
 * gitignoreado). El montaje a GIF lo hace `scripts/gif-momento-oro.mjs` con ffmpeg.
 * Regenerar todo (el README usa solo el móvil):
 *   npx playwright test e2e/momento-oro.spec.ts --project=390px
 *   node scripts/gif-momento-oro.mjs
 */

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const DESTINO = 'capturas/zetabus/momento-oro';

test('captura los dos estados del momento oro (normal → caído)', async ({ page }, info) => {
  mkdirSync(DESTINO, { recursive: true });
  const v = info.project.name; // p.ej. "390px" / "1280px"

  // 1 · NORMAL: hay autobuses, con los minutos y la edad del dato.
  await page.goto('/parada/744?fingir=solo-oficiales', { waitUntil: 'networkidle' });
  await expect(page.getByText('min', { exact: false }).first()).toBeVisible();
  await page.screenshot({ path: `${DESTINO}/${v}-1-normal.png` });

  // 2 · CAÍDO: el mensaje honesto real, con su banda de demo y su coletilla.
  await page.goto('/parada/744?fingir=caido', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-papel="caido"]')).toBeVisible();
  await expect(page.getByText('no lo sabemos', { exact: false })).toBeVisible();
  await page.screenshot({ path: `${DESTINO}/${v}-2-caido.png` });
});
