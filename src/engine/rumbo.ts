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
  /**
   * ⭐ DESTINO DE CAMPO (Antonio), si lo hay. Cuando el GTFS no basta —la cabecera
   * es una ZONA con barra que él conoce (21, 28), o el par de sentidos viene mal
   * (C1, C4)—, aquí llega ya resuelto el destino que MANDA sobre el `headsign`. Lo
   * pone la topología (que sabe la línea) vía `destinoDeCampo`. Ver más abajo.
   */
  readonly destino?: string;
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
  // Otro numeral, esta vez DELETREADO en el headsign ("Quinto"). La forma buena no
  // es opinión: la propia parada final se llama "Plaza Emperador Carlos V / Intercambiador".
  'Plaza Emperador Carlos Quinto': 'Plaza Emperador Carlos V',
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
  // ── Headsigns de CIRCULAR que se desvían del patrón "el barrio" (54-57 lo
  //    cumplen: su headsign ES el barrio). La forma buena sale del `longName`:
  'Fuente Junquera': 'Fuente de La Junquera', // 58 · le falta "de La"; el longName y la parada lo tienen
  'Tranvia-Arcosur': 'Arcosur', // 59 · el barrio (1er tramo del longName "Arcosur - Tranvía"), no "Tranvia-Arcosur"
};

/** Aplica la corrección si el destino es un roto conocido; si no, lo deja igual. */
export function corregirDestino(bruto: string): string {
  const s = limpio(bruto);
  return CORRECCIONES[s] ?? s;
}

/**
 * ⭐⭐ EL DESTINO DE CAMPO. Y ESTO CRUZA OTRA LÍNEA MÁS QUE `CORRECCIONES`:
 * arriba se arreglaba la ORTOGRAFÍA de lo que dice el GTFS; aquí el GTFS dice algo
 * DISTINTO de lo que es, y manda el CONOCIMIENTO DE ANTONIO. Es una decisión suya,
 * apuntada como tal, no una limpieza.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Dos motivos, los dos de campo:
 *
 *  1) LA BARRA NO SEPARA DESTINOS: nombra UNA zona. La cabecera de la 21 es la zona
 *     «Oliver / Miralbueno» (el GTFS solo pone «Miralbueno»); la de la 28 es
 *     «Montañana / Peñaflor» (el GTFS solo pone «Peñaflor»). No son dos destinos:
 *     son uno con dos barrios. ⛔ NUNCA se parte por la barra.
 *
 *  2) EL PAR DE SENTIDOS VIENE MAL (las lanzaderas C1 y C4). El `trip_headsign`
 *     llega truncado («Complejo») o mal capitalizado («Plaza Canteras», «Plaza De
 *     Las Canteras»), y el emparejamiento de sentidos del GTFS no es de fiar aquí.
 *     Antonio da el par bueno y ese manda.
 *
 *  ⚠️ SE INDEXA POR (línea, headsign BRUTO), NO por directionId. El `directionId`
 *     del GTFS puede intercambiarse entre exports —es justo el «a veces intercambia
 *     nombres» que teme Antonio—; el texto del headsign es estable. Así, aunque el
 *     feed gire los sentidos, «Miralbueno» de la 21 sigue resolviendo a la zona.
 *
 *  ⚠️ Como en `CORRECCIONES`, el resultado ya NO es una cita literal: en pantalla
 *     va en <Toponimo> (protege del traductor) y no en <Cita>.
 *
 *  ⛔ Antonio recordaba que «la C1 solo tenía sentido -1»: el GTFS de hoy trae los
 *     DOS. No pasa nada —igualmente pisamos ambos con su par—, pero queda anotado
 *     que la fuente cambió desde que lo miró.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const DESTINO_DE_CAMPO: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  '21': { Miralbueno: 'Oliver / Miralbueno' }, // la cabecera es la zona, no solo Miralbueno
  '28': { Peñaflor: 'Montañana / Peñaflor' },
  // "Plaza de Las Canteras" con "Las" en MAYÚSCULA: Antonio corrige su propio string
  // para casar con "Las Fuentes"/"Las Torres", donde "Las" es nombre propio. La misma
  // forma va en el `longName` de C1/C4 (que ya la trae así) — un solo sitio del sitio.
  C1: { Complejo: 'Complejo Funerario', 'Plaza Canteras': 'Plaza de Las Canteras' },
  C4: { 'Plaza De Las Canteras': 'Plaza de Las Canteras' }, // el otro sentido («Puerto Venecia») ya está bien
};

/**
 * El destino de campo para (línea, headsign bruto), o `undefined` si no hay. Lo
 * llama la topología al armar cada sentido, porque es allí donde se sabe la línea.
 */
