/**
 * EL PARSER DEL POSTE. HTML DE VERDAD, NO EXPRESIONES REGULARES.
 *
 * ⚠️ POR QUÉ NO UN REGEX — Y NO ES DOGMA, ES UNA CICATRIZ:
 * el proyecto viejo leía este HTML con regex. El día que Avanza cambiara una
 * clase CSS, `tiempoMin` habría pasado a `null` EN SILENCIO. Habría seguido
 * pintando la pantalla, con menos buses, sin decir nada. Degradar en silencio
 * es peor que caerse: caerse se ve.
 *
 * Y hay una razón técnica encima. Esto es lo que manda Avanza, LITERAL:
 *
 *     <strong>039
 *         <i class="fa fa-long-arrow-right fa-fw"></i>VADORREY
 *     </strong>
 *
 * `.text` de ese nodo devuelve "039VADORREY": PEGADOS, sin separador, porque el
 * <i> no aporta texto. Un regex que parta por espacios se come el destino o se
 * lleva la línea de propina. Con un árbol de verdad se recorren los nodos de
 * TEXTO por separado y el problema no existe. Esa es la diferencia, en una línea.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⭐ Y AQUÍ ESTÁ EL REGALO: LA FUENTE TRAE SU PROPIO CONTADOR DE CONTROL (L1).
 *
 * El mismo hecho —"el coche 4650 viene hacia aquí"— viaja por TRES canales
 * independientes dentro de la misma respuesta:
 *
 *   1. tablatiempos → href  ".../fParadas/744/4650"     (estructura)
 *   2. tablatiempos → texto "4650 [3 mins]"             (texto)
 *   3. maquinas[i].title    "039 4650"  + coordenadas   (otro objeto, otro JSON)
 *
 * L1 dice que un extractor necesita un contador INDEPENDIENTE, y que contar con
 * el mismo método con el que extraes no verifica nada. Aquí no hay que
 * inventárselo: se cruzan los canales.
 *
 *     conjunto de coches en tablatiempos  ==  conjunto de coches en maquinas
 *
 * Si Avanza cambia una clase CSS, un canal se queda a cero y el otro no → los
 * conjuntos dejan de cuadrar → GRITAMOS. No es una heurística sobre el aspecto
 * del HTML: es una contradicción interna de la propia respuesta.
 *
 * ⚠️ HASTA DÓNDE LLEGA LA PRUEBA: el invariante se ha verificado en 20 postes
 * reales el 13/07/2026 (20/20, cero descuadres, 41 bloques línea+destino).
 * n=20 NO ES "siempre". Por eso un descuadre NO tumba el proceso: marca la
 * lectura como `ilegible`, que se enseña como "no hemos podido leerlo" y NUNCA
 * como "no hay autobuses". Si algún día resulta que hay un caso legítimo de
 * descuadre, lo veremos en los avisos antes de haberle mentido a nadie.
 */

import { parse, type HTMLElement } from 'node-html-parser';
import type { LatLon } from '@/core';

/** Un vehículo anunciado hacia el poste. Sin interpretar, sin traducir. */
export interface LlegadaCruda {
  /** Tal cual viene: "039", "CI2". La traducción al GTFS es otro paso. */
  readonly lineaCruda: string;
  readonly destino: string;
  readonly coche: string;
  readonly etaMinutos: number;
}

export interface VehiculoCrudo {
  readonly coche: string;
  readonly lineaCruda: string;
  /**
   * ⚠️ `null` = SIN COORDENADAS = **EL BUS NO SE PINTA**.
   * NUNCA `?? 0`. El proyecto viejo hacía eso y mandaba los autobuses de
   * Zaragoza al golfo de Guinea (0,0), donde se veían tan campantes.
   */
  readonly posicion: LatLon | null;
}

export interface LecturaPoste {
  readonly llegadas: readonly LlegadaCruda[];
  readonly vehiculos: readonly VehiculoCrudo[];
  /** El marcador de la propia parada. NO es un autobús. */
  readonly marcadorParada: LatLon | null;
  readonly avisos: readonly string[];
}

export class PosteIlegible extends Error {
  constructor(readonly motivo: string, readonly detalle?: string) {
    super(`No se puede leer la respuesta del poste: ${motivo}${detalle ? ` · ${detalle}` : ''}`);
    this.name = 'PosteIlegible';
  }
}

/** El icono es lo que DECLARA qué es cada `maquina`. No se adivina por el título. */
const ICONO_BUS = 'bus.png';
const ICONO_PARADA = 'bus_rojo.png';

