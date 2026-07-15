/**
 * NUESTRA TOPOLOGÍA. La que sale del GTFS oficial, horneada en el build.
 *
 * Este fichero es el que hace posible una cosa que la fuente viva NO permite:
 * distinguir un poste que no existe de un poste sin autobuses.
 *
 * ⚠️ MEDIDO EL 13/07/2026 CONTRA gps.avanzabus.com:
 *
 *     poste 264     VÁLIDO (desviado)  →  HTTP 200   {"tablatiempos":""}
 *     poste 999999  NO EXISTE          →  HTTP 200   {"tablatiempos":""}
 *     poste "abc"   BASURA             →  HTTP 200   {"tablatiempos":""}
 *
 * Los tres, byte por byte, la misma respuesta. La API **no distingue** un poste
 * inválido de uno sin servicio, así que NOSOTROS no podemos distinguirlos
 * DESPUÉS de preguntar. No hay parser que arregle eso: la información no está.
 *
 * ⭐ Por eso la validación va ANTES, y contra nuestros propios datos:
 *
 *     poste ∉ GTFS  →  `desconocido`. Y NI SE PREGUNTA a Avanza.
 *     poste ∈ GTFS  →  se pregunta. Si viene vacío, "sin llegadas ahora"
 *                      YA SIGNIFICA ALGO, porque el poste existe de verdad.
 *
 * De propina: cero peticiones desperdiciadas con entrada basura, que es lo
 * mínimo que se le debe a un servicio ajeno del que estamos viviendo.
 *
 * ⚠️ LO QUE SIGUE SIN PODERSE DISTINGUIR, Y SE DICE:
 * un poste que está en el GTFS pero que el sistema de Avanza no conoce (una
 * parada nueva, por ejemplo) devuelve vacío igual que uno sin autobuses. Ese
 * caso residual NO es detectable con ninguna fuente que tengamos. No se
 * inventa: se calla y se enseña "sin llegadas previstas", que es cierto.
 */

import type { BusProfile } from '@/modes/bus/profile';
import {
  lineId as haceLineId,
  stopId as haceStopId,
  type FeedValidity,
  type Line,
  type LineId,
  type Stop,
  type StopId,
} from '@/core';
import type { SalidaDeTerminal, TerminalDeSentido, TipoDeDia } from '@/sources/gtfs-nap/terminal';
import type { SentidoParaRumbo } from '@/engine/rumbo';
import artefacto from '@/generated';

export type { SalidaDeTerminal, TerminalDeSentido, TipoDeDia };

interface Artefacto {
  readonly generatedAt: string;
  readonly validity: FeedValidity;
  readonly stops: Stop[];
  readonly lines: Line[];
  readonly directions: {
    lineId: string; directionId: 0 | 1; headsign: string;
    official: { stops: string[]; geometry: { lat: number; lon: number }[] };
  }[];
  readonly posteByStopId: Record<string, number>;
  readonly flota: Record<string, BusProfile>;
  readonly terminales?: TerminalDeSentido[];
  readonly fechasDeReferencia?: Record<TipoDeDia, string | null>;
}

const A = artefacto as unknown as Artefacto;

