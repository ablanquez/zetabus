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
  const clave = `horario-web:${etiqueta}:${sentido}:${hoy}`;
  const r = await dep.cache.obtener(clave, () => leerHorarioWeb(etiqueta, sentido, dep.transporte));
  return r.tipo === 'fallo' ? null : r.datos;
}
