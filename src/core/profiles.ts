import type { Mode } from './ids';
import type { Confidence } from './provenance';

/**
 * EL PERFIL DE UN VEHÍCULO — Y EL NÚCLEO NO SABE LO QUE HAY DENTRO.
 *
 * ⚠️ ESTE FICHERO CAMBIÓ EN LA TANDA 2, Y POR UN MOTIVO QUE MERECE LEERSE.
 *
 * El diseño aprobado en la Tanda 1 ponía aquí un `BusProfile` con `manufacturer`,
 * `lengthMeters`, `isArticulated`... y lo justificaba: "genérico el núcleo,
 * TIPADO lo específico".
 *
 * Estaba mal, y lo cazó el test `tranvia-sin-tocar-el-nucleo.test.ts`, que
 * comprueba que la palabra "bus" no aparece en `core/`. Un núcleo que declara
 * `lengthMeters: 10 | 12 | 18` SABE LO QUE ES UN AUTOBÚS. Que el tipo se llame
 * "perfil" no lo hace agnóstico: lo hace agnóstico de nombre.
 *
 * ⭐ LA SOLUCIÓN: un REGISTRO. El núcleo declara el hueco; cada modo lo rellena
 * desde `src/modes/<modo>/`, por *declaration merging*. El núcleo sabe que un
 * vehículo PUEDE llevar un perfil y que el perfil se discrimina por `mode`.
 * Qué haya dentro, no es asunto suyo.
 *
 * Añadir el tranvía = crear `src/modes/tram/profile.ts`. Cero ficheros del
 * núcleo tocados. Eso ya no es una promesa: es un test.
 */

/** Lo único que el núcleo exige de CUALQUIER perfil, sea del modo que sea. */
export interface VehicleProfileBase {
  readonly mode: Mode;
  /** ⚠️ VIAJA HASTA LA INTERFAZ. Un `sin_verificar` lleva asterisco en pantalla. */
  readonly confidence: Confidence;
}

/**
 * El registro. Nace VACÍO, a propósito.
 *
 * Cada modo lo amplía desde su propio fichero:
 *
 *     declare module '@/core/profiles' {
 *       interface VehicleProfileRegistry { bus: BusProfile }
 *     }
 *
 * Y así `VehicleProfile` acaba siendo la unión de los modos registrados, sin que
 * el núcleo haya tenido que nombrar ni uno.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VehicleProfileRegistry {}

export type RegisteredMode = keyof VehicleProfileRegistry;

/** Unión discriminada de los perfiles registrados. Vacío si no hay ninguno. */
export type VehicleProfile =
  VehicleProfileRegistry[keyof VehicleProfileRegistry] extends never
    ? VehicleProfileBase
    : VehicleProfileRegistry[keyof VehicleProfileRegistry];
