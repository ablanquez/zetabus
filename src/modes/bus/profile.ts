import type { Confidence, VehicleProfileBase } from '@/core';

/**
 * TODO LO QUE ZETABUS SABE SOBRE LO QUE ES UN AUTOBÚS, EN UN SOLO FICHERO.
 *
 * El núcleo no importa nada de aquí. Aquí se importa del núcleo.
 * Esa flecha, y solo esa, es lo que hace que el 004 sea un hito y no cirugía.
 */

export type Fuel = 'diesel' | 'hibrido' | 'electrico';
export type BusClass = 'sencillo' | 'articulado' | 'microbus_pmrs';

export interface BusProfile extends VehicleProfileBase {
  readonly mode: 'bus';
  readonly manufacturer: string;
  readonly model: string;
  /**
   * ⚠️ 10 | 12 | 18 y nada más. Un 15 NO COMPILA, y eso es lo que quiero.
   *
   * ⚠️⚠️ NO DERIVAR ESTO DEL NOMBRE DEL MODELO. Hay 72 Volvo 7905 de 12 m y 35
   * de 18 m — MISMO NOMBRE. El fichero heredado lo dedujo del modelo y erró 62
   * de 316 (20%), siempre ocultando articulados. Ver docs/LECCIONES.md · L3.
   */
  readonly lengthMeters: 10 | 12 | 18 | null;
  readonly busClass: BusClass;
  readonly fuel: Fuel | null;
  readonly registeredOn: string | null;
  readonly plate: string | null;
  readonly confidence: Confidence;
}

/** Registra el perfil en el núcleo. Esto es TODO el acoplamiento que hay. */
declare module '@/core/profiles' {
  interface VehicleProfileRegistry {
    bus: BusProfile;
  }
}

/**
 * De la longitud a la clase, sí. Del modelo a la longitud, NUNCA.
 * Es la única dirección válida, y la que el fichero heredado invirtió.
 */
export function classFromLength(meters: number): BusClass {
  return meters >= 18 ? 'articulado' : 'sencillo';
}
