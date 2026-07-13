/**
 * REGISTRO DE MODOS.
 *
 * Importar este fichero es lo que hace que los perfiles existan para
 * TypeScript. Sin él, `VehicleProfile` sería solo la base.
 *
 * El 004 añade una línea aquí. Nada más.
 */
import './bus/profile';
import './tram/profile';

export type { BusProfile, BusClass, Fuel } from './bus/profile';
export { classFromLength } from './bus/profile';
export type { TramProfile } from './tram/profile';
