/**
 * LO QUE PUEDE PASAR CUANDO MIRAS ALGO QUE NO CONTROLAS.
 *
 * El motor vivo depende de un servicio ajeno que puede caerse, tardar, cambiar
 * de formato o mentir. Este fichero existe porque el proyecto viejo tenía UN
 * solo estado —"no hay llegadas"— y ese estado se comía CUATRO situaciones
 * distintas que no significan lo mismo:
 *
 *     el sitio no existe · no pasa nada ahora · no hemos podido leerlo · está caído
 *
 * Colapsarlas es lo que produce el fallo que perseguimos: una pantalla
 * coherente y falsa. El usuario lee "no hay llegadas" y se cree que no hay
 * servicio, cuando lo que ha pasado es que nuestra petición era errónea.
 *
 * ⚠️ Y NO ES TEORÍA. Medido el 13/07/2026 contra la fuente real:
 *
 *     poste 264  (VÁLIDO, desviado)  →  HTTP 200  {"tablatiempos":""}
 *     poste 999999 (NO EXISTE)       →  HTTP 200  {"tablatiempos":""}
 *     poste "abc"  (BASURA)          →  HTTP 200  {"tablatiempos":""}
 *
 * La fuente devuelve LO MISMO para los tres. No los distingue, y por tanto
 * NOSOTROS no podemos distinguirlos DESPUÉS de preguntar. Solo se puede ANTES:
 * validando contra nuestra propia topología. Ver `src/engine/llegadas.ts`.
 *
 * ⚠️ Y OJO CON LA TENTACIÓN: un sitio callado NO ES un sitio desviado.
 * Un sitio callado es un sitio callado. Puede ser desvío, puede ser que sean
 * las 4 de la mañana, puede ser que la fuente no lo conozca. `Observacion` no
 * tiene —ni tendrá— un estado `desviado`, porque este canal NO PUEDE
 * demostrarlo. El desvío se demuestra en otro sitio, con otra fuente, y sin
 * mirar aquí. Ver `src/engine/desvios.ts`.
 */

/** Un dato que sabe CUÁNDO se observó y, por tanto, CUÁNTO miente. */
export interface Fechado<T> {
  readonly datos: T;
  /** ISO-8601. El instante en que la FUENTE fue consultada, no en que se sirvió. */
  readonly observadoEn: string;
  /**
   * Segundos transcurridos desde `observadoEn`.
   *
   * ⭐ ESTE CAMPO ES LO QUE HACE HONESTA A UNA CACHÉ. Sin él, una caché de 15 s
   * y una de 5 minutos se ven igual desde fuera: las dos dicen "aquí tienes".
   * Con él, la pantalla puede poner "actualizado hace 18 s" y el usuario juzga.
   *
   * (Y es la razón por la que `use cache` de Next no sirve para esta capa:
   * cachea, pero no expone la edad de lo que te da.)
   */
  readonly edadSegundos: number;
  readonly origen: 'memoria' | 'disco' | 'fuente';
}

export type Observacion<T> =
  /** La fuente respondió y la lectura cuadra. `datos` puede estar VACÍO, y eso
   *  significa exactamente "ahora mismo no hay nada que contar". Nada más. */
  | ({ readonly estado: 'ok' } & Fechado<T>)
  /** La fuente falló AHORA, pero teníamos algo de antes. Se sirve DICIENDO su
   *  edad. Un dato viejo etiquetado es útil; un dato viejo disfrazado de fresco
   *  es el fallo que perseguimos. */
  | ({ readonly estado: 'rancio'; readonly motivo: string } & Fechado<T>)
  /** La fuente respondió, pero lo que dijo no lo entendemos o no cuadra consigo
   *  mismo. ⚠️ ESTO NO ES "NO HAY NADA". Es "no sabemos". Y se grita. */
  | { readonly estado: 'ilegible'; readonly motivo: string }
  /** La fuente no respondió, y no tenemos nada de antes. */
  | { readonly estado: 'caido'; readonly motivo: string }
  /** Lo que se pregunta no existe en NUESTRA topología. Ni se pregunta fuera. */
  | { readonly estado: 'desconocido'; readonly motivo: string };

/** `true` si la observación trae datos, sean frescos o rancios. */
export function tieneDatos<T>(o: Observacion<T>): o is Extract<Observacion<T>, { estado: 'ok' | 'rancio' }> {
  return o.estado === 'ok' || o.estado === 'rancio';
}

export function edadDe(observadoEn: string, ahora: number): number {
  return Math.max(0, Math.round((ahora - Date.parse(observadoEn)) / 1000));
}
