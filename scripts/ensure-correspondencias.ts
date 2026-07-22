/**
 * ⭐ GARANTIZA EL ÍNDICE DE CORRESPONDENCIAS EN EL BUILD, SIN PAGAR EL BARRIDO DE MÁS.
 *
 *     Va dentro de `npm run build`, entre `data:build` y `next build`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  El índice (`data/generated/correspondencias.json`) es dato raspado de Avanza:
 *  NO se versiona. Quien clona el repo no lo tiene, y sin él la app arranca en modo
 *  degradado (normales del GTFS, sin provisionales) SIN que él sepa por qué.
 *
 *  ⇒ Este script lo genera SI FALTA, y solo si falta:
 *      · ya existe  → no se rebarre (quien lo tiene no paga 74 peticiones);
 *      · no existe  → se barre una vez (quien clona y compila lo tiene sin enterarse).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ NO se lanza desde la APP al detectar que falta: serían 74 peticiones disparadas
 *    por una visita, 40 s de espera para el primero, y N barridos si entran N personas
 *    a la vez. Y contradice la regla del proyecto: no se pide a Avanza sin que nadie
 *    mire. El build SÍ es "alguien mirando". La app, no.
 *
 * ⚠️⚠️ SI AVANZA ESTÁ CAÍDA durante el build, EL BUILD NO SE MUERE. Un fallo de una API
 *    externa no puede impedir compilar y desplegar. Pero el aviso NO puede leerse como
 *    decoración: se pinta un recuadro que dice, sin ambigüedad, que la app arrancará en
 *    modo degradado y con qué comando se arregla. (Ya sabemos lo que pasa con los avisos
 *    de build que se leen como ruido: no se leen.)
 *
 * ⚠️ Se lanza el barrido como PROCESO HIJO (no se importa `build-correspondencias`, que
 *    haría su trabajo al importarlo). El código de salida del hijo decide: 0 = índice
 *    escrito; ≠0 = no se pudo, y AQUÍ se convierte en aviso no-fatal (salimos 0).
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const OUT = 'data/generated/correspondencias.json';

if (existsSync(OUT)) {
  console.log(`\n✅ Índice de correspondencias ya presente (${OUT}). No se rebarre.\n`);
  process.exit(0);
}

console.log(`\nℹ️  No hay índice de correspondencias en ${OUT}.`);
console.log('   Se genera ahora, una vez (barrido de Avanza, ~2 min). Quien ya lo tenga no paga esto.\n');

// tsx está en el PATH (node_modules/.bin) durante un `npm run *`. `shell: true` para que
// Windows resuelva el .cmd. `stdio: inherit` para que el barrido cuente lo suyo en vivo.
const r = spawnSync('tsx', ['scripts/build-correspondencias.ts'], { stdio: 'inherit', shell: true });

if (r.status === 0 && existsSync(OUT)) {
  process.exit(0);
}

// ── No se pudo (Avanza caída, suelo no alcanzado, o el hijo murió). NO se cae el build ──
const linea = '═'.repeat(70);
console.error(`
⛔${linea}⛔
⛔
⛔   NO SE PUDO GENERAR EL ÍNDICE DE CORRESPONDENCIAS.
⛔
⛔   El build CONTINÚA —un fallo de Avanza no puede impedir compilar—, pero
⛔   ⚠️  LA APP ARRANCARÁ EN MODO DEGRADADO:
⛔        · "Líneas que pasan por aquí" saldrá de la ruta OFICIAL del GTFS;
⛔        · NO se marcará ninguna correspondencia PROVISIONAL (por desvío de hoy).
⛔
⛔   Esto NO es un aviso decorativo. Para arreglarlo cuando Avanza responda:
⛔
⛔        npm run correspondencias:build
⛔
⛔   (Se puede comprobar el estado del índice en /api/diag → "correspondencias".)
⛔
⛔${linea}⛔
`);
// Salimos 0 a propósito: el build NO debe fallar por esto.
process.exit(0);
