/**
 * EL MOTOR DEL PROCESO. Uno por worker, y el disco los coordina a todos.
 *
 * ⚠️ POR QUÉ UN SINGLETON Y NO UNO POR PETICIÓN:
 * la caché en memoria y el registro de vuelos en curso SON el estado que hace
 * que 20 peticiones concurrentes se conviertan en 1. Si cada petición se creara
 * su propia caché, no habría nada que compartir y el vuelo único no existiría:
 * tendríamos 20 llamadas a Avanza y una caché que no cachea nada, con toda la
 * pinta de estar funcionando.
 */

import { CacheDosPisos } from '@/cache/dos-pisos';
import { transporteReal, contador } from '@/sources/avanza/transporte';
import type { Dependencias } from './llegadas';

/** Gitignorado (`/.cache/`). Es dato ajeno cacheado: NO entra al repo público. */
const DIR_CACHE = process.env.ZETABUS_CACHE_DIR ?? '.cache/vivo';

let cache: CacheDosPisos | null = null;

export function motor(): Dependencias & { cache: CacheDosPisos } {
  cache ??= new CacheDosPisos({ dir: DIR_CACHE });
  return { cache, transporte: transporteReal };
}

export { contador };
