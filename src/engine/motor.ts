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
import { transporteReal, contador, type Transporte } from '@/sources/avanza/transporte';
import type { Dependencias } from './llegadas';

/** Gitignorado (`/.cache/`). Es dato ajeno cacheado: NO entra al repo público. */
const DIR_CACHE = process.env.ZETABUS_CACHE_DIR ?? '.cache/vivo';

let cache: CacheDosPisos | null = null;
const cachesFingidas = new Map<string, CacheDosPisos>();

/**
 * @param transporte Solo se pasa para FINGIR (modo demo). Por defecto, el real.
 *                   Ver `src/engine/fingir.ts`: hace falta `ZETABUS_DEMO=1`.
 * @param fingiendo  Etiqueta del fingimiento. NO es decorativa.
 *
 * ⚠️ EL FINGIMIENTO NECESITA SU PROPIA CACHÉ, Y CASI SE ME ESCAPA.
 *
 * La caché guarda por clave `poste:744`. Si el modo demo compartiera la caché
 * real, al pedir `?fingir=caido` la caché devolvería tan campante el dato BUENO
 * de hace 8 segundos, y el fingimiento NO FINGIRÍA NADA. Yo habría abierto la
 * página, habría visto autobuses, y habría dado por bueno que "el caso caído se
 * ve bien" — cuando lo que estaba viendo era el caso normal.
 *
 * Un modo de prueba que no prueba lo que dice es peor que no tenerlo: da
 * confianza falsa. Cada fingimiento vive en su propio directorio.
 */
export function motor(
  transporte: Transporte = transporteReal,
  fingiendo: string | null = null,
): Dependencias & { cache: CacheDosPisos } {
  if (fingiendo) {
    let c = cachesFingidas.get(fingiendo);
    if (!c) {
      c = new CacheDosPisos({ dir: `${DIR_CACHE}/_demo/${fingiendo}`, ttlMs: 2_000 });
      cachesFingidas.set(fingiendo, c);
    }
    return { cache: c, transporte };
  }
  cache ??= new CacheDosPisos({ dir: DIR_CACHE });
  return { cache, transporte };
}

export { contador };
