import { stopId, type StopId } from '@/core';

/**
 * EL PUENTE DE IDENTIDAD — Y ES ESPECÍFICO DE AVANZA, NO DEL NÚCLEO.
 *
 *     stop_code = "PA" + poste.padStart(5,'0')     →     PA00669 = poste 669
 *
 * Cobertura medida en la Fase 3: **934/934 paradas de autobús**. Coste: cero.
 *
 * ⚠️ POR QUÉ VIVE AQUÍ Y NO EN core/:
 *    Las paradas del TRANVÍA no llevan prefijo `PA`. Si este puente estuviera
 *    en el núcleo, el tranvía lo rompería el primer día. Y el 004 es
 *    multimodal. No es purismo: es que ya sabemos que se rompe.
 */

const PA = /^PA(\d{5})$/;

/** Devuelve el nº de poste, o `null` si este `stop_code` no es de Avanza-bus. */
export function posteFromStopCode(stopCode: string | null): number | null {
  if (!stopCode) return null;
  const m = PA.exec(stopCode.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** `StopId` estable del núcleo a partir del `stop_id` del GTFS. */
export function stopIdFromGtfs(gtfsStopId: string): StopId {
  return stopId(gtfsStopId);
}
