/**
 * EL RECORRIDO QUE SE ESTÁ HACIENDO HOY.
 *
 * `admin-ajax.php` con `action=get_stops_list` devuelve la secuencia ORDENADA de
 * postes de un sentido **con el desvío ya aplicado**. Es la ruta operativa: lo
 * que el autobús hace de verdad esta mañana, no lo que el GTFS dice que hace.
 *
 * Es el desplegable de postes de su propia web. Ellos lo usan para que elijas
 * parada; nosotros, para saber qué paradas han dejado de existir.
 *
 * ⚠️ Y OTRA VEZ: HTML, NO REGEX. Aquí la tentación es enorme —son `<option>`
 * planos, un regex de tres líneas los saca—. Pero es exactamente el mismo error
 * con otro traje: el día que metan un `<optgroup>`, o cambien el atributo, el
 * regex devuelve MENOS PARADAS. Y menos paradas en la ruta real significa, para
 * el motor de desvíos, PARADAS SUPRIMIDAS QUE NO EXISTEN. Un regex mal puesto
 * aquí no rompe la pantalla: la llena de desvíos inventados.
 */

import { parse } from 'node-html-parser';
import { pedir, type Transporte } from './transporte';

export const URL_AJAX = 'https://zaragoza.avanzagrupo.com/wp-admin/admin-ajax.php';

/** Lo que Avanza llama sentido. Se traduce al `directionId` del GTFS aparte. */
export type SentidoAvanza = -1 | -2;

export interface PosteDelRecorrido {
  readonly poste: number;
  readonly nombre: string;
}

export class RecorridoIlegible extends Error {
  constructor(motivo: string, detalle?: string) {
    super(`No se puede leer el recorrido: ${motivo}${detalle ? ` · ${detalle}` : ''}`);
    this.name = 'RecorridoIlegible';
  }
}

/** El `<option>` de relleno que encabeza el desplegable. No es una parada. */
const RELLENO = 'postedefault';

export function parsearRecorrido(html: string): readonly PosteDelRecorrido[] {
  const trozo = html.trim();
  if (trozo === '') {
    // Vacío = esa línea no tiene ese sentido (las circulares solo tienen uno),
    // o la petición era errónea. El que llama decide; aquí no se inventa nada.
    return [];
  }
  if (trozo.startsWith('<') === false && trozo.startsWith('0') === false) {
    throw new RecorridoIlegible('la respuesta no parece HTML', `empieza por: "${trozo.slice(0, 50)}"`);
  }

  const arbol = parse(`<select>${html}</select>`);
  const opciones = arbol.querySelectorAll('option');
  if (opciones.length === 0) {
    throw new RecorridoIlegible('no hay ni un <option>', 'la estructura de la respuesta ha cambiado');
  }

  const postes: PosteDelRecorrido[] = [];
  for (const op of opciones) {
    const valor = (op.getAttribute('value') ?? '').trim();
    if (valor.toLowerCase() === RELLENO) continue;

    const n = Number(valor);
    if (!Number.isInteger(n) || n <= 0) {
      throw new RecorridoIlegible(`un <option> tiene un poste ilegible: "${valor}"`);
    }
    // "1297 - Cosuenda / Paseo de Longares" → nos quedamos con el nombre.
    const texto = op.text.replace(/\s+/g, ' ').trim();
    const nombre = texto.replace(/^\d+\s*-\s*/, '');
    postes.push({ poste: n, nombre });
  }

  if (postes.length === 0) {
    throw new RecorridoIlegible(
      'el desplegable trae opciones pero ninguna es un poste',
      'si esto se devolviera vacío en silencio, el motor de desvíos daría TODAS las paradas por suprimidas',
    );
  }
  return postes;
}

export async function leerRecorrido(
  lineaEtiqueta: string,
  sentido: SentidoAvanza,
  transporte: Transporte,
): Promise<readonly PosteDelRecorrido[]> {
  const { status, texto } = await pedir(transporte, {
    url: URL_AJAX,
    cuerpo: new URLSearchParams({
      action: 'get_stops_list',
      selectLinea: lineaEtiqueta,
      selectSentido: String(sentido),
    }).toString(),
  });
  if (status !== 200) {
    throw new RecorridoIlegible(`la fuente ha respondido con HTTP ${status}`, `línea ${lineaEtiqueta}, sentido ${sentido}`);
  }
  return parsearRecorrido(texto);
}