/**
 * La etiqueta de una línea, en forma canónica.
 *
 * Avanza la escribe "039" y "CI2". El GTFS la escribe "39" y "Ci2".
 * Son la misma línea. Comparar las cadenas a pelo las da por distintas, y el
 * bus se queda sin color, sin enlace y sin nombre — en silencio.
 *
 *     "039" → "39"      ceros a la izquierda: fuera
 *     "CI2" → "CI2"     mayúsculas: se igualan las dos partes
 *     "Ci2" → "CI2"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⛔ AQUÍ ESTABA EL "0C1". Y NO ERA UN FALLO DE PINTADO: ERA ÉSTE.
 *
 * La versión anterior quitaba los ceros SOLO si el carácter siguiente era un
 * DÍGITO:  `.replace(/^0+(?=\d)/, '')`
 *
 * Es decir: trataba la etiqueta de línea COMO SI FUERA UN NÚMERO. Y "C1" no es
 * un número. Resultado, medido contra Avanza el 14/07/2026 (postes 730 y 1040):
 *
 *     Avanza manda ......... "0C1"      GTFS tiene ......... "C1"
 *     canonLinea("0C1") → "0C1"    ≠    canonLinea("C1") → "C1"
 *
 * ⇒ NO CASABAN. Y las consecuencias no eran cosméticas:
 *      · el autobús salía con la etiqueta "0C1" en vez de "C1"
 *      · SIN COLOR de línea y SIN ENLACE (no había GTFS que enganchar)
 *      · y con un AVISO FALSO: "la línea 0C1 está circulando pero no existe en
 *        el GTFS". Un aviso falso enseña a ignorar los avisos. Ése es el daño.
 *
 * ⭐ POR QUÉ EL CERO ESTÁ AHÍ, Y NO ES UNA RAREZA DE LA API:
 *
 * El operador codifica la línea en TRES caracteres, rellenando con ceros:
 *     "21" → "021"      "C1" → "0C1"      "CI1" → "CI1" (ya mide 3)
 *
 * Y no es una suposición: **el propio GTFS lo hace**. Sus `service_id` son
 * `021008L_02101_`, `0C1003F_0C1E1_`, `CI1008F_CI101_`. El relleno es del
 * OPERADOR, no de la API. Por eso la regla correcta es quitar el relleno, sin
 * mirar qué viene detrás.
 *
 * (La referencia llegó a lo mismo por el camino corto: `raw.replace(/^0+/,"")`.)
 *
 * ⚠️ EL SUPUESTO QUE ESTO ASUME, DICHO EN VOZ ALTA: que ninguna línea del GTFS
 *    empieza por cero. Si un día la hubiera, "0X" se convertiría en "X" y
 *    volveríamos a tener el mismo lío al revés. NO se confía en que alguien se
 *    acuerde: el test `ninguna línea del GTFS empieza por 0` se pone rojo.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El `|| etiqueta` del final protege el caso degenerado: una etiqueta que sea
 * TODO ceros ("000") no puede convertirse en la cadena vacía.
 */
export const canonLinea = (etiqueta: string): string => {
  const s = etiqueta.trim().toUpperCase();
  return s.replace(/^0+/, '') || s;
};

// ── Índices, construidos una vez al cargar el módulo ─────────────────────────

const paradaPorId = new Map<string, Stop>(A.stops.map((s) => [String(s.id), s]));
const lineaPorId = new Map<string, Line>(A.lines.map((l) => [String(l.id), l]));

const posteDeParada = new Map<string, number>(Object.entries(A.posteByStopId));
/** El puente al revés. Es el que valida la entrada del usuario. */
const paradaDePoste = new Map<number, StopId>(
  Object.entries(A.posteByStopId).map(([sid, poste]) => [poste, haceStopId(sid)]),
);

const lineaPorCanon = new Map<string, Line>();
for (const l of A.lines) {
  const c = canonLinea(l.shortName);
  // Si dos líneas del GTFS colapsan al mismo canon, la comparación insensible
  // sería ambigua y estaríamos coloreando buses al azar. Preferimos saberlo.
  if (lineaPorCanon.has(c)) {
    throw new Error(
      `Dos líneas del GTFS comparten forma canónica "${c}": ` +
        `"${lineaPorCanon.get(c)!.shortName}" y "${l.shortName}". ` +
        'La comparación insensible a mayúsculas y ceros dejaría de ser unívoca.',
    );
  }
  lineaPorCanon.set(c, l);
}

/** Paradas de cada sentido, en orden. La ruta OFICIAL (la del GTFS). */
const sentidosPorLinea = new Map<string, Artefacto['directions']>();
for (const d of A.directions) {
  const lista = sentidosPorLinea.get(d.lineId) ?? [];
  lista.push(d);
  sentidosPorLinea.set(d.lineId, lista);
}

// ── La interfaz pública ──────────────────────────────────────────────────────

export const validez = A.validity;
export const generadoEn = A.generatedAt;
export const lineas = (): readonly Line[] => A.lines;
export const paradas = (): readonly Stop[] => A.stops;
export const sentidosDe = (id: LineId) => sentidosPorLinea.get(String(id)) ?? [];
export const parada = (id: StopId): Stop | null => paradaPorId.get(String(id)) ?? null;

