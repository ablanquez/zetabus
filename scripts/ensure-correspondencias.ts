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
 *    haría su trabajo al importarlo). Y el CÓDIGO DE SALIDA del hijo decide, en TRES vías:
 *      · 0                    → índice escrito. Seguimos.
 *      · CODIGO_FUENTE_CAIDA  → Avanza no respondió al suelo: caída BENIGNA. Aviso
 *                               honesto y el build CONTINÚA (modo degradado). Salimos 0.
 *      · cualquier OTRO       → fallo NUESTRO (el hijo ni arrancó, o reventó por su
 *                               cuenta). El build PARA. No se despliega un fallo que no
 *                               entendemos disfrazado de caída de Avanza. Salimos 1.
 *    Antes, un `≠0` cualquiera se tomaba por «Avanza caída» y seguía SIEMPRE. Mismo
 *    patrón que `ensure-nombres`. Ver scripts/codigos-salida.ts.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { CODIGO_FUENTE_CAIDA } from './codigos-salida';

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

const linea = '═'.repeat(70);

// ── FUENTE CAÍDA (Avanza no llegó al suelo). Caída benigna: el build CONTINÚA ──────
if (r.status === CODIGO_FUENTE_CAIDA) {
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
}

// ── FALLO INTERNO (cualquier otro código: no arrancó, crash, invariante roto). PARA ──
console.error(`
⛔${linea}⛔
⛔
⛔   FALLO INTERNO GENERANDO EL ÍNDICE DE CORRESPONDENCIAS — Y NO ES DE AVANZA.
⛔
⛔   El hijo terminó con ${r.status === null ? `señal ${r.signal}` : `código ${r.status}`}, no con el ${CODIGO_FUENTE_CAIDA}
⛔   que reservamos para "la fuente no respondió". Es decir: build-correspondencias
⛔   ni llegó a preguntarle a Avanza, o reventó por su cuenta —un módulo que no
⛔   resuelve, un error de sintaxis, un invariante roto—.
⛔
⛔   ⚠️  Esto es un fallo NUESTRO. El stack o el mensaje que lo explica va AQUÍ
⛔       ARRIBA (el hijo hereda stdio).
⛔
⛔   ⛔  POR ESO EL BUILD PARA. Un error interno es propio y permanente, no ajeno
⛔       y pasajero: continuar desplegaría el mismo degradado-en-silencio en cada
⛔       build hasta que alguien lo note, culpando a Avanza de algo nuestro. (Se
⛔       ASUME que un build fallido deja la versión anterior sirviendo en
⛔       Hostinger; NO verificado a día de hoy.)
⛔
⛔   ⚠️  SÍ, esto bloquea CUALQUIER deploy —aunque solo quisieras subir un typo—
⛔       hasta arreglar la causa. Es el punto: si está roto, se arregla.
⛔
⛔   QUÉ HACER: lee el stack de arriba, arregla la causa y vuelve a desplegar.
⛔
⛔${linea}⛔
`);
process.exit(1);
