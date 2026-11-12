/**
 * ⭐ LOS DOS SENTIDOS SE PIDEN A LA VEZ, NO UNO DETRÁS DE OTRO.
 *
 * `/linea/[linea]` espera a `desviosDeLinea` antes de pintar nada. Con los sentidos
 * en fila, la espera era la SUMA de las dos peticiones a Avanza; medido en producción
 * el 12/11/2026, sin caché: `/linea/35` 13,9 s y `/linea/21` 8,9 s (bitácora, Fase 58).
 *
 * ⚠️ SE MIDE LA CONCURRENCIA, NO EL RELOJ. Un umbral de milisegundos daría rojos de
 *    timing bajo carga, que es justo el fallo que esto viene a cerrar. El doble cuenta
 *    cuántas peticiones de recorrido hay en vuelo a la vez: en fila, 1; a la vez, 2.
 *
 * ⚠️ Y EL NONCE, UNA VEZ. Al pedir a la vez con el nonce frío, las dos lecturas
 *    llegan juntas a `obtenerNonce`. Sin vuelo único, cada una pediría el suyo: una
 *    petición de más a Avanza por cada línea abierta en frío.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CacheDosPisos } from '@/cache/dos-pisos';
import { desviosDeLinea } from '@/engine/desvios';
import { invalidarNonce, URL_NONCE } from '@/sources/avanza/recorrido';
import type { Transporte } from '@/sources/avanza/transporte';
import { idLinea, idParada, lineas, posteDe, sentidosDe } from '@/engine/topologia';
import { respuestaNonce, respuestaRecorrido } from './dobles';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'zetabus-par-')); invalidarNonce(); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const TARDA_MS = 150;

/** Un Avanza lento que responde la ruta oficial y lleva la cuenta de lo que hay en vuelo. */
function avanzaLento(linea: string) {
  const l = lineas().find((x) => x.shortName === linea)!;
  const id = idLinea(String(l.id));
  const cuenta = { enVuelo: 0, maxEnVuelo: 0, recorridos: 0, nonces: 0 };
  const transporte: Transporte = async (url, { cuerpo }) => {
    if (url === URL_NONCE) {
      cuenta.nonces++;
      await new Promise((r) => setTimeout(r, TARDA_MS));
      return { status: 200, texto: respuestaNonce() };
    }
    cuenta.recorridos++;
    cuenta.enVuelo++;
    cuenta.maxEnVuelo = Math.max(cuenta.maxEnVuelo, cuenta.enVuelo);
    await new Promise((r) => setTimeout(r, TARDA_MS));
    cuenta.enVuelo--;
    const dirAvanza = new URLSearchParams(cuerpo ?? '').get('selectSentido') === '-1' ? 0 : 1;
    const s = sentidosDe(id).find((x) => x.directionId === dirAvanza);
    const postes: { poste: number; nombre: string }[] = [];
    for (const sid of s?.official.stops ?? []) {
      const p = posteDe(idParada(sid));
      if (p) postes.push({ poste: p, nombre: 'x' });
    }
    return { status: 200, texto: respuestaRecorrido(postes) };
  };
  return { id, cuenta, transporte };
}

describe('⭐ desviosDeLinea pide los sentidos a la vez', () => {
  it('la 35 (dos sentidos): las dos lecturas de recorrido están en vuelo a la vez', async () => {
    const a = avanzaLento('35');
    const r = await desviosDeLinea(a.id, { cache: new CacheDosPisos({ dir }), transporte: a.transporte });

    expect(r.estado).toBe('ok');
    expect(a.cuenta.recorridos).toBe(2);
    expect(a.cuenta.maxEnVuelo, 'los sentidos se pidieron en fila: la espera es la suma').toBe(2);
  });

  it('con el nonce frío, se pide UNA sola vez aunque los dos sentidos lo quieran a la vez', async () => {
    const a = avanzaLento('35');
    await desviosDeLinea(a.id, { cache: new CacheDosPisos({ dir }), transporte: a.transporte });

    expect(a.cuenta.nonces).toBe(1);
  });

  it('⭐ el resultado sale en el orden de los sentidos, como antes', async () => {
    const a = avanzaLento('35');
    const r = await desviosDeLinea(a.id, { cache: new CacheDosPisos({ dir }), transporte: a.transporte });

    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') {
      expect(r.datos.map((d) => d.directionId)).toEqual(sentidosDe(a.id).map((s) => s.directionId));
    }
  });
});
