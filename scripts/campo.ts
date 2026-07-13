/**
 * MEDICIÓN DE CAMPO. Contra Avanza, de verdad, y con la cuenta a la vista.
 *
 *      npm run campo
 *
 * Dos cosas:
 *   1. ¿El barrido con paso encuentra los mismos autobuses que el completo?
 *   2. El diff de desvíos sobre las líneas que están desviadas AHORA.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ⚠️ POR QUÉ LA COMPARACIÓN DEL BARRIDO NO SE HACE COMO PARECE OBVIO.
 *
 * Lo obvio: barrer los 63 postes, luego barrer 17 con paso, y comparar.
 * ESO NO VALE, y el instrumento mentiría.
 *
 * Entre los dos barridos pasan ~20 segundos. **Los autobuses se mueven.** Uno
 * termina su servicio, otro sale de cochera. Está medido: el poste 744 pasó de
 * anunciar el coche 4262 a anunciar el 4275 entre dos capturas separadas por un
 * minuto. Si al comparar apareciera una diferencia, no sabríamos si es porque
 * el paso se dejó un autobús o porque ese autobús ya no circulaba.
 *
 * El instrumento estaría midiendo su propio retraso y llamándolo cobertura.
 *
 * ⭐ LA FORMA HONESTA: se hace UN SOLO barrido completo y se calcula el barrido
 *   con paso SOBRE ESA MISMA CAPTURA. La respuesta de cada poste es
 *   independiente de las demás, así que el subconjunto {0, 4, 8, ...} es una
 *   RÉPLICA EXACTA de lo que habría devuelto un barrido con paso en ese preciso
 *   instante. Cero deriva. Y cero peticiones de más, que también cuenta.
 * ═════════════════════════════════════════════════════════════════════════════
 */
