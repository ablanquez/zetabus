import type { VehicleProfileBase } from '@/core';

/**
 * EL TRANVÍA. Existe para demostrar que el modelo aguanta un segundo modo.
 *
 * Fíjate en lo que NO hubo que hacer para añadirlo:
 *   · no se tocó ningún fichero de src/core/
 *   · no se tocó el adaptador del GTFS
 *   · no se tocó la ingesta
 *
 * Solo esto: un fichero nuevo que se registra en el hueco que el núcleo dejó.
 */
export interface TramProfile extends VehicleProfileBase {
  readonly mode: 'tram';
  readonly manufacturer: string;
  readonly model: string;
  /** Unidades acopladas. Un tranvía no tiene "longitud de autobús". */
  readonly units: number | null;
}

declare module '@/core/profiles' {
  interface VehicleProfileRegistry {
    tram: TramProfile;
  }
}
