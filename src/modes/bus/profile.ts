import type { Confidence, ProcedenciaDeCampo, VehicleProfileBase } from '@/core';
import { ORDEN_DE_CONFIANZA } from '@/core';

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
  /**
   * ⚠️ LA DEL CAMPO MÁS DÉBIL QUE SE ENSEÑA. No la del vehículo, que ya no existe.
   * La calcula `confianzaDeLaFicha()`. NO se escribe a mano.
   */
  readonly confidence: Confidence;
  /** ⭐ De dónde sale CADA campo. La trazabilidad, no el resumen. */
  readonly procedencias: Readonly<Partial<Record<CampoDeFicha, ProcedenciaDeCampo>>>;
}

/** Los campos que se pueden afirmar de un autobús. Cada uno con su fuente. */
export type CampoDeFicha =
  | 'matricula'
  | 'fechaMatriculacion'
  | 'fabricante'
  | 'modelo'
  | 'longitudM'
  | 'clase'
  | 'propulsion';

/**
 * ⭐⭐ LOS CAMPOS QUE LA FICHA ENSEÑA DE VERDAD. Y solo estos deciden la marca.
 *
 * `FichaVehiculo` pinta tres chips: el número de coche, «clase · longitud» y el
 * combustible. La matrícula y la fecha de matriculación **no se enseñan a nadie**:
 * viven en el dato para poder auditar.
 *
 * ⚠️ Y por eso la marca sale de ESTOS y no de todos: marcar una ficha con `†`
 * porque la MATRÍCULA la aportó una persona —cuando la matrícula no está en la
 * pantalla— sería un aviso sobre algo que el usuario no puede ni ver.
 */
export const CAMPOS_QUE_SE_ENSEÑAN: readonly CampoDeFicha[] = ['clase', 'longitudM', 'propulsion'];

/**
 * ⭐⭐ LA REGLA QUE NO SE NEGOCIA: **UNA FICHA NO SE BLANQUEA.**
 *
 * Si UN SOLO campo de los que se enseñan viene de una observación, la ficha entera
 * lleva el `†`. No se limpia por tener los otros tres campos del pliego municipal.
 *
 * Es exactamente la trampa que abre la procedencia por campo: coges un vehículo,
 * le pones 6 campos oficiales y 1 observado, y la ficha sale impecable — con un
 * dato que nadie ha publicado nunca dentro. **Aquí se cierra.**
 */
export function confianzaDeLaFicha(
  procedencias: Readonly<Partial<Record<CampoDeFicha, ProcedenciaDeCampo>>>,
): Confidence {
  let peor: Confidence = 'oficial';
  for (const campo of CAMPOS_QUE_SE_ENSEÑAN) {
    const p = procedencias[campo];
    if (!p) continue; // un campo a null no afirma nada, así que no ensucia
    if (ORDEN_DE_CONFIANZA.indexOf(p.confidence) > ORDEN_DE_CONFIANZA.indexOf(peor)) {
      peor = p.confidence;
    }
  }
  return peor;
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
