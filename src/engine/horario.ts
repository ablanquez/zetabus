/**
 * EL HORARIO DE HOY, TRAÍDO DE LA WEB DE AVANZA. Y CACHEADO UN DÍA.
 *
 * A diferencia de las llegadas (15 s) o los desvíos, la tabla de horarios cambia
 * como mucho una vez al día. Por eso vive en su propia caché de TTL largo y la
 * clave lleva la FECHA: dentro del día se sirve lo mismo (una sola petición por
 * línea y sentido); al cambiar el día, la clave cambia y se vuelve a pedir.
 *
 * ⚠️ No se afirma nada más allá de lo que la web dice. Si no se puede leer, se
 * devuelve `null` y la pantalla no pinta el bloque —nunca una tabla inventada—.
 */

import type { CacheDosPisos } from '@/cache/dos-pisos';
import type { Transporte } from '@/sources/avanza/transporte';
import { leerHorarioWeb, type HorarioWeb } from '@/sources/avanza/horario';
import type { SentidoAvanza } from '@/sources/avanza/recorrido';

/**
 * ⚠️ MEDIDO, NO SUPUESTO. El `selectSentido` de Avanza contra el `direction_id`
 * del GTFS (mismo mapeo que en `desvios.ts`, verificado allí).
 */
const SENTIDO_AVANZA: Record<0 | 1, SentidoAvanza> = { 0: -1, 1: -2 };

/**
 * ⭐ LA VERSIÓN DE FORMA DE LO CACHEADO. Va en la CLAVE, y es un seguro contra un
 * fallo que no da la cara.
 *
 * La caché guarda un `HorarioWeb` serializado. Si alguien AÑADE un campo a
 * `HorarioWeb` (como pasó con `frecuencia`), las entradas que YA están en disco se
 * quedan con la forma vieja —sin ese campo—. Y ahí está la trampa: **no da error, no
 * lanza excepción, no se pone nada rojo.** La caché sirve fielmente lo que guardó, y
 * la pantalla sale MANCA. Es el mismo patrón que "el push que nadie hizo": la
 * ausencia de fallo no es la presencia del dato.
 *
 * Con TTL de un día, una entrada manca miente TODO EL DÍA (hasta que la clave, que
 * lleva la fecha, rueda al día siguiente). `frecuencia` se estrenó justo así: las
 * líneas cacheadas antes del cambio salían sin frecuencia y las pedidas después con
 * ella —"a veces sí, a veces no"— sin un solo error en los logs.
 *
 * ⚠️ SI AMPLÍAS `HorarioWeb` (un campo nuevo, un rename, un borrado), **SUBE ESTE
 * NÚMERO**. Al cambiar, cambia la clave → cambia el nombre de fichero → las entradas
 * viejas dejan de encontrarse y se vuelven a pedir con la forma nueva. Si NO lo
 * subes, se sirve la forma vieja hasta que caduque: un día entero de datos mancos.
 *
 *   v1 = forma sin `frecuencia` (implícita: el código viejo no ponía token)
 *   v2 = forma con `frecuencia`
 */
export const FORMA_HORARIO = 2;

export interface DependenciasHorario {
  readonly cache: CacheDosPisos;
  readonly transporte: Transporte;
}

/**
 * @param hoy Fecha `YYYY-MM-DD`. Entra en la clave de caché para que el dato se
 *            renueve al cambiar el día sin refrescar a media jornada.
 */
export async function horarioDeLinea(
  etiqueta: string,
  directionId: 0 | 1,
  hoy: string,
  dep: DependenciasHorario,
): Promise<HorarioWeb | null> {
  const sentido = SENTIDO_AVANZA[directionId];
  // ⚠️ `f${FORMA_HORARIO}` invalida en seco lo cacheado con una forma anterior. Ver arriba.
  const clave = `horario-web:f${FORMA_HORARIO}:${etiqueta}:${sentido}:${hoy}`;
  const r = await dep.cache.obtener(clave, () => leerHorarioWeb(etiqueta, sentido, dep.transporte));
  return r.tipo === 'fallo' ? null : r.datos;
}
