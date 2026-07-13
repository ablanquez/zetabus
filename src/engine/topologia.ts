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
import artefacto from '@/generated';

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
 * ⚠️ Los ceros se quitan SOLO si delante de un dígito. Una futura línea "0X" no
 *    se convertiría en "X" por accidente.
 */
export const canonLinea = (etiqueta: string): string =>
  etiqueta.trim().toUpperCase().replace(/^0+(?=\d)/, '');

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
