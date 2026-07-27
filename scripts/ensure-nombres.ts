/**
 * ⭐ GARANTIZA LA TABLA DE NOMBRES EN EL BUILD, SIN PAGAR EL BARRIDO DE MÁS.
 *
 *     Va dentro de `npm run build`, ANTES de `data:build`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  La tabla (`src/generated/nombres.json`) es dato raspado de Avanza (como el
 *  índice de correspondencias): NO se versiona. Quien clona el repo no la tiene, y
 *  sin ella `data:build` hornea TODAS las paradas con el nombre del GTFS, MARCADO
 *  como «sin confirmar». El aviso sale en las 934 → ruido, y un aviso que salta
 *  siempre no se lee.
 *
 *  ⇒ Este script la genera SI FALTA, y solo si falta:
 *      · ya existe  → no se rebarre (quien la tiene no paga ~2 min de Avanza);
 *      · no existe  → se barre una vez (quien clona y compila la tiene sin enterarse).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ VA ANTES DE `data:build`, Y EL ORDEN ES CRÍTICO. `data:build` LEE la tabla y
 *    HORNEA los nombres dentro de `gtfs.json` (en runtime nadie relee `nombres.json`).
 *    Si este script corriera DESPUÉS, la tabla nacería cuando el artefacto ya se
 *    horneó sin nombres: existiría en disco y no serviría de nada.
 *
 * ⚠️ NO se lanza desde la APP al detectar que falta: serían 74 peticiones disparadas
 *    por una visita. La tabla se pide en el BUILD, que es "alguien mirando". La app, no.
 *    (Y a diferencia del índice de correspondencias, esto NO lo refresca el cron: los
 *    nombres de las paradas son estables, se piden una vez por build y basta.)
 *
 * ⚠️⚠️ SI AVANZA ESTÁ CAÍDA durante el build, EL BUILD NO SE MUERE. Un fallo de una API
 *    externa no puede impedir compilar y desplegar. Pero el aviso NO puede leerse como
 *    decoración: se pinta un recuadro que dice, sin ambigüedad, que la app arrancará
 *    con TODAS las paradas «sin confirmar» y con qué comando se arregla. (Ya sabemos lo
 *    que pasa con los avisos de build que se leen como ruido: no se leen.)
 *
 * ⚠️ Se lanza `build-nombres` como PROCESO HIJO (no se importa: importarlo dispararía
 *    su barrido al cargar). El código de salida del hijo decide: 0 = tabla escrita;
 *    ≠0 = no se pudo (Avanza caída o suelo del 80% no alcanzado), y AQUÍ se convierte
 *    en aviso no-fatal (salimos 0). El propio `build-nombres` ya protege la tabla buena
 *    que hubiera: por debajo del suelo NO la sobrescribe.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const OUT = 'src/generated/nombres.json';

if (existsSync(OUT)) {
  console.log(`\n✅ Tabla de nombres ya presente (${OUT}). No se rebarre.\n`);
  process.exit(0);
}

console.log(`\nℹ️  No hay tabla de nombres en ${OUT}.`);
console.log('   Se genera ahora, una vez (barrido de Avanza, ~2 min). Quien ya la tenga no paga esto.\n');

// tsx está en el PATH (node_modules/.bin) durante un `npm run *`. `shell: true` para que
// Windows resuelva el .cmd. `stdio: inherit` para que el barrido cuente lo suyo en vivo.
const r = spawnSync('tsx', ['scripts/build-nombres.ts'], { stdio: 'inherit', shell: true });

if (r.status === 0 && existsSync(OUT)) {
  process.exit(0);
}

// ── No se pudo (Avanza caída, suelo no alcanzado, o el hijo murió). NO se cae el build ──
const linea = '═'.repeat(70);
console.error(`
⛔${linea}⛔
⛔
⛔   NO SE PUDO GENERAR LA TABLA DE NOMBRES.
⛔
⛔   El build CONTINÚA —un fallo de Avanza no puede impedir compilar—, pero
⛔   ⚠️  LA APP ARRANCARÁ SIN NOMBRES CONFIRMADOS:
⛔        · TODAS las paradas usarán el nombre del GTFS (puede venir roto);
⛔        · TODAS saldrán marcadas como «nombre sin confirmar».
⛔
⛔   Esto NO es un aviso decorativo. Para arreglarlo cuando Avanza responda:
⛔
⛔        npm run nombres:build
⛔
⛔${linea}⛔
`);
// Salimos 0 a propósito: el build NO debe fallar por esto.
process.exit(0);
