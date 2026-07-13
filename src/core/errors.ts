/**
 * Errores del núcleo.
 *
 * Todos comparten una idea: **fallar ruidosamente**. Un mapa sin paradas que no
 * se queja es peor que un error — el error lo arreglas; el mapa vacío lo
 * publicas.
 */

/** La ingesta no puede continuar. Aborta el build. */
export class IngestError extends Error {
  constructor(message: string, readonly hint?: string) {
    super(hint ? `${message}\n  → ${hint}` : message);
    this.name = 'IngestError';
  }
}

/** Un dato no cumple una invariante del núcleo. */
export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantError';
  }
}