const nombreIcono = (u: unknown): string => String(u ?? '').split('/').pop() ?? '';

/** Texto de los hijos directos que SON texto. Ignora los <i> decorativos. */
function nodosDeTexto(el: HTMLElement): string[] {
  return el.childNodes
    .filter((n) => n.nodeType === 3)
    .map((n) => n.rawText.replace(/&nbsp;?/gi, ' ').trim())
    .filter((s) => s.length > 0);
}

function coordenada(m: Record<string, unknown>): LatLon | null {
  const c = (m.coordenadas as Record<string, { LAT?: unknown; LON?: unknown }> | undefined)?.['0'];
  const lat = Number(c?.LAT);
  const lon = Number(c?.LON);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  // ⚠️ NULL ISLAND. (0,0) está en el golfo de Guinea. Un autobús de Zaragoza que
  //    aparece ahí no es un dato: es un hueco que alguien rellenó con un cero.
  if (lat === 0 && lon === 0) return null;
  return { lat, lon };
}

// ─────────────────────────────────────────────────────────────────────────────

export function parsearPoste(cuerpo: string): LecturaPoste {
  // 1 · ¿Es JSON siquiera? Si Avanza sirve una página de error, un mantenimiento
  //     o un captcha del WAF, aterriza aquí. Y GRITA.
  //     ⚠️ NO se puede filtrar por Content-Type: la respuesta BUENA viene como
  //        `text/html; charset=UTF-8` aunque sea JSON. Medido, no supuesto.
  let raiz: Record<string, unknown>;
  try {
    raiz = JSON.parse(cuerpo) as Record<string, unknown>;
  } catch {
    const pista = cuerpo.trimStart().slice(0, 60).replace(/\s+/g, ' ');
    throw new PosteIlegible('la fuente no ha devuelto JSON', `empieza por: "${pista}"`);
  }
  if (raiz === null || typeof raiz !== 'object' || Array.isArray(raiz)) {
    throw new PosteIlegible('la fuente ha devuelto un JSON que no es un objeto');
  }
  // `tablatiempos` es la ÚNICA clave que sale siempre, incluso en un poste mudo.
  // Si falta, la respuesta no es la que creemos que es.
  if (!('tablatiempos' in raiz)) {
    throw new PosteIlegible('falta la clave `tablatiempos`',
      `claves recibidas: ${Object.keys(raiz).join(', ') || '(ninguna)'}`);
  }

  const avisos: string[] = [];

  // ── 2 · maquinas: el mapa. Un marcador de parada + N autobuses ─────────────
  const maquinas = (raiz.maquinas ?? {}) as Record<string, Record<string, unknown>>;
  const vehiculos: VehiculoCrudo[] = [];
  let marcadorParada: LatLon | null = null;

  for (const [clave, m] of Object.entries(maquinas)) {
    const icono = nombreIcono(m.icon);

    // ⚠️ LA TRAMPA CONOCIDA: maquinas["0"] NO ES UN BUS, ES LA PARADA.
    //    Y NO se filtra por la clave "0" —eso sería filtrar por suerte—, sino
    //    por lo que la respuesta DECLARA: el icono.
    if (icono === ICONO_PARADA) {
      marcadorParada = coordenada(m);
      continue;
    }
    if (icono !== ICONO_BUS) {
      // Un icono que no conocemos. NO lo tiramos en silencio: eso es justo lo
      // que hace que aparezca menos gente en pantalla sin que nadie se entere.
      avisos.push(`maquinas["${clave}"]: icono desconocido "${icono || '(vacío)'}" — ignorado y anotado`);
      continue;
    }

    // title = "039 4650"  →  línea + coche. Dos campos, un espacio.
    const titulo = String(m.title ?? '').trim();
    const partes = titulo.split(/\s+/);
    if (partes.length !== 2) {
      throw new PosteIlegible(`maquinas["${clave}"]: el título de un autobús no es "<línea> <coche>"`,
        `recibido: "${titulo}"`);
    }
    const posicion = coordenada(m);
    if (posicion === null) {
      // El bus existe (viene en tablatiempos) pero no sabemos dónde está.
      // Se conserva la LLEGADA y se pierde el PUNTO. Nunca al revés, y nunca a (0,0).
      avisos.push(`coche ${partes[1]}: sin coordenadas válidas — no se pintará en el mapa`);
    }
    vehiculos.push({ coche: partes[1], lineaCruda: partes[0], posicion });
  }

  // ── 3 · tablatiempos: el canal limpio, ya agrupado por línea y destino ─────
  const tabla = String(raiz.tablatiempos ?? '');
  const llegadas: LlegadaCruda[] = [];

  if (tabla.trim() !== '') {
    // Fragmento de <li>, sin documento que lo envuelva. `parse` lo admite.
    const arbol = parse(`<ul>${tabla}</ul>`);
    const raizUl = arbol.querySelector('ul');
    // ⚠️ Los <li> de PRIMER NIVEL, y solo esos. Dentro de cada bloque hay otro
    //    <ul> con sus propios <li> (las filas de llegada), y un selector como
    //    `ul > li` casa CON LOS DOS. Se recorren los hijos directos y no hay
    //    ambigüedad que valga. (Y sí: caí en ello. Lo cazó este mismo parser,
    //    gritando, en lugar de devolverme media lista y una pantalla creíble.)
    const bloques = (raizUl?.childNodes ?? []).filter(
      (n): n is HTMLElement => n.nodeType === 1 && (n as HTMLElement).rawTagName?.toLowerCase() === 'li',
    );
    if (bloques.length === 0) {
      throw new PosteIlegible('`tablatiempos` trae contenido pero no hay ni un <li>',
        'la estructura del HTML ha cambiado');
    }

    for (const bloque of bloques) {
      const cabecera = bloque.querySelector('strong');
      if (!cabecera) {
        throw new PosteIlegible('un bloque de `tablatiempos` no tiene <strong> con la línea y el destino',
          'la estructura del HTML ha cambiado');
      }
      // ⭐ Aquí es donde el árbol gana al regex: dos nodos de texto hermanos,
      //    separados por un <i> que no aporta nada.
      const trozos = nodosDeTexto(cabecera);
      if (trozos.length < 2) {
        throw new PosteIlegible('el <strong> no trae línea Y destino como nodos de texto separados',
          `contenido: "${cabecera.text.replace(/\s+/g, ' ').trim().slice(0, 50)}"`);
      }
      const lineaCruda = trozos[0];
      const destino = trozos.slice(1).join(' ').replace(/\s+/g, ' ').trim();

      const filas = bloque.querySelectorAll('ul li a');
      for (const a of filas) {
        // CANAL 1 (estructura): el coche va DENTRO del href.
        const href = a.getAttribute('href') ?? '';
        const enHref = /\/fParadas\/\d+\/(\d+)\s*$/.exec(href.trim())?.[1];
        // CANAL 2 (texto): "4650 [3 mins]"
        const texto = a.text.replace(/\s+/g, ' ').trim();
        const enTexto = /^(\d+)\s*\[\s*(-?\d+)\s*min/i.exec(texto);

        if (!enHref || !enTexto) {
          throw new PosteIlegible('una fila de llegada no tiene la forma esperada',
            `href="${href.slice(0, 50)}" texto="${texto.slice(0, 40)}"`);
        }
        // ⭐ EL CRUCE, FILA A FILA: el número del enlace y el del texto son la
        //    misma cosa dicha dos veces. Si no coinciden, la respuesta se
        //    contradice a sí misma y no nos la creemos.
        if (enHref !== enTexto[1]) {
          throw new PosteIlegible('el coche del enlace no coincide con el del texto',
            `href dice ${enHref}, texto dice ${enTexto[1]}`);
        }
        const eta = Number(enTexto[2]);
        if (!Number.isInteger(eta) || eta < 0 || eta > 240) {
          throw new PosteIlegible(`tiempo de llegada fuera de rango: ${eta} min`, `coche ${enHref}`);
        }
        llegadas.push({ lineaCruda, destino, coche: enHref, etaMinutos: eta });
      }
    }
  }

  // ── 4 · ⭐ EL CONTADOR DE CONTROL (L1): dos canales, un solo hecho ─────────
  const enTabla = new Set(llegadas.map((l) => l.coche));
  const enMapa = new Set(vehiculos.map((v) => v.coche));
  const soloTabla = [...enTabla].filter((c) => !enMapa.has(c));
  const soloMapa = [...enMapa].filter((c) => !enTabla.has(c));

  if (soloTabla.length > 0 || soloMapa.length > 0) {
    throw new PosteIlegible(
      'la respuesta se contradice: `tablatiempos` y `maquinas` no anuncian los mismos autobuses',
      `solo en tablatiempos: [${soloTabla.join(', ') || '—'}] · solo en maquinas: [${soloMapa.join(', ') || '—'}]. ` +
        'O ha cambiado el HTML de Avanza, o el parser ha perdido filas en silencio. Ver docs/LECCIONES.md · L1.',
    );
  }

  return { llegadas, vehiculos, marcadorParada, avisos };
}
