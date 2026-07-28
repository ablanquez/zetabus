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
import { unicoPorProceso } from '@/core/proceso';
import { transporteReal, contador, type Transporte } from '@/sources/avanza/transporte';
import type { Dependencias } from './llegadas';

/** Gitignorado (`/.cache/`). Es dato ajeno cacheado: NO entra al repo público. */
const DIR_CACHE = process.env.ZETABUS_CACHE_DIR ?? '.cache/vivo';
/** El horario web cambia como mucho una vez al día → su propia caché, TTL largo. */
const DIR_HORARIO = process.env.ZETABUS_HORARIO_DIR ?? '.cache/horario';
const TTL_HORARIO_MS = 24 * 60 * 60_000;

/**
 * ⭐ EL RECORRIDO (desvíos) TIENE SU PROPIA CACHÉ, Y NO ES CAPRICHO. Un desvío no se
 * pone y se quita cada minuto —una obra de calle dura días—, así que releerlo cada
 * 15 s (el TTL del vivo) sería pedirle `get_stops_list` a Avanza ~240 veces por hora
 * y sentido para nada. 1 h corta ~99 % de esas peticiones y sigue cazando un corte de
 * calle que Avanza meta a media mañana (el índice de correspondencias se regenera de
 * noche: sin esta lectura, un desvío de las 9:00 no se vería hasta el día siguiente).
 *
 * ⚠️ VA EN SU PROPIA INSTANCIA (`motorRecorrido`), NO en la del vivo: si este TTL de
 *    1 h tocara la caché de las LLEGADAS, la pantalla diría «llega en 2 min» con datos
 *    de hace una hora. Se separa por CONSTRUCCIÓN, igual que el horario.
 */
const DIR_RECORRIDO = process.env.ZETABUS_RECORRIDO_DIR ?? '.cache/recorrido';
export const TTL_RECORRIDO_MS = 60 * 60_000;

/**
 * ⚠️⚠️ ESTO ERAN CUATRO `let`/`const` A NIVEL DE MÓDULO, Y NO ERAN UNO POR PROCESO.
 *
 * La cabecera de este fichero dice —y con razón— que si cada petición se creara su
 * propia caché «no habría nada que compartir y el vuelo único no existiría». Pues
 * bien: **eso ya estaba pasando a media escala.** En producción, el render de una
 * página y el route handler que la refresca corren en grafos de módulos distintos,
 * así que había DOS motores por proceso y el vuelo único no cruzaba entre ellos.
 *
 * No se notó porque **el piso de DISCO lo tapaba**: medido, la segunda petición al
 * mismo poste encontraba el dato en disco y no llamaba a Avanza otra vez. O sea que
 * el segundo piso —documentado como «precaución para el día que haya varios
 * workers»— llevaba meses trabajando de verdad, hoy, con un solo worker.
 *
 * ⇒ Con `unicoPorProceso` vuelve a haber UN motor por proceso, que es lo que la
 *   cabecera prometía. Ver `src/core/proceso.ts`.
 */
const cachesFingidas = unicoPorProceso('motor.cachesFingidas', () => new Map<string, CacheDosPisos>());
const cachesHorarioFingidas = unicoPorProceso('motor.cachesHorarioFingidas', () => new Map<string, CacheDosPisos>());
const cachesRecorridoFingidas = unicoPorProceso('motor.cachesRecorridoFingidas', () => new Map<string, CacheDosPisos>());

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
  return { cache: unicoPorProceso('motor.cache', () => new CacheDosPisos({ dir: DIR_CACHE })), transporte };
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
  const cache = unicoPorProceso(
    'motor.cacheHorario',
    () => new CacheDosPisos({ dir: DIR_HORARIO, ttlMs: TTL_HORARIO_MS }),
  );
  return { cache, transporte };
}

/**
 * La caché del RECORRIDO (desvíos): mismo patrón que `motorHorario()` —instancia
 * aparte, TTL propio (1 h, ver `TTL_RECORRIDO_MS`)—. Se separa del vivo porque un
 * desvío no cambia cada 15 s, y sobre todo para que su TTL largo NO pueda tocar jamás
 * la caché de las llegadas. La usa `desviosDeLinea` a través de su `dep.cache`.
 */
export function motorRecorrido(
  transporte: Transporte = transporteReal,
  fingiendo: string | null = null,
): { cache: CacheDosPisos; transporte: Transporte } {
  if (fingiendo) {
    let c = cachesRecorridoFingidas.get(fingiendo);
    if (!c) {
      c = new CacheDosPisos({
        dir: `${DIR_CACHE}/_demo/${fingiendo}/recorrido`,
        // En la demo, el TTL corto de `motor()` (2 s): el fingimiento es determinista
        // y así responde al instante al cambiar de `?fingir=`, como el resto del demo.
        ttlMs: 2_000,
        // Sin Avanza no hay techo que respetar (igual que en `motor()`).
        limitador: new Limitador(`${DIR_CACHE}/_demo/${fingiendo}/recorrido/_techo`, 1e9, 1e9),
      });
      cachesRecorridoFingidas.set(fingiendo, c);
    }
    return { cache: c, transporte };
  }
  const cache = unicoPorProceso(
    'motor.cacheRecorrido',
    () => new CacheDosPisos({ dir: DIR_RECORRIDO, ttlMs: TTL_RECORRIDO_MS }),
  );
  return { cache, transporte };
}

export { contador };
