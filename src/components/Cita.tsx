import type { ReactNode } from 'react';

/**
 * ⭐⭐ <Cita> · UN STRING LITERAL DE UNA FUENTE EXTERNA (Avanza, GTFS), Y EL ÚNICO
 * SITIO DE LA APP QUE SABE PINTARLO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ SE LLAMA "Cita" Y NO "Dato":
 *  Porque nombra el CONTRATO, no el contenido. Todo el proyecto se sostiene en
 *  "se cita, no se razona": un nombre de parada, una hora, un nombre de terminal
 *  se pintan TAL CUAL —son de Avanza/del GTFS, con su cadena de custodia—, no se
 *  reescriben ni se "mejoran". "Dato" es lo que el motor calcula; "Cita" es lo que
 *  otro publicó y nosotros repetimos sin tocar. Este componente protege lo segundo.
 *
 *  POR QUÉ EXISTE, Y ES UN ATAQUE QUE VIENE DE FUERA DEL CÓDIGO:
 *  El usuario puede darle a «traducir esta página» y el traductor del navegador
 *  REESCRIBE las citas en silencio —"Puerta del Carmen" → "Gate of the Carmen",
 *  "H. Cortes, 9" mutilado—. Deshace el principio entero desde fuera, y NINGÚN
 *  test del código lo caza, porque el que reescribe es el navegador, no nosotros.
 *
 *  La defensa es `translate="no"`: le dice al traductor que NO toque este nodo
 *  (ni sus hijos: el flag se hereda). Y para que no se olvide en el SÉPTIMO sitio
 *  —la ley de las 26 copias a mano, el mismo patrón que la versión de forma en la
 *  caché— vive en UN componente. Se pinta un string de fuente externa ⇒ se pinta
 *  con <Cita>. Punto. Un guardián lo vigila (ver `tests/cita-traduccion`).
 *
 *  ⚠️ NUESTRO texto (rótulos, "Hacia", "Primeras salidas", "Información adicional")
 *     NO va en <Cita>: ese SÍ queremos que el traductor lo traduzca. <Cita> es solo
 *     para la cita AJENA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ MÍNIMO A PROPÓSITO. Solo lo que resuelve el problema:
 *   · `translate="no"` — la defensa.
 *   · `data-cita` — un marcador SIN VALOR, solo para que el guardián del DOM pueda
 *     enumerar los nodos-cita. La procedencia (avanza/gtfs) no hace falta para
 *     defenderse del traductor, así que no se carga aquí (YAGNI).
 * Nada de `className` ni `as`: si un sitio necesita estilar, estila el PADRE y mete
 * la cita dentro. Un solo componente, una sola responsabilidad.
 */
export function Cita({ children }: { children: ReactNode }) {
  return (
    <span translate="no" data-cita>
      {children}
    </span>
  );
}
