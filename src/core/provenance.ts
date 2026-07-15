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

/**
 * ⭐⭐ A1 · LA PROCEDENCIA DEL NOMBRE DE UNA PARADA. (Tanda 10)
 *
 * Es la misma idea que bajó al campo en la flota, aplicada al nombre de una parada:
 * **un nombre tiene su fuente, igual que la longitud de un bus tiene la suya.**
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ HACEN FALTA DOS FUENTES, Y NO UNA.
 *
 *  El GTFS del NAP trae el 80,4 % de los nombres ROTOS por un `ucwords()` de PHP
 *  en el exportador de Avanza: "Pedro III" → "Pedro Iii", "Miguel Ángel" → "Miguel
 *  ángel", "de" → "De". PRUEBA de que es el exportador y no el GTFS: las 50 paradas
 *  de TRANVÍA del mismo fichero están bien escritas. Mismo fichero, dos calidades.
 *
 *  ⇒ El nombre bueno se le pide al OPERADOR, a `get_stops_list` (el mismo endpoint
 *    que ya usamos para los desvíos), que lo escribe bien: "Av. de Cataluña n.º 51".
 *
 *  Pero esa fuente NO cubre el 100 %: `get_stops_list` devuelve la ruta REAL de hoy,
 *  así que **no da las paradas suprimidas por un desvío**. Esas se quedan con el
 *  nombre roto del GTFS, y HAY QUE DECIRLO EN PANTALLA, no taparlo.
 *
 *      `avanza-web`     el operador lo escribe así HOY. Es el bueno.
 *      `gtfs-marcado`   Avanza no lo da (parada suprimida, o fuera de toda ruta).
 *                       Se queda el del GTFS, que puede estar roto, Y SE MARCA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y NO SE CORRIGE A MANO NI UNO. La transformación del GTFS tiene PÉRDIDA: de
 *    "Pedro Iii" no se puede recuperar "Pedro III" sin adivinar (¿o era "Pedro III"
 *    de un rey, o "III" de un número de portal?). Adivinar es inventar. Es la L3.
 */
export type FuenteDelNombre = 'avanza-web' | 'gtfs-marcado';

export interface ProcedenciaDelNombre {
  readonly fuente: FuenteDelNombre;
  /** ISO. Cuándo se lo pedimos a Avanza. `null` cuando se quedó el del GTFS. */
  readonly fecha: string | null;
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
