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
import { unicoPorProceso } from '@/core/proceso';
import { pedir, type Transporte } from './transporte';

export const URL_AJAX = 'https://zaragoza.avanzagrupo.com/wp-admin/admin-ajax.php';

/**
 * ⚠️⚠️ LA PÁGINA DE LA QUE SALE EL NONCE. NO ES DECORACIÓN: SIN ÉL, 403.
 *
 * Avanza metió (jul/26) un nonce de WordPress en sus AJAX: `get_stops_list` sin
 * `nonce` responde **403 con cuerpo vacío**. El nonce vive en el HTML de esta
 * página como `<input type="hidden" id="avz_bus_ajax_nonce" value="…">`, lo baja
 * un GET normal (no hay reto de navegador que resolver: se comprobó que hasta el
 * propio UA de ZetaBus pasa con el nonce; el «muro Radware» daba `allowed`). Es un
 * nonce de ventana temporal (validez WP ~12 h), así que se re-scrapea, nunca se
 * cablea. Ver docs/BITACORA.md.
 */
export const URL_NONCE = 'https://zaragoza.avanzagrupo.com/lineas-y-horarios/';

/** El id del campo oculto del nonce en esa página. */
const CAMPO_NONCE = '#avz_bus_ajax_nonce';

/**
 * TTL del nonce memoizado EN RUNTIME (no en el barrido, que lo saca fresco). 30 min
 * está muy por debajo de la validez WP (~12 h): no sirve caducados. Y si Avanza lo
 * rotara antes, `leerRecorridoRuntime` lo invalida al primer 403 y re-pide.
 */
export const TTL_NONCE_MS = 30 * 60_000;

/** Lo que Avanza llama sentido. Se traduce al `directionId` del GTFS aparte. */
export type SentidoAvanza = -1 | -2;

export interface PosteDelRecorrido {
  readonly poste: number;
  readonly nombre: string;
}

export class RecorridoIlegible extends Error {
  /**
   * El status HTTP, cuando el motivo fue un status ≠ 200. Lo usa el runtime para
   * distinguir el **403** (nonce caducado → invalidar y reintentar) de otros fallos.
   */
  constructor(motivo: string, detalle?: string, readonly status?: number) {
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
  // ⚠️ OBLIGATORIO. Sin él, Avanza responde 403 (ver URL_NONCE). Que sea un
  //    parámetro —y no algo que se saca aquí dentro— es a propósito: quien
  //    orquesta un barrido saca UN nonce y lo reparte, no uno por sentido.
  nonce: string,
): Promise<readonly PosteDelRecorrido[]> {
  const { status, texto } = await pedir(transporte, {
    url: URL_AJAX,
    cuerpo: new URLSearchParams({
      action: 'get_stops_list',
      selectLinea: lineaEtiqueta,
      selectSentido: String(sentido),
      nonce,
    }).toString(),
  });
  if (status !== 200) {
    throw new RecorridoIlegible(
      `la fuente ha respondido con HTTP ${status}`,
      `línea ${lineaEtiqueta}, sentido ${sentido}`,
      status,
    );
  }
  return parsearRecorrido(texto);
}

// ─────────────────────────────────────────────────────────────────────────────
//  EL NONCE. Un GET a la página, se saca el campo oculto. Ver URL_NONCE.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Baja la página y saca el nonce del campo oculto. HTML, no regex (la regla del
 * fichero: si mañana cambian el atributo, esto falla RUIDOSAMENTE, no en silencio).
 * Lanza `RecorridoIlegible` si la página no responde 200 o el campo no está —lo que
 * el que llama convierte en degradado honesto, igual que un 403 de recorrido.
 */
export async function leerNonce(transporte: Transporte): Promise<string> {
  const { status, texto } = await pedir(transporte, { url: URL_NONCE });
  if (status !== 200) {
    throw new RecorridoIlegible(`la página del nonce respondió HTTP ${status}`, URL_NONCE, status);
  }
  const valor = parse(texto).querySelector(CAMPO_NONCE)?.getAttribute('value')?.trim();
  if (!valor) {
    throw new RecorridoIlegible('no está el nonce en la página', `falta ${CAMPO_NONCE} — ¿Avanza cambió la página?`);
  }
  return valor;
}

/** El nonce vivo del proceso, con su caducidad. Único por proceso (ver core/proceso). */
interface CajaNonce {
  valor: string;
  expira: number;
}
const cajaNonce = (): CajaNonce => unicoPorProceso('avz.nonce', () => ({ valor: '', expira: 0 }));

/**
 * ⭐ EL NONCE MEMOIZADO — PARA RUNTIME, NO PARA EL BARRIDO.
 *
 * El barrido saca uno fresco por ejecución (`leerNonce`). Runtime, en cambio,
 * atiende muchas vistas de línea: pedir el nonce en cada una sería un GET extra por
 * lectura. Se cachea por proceso con TTL (30 min) → a lo sumo un GET cada 30 min,
 * compartido por todas las líneas. En la ruta caliente: cero GET de nonce.
 */
export async function obtenerNonce(transporte: Transporte, ahora: () => number = Date.now): Promise<string> {
  const caja = cajaNonce();
  if (caja.valor && ahora() < caja.expira) return caja.valor;
  caja.valor = await leerNonce(transporte);
  caja.expira = ahora() + TTL_NONCE_MS;
  return caja.valor;
}

/** Invalida el nonce memoizado → el próximo `obtenerNonce` re-pide. */
export function invalidarNonce(): void {
  cajaNonce().expira = 0;
}

/**
 * ⭐ RUNTIME: leer un recorrido con el nonce memoizado, y UN reintento si caducó.
 *
 * El TTL de 30 min vive dentro de la validez del nonce (~12 h), pero si Avanza lo
 * rotara antes, el cacheado empezaría a dar 403. En vez de arrastrar media hora de
 * 403 hasta que expire el TTL: al primer 403, se invalida, se re-pide UNA vez y se
 * reintenta. Si el fresco TAMBIÉN da 403 (o el fallo no era 403), sube el error →
 * el que llama lo trata como «no se pudo leer» (degradado honesto). Nunca revienta.
 *
 * Solo runtime: el barrido usa `leerRecorrido` con su nonce fresco, sin esto.
 */
export async function leerRecorridoRuntime(
  lineaEtiqueta: string,
  sentido: SentidoAvanza,
  transporte: Transporte,
  ahora: () => number = Date.now,
): Promise<readonly PosteDelRecorrido[]> {
  try {
    return await leerRecorrido(lineaEtiqueta, sentido, transporte, await obtenerNonce(transporte, ahora));
  } catch (e) {
    if (e instanceof RecorridoIlegible && e.status === 403) {
      invalidarNonce();
      return await leerRecorrido(lineaEtiqueta, sentido, transporte, await obtenerNonce(transporte, ahora));
    }
    throw e;
  }
}