/**
 * ⭐ LOS SENTIDOS, listos para calcular el RUMBO (origen → destino / circular).
 *
 * Resuelve los NOMBRES de la primera y la última parada de cada sentido y marca
 * si es un bucle (primera parada === última). Lo hace AQUÍ, un solo sitio, para
 * que la página y los tests partan del mismo dato. Ver `engine/rumbo.ts`.
 */
export function sentidosParaRumbo(id: LineId): SentidoParaRumbo[] {
  const nombre = (sid: string): string => paradaPorId.get(sid)?.name ?? sid;
  return sentidosDe(id).map((d) => {
    const st = d.official.stops;
    return {
      directionId: d.directionId,
      headsign: d.headsign,
      primeraParada: st.length > 0 ? nombre(st[0]) : '',
      ultimaParada: st.length > 0 ? nombre(st[st.length - 1]) : '',
      esBucle: st.length > 0 && st[0] === st[st.length - 1],
    };
  });
}
export const linea = (id: LineId): Line | null => lineaPorId.get(String(id)) ?? null;
export const posteDe = (id: StopId): number | null => posteDeParada.get(String(id)) ?? null;

/**
 * ⭐ EL GUARDIA DE LA ENTRADA. `null` = ese poste NO ES NUESTRO.
 * Todo lo que entra por la URL pasa por aquí antes de que Avanza se entere.
 */
export function paradaDelPoste(poste: unknown): StopId | null {
  let n: number;
  if (typeof poste === 'number') {
    n = poste;
  } else {
    const s = String(poste ?? '').trim();
    // ⚠️ SE EXIGEN DÍGITOS. No "algo que JavaScript sepa convertir en número".
    //
    // `Number()` es demasiado servicial y acepta cosas que NADIE escribe a mano:
    //     Number("")      → 0        el vacío se cuela como poste 0
    //     Number("1e3")   → 1000     notación científica
    //     Number("0x2E8") → 744      ⭐ hexadecimal: /api/llegadas/0x2E8 te
    //                                servía Plaza San Miguel. Lo cazó el test
    //                                de basura de la URL, no yo.
    //     Number("\n744") → 744      espacios de todo tipo
    //
    // Ninguna es peligrosa por sí sola, pero todas significan lo mismo: la
    // entrada NO era la que creíamos y el motor siguió adelante tan tranquilo.
    // Eso es exactamente lo que no queremos que ocurra en ninguna capa.
    if (!/^\d+$/.test(s)) return null;
    n = Number(s);
  }
  if (!Number.isInteger(n) || n <= 0) return null;
  return paradaDePoste.get(n) ?? null; // y además TIENE QUE EXISTIR en el GTFS
}

/** `null` = una línea que el GTFS no conoce. NO se descarta el bus: se anota. */
/** El nombre de la parada de ese poste. Para poder decir "llega a X en N min". */
export function nombreDePoste(poste: number): string {
  const sid = paradaDePoste.get(poste);
  const p = sid ? paradaPorId.get(String(sid)) : undefined;
  return p?.name ?? `poste ${poste}`;
}

export function lineaDeEtiqueta(cruda: string): Line | null {
  return lineaPorCanon.get(canonLinea(cruda)) ?? null;
}

/**
 * El perfil del vehículo. `null` = **SIN DATOS**, y así se enseña.
 *
 * ⚠️ NUNCA un valor por defecto. El registro oficial cubre el 87% de lo que
 * circula, porque un autobús nuevo aparece en la calle antes que en un
 * documento. Rellenar el 13% restante con "sencillo, 12 m" sería inventarse
 * los datos justo donde no los tenemos — y con toda la confianza del mundo.
 */
export function perfilDe(coche: string): BusProfile | null {
  return A.flota[coche] ?? null;
}

export const idLinea = haceLineId;
export const idParada = haceStopId;

// ─────────────────────────────────────────────────────────────────────────────
//  ⭐ LOS TRANSBORDOS. Clonado de la referencia, y es ORO PURO.
//
//  En su itinerario, cada parada lleva los chips de LAS OTRAS LÍNEAS que pasan
//  por ahí. Lo medí jugando con ella: la línea 21 tiene 34 paradas y **61 chips
//  de transbordo**. Te dice dónde cambiar de línea SIN SALIR DEL ITINERARIO.
//
//  ⚠️ Y no lo vi leyendo su código. Solo se ve pulsando. Es la L7 otra vez: leí
//     una capa (el CSS), medí otra (la geometría), y nunca usé la tercera (la
//     interacción). Lo mejor de su pantalla vivía justo ahí.
// ─────────────────────────────────────────────────────────────────────────────

