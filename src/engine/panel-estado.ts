/**
 * ⭐⭐ EL NÚCLEO PURO DEL PANEL PÚBLICO `/estado`. Sin disco, sin reloj, sin red.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  QUÉ RESUELVE. El visitante de `/estado` quiere saber UNA cosa: «¿me puedo fiar
 *  del dato que me enseña ZetaBus ahora mismo?». Este módulo toma lo que el motor
 *  ya sabe (`EstadoIndice`, el estado del feed, los totales) y devuelve UN
 *  VEREDICTO y el subconjunto seguro que se pinta. La página solo lo dibuja.
 *
 *  ⭐ POR QUÉ AQUÍ Y NO EN LA PÁGINA. Un `page.tsx` no se prueba sin renderizar.
 *     La decisión de «fresco vs rancio vs degradado vs ilegible» ES la parte que
 *     puede mentir —dar VERDE sobre un dato de anteayer es el peor fallo del
 *     proyecto—, así que vive en una función pura con test propio, igual que
 *     `estadoIndiceDesde` (la lógica) vive separada de `estadoIndice` (el disco).
 *
 *  ⚠️ LISTA BLANCA POR CONSTRUCCIÓN (Ley 2). Este módulo lee campos de
 *     `EstadoIndice` CON NOMBRE, nunca con `...spread`. No importa `motor()` ni
 *     `contador` ni `process`, así que `pid`, `cwd` y todo el bloque `cache` NO
 *     son siquiera alcanzables desde aquí. Un campo sensible nuevo en `/api/diag`
 *     no tiene por dónde salir a `/estado`: la página no lee ese JSON.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { EstadoIndice } from '@/engine/correspondencias';
import type { FeedStatus } from '@/core';

/**
 * ⭐ EL UMBRAL DE FRESCURA, CON NOMBRE Y CON PORQUÉ (jamás un número mágico suelto).
 *
 * El cron regenera el índice a las 02:00 LOCALES cada día. Durante la operación
 * normal, la edad del artefacto oscila entre ~0 h (recién barrido) y ~24 h (justo
 * antes del barrido de la noche siguiente). El pico normal es, por tanto, ~24 h.
 *
 * 26 h = 24 h de pico normal + 2 h de colchón. Y el colchón NO es un redondeo:
 *   · absorbe un cron que se retrase o reintente sin dar falso «rancio»;
 *   · absorbe el vaivén de ±1 h del horario de verano —el cron dispara a las 02:00
 *     LOCALES y España cambia la hora dos veces al año; un colchón de 1 h no lo
 *     cubriría, uno de 2 h sí—. Este repo ya trata la zona `Europe/Madrid` con
 *     lupa (ver `feed-validity.ts`); esto es coherente con eso.
 *
 * Consecuencia buena: una noche ENTERA saltada cruza el umbral hacia las 04:00 de
 * la mañana siguiente —antes de la punta de tráfico—, así que el rancio se ve a
 * tiempo. No es una norma sagrada: es este argumento, escrito, y revisable.
 */
export const FRESCURA_MAX_HORAS = 26;
export const FRESCURA_MAX_SEGUNDOS = FRESCURA_MAX_HORAS * 60 * 60;

/**
 * Los CUATRO estados del panel. La forma (no el color) dice cuál es; el color solo
 * acompaña. Ver la prueba de escala de grises en `/estado`.
 *
 * ⚠️ LOS DISPARADORES CASAN CON EL MOTOR, NO CON LA INTUICIÓN. `estadoIndiceDesde`
 *    solo emite `degradado:true` JUNTO A `presente:false` (son el mismo evento: «no
 *    hay índice»); `presente:true && degradado:true` NO existe. Por eso:
 *      · `!presente`  → DEGRADADO (el índice falta o es ilegible en disco; la app
 *                       sirve los recorridos oficiales, sin los desvíos de hoy).
 *      · `ilegible`   queda para el cinturón de verdad: un `generadoEn` presente
 *                       pero infechable, o una excepción al construir el modelo.
 *    Mandar `!presente` a «ilegible» habría pintado «no lo sé» sobre un «índice
 *    falta» —plegar dos estados opuestos—, que es justo lo que NO se hace.
 */
export type Veredicto = 'al-dia' | 'desactualizado' | 'degradado' | 'ilegible';

/**
 * Clasifica SOLO a partir de `EstadoIndice`. No mira el reloj: la edad ya la
 * calculó el motor (`edadSegundos`), así que esto es determinista y se prueba
 * construyendo un `EstadoIndice` a mano.
 */
export function clasificarEstado(estado: EstadoIndice): Veredicto {
  // Índice ausente/ilegible en disco → servicio reducido (oficiales sin desvíos).
  if (!estado.presente) return 'degradado';
  // Presente pero no se puede fechar → no podemos juzgar la frescura: se dice.
  if (estado.edadSegundos === undefined) return 'ilegible';
  return estado.edadSegundos <= FRESCURA_MAX_SEGUNDOS ? 'al-dia' : 'desactualizado';
}

