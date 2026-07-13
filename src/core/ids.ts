/**
 * Identidades del núcleo.
 *
 * Son OPACAS a propósito. El núcleo no sabe que un `StopId` esconde un "poste"
 * de Avanza, ni que un `LineId` esconde una `route_id` del GTFS. Esas son
 * traducciones de la capa de ingesta, y viven allí.
 *
 * El marcado (`brand`) evita el error más aburrido y más caro: pasar un
 * `LineId` donde se espera un `StopId`. Ambos son `string` en tiempo de
 * ejecución; sin la marca, TypeScript los da por intercambiables.
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type StopId = Brand<string, 'StopId'>;
export type LineId = Brand<string, 'LineId'>;
export type VehicleId = Brand<string, 'VehicleId'>;
export type SourceId = Brand<string, 'SourceId'>;

export const stopId = (v: string): StopId => v as StopId;
export const lineId = (v: string): LineId => v as LineId;
export const vehicleId = (v: string): VehicleId => v as VehicleId;
export const sourceId = (v: string): SourceId => v as SourceId;

/**
 * El único punto de extensión por modo de transporte.
 *
 * `tram` ya está aquí, y no es especulación: el tranvía de Zaragoza viaja
 * DENTRO del mismo GTFS que el autobús (`agency_id=11`, `route_type=900`).
 * Añadir un modo nuevo se hace aquí y en `profiles.ts`. En ningún otro sitio
 * del núcleo aparece el nombre de un modo.
 */
export type Mode = 'bus' | 'tram';

export interface LatLon {
  readonly lat: number;
  readonly lon: number;
}

/** Color en formato `#RRGGBB`. */
export type Hex = string;