const lineasPorParada = new Map<string, Set<string>>();
for (const d of A.directions) {
  for (const sid of d.official.stops) {
    let s = lineasPorParada.get(sid);
    if (!s) { s = new Set(); lineasPorParada.set(sid, s); }
    s.add(d.lineId);
  }
}

/** Las OTRAS líneas que pasan por esta parada. Sin la actual. Ordenadas. */
export function transbordosDe(paradaId: StopId, exceptoLinea: LineId): readonly Line[] {
  const ids = lineasPorParada.get(String(paradaId));
  if (!ids) return [];
  return [...ids]
    .filter((id) => id !== String(exceptoLinea))
    .map((id) => lineaPorId.get(id))
    .filter((l): l is Line => l !== undefined)
    .sort((a, b) => a.shortName.localeCompare(b.shortName, 'es', { numeric: true }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  ⭐ LOS GRUPOS DE LÍNEA. También clonado: Diurnas / Lanzaderas / Circulares /
//  Búhos. Su índice los agrupa así y es la manera correcta de leer 44 líneas.
// ─────────────────────────────────────────────────────────────────────────────

export type GrupoLinea = 'diurna' | 'lanzadera' | 'circular' | 'buho';

export const GRUPOS: { readonly clave: GrupoLinea; readonly titulo: string; readonly nota: string }[] = [
  { clave: 'diurna', titulo: 'Diurnas', nota: 'las de todos los días' },
  { clave: 'circular', titulo: 'Circulares', nota: 'dan la vuelta: un solo sentido' },
  { clave: 'lanzadera', titulo: 'Lanzaderas', nota: 'refuerzo puntual' },
  { clave: 'buho', titulo: 'Búhos', nota: 'de madrugada' },
];

export function grupoDe(l: Line): GrupoLinea {
  const s = l.shortName;
  if (/^N/i.test(s)) return 'buho';
  if (/^Ci/i.test(s)) return 'circular';
  if (/^C\d/i.test(s)) return 'lanzadera';
  return 'diurna';
}

/**
 * ⭐ ¿Es una línea nocturna? La pregunta que responde LA INVERSIÓN del chip (D1).
 *
 * Vive aquí, y no en el componente, para que **haya un solo sitio que lo decida**.
 * Si el chip de la lista, el del itinerario y el del índice lo dedujeran cada uno
 * por su cuenta con su propia expresión regular, bastaría con que uno se
 * despistase para que una N7 saliera pintada de diurna en una pantalla y de búho
 * en otra. Ése es exactamente el fallo del "0C1", con otro traje.
 */
export const esBuho = (l: Line): boolean => grupoDe(l) === 'buho';

// ─────────────────────────────────────────────────────────────────────────────
//  ⭐ C5 · FUNCIONAMIENTO DE TERMINAL. Primeras y últimas salidas por tipo de día.
//
//  ⚠️ SE COMPROBÓ QUE EL DATO EXISTE ANTES DE PROMETERLO: sale de stop_times
//  (870.718 filas) + trips + calendar_dates, horneado en el build. Y NO de
//  clasificar `service_id` por su nombre: el feed tiene dos convenciones y una de
//  ellas hace circular "domingos y festivos" un martes — porque un festivo CAE en
//  martes. Se evalúa una fecha concreta del propio feed. Ver `terminal.ts`.
// ─────────────────────────────────────────────────────────────────────────────

const terminalPorSentido = new Map<string, TerminalDeSentido>();
for (const t of A.terminales ?? []) {
  terminalPorSentido.set(`${t.lineId}|${t.directionId}`, t);
}

/** `null` = ese sentido no tiene horario en el feed. Se calla, no se inventa. */
export function terminalDe(id: LineId, directionId: 0 | 1): TerminalDeSentido | null {
  return terminalPorSentido.get(`${String(id)}|${directionId}`) ?? null;
}

/** Las fechas del feed que se han usado como día representativo. Son auditables. */
export const fechasDeReferencia = A.fechasDeReferencia ?? { laborable: null, sabado: null, festivo: null };