export function destinoDeCampo(shortName: string, headsignBruto: string): string | undefined {
  return DESTINO_DE_CAMPO[shortName]?.[limpio(headsignBruto)];
}

/**
 * ⭐ EL NOMBRE LARGO (`route_long_name`), corregido. El MISMO `ucwords()` que rompió
 * paradas y destinos tocó también este campo, pero mucho menos: de las 44 líneas,
 * 34 vienen bien (los acentos y las preposiciones YA están; el ucwords se cebó con
 * los headsigns, no con esto). Solo 8 estaban rotas, y Antonio marcó a mano cuáles.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Se indexa por la CADENA CRUDA COMPLETA (no por trozos): cada entrada es una línea
 *  concreta, revisada. La forma buena de cada una NO es opinión —sale de otro dato
 *  del propio proyecto (auditoría en `docs/AUDITORIA_NOMBRES_LARGOS.md`)—:
 *
 *   · 34 · acento comido        (destino ya corregido + longName de la 51 + parada)
 *   · 44 · guion perdido        (longName de la 42/43 "Actur-Rey Fernando")
 *   · 53 · romano deletreado    (parada "Plaza Emperador Carlos V / Intercambiador")
 *   · 60 · abreviatura + guion  (destino "Avenida Estudiantes"; doble espacio de paso)
 *   · 28 · espaciado de barra   (destino de campo "Montañana / Peñaflor")
 *   · 21 · el 2.º guion es zona  (destino de campo "Oliver / Miralbueno")
 *
 *  ⚠️ C1/C4 NO ESTÁN AQUÍ: su longName ya trae "Plaza de Las Canteras" bien (con
 *     "Las" mayúscula). Lo que se corrige de ellas es el DESTINO_DE_CAMPO, para que
 *     case con el longName (ver arriba). Un solo sitio nombra el sitio.
 *
 *  ⚠️ Y LAS BARRAS NO SE PARTEN (21, 28): "Oliver / Miralbueno" es UNA zona. El
 *     longName corregido las lleva, alineado con el destino.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const NOMBRES_LARGOS: Readonly<Record<string, string>> = {
  'Estacion Delicias - Cementerio': 'Estación Delicias - Cementerio',
  'Estación Miraflores - Actur Rey Fernando': 'Estación Miraflores - Actur-Rey Fernando',
  'Plaza Emperador Carlos Quinto - Miralbueno': 'Plaza Emperador Carlos V - Miralbueno',
  'Avda Estudiantes -  Actur Rey Fernando': 'Avenida Estudiantes - Actur-Rey Fernando',
  'Coso - Montañana/Peñaflor': 'Coso - Montañana / Peñaflor',
  'Barrio Jesús - Oliver - Miralbueno': 'Barrio Jesús - Oliver / Miralbueno',
};

/** El nombre largo corregido si es un roto conocido; si no, igual. Lo aplica la
 *  topología una vez, al exponer las líneas, para que todo lea la forma buena. */
export function corregirNombreLargo(bruto: string): string {
  const s = limpio(bruto);
  return NOMBRES_LARGOS[s] ?? s;
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
  // ⭐ El destino de campo (Antonio) manda sobre todo: es una decisión, no el GTFS.
  if (s.destino !== undefined) return s.destino;
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
    // "Circular por {barrio}". El headsign también pasa por la corrección: la 58
    // llegaba "Fuente Junquera" y la 59 "Tranvia-Arcosur" (ver CORRECCIONES).
    return { tipo: 'circular', por: corregirDestino(limpio(activo.headsign) || activo.ultimaParada) };
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
  // El orden lo da el nombre, pero SIN acentos: el `longName` a veces conserva la
  // forma rota ("Estacion Delicias") mientras el destino ya va corregido ("Estación
  // Delicias"). Comparar a pelo no casaría y mandaría el 1º al fondo por un acento.
  const plano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const long = plano(longName);
  const idx = (d: string) => {
    const i = long.indexOf(plano(d));
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return idx(a) <= idx(b) ? [a, b] : [b, a];
}
