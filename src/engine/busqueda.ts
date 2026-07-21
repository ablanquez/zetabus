/**
 * ⭐ EL ÍNDICE DE BÚSQUEDA. Puro, sin React, para poder MEDIRLO en tests.
 *
 * EL PRINCIPIO (pasada 2): se MUESTRA la forma correcta, se ENCUENTRA por cualquier
 * forma razonable. Corregir un dato (—"Carlos Quinto" → "Carlos V"—) no puede
 * empeorar la búsqueda. Aquí vive todo lo que hace que teclear encuentre:
 *
 *   1) NORMALIZAR el texto a los dos lados (índice y consulta): minúsculas, sin
 *      acentos NI ñ (NFD + quita diacríticos → "peñaflor"="penaflor"), y expande
 *      las abreviaturas de callejero (av→avenida, pza→plaza, pº→paseo…).
 *   2) ALIAS por línea: palabras que NO se muestran pero SÍ se indexan, para cerrar
 *      lo que la normalización no puede —los NUMERALES ROMANOS—.
 *   3) PUNTUAR y ordenar, con el número de poste como señal más fuerte.
 *
 * ⚠️ POR QUÉ ALIAS Y NO UN SINÓNIMO GLOBAL "quinto→v": los romanos están por TODA
 *    la red en nombres de parada ("Juan Pablo II", "Pedro III", "L.V Beethoven",
 *    "V. Broto", "Juan Carlos I"…). Un "quinto→v" o "5→v" global haría que teclear
 *    "v", "5" o "quinto" arrastrara media red (Beethoven, Broto, portales n.º 5).
 *    Por eso el alias es QUIRÚRGICO: cuelga de la línea concreta que lo necesita, y
 *    de ninguna otra. "quinto" solo encuentra la 53; "v" a secas no encuentra nada.
 */

export interface Entrada {
  tipo: 'parada' | 'linea';
  clave: string;
  titulo: string;
  sub: string;
  /** Palabras que se INDEXAN pero no se muestran (p. ej. "quinto" para "Carlos V"). */
  alias?: string;
  /**
   * Los DESTINOS de la línea, para indexar (no se muestran). La mayoría ya están en
   * el `titulo` (el longName los nombra), pero las CIRCULARES se llaman "Circular N"
   * y no dicen a dónde van: sin esto, teclear "Paseo de la Ribera" no encontraba la
   * Ci4. Salen del mismo `destinoDeSentido` que la home y la botonera. Ver `page.tsx`.
   */
  destinos?: string;
  color?: string;
  colorTexto?: string;
  href: string;
}

/**
 * ⭐ ALIAS DE BÚSQUEDA POR LÍNEA. Cierran el hueco que dejan los numerales romanos
 * al escribirse (la gente teclea "quinto"/"5", "veintiuno"/"21"). Van SOLO en la
 * línea que los necesita, para no ensuciar "v"/"21"/"5" con falsos positivos. La
 * forma que se MUESTRA no cambia: sigue siendo "Carlos V", "Siglo XXI".
 */
export const ALIAS_LINEA: Readonly<Record<string, string>> = {
  '53': 'quinto', // "Plaza Emperador Carlos V" se teclea "Carlos Quinto"
  '23': 'veintiuno 21', // "Siglo XXI" → "siglo 21" / "siglo veintiuno" (además de "xxi")
};

// Abreviaturas de callejero. Se expanden a los DOS lados, así "avda"/"av." y
// "Avenida" caen en la misma palabra. (Ya venían de la referencia; se conservan.)
const ABREVIATURAS: [RegExp, string][] = [
  [/\bav(da?)?\.?\b/g, 'avenida'],
  [/\bc\/|\bcl\.?\b/g, 'calle'],
  [/\bpza?\.?\b|\bpl\.?\b/g, 'plaza'],
  [/\bp(º|so|seo)\.?\b/g, 'paseo'],
  [/\bctra\.?\b/g, 'carretera'],
  [/\bcno\.?\b|\bcmno\.?\b/g, 'camino'],
];

/** Minúsculas, sin acentos ni ñ, abreviaturas expandidas, espacios colapsados. */
export function normalizar(s: string): string {
  let t = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [re, con] of ABREVIATURAS) t = t.replace(re, con);
  return t.replace(/\s+/g, ' ').trim();
}

export interface Indexado {
  readonly e: Entrada;
  readonly n: string;
}

/** El índice: cada entrada con su texto normalizado (título + sub + clave + ALIAS + DESTINOS). */
export function indexar(entradas: readonly Entrada[]): Indexado[] {
  return entradas.map((e) => ({
    e,
    n: normalizar(`${e.titulo} ${e.sub} ${e.clave} ${e.alias ?? ''} ${e.destinos ?? ''}`),
  }));
}

export const MAX_RESULTADOS = 8;

/**
 * Busca `q` en el índice y devuelve hasta `max` entradas, ordenadas.
 *
 * PUNTOS (menor = mejor): 0 clave exacta · 1 clave por prefijo · 3 el nombre empieza
 * por la consulta · 4 el nombre la contiene · 6 contiene todas sus palabras sueltas.
 *
 * ⭐ DESEMPATE, y aquí está el arreglo de la 60: dentro del MISMO nivel de nombre
 *    (3+), una LÍNEA va antes que una parada. Sin esto, "avenida" enterraba la
 *    línea 60 bajo 335 paradas "Av. …" (estaba en el puesto #293). El desempate por
 *    LONGITUD que ya existía se conserva como último criterio. Las claves numéricas
 *    (poste/línea, niveles 0–1) NO se tocan: el número de poste sigue mandando.
 */
export function buscar(indice: readonly Indexado[], q: string, max: number = MAX_RESULTADOS): Entrada[] {
  const nq = normalizar(q);
  // Un solo carácter vale si es un dígito: "5" es un poste o una línea.
  if (nq.length < 2 && !/^\d$/.test(nq)) return [];

  const puntuar = (e: Entrada, n: string): number => {
    if (e.clave === nq) return 0;
    if (e.clave.startsWith(nq)) return 1;
    if (n.startsWith(nq)) return 3;
    if (n.includes(nq)) return 4;
    if (nq.split(' ').every((t) => n.includes(t))) return 6;
    return 99;
  };
  // Una línea, cuando ha casado POR NOMBRE (nivel 3+), sale antes que una parada.
  const preferencia = (e: Entrada, p: number): number => (p >= 3 && e.tipo === 'linea' ? 0 : 1);

  return indice
    .map(({ e, n }) => ({ e, p: puntuar(e, n) }))
    .filter((r) => r.p < 99)
    .sort(
      (a, b) =>
        a.p - b.p ||
        preferencia(a.e, a.p) - preferencia(b.e, b.p) ||
        a.e.titulo.length - b.e.titulo.length,
    )
    .slice(0, max)
    .map((r) => r.e);
}
