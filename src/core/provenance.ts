import type { SourceId } from './ids';

/**
 * Cuánto nos podemos fiar de un dato.
 *
 * ⚠️ ESTE CAMPO VIAJA HASTA LA INTERFAZ. Un `sin_verificar` NO puede
 * disfrazarse de oficial por estar en el mismo array que uno oficial.
 * (Tanda 1 · cierre de cabos § 1.2)
 */
export type Confidence = 'oficial' | 'sin_verificar';

/** De dónde salió un dato. Sin esto, un dato es un rumor. */
export interface Provenance {
  /** Qué fuente lo produjo. */
  readonly source: SourceId;
  /** Cuándo lo leímos NOSOTROS. */
  readonly observedAt: string;
  /** Cuándo lo cambiaron ELLOS (Last-Modified, feed_start_date...). Puede no saberse. */
  readonly sourceUpdatedAt: string | null;
  /** Para poder enseñárselo al usuario. */
  readonly url: string | null;
  readonly confidence: Confidence;
}
