/**
 * ⭐ EL RUMBO DE LA LÍNEA: qué origen y qué destino se pintan arriba.
 *
 * Antonio, mirando la cabecera: «hay mucha confusión con el sentido y lo que
 * tengo seleccionado». El título decía "Parque Goya - Seminario" fijo —un guion,
 * que dice RANGO— sin decir hacia dónde vas. Aquí se calcula el rumbo del sentido
 * ACTIVO, para pintar "Seminario → Parque Goya" —una flecha, que dice DIRECCIÓN—.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA TRAMPA: NO TODA LÍNEA TIENE ORIGEN → DESTINO.
 *
 * Una línea de BUCLE empieza y acaba en la misma parada. Dibujarle una flecha
 * "A → A" sería mentir. El detector correcto NO es el nombre ("Ci"): es la
 * GEOMETRÍA —¿la primera parada del sentido es la última?—. Y eso pilla tres
 * familias que el nombre no pilla:
 *
 *   · Ci3, Ci4 ......... circulares de una sola vuelta.
 *   · 30, 54-59 ........ numeradas que en el GTFS cierran el bucle.
 *   · N1,N3,N4,N5,N7 ... búhos que dan la vuelta y vuelven al centro.
 *
 * Y AL REVÉS: Ci1 y Ci2 se LLAMAN circulares pero en el feed tienen DOS sentidos
 * de ida y vuelta con extremos distintos. A ésas SÍ les toca flecha. Por eso se
 * mira la geometría y no el prefijo del nombre.
 *
 * ⚠️ Y UN COLAPSO MÁS FINO (la N2): dos sentidos de verdad, pero con el MISMO
 * `trip_headsign` —una lista de barrios que describe la ronda entera, igual en
 * los dos sentidos—. Si el origen saliera del headsign del otro sentido, las dos
 * cabeceras y los dos botones dirían lo mismo: no distinguirían nada. Cuando el
 * headsign se comparte, se cae a la PRIMERA/ÚLTIMA PARADA REAL del sentido, que
 * sí es distinta. Nunca, jamás, una flecha "X → X".
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ TODO SALE DEL GTFS (trip_headsign y las paradas del sentido). Nada se
 * cablea a mano: una línea nueva o un cambio de cabecera NO obliga a tocar código.
 */

/** Lo que este módulo necesita saber de un sentido. Se arma desde la topología. */
export interface SentidoParaRumbo {
  readonly directionId: 0 | 1;
  /** `trip_headsign`. Puede venir vacío, o repetido entre sentidos (la N2). */
  readonly headsign: string;
  /** Nombre de la primera parada del sentido (la cabecera real). */
  readonly primeraParada: string;
  /** Nombre de la última parada del sentido (el final real). */
  readonly ultimaParada: string;
  /** ¿La primera parada ES la última? Entonces es un bucle: no hay flecha. */
  readonly esBucle: boolean;
}

/** El contexto de la LÍNEA (no del sentido) que hace falta para los bucles. */
export interface ContextoDeRumbo {
  /** Un búho es un bucle, pero en nuestra taxonomía NO es "una circular". */
  readonly esBuho: boolean;
  /** El nombre oficial de la línea. Es lo que se enseña en el bucle de un búho. */
  readonly nombreLargo: string;
}

export type Rumbo =
  /** Ida y vuelta: se pinta `origen → destino`. */
  | { readonly tipo: 'trayecto'; readonly origen: string; readonly destino: string }
  /** Circular (Ci / numerada de bucle): se pinta "Circular por {por}". */
  | { readonly tipo: 'circular'; readonly por: string }
  /** Un nombre tal cual (búho de bucle, o degradado): se pinta sin flecha. */
  | { readonly tipo: 'nombre'; readonly texto: string };

const limpio = (s: string): string => s.trim();

/**
 * El DESTINO de un sentido, como etiqueta limpia. Es lo que va en el botón
 * ("Hacia {destino}") y en el lado derecho de la flecha del título.
 *
 * El `trip_headsign` es la etiqueta curada y es lo que se usa... SALVO que lo
 * comparta con otro sentido (la N2): entonces no distingue el sentido y se cae a
 * la última parada real, que sí es propia de este sentido.
 */
export function destinoDeSentido(
  s: SentidoParaRumbo,
  sentidos: readonly SentidoParaRumbo[],
): string {
  const h = limpio(s.headsign);
  const loComparte = sentidos.some(
    (o) => o.directionId !== s.directionId && limpio(o.headsign) === h,
  );
  if (h.length > 0 && !loComparte) return h;
  return s.ultimaParada;
}

/**
 * El rumbo del sentido ACTIVO. Ver la cabecera del módulo para las tres formas.
 */
export function rumboDe(
  activo: SentidoParaRumbo,
  sentidos: readonly SentidoParaRumbo[],
  ctx: ContextoDeRumbo,
): Rumbo {
  // ── BUCLE: jamás una flecha. ──────────────────────────────────────────────
  if (activo.esBucle) {
    // Un búho da la vuelta, pero no es "una circular" en nuestra taxonomía: se
    // enseña su nombre oficial (que ya es una lista de barrios).
    if (ctx.esBuho) return { tipo: 'nombre', texto: ctx.nombreLargo };
    return { tipo: 'circular', por: limpio(activo.headsign) || activo.ultimaParada };
  }

  // ── IDA Y VUELTA: origen → destino. ───────────────────────────────────────
  const destino = destinoDeSentido(activo, sentidos);
  const otro = sentidos.find((s) => s.directionId !== activo.directionId);
  // El origen de este sentido es el destino del OTRO. Si no hay otro sentido
  // (caso degenerado), se usa la primera parada real de éste.
  const origenBruto = otro ? destinoDeSentido(otro, sentidos) : activo.primeraParada;
  // ⛔ Nunca "X → X". Si por lo que sea el origen coincide con el destino, se
  //    cae a la primera parada real, que es de este sentido y es distinta.
  const origen = origenBruto !== destino ? origenBruto : activo.primeraParada;
  return { tipo: 'trayecto', origen, destino };
}
