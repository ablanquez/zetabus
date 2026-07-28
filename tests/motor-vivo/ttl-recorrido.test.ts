/**
 * ⭐⭐ EL TTL DEL RECORRIDO SE CABLEA DE VERDAD, Y SE MIDE — NO SE DECLARA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL BUG QUE ESTO CIERRA. Había una constante `TTL_RECORRIDO_MS` "de 30 min"
 *  DECLARADA y NUNCA conectada: la caché del recorrido caía al TTL por defecto
 *  (15 s), y un test afirmaba en verde que eran 30 min. Un cartel correcto sobre
 *  una tubería que no existía.
 *
 *  ⇒ La consecuencia real era pedir `get_stops_list` a Avanza cada 15 s por
 *    sentido. Un desvío no cambia en 15 s. Se cablea a 1 h, en su PROPIA caché
 *    (`motorRecorrido`), separada del vivo por CONSTRUCCIÓN.
 *
 *  ⚠️ ESTE TEST PRUEBA EL CABLEADO, NO LA CONSTANTE. Un `TTL_RECORRIDO_MS === 3600000`
 *     volvería a dar verde sobre exactamente el mismo bug (constante correcta, no
 *     conectada). Aquí se mide con reloj inyectado que la CACHÉ caduca donde debe.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CacheDosPisos, TTL_MS } from '@/cache/dos-pisos';
import { motor, motorRecorrido, TTL_RECORRIDO_MS } from '@/engine/motor';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'zetabus-ttl-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

/** Un origen que cuenta cuántas veces lo llaman. Es todo el instrumento. */
function origenContado(valor: unknown = { postes: [{ poste: 55, nombre: 'X' }] }) {
  const estado = { llamadas: 0 };
  const fn = async () => { estado.llamadas++; return valor; };
  return { estado, fn };
}

const MIN = 60_000;

// ─────────────────────────────────────────────────────────────────────────────
//  EL COMPORTAMIENTO, CON RELOJ INYECTADO (ni una espera real)
// ─────────────────────────────────────────────────────────────────────────────

describe('⭐⭐ el TTL del recorrido, medido en la caché (no en la constante)', () => {
  it('⚠️ EL ANTES (el bug): con el TTL por defecto (15 s) el recorrido caduca a los 20 s', async () => {
    // Es lo que HACÍA la caché del recorrido antes de cablearlo: caía a `motor().cache`,
    // 15 s. A los 20 s ya vuelve a pedírselo a Avanza. Ese era el fallo, medido.
    let t = 1_000_000;
    const cache = new CacheDosPisos({ dir, ahora: () => t }); // sin ttlMs → TTL_MS (15 s)
    const origen = origenContado();

    await cache.obtener('recorrido:35:0', origen.fn);
    t += 20_000; // +20 s
    await cache.obtener('recorrido:35:0', origen.fn);

    expect(origen.estado.llamadas).toBe(2); // caducó: SE VOLVIÓ A PEDIR
  });

  it('⭐ EL DESPUÉS: con 1 h, el recorrido sigue fresco a los 30 min y caduca pasada la hora', async () => {
    let t = 1_000_000;
    const cache = new CacheDosPisos({ dir, ttlMs: TTL_RECORRIDO_MS, ahora: () => t });
    const origen = origenContado();

    await cache.obtener('recorrido:35:0', origen.fn); // 1ª → 1 llamada
    t += 30 * MIN;                                    // +30 min
    await cache.obtener('recorrido:35:0', origen.fn); // SIGUE FRESCO → 1 llamada
    expect(origen.estado.llamadas).toBe(1);

    t += 31 * MIN;                                    // +31 min → total 61 min
    await cache.obtener('recorrido:35:0', origen.fn); // caducó → 2 llamadas
    expect(origen.estado.llamadas).toBe(2);
  });

  it('⚠️ CONTRAPRUEBA DE MUTACIÓN: con el TTL por defecto, el «después» NO se cumpliría', async () => {
    // Si alguien DESCABLEA el TTL (la caché vuelve al por defecto), a los 30 min ya
    // no está fresco. Es exactamente lo que el test de arriba impide que vuelva.
    let t = 1_000_000;
    const cacheSinCablear = new CacheDosPisos({ dir, ahora: () => t }); // 15 s
    const origen = origenContado();

    await cacheSinCablear.obtener('recorrido:35:0', origen.fn);
    t += 30 * MIN;
    await cacheSinCablear.obtener('recorrido:35:0', origen.fn);

    expect(origen.estado.llamadas).toBe(2); // NO aguantó los 30 min: el bug reaparece
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  EL CABLEADO REAL: qué TTL tiene cada instancia que el motor entrega
// ─────────────────────────────────────────────────────────────────────────────

describe('⭐ el cableado: la caché del recorrido es 1 h; la del vivo, intacta a 15 s', () => {
  it('motorRecorrido() entrega una caché de 1 h', () => {
    // Lee el TTL de la instancia REAL que usa la vista de línea. Si se descablea
    // (motorRecorrido sin `ttlMs`), esto cae a 15 y se pone ROJO.
    expect(motorRecorrido().cache.instantanea().ttlSegundos).toBe(TTL_RECORRIDO_MS / 1000);
    expect(motorRecorrido().cache.instantanea().ttlSegundos).toBe(3600);
  });

  it('⚠️ LAS LLEGADAS NO SE TOCAN: motor().cache sigue a 15 s', () => {
    // El bug catastrófico sería que el TTL largo tocara el vivo. No puede: es OTRA
    // instancia. Si esto diera 3600, las llegadas se servirían con una hora de retraso.
    expect(motor().cache.instantanea().ttlSegundos).toBe(TTL_MS / 1000);
    expect(motor().cache.instantanea().ttlSegundos).toBe(15);
  });

  it('⭐ son DOS instancias distintas: el vivo queda a salvo por construcción, no por convención', () => {
    expect(motorRecorrido().cache).not.toBe(motor().cache);
  });
});
