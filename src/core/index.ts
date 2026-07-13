/**
 * EL NÚCLEO.
 *
 * Vocabulario completo del motor: FUENTE → (Parada, Línea, Sentido, Vehículo,
 * Llegada, Aviso). Nada más.
 *
 * ⚠️ REGLA QUE NO SE NEGOCIA:
 *    `src/core/` NO PUEDE IMPORTAR NADA DE `src/sources/`. Nunca.
 *    Si un tipo del núcleo necesita saber de dónde vino, está mal puesto.
 *    Lo vigila `tests/core-agnostico.test.ts`, no la buena voluntad.
 */
export * from './ids';
export * from './provenance';
export * from './profiles';
export * from './entities';
export * from './errors';
export * from './control';
export * from './feed-validity';
