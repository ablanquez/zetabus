import type { SourceId } from './ids';

/**
 * Cuánto nos podemos fiar de un dato. **Y DE QUIÉN VIENE.**
 *
 * ⚠️ ESTE CAMPO VIAJA HASTA LA INTERFAZ. Un `sin_verificar` NO puede
 * disfrazarse de oficial por estar en el mismo array que uno oficial.
 * (Tanda 1 · cierre de cabos § 1.2)
 *
 * Los cuatro niveles NO son una escala de "cuánto me lo creo": son CUATRO
 * PROCEDENCIAS DISTINTAS, y cada una se sostiene de una manera distinta.
 *
 *   `oficial`            un documento firmado por el Ayuntamiento. Se cita.
 *   `fuente_secundaria`  un sitio especializado y citable, **pero NO oficial**.
 *                        Medido: acierta el 100% del fabricante y de la
 *                        propulsión contra el pliego, y ~98,6% de la matrícula
 *                        —o sea, transcribe a mano y se equivoca a veces—.
 *   `observacion_propia` una PERSONA lo vio circular, con nombre y fecha. No es
 *                        citable. Su cadena de custodia es el `git blame`.
 *   `sin_verificar`      no consta en ningún sitio. Se enseña, y se dice.
 *
 * ⚠️ Y NO SE COLAPSAN EN "verificado / no verificado". El día que un aficionado
 * y un pliego municipal valgan lo mismo en este tipo, hemos perdido el proyecto.
 */
export type Confidence =
  | 'oficial'
  | 'fuente_secundaria'
  | 'observacion_propia'
  | 'sin_verificar';

/** El orden. `0` manda sobre `1`, `1` sobre `2`… Y NO es una opinión: es la jerarquía. */
export const ORDEN_DE_CONFIANZA: readonly Confidence[] = [
  'oficial',
  'fuente_secundaria',
  'observacion_propia',
  'sin_verificar',
];

/**
 * ⭐⭐ LA PROCEDENCIA BAJA AL CAMPO. (Tanda 9)
 *
 * Hasta hoy, un vehículo tenía UNA fuente. Yo defendí ese diseño con este
 * argumento: *"mezclar procedencias produce fichas Frankenstein de las que ya no
 * se puede decir «esto viene de aquí»"*.
 *
 * ⛔ **Y perdía.** Porque el sistema estaba OBLIGANDO A CALLARSE algo que se sabe:
 * el coche 4114 salía **sin longitud** —porque busesmadrid.es no la publica—
 * existiendo alguien que se sube a él todas las semanas y sabe que mide 12 m.
 * **Eso es dejar de informar por pureza de diseño.**
 *
 * ⭐ Y mi objeción se convierte en el REQUISITO: *"de una ficha Frankenstein ya no
 * se puede decir de dónde viene cada cosa"* → **pues que se pueda. Campo a campo.**
 *
 *     4114 · modelo     ← busesmadrid.es
 *     4114 · propulsión ← busesmadrid.es
 *     4114 · longitud   ← Antonio Blánquez · 14/07/2026 · "me monto cada semana"
 *
 * Eso NO es Frankenstein: **es TRAZABILIDAD.** Lo Frankenstein sería no saberlo.
 */
export interface ProcedenciaDeCampo {
  /** Qué fuente afirma ESTE campo. */
  readonly fuente: string;
  readonly confidence: Confidence;
  /** Solo en `observacion_propia`: quién lo vio, cuándo, y cómo lo sabe. */
  readonly quien?: string;
  readonly fecha?: string;
  readonly comoLoSupe?: string;
}

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
