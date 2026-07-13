/**
 * LAS LLEGADAS DE UNA PARADA. El motor vivo, de punta a punta.
 *
 * Orden, y el orden ES el diseño:
 *
 *   1. ¿El poste es NUESTRO?  → si no, `desconocido`. Y a Avanza NI SE LE PREGUNTA.
 *   2. Caché de dos pisos     → si hay algo fresco, se sirve. Sin red.
 *   3. Avanza                 → una petición, con techo, timeout y reintento.
 *   4. Lectura                → si no cuadra, `ilegible`. NUNCA "no hay buses".
 *   5. Enriquecido            → línea del GTFS, perfil de la flota.
 *
 * ⚠️ NINGUNA DE ESTAS CINCO ETAPAS PUEDE PRODUCIR LA PALABRA "DESVIADO".
 * Un poste callado es un poste callado: puede ser un desvío, pueden ser las
 * cuatro de la mañana, puede ser que Avanza no conozca esa parada. Este canal
 * no distingue entre esas tres cosas y por tanto NO OPINA sobre ninguna.
 * El desvío se demuestra en `desvios.ts`, con otra fuente, y sin mirar aquí.
 */

import {
  vehicleId,
  type LatLon,
  type LineId,
  type Observacion,
  type StopId,
  type VehicleId,
} from '@/core';
import type { BusProfile } from '@/modes/bus/profile';
import type { CacheDosPisos } from '@/cache/dos-pisos';
import { leerPoste } from '@/sources/avanza/poste';
import { PosteIlegible } from '@/sources/avanza/parse-poste';
import { FuenteCaida, type Transporte } from '@/sources/avanza/transporte';
import { lineaDeEtiqueta, parada, paradaDelPoste, perfilDe, posteDe } from './topologia';

export interface LlegadaViva {
  /** `null` = Avanza anuncia una línea que el GTFS no tiene. Se ENSEÑA IGUAL. */
  readonly lineaId: LineId | null;
  /** Lo que dijo Avanza, literal: "039". Se conserva aunque no case con el GTFS. */
  readonly etiquetaCruda: string;
  /** El nombre bonito del GTFS: "39". `null` si no casó. */
  readonly linea: string | null;
  readonly color: string | null;
  readonly destino: string;
  readonly coche: VehicleId;
  readonly etaMinutos: number;
  /** `null` = **SIN DATOS**. Jamás un valor por defecto. */
  readonly perfil: BusProfile | null;
  /** `null` = sin coordenadas → NO SE PINTA. Jamás (0,0). */
  readonly posicion: LatLon | null;
}

export interface LlegadasDeParada {
  readonly paradaId: StopId;
  readonly nombreParada: string;
  readonly poste: number;
  readonly posicionParada: LatLon | null;
  /**
   * ⚠️ EL CONTRATO DE DATOS, Y NO ES UN MATIZ:
   * son los autobuses **DETECTADOS**, no "todos los autobuses". Avanza anuncia
   * como mucho LOS DOS SIGUIENTES por línea y sentido (medido: 41 bloques de 41
   * en 20 postes, ninguno con tres). Un tercer autobús de la misma línea existe
   * y circula, pero no sale aquí. Si alguna vez alguien escribe "todos los
   * autobuses de la línea 35" apoyándose en este campo, estará mintiendo.
   */
  readonly llegadas: readonly LlegadaViva[];
  /** Cosas que no cuadran y que NO se tapan: iconos raros, líneas sin GTFS... */
  readonly avisos: readonly string[];
}

export interface Dependencias {
  readonly cache: CacheDosPisos;
  readonly transporte: Transporte;
  readonly ahora?: () => number;
}

export async function llegadasDePoste(
  entrada: unknown,
  dep: Dependencias,
): Promise<Observacion<LlegadasDeParada>> {
  // ── 1 · EL GUARDIA. Lo único que arregla el agujero de la fuente ───────────
  const paradaId = paradaDelPoste(entrada);
  if (paradaId === null) {
    return {
      estado: 'desconocido',
      motivo:
        `El poste ${JSON.stringify(entrada)} no existe en la topología oficial de Zaragoza. ` +
        'No se ha consultado a Avanza: su API devuelve exactamente lo mismo para un poste ' +
        'inexistente que para uno sin autobuses, así que preguntar no aclararía nada y ' +
        'solo gastaría una petición ajena.',
    };
  }
  const poste = posteDe(paradaId)!;
  const p = parada(paradaId)!;

  // ── 2 y 3 · caché → (si hace falta) Avanza ────────────────────────────────
  const r = await dep.cache.obtener(`poste:${poste}`, () => leerPoste(poste, dep.transporte));

  if (r.tipo === 'fallo') {
    // ⚠️ Se distingue "no lo entiendo" de "no me contesta". Al usuario le da
    //    igual, pero a quien tenga que arreglarlo NO, y el mensaje se guarda.
    const ilegible = r.motivo.includes('No se puede leer');
    return { estado: ilegible ? 'ilegible' : 'caido', motivo: r.motivo };
  }

  // ── 4 y 5 · lectura → enriquecido ─────────────────────────────────────────
  const lectura = r.datos;
  const avisos = [...lectura.avisos];
  const posicionPorCoche = new Map(lectura.vehiculos.map((v) => [v.coche, v.posicion]));

  const llegadas: LlegadaViva[] = lectura.llegadas.map((l) => {
    const gtfs = lineaDeEtiqueta(l.lineaCruda);
    if (!gtfs) {
      // Avanza anuncia una línea que nuestro GTFS no tiene. Pasa cuando el feed
      // se queda viejo o cuando abren una línea nueva. NO se descarta el
      // autobús —existe, va lleno de gente— pero se dice que no lo conocemos.
      avisos.push(
        `la línea "${l.lineaCruda}" está circulando pero no existe en el GTFS ` +
          `(${/* la vigencia se enseña aparte */ ''}se muestra sin color ni enlace)`,
      );
    }
    return {
      lineaId: gtfs ? gtfs.id : null,
      etiquetaCruda: l.lineaCruda,
      linea: gtfs ? gtfs.shortName : null,
      color: gtfs ? gtfs.color : null,
      destino: l.destino,
      coche: vehicleId(l.coche),
      etaMinutos: l.etaMinutos,
      perfil: perfilDe(l.coche), // ← null = SIN DATOS
      posicion: posicionPorCoche.get(l.coche) ?? null, // ← null = no se pinta
    };
  });

  const datos: LlegadasDeParada = {
    paradaId,
    nombreParada: p.name,
    poste,
    posicionParada: lectura.marcadorParada ?? p.position,
    llegadas,
    avisos,
  };

  return r.tipo === 'rancio'
    ? { estado: 'rancio', motivo: r.motivo, datos, observadoEn: r.observadoEn, edadSegundos: r.edadSegundos, origen: r.origen }
    : { estado: 'ok', datos, observadoEn: r.observadoEn, edadSegundos: r.edadSegundos, origen: r.origen };
}

export { PosteIlegible, FuenteCaida };