/** La salud del último barrido, subconjunto seguro. Solo existe si hubo índice. */
export interface SaludBarrido {
  readonly sentidosRespondidos: number;
  readonly sentidosEsperados: number;
  readonly sentidosFallidos: number;
  readonly sentidosSospechosos: number;
  readonly lineasDesviadas: number;
  readonly incidencias: number;
  readonly postesSinCoordenadas: number;
}

/** La vigencia del feed, subconjunto seguro (sin `version` interna). */
export interface SaludFeed {
  readonly estado: FeedStatus['kind'];
  readonly endDate: string;
  readonly aviso: string | null;
}

/** Totales que dan confianza sin ser tripas. Siempre disponibles (van en el bundle). */
export interface Totales {
  readonly lineas: number;
  readonly paradas: number;
}

/**
 * El modelo que la página pinta. Cada estado trae SOLO lo que el motor da en ese
 * caso: en `degradado` NO hay `edadSegundos` ni `barrido` (el motor no los emite
 * sin índice) y NO se rellenan con placeholders; en `ilegible` no se pinta nada
 * más que el mensaje —si no podemos formar un veredicto, no fingimos medias
 * verdades—.
 */
export type ModeloPanel =
  | {
      readonly veredicto: 'al-dia' | 'desactualizado';
      readonly edadSegundos: number;
      readonly barrido: SaludBarrido | null;
      readonly feed: SaludFeed;
      readonly totales: Totales;
    }
  | {
      readonly veredicto: 'degradado';
      readonly feed: SaludFeed;
      readonly totales: Totales;
    }
  | { readonly veredicto: 'ilegible' };

/**
 * Construye el modelo desde los datos del motor. PURA: se le pasan el `EstadoIndice`
 * y los valores del feed/totales ya calculados (para no atar esto al reloj ni al
 * bundle en el test).
 *
 * ⚠️ Solo se COPIAN campos con nombre. `EstadoIndice.barrido` trae además
 *    `postesGtfs`, `postesSoloBarrido` y `postesConProvisional`: se dejan fuera a
 *    propósito (Costura 3) — un panel público se lee mejor con pocos números que
 *    importan.
 */
export function construirModelo(estado: EstadoIndice, feed: SaludFeed, totales: Totales): ModeloPanel {
  const veredicto = clasificarEstado(estado);

  if (veredicto === 'ilegible') return { veredicto };

  if (veredicto === 'degradado') return { veredicto, feed, totales };

  // al-dia | desactualizado — presente, con edad fechable (garantizado por el clasificador).
  const b = estado.barrido;
  return {
    veredicto,
    edadSegundos: estado.edadSegundos as number,
    barrido: b
      ? {
          sentidosRespondidos: b.sentidosRespondidos,
          sentidosEsperados: b.sentidosEsperados,
          sentidosFallidos: b.sentidosFallidos,
          sentidosSospechosos: b.sentidosSospechosos,
          lineasDesviadas: b.lineasDesviadas,
          incidencias: b.incidencias,
          postesSinCoordenadas: b.postesSinCoordenadas,
        }
      : null,
    feed,
    totales,
  };
}

/**
 * ⭐ EL CINTURÓN DE LA LEY 3. Envuelve la construcción del modelo: si CUALQUIER
 * cosa revienta al leer el motor (feed incoherente, topología, un `throw`
 * inesperado), el panel dice «no lo sé» en vez de pintar salud falsa.
 *
 * ⚠️ Con la Lectura B no hay red, así que el disparador de «ilegible» NO es «la API
 *    no responde» (eso era del fetch descartado): es una excepción síncrona al leer
 *    el motor, o un `generadoEn` infechable. Aquí se captura la primera.
 */
export function modeloSeguro(leer: () => ModeloPanel): ModeloPanel {
  try {
    return leer();
  } catch {
    return { veredicto: 'ilegible' };
  }
}

/**
 * Millares con punto, como en el resto del proyecto («2.034»). NO se usa el
 * formateo de locale de JS: en Hostinger (Node con ICU recortado) NO agrupa y
 * devuelve «2034» —medido abriendo la página, con 14 tests en verde—. Se agrupa a
 * mano, que es determinista y no depende de qué ICU trae el host.
 *
 * ⚠️ Y el comentario NO nombra ese método con su sintaxis de llamada a propósito:
 *    el guardián `horas-malas` lo prohíbe en `src/engine/` grepeando el código
 *    CRUDO, así que citarlo aquí lo pondría rojo por una frase, no por una llamada.
 */
export function formatearMillar(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Edad legible, sin recortar y sin inventar precisión. Greyscale-safe (son
 * palabras y números). `< 1 min` se dice «hace menos de un minuto» y no «hace 0».
 */
export function formatearEdad(edadSegundos: number): string {
  if (edadSegundos < 60) return 'hace menos de un minuto';
  const min = Math.floor(edadSegundos / 60);
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  const restoMin = min % 60;
  if (horas < 24) {
    return restoMin === 0 ? `hace ${horas} h` : `hace ${horas} h ${restoMin} min`;
  }
  const dias = Math.floor(horas / 24);
  const restoHoras = horas % 24;
  const d = `${dias} ${dias === 1 ? 'día' : 'días'}`;
  return restoHoras === 0 ? `hace ${d}` : `hace ${d} y ${restoHoras} h`;
}