import { desviosDeLinea } from '@/engine/desvios';
import { canonLinea, idLinea, idParada, lineas, posteDe, sentidosDe } from '@/engine/topologia';
import { leerPoste } from '@/sources/avanza/poste';
import { contador, transporteReal } from '@/sources/avanza/transporte';
import { CacheDosPisos } from '@/cache/dos-pisos';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LINEA_BARRIDO = process.argv[2] ?? '35';
/** Las del Coso y las de Avenida Valencia: las que la auditoría vio desviadas. */
const LINEAS_DESVIO = ['21', '29', '35', '38', '39', '41'];

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  ZETABUS · MEDICIÓN DE CAMPO                                               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n  ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} (hora de Zaragoza)\n`);

  // ═══ 1 · BARRIDO: ¿el paso pierde autobuses? ═══════════════════════════════
  const l = lineas().find((x) => x.shortName === LINEA_BARRIDO);
  if (!l) throw new Error(`no existe la línea ${LINEA_BARRIDO}`);
  const id = idLinea(String(l.id));
  const canon = canonLinea(l.shortName);

  const postes: number[] = [];
  const vistos = new Set<number>();
  for (const s of sentidosDe(id)) {
    for (const sid of s.official.stops) {
      const p = posteDe(idParada(sid));
      if (p && !vistos.has(p)) { vistos.add(p); postes.push(p); }
    }
  }

  console.log(`━━ 1 · BARRIDO DE LA LÍNEA ${l.shortName} ${'━'.repeat(48)}\n`);
  console.log(`  ${postes.length} postes. Se piden TODOS, una sola vez, a 4 peticiones/segundo.`);
  console.log('  El barrido con paso se calcula DESPUÉS, sobre estas mismas respuestas.\n');

  /** coche → los postes (por índice) en los que apareció. */
  const apariciones = new Map<string, Set<number>>();
  let fallos = 0;
  const t0 = Date.now();

  for (let i = 0; i < postes.length; i++) {
    try {
      const r = await leerPoste(postes[i], transporteReal);
      for (const ll of r.llegadas) {
        if (canonLinea(ll.lineaCruda) !== canon) continue;
        const set = apariciones.get(ll.coche) ?? new Set<number>();
        set.add(i);
        apariciones.set(ll.coche, set);
      }
    } catch {
      fallos++;
    }
    await dormir(250); // 4 req/s. El techo que prometemos, cumplido a mano.
  }

  const segundos = ((Date.now() - t0) / 1000).toFixed(1);
  const todos = new Set(apariciones.keys());
  console.log(`  → barrido COMPLETO: ${postes.length} peticiones en ${segundos} s · ${fallos} fallos`);
  console.log(`  → autobuses DETECTADOS: ${todos.size}   ${[...todos].sort().join(' ')}\n`);

  if (todos.size === 0) {
    console.log('  (no circula ningún autobús de esta línea ahora mismo — prueba en hora de servicio)\n');
  } else {
    console.log('  COBERTURA POR PASO (calculada sobre la MISMA captura → cero deriva):\n');
    console.log('     paso   peticiones   encontrados   perdidos   cobertura');
    console.log('     ────   ──────────   ───────────   ────────   ─────────');

    for (const paso of [1, 2, 3, 4, 5, 6, 8]) {
      const consultados = new Set<number>();
      for (let i = 0; i < postes.length; i += paso) consultados.add(i);
      consultados.add(postes.length - 1); // el último SIEMPRE, como en el motor

      const hallados = new Set<string>();
      for (const [coche, dondes] of apariciones) {
        for (const d of dondes) if (consultados.has(d)) { hallados.add(coche); break; }
      }
      const perdidos = [...todos].filter((c) => !hallados.has(c));
      const pct = Math.round((100 * hallados.size) / todos.size);
      const marca = paso === 4 ? ' ← el nuestro' : '';
      console.log(
        `     ${String(paso).padStart(4)}   ${String(consultados.size).padStart(10)}   ` +
          `${String(hallados.size).padStart(11)}   ${String(perdidos.length).padStart(8)}   ` +
          `${String(pct).padStart(7)}%${marca}${perdidos.length ? `   (falta ${perdidos.join(' ')})` : ''}`,
      );
    }
    console.log('');
  }

  // ═══ 2 · DESVÍOS ══════════════════════════════════════════════════════════
  console.log(`━━ 2 · DIFF DE DESVÍOS ${'━'.repeat(55)}\n`);
  const dir = mkdtempSync(join(tmpdir(), 'zetabus-campo-'));
  const dep = { cache: new CacheDosPisos({ dir }), transporte: transporteReal };

  for (const etiqueta of LINEAS_DESVIO) {
    const li = lineas().find((x) => x.shortName === etiqueta);
    if (!li) continue;
    const r = await desviosDeLinea(idLinea(String(li.id)), dep);
    if (r.estado !== 'ok') {
      console.log(`  línea ${etiqueta}: ${r.estado} — ${r.motivo}\n`);
      continue;
    }
    for (const d of r.datos) {
      const cab = `  LÍNEA ${d.linea} · sentido ${d.directionId} → ${d.headsign}`;
      if (d.veredicto.tipo === 'indeterminado') {
        console.log(`${cab}\n     ⚠️ INDETERMINADO: ${d.veredicto.motivo}\n`);
        continue;
      }
      const v = d.veredicto;
      if (!v.hayDesvio) {
        console.log(`${cab}\n     ✅ sin desvío (${v.oficiales} paradas oficiales = ${v.reales} de hoy)\n`);
        continue;
      }
      console.log(`${cab}\n     ⭐ DESVÍO DETECTADO  (oficial ${v.oficiales} → hoy ${v.reales})`);
      if (v.fuera.length) {
        console.log(`     ⛔ EL AUTOBÚS YA NO PASA POR (${v.fuera.length}):`);
        for (const p of v.fuera) console.log(`          ${String(p.poste).padStart(5)}  ${p.nombre}`);
      }
      if (v.hacia.length) {
        console.log(`     ➕ PARADAS PROVISIONALES (${v.hacia.length}):`);
        for (const p of v.hacia) console.log(`          ${String(p.poste).padStart(5)}  ${p.nombre}`);
      }
      if (v.reordenado) console.log('     ↻  y además cambia el ORDEN del recorrido');
      console.log('');
    }
    await dormir(250);
  }
  rmSync(dir, { recursive: true, force: true });

  // ═══ LA CUENTA ════════════════════════════════════════════════════════════
  const c = contador.cuenta;
  console.log(`━━ LA CUENTA ${'━'.repeat(65)}\n`);
  console.log(`  peticiones a Avanza en toda la medición: ${c.peticiones}`);
  console.log(`  reintentos: ${c.reintentos} · timeouts: ${c.timeouts} · errores: ${c.errores}`);
  console.log(`  tiempo medio de respuesta: ${c.peticiones ? Math.round(c.msAcumulados / c.peticiones) : 0} ms`);
  console.log(`  ritmo medido: ${contador.porMinuto().toFixed(1)} peticiones/minuto\n`);
  console.log('  ⚠️  Los desvíos NO se han deducido de ningún silencio. Salen de comparar');
  console.log('      el GTFS con el recorrido que Avanza publica para HOY. Un poste callado');
  console.log('      no ha entrado en la cuenta ni una sola vez.\n');
}

void main();
