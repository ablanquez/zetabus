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
 * ⭐⭐ CORRECCIÓN ORTOGRÁFICA DE LOS DESTINOS DEL GTFS. Y ESTO CRUZA UNA LÍNEA:
 * AQUÍ YA NO SE CITA, SE CORRIGE. Es una decisión (de Antonio), no un detalle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  El `trip_headsign` del GTFS viene pasado por el MISMO `ucwords()` que destrozó
 *  los nombres de parada: capitaliza CADA palabra —incluidas las preposiciones y
 *  artículos ("Puerta del Carmen" → "Puerta Del Carmen")— y se come acentos y
 *  numerales ("SIGLO XXI" → "Siglo Xxi"; "Aljafería" → "Aljaferia"); a veces hasta
 *  pierde una preposición ("Camino de Las Torres" → "Camino Las Torres"). Es un
 *  artefacto de export CONOCIDO, no una elección del operador.
 *
 *  ⭐ Y para la mitad de estos, la forma correcta NO es opinión: está EN EL PROPIO
 *     GTFS, en el `longName` de la línea ("La Cartuja - Puerta del Carmen"), que sí
 *     conserva el "del". El headsign es la copia rota; el nombre largo, la buena.
 *
 *  Se corrige. Fuente = GTFS; ortografía = correcta. Son TOPÓNIMOS de Zaragoza:
 *  la forma buena es un hecho comprobable (el callejero, la web del operador), no
 *  una opinión. Pero como reescribimos el texto, deja de ser una CITA literal:
 *  por eso en pantalla NO va en <Cita> (que marca lo verbatim) sino en <Toponimo>
 *  (que solo protege del traductor del navegador). Ver `components/Toponimo.tsx` y
 *  la nota en /sobre-los-datos.
 *
 *  ⚠️ Es un MAPA EXPLÍCITO, no un algoritmo: los acentos perdidos no se pueden
 *     reponer a ciegas (¿"jose" es "José" o "Jose"?). Cada entrada es una decisión
 *     con su forma correcta. Si el GTFS trae mañana un destino roto NUEVO, saldrá
 *     tal cual (degrada a lo feo, no a lo incorrecto) hasta que se añada aquí — un
 *     test lista los rotos conocidos para que no se cuele uno sin querer.
 *
 *  ⛔ LA 60 NO SE TOCA Y NO ESTÁ AQUÍ: su GTFS dice "Actur-Rey Fernando" y la web
 *     de Avanza dice "Valle de Broto". Es una divergencia REAL entre fuentes, no un
 *     ucwords. Antonio decidió mostrar el GTFS. Queda como CABO, sin inventar.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const CORRECCIONES: Readonly<Record<string, string>> = {
  'Siglo Xxi': 'Siglo XXI', // el peor: el numeral romano, roto por el ucwords
  Aljaferia: 'Aljafería',
  'Estacion Delicias': 'Estación Delicias',
  'Plaza Aragon': 'Plaza Aragón',
  'San Jose': 'San José',
  'Camino Las Torres': 'Camino de Las Torres', // le falta la preposición
  'Actur - Rey Fernando': 'Actur-Rey Fernando', // unifica: la 43 con espacios; 42/44/60 sin
  // ── Preposición/artículo capitalizados por el ucwords. La forma buena sale del
  //    `longName` de la línea, que sí la conserva en minúscula. (No se tocan "Las
  //    Torres" ni "La Cartuja": ahí "Las"/"La" son parte del nombre propio.)
  'Puerta Del Carmen': 'Puerta del Carmen',
  'Pinares De Venecia': 'Pinares de Venecia',
  'Rosales Del Canal': 'Rosales del Canal',
};

/** Aplica la corrección si el destino es un roto conocido; si no, lo deja igual. */
export function corregirDestino(bruto: string): string {
  const s = limpio(bruto);
  return CORRECCIONES[s] ?? s;
}

/**
 * El DESTINO de un sentido, como etiqueta limpia y CORREGIDA. Es lo que va en el
 * botón ("Hacia {destino}"), en el lado derecho de la flecha del título, y en la
 * home (los dos destinos de la tarjeta). Un solo sitio lo produce: así "Siglo XXI"
 * sale igual en las tres pantallas.
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
  const bruto = h.length > 0 && !loComparte ? h : s.ultimaParada;
  return corregirDestino(bruto);
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

/**
 * ⭐ LOS DOS DESTINOS (corregidos) de una línea de ida y vuelta, para la tarjeta de
 * la HOME: un renglón por destino, en vez del nombre largo que se parte donde cae.
 * `null` si la línea NO tiene dos extremos distintos (bucle, sentido único, o el
 * colapso de headsign) — esas se quedan con su nombre de siempre.
 *
 * El orden sigue el NOMBRE oficial: el extremo nombrado antes en el `longName` va
 * arriba ("Barrio Jesús" antes que "Miralbueno" en "Barrio Jesús - … - Miralbueno").
 * El que no aparezca en el nombre (una abreviatura que no casa) cae al final, sin
 * romperse: los dos destinos se enseñan igual, solo cambia cuál va arriba.
 *
 * ⚠️ NO decide si la línea es "diurna": eso es taxonomía (grupoDe), y lo filtra
 *    quien llama (la home lo aplica solo a las diurnas de doble sentido).
 */
export function dosDestinos(
  sentidos: readonly SentidoParaRumbo[],
  longName: string,
): readonly [string, string] | null {
  if (sentidos.length !== 2 || sentidos.some((s) => s.esBucle)) return null;
  const a = destinoDeSentido(sentidos[0], sentidos);
  const b = destinoDeSentido(sentidos[1], sentidos);
  if (a === b) return null; // sin dos destinos distintos (no debería pasar en diurnas)
  const idx = (d: string) => {
    const i = longName.toLowerCase().indexOf(d.toLowerCase());
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return idx(a) <= idx(b) ? [a, b] : [b, a];
}
