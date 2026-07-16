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
import { Limitador } from '@/cache/limitador';
import { transporteReal, contador, type Transporte } from '@/sources/avanza/transporte';
import type { Dependencias } from './llegadas';

/** Gitignorado (`/.cache/`). Es dato ajeno cacheado: NO entra al repo público. */
const DIR_CACHE = process.env.ZETABUS_CACHE_DIR ?? '.cache/vivo';
/** El horario web cambia como mucho una vez al día → su propia caché, TTL largo. */
const DIR_HORARIO = process.env.ZETABUS_HORARIO_DIR ?? '.cache/horario';
const TTL_HORARIO_MS = 24 * 60 * 60_000;

let cache: CacheDosPisos | null = null;
const cachesFingidas = new Map<string, CacheDosPisos>();
let cacheHorario: CacheDosPisos | null = null;
const cachesHorarioFingidas = new Map<string, CacheDosPisos>();

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
      c = new CacheDosPisos({
        dir: `${DIR_CACHE}/_demo/${fingiendo}`,
        ttlMs: 2_000,
        /**
         * ⚠️⚠️ Y EL TECHO TAMPOCO VA EN LA DEMO. LO VI EN UNA CIFRA QUE NO CUADRABA.
         *
         * La demo enseñaba "67 paradas consultadas · 40 peticiones a Avanza" y 27
         * avisos de "una parada no ha respondido". ¿Veintisiete fallos, con un
         * transporte FALSO que no puede fallar?
         *
         * Eran las fichas del cubo. La demo se salta el ritmo (no hay a quién
         * proteger: no sale un byte hacia Avanza), así que suelta los 67 postes de
         * golpe — y el cubo, que tiene 40, deniega los otros 27.
         *
         * ⇒ La demo estaba enseñando 27 fallos QUE EN PRODUCCIÓN NO OCURREN NUNCA:
         *   allí el barrido va a 4/s, que es justo lo que el cubo repone, y no se
         *   deniega ni una. La demo no estaba imitando al producto: lo estaba
         *   calumniando. Y con un número muy convincente al lado.
         *
         * El techo existe para proteger a Avanza. Si no hay Avanza, no hay techo.
         * Es la misma razón por la que se salta el ritmo, y va en el mismo sitio.
         */
        limitador: new Limitador(`${DIR_CACHE}/_demo/${fingiendo}/_techo`, 1e9, 1e9),
      });
      cachesFingidas.set(fingiendo, c);
    }
    return { cache: c, transporte };
  }
  cache ??= new CacheDosPisos({ dir: DIR_CACHE });
  return { cache, transporte };
}

/**
 * La caché del HORARIO WEB: mismo patrón que `motor()` pero con TTL de un día. Se
 * separa porque el horario no es el vivo: no tiene sentido pedirlo cada 15 s.
 */
export function motorHorario(
  transporte: Transporte = transporteReal,
  fingiendo: string | null = null,
): { cache: CacheDosPisos; transporte: Transporte } {
  if (fingiendo) {
    let c = cachesHorarioFingidas.get(fingiendo);
    if (!c) {
      c = new CacheDosPisos({
        dir: `${DIR_CACHE}/_demo/${fingiendo}/horario`,
        ttlMs: TTL_HORARIO_MS,
        // Sin Avanza no hay techo que respetar (igual que en `motor()`).
        limitador: new Limitador(`${DIR_CACHE}/_demo/${fingiendo}/horario/_techo`, 1e9, 1e9),
      });
      cachesHorarioFingidas.set(fingiendo, c);
    }
    return { cache: c, transporte };
  }
  cacheHorario ??= new CacheDosPisos({ dir: DIR_HORARIO, ttlMs: TTL_HORARIO_MS });
  return { cache: cacheHorario, transporte };
}

export { contador };
