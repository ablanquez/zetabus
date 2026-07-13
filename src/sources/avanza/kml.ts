/**
 * EL TRAZADO REAL, Y EL DETECTOR BARATO DE DESVÍOS.
 *
 * Avanza publica el trazado de cada línea y sentido como KML:
 *     /wp-content/uploads/2019/12/{línea}-{1|2}.kml
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ⭐ EL DETECTOR QUE CUESTA CASI NADA: `Last-Modified`.
 *
 * Un GET condicional con `If-Modified-Since` devuelve **304 Not Modified y CERO
 * BYTES** si el fichero no ha cambiado. Comprobado contra el servidor real el
 * 13/07/2026:
 *
 *     GET 21-1.kml                              → 200, Last-Modified: Tue, 30 Jun 2026 12:03:02 GMT
 *     GET 21-1.kml  If-Modified-Since: <esa>    → 304 Not Modified, 0 bytes
 *
 * ⚠️ Y SE COMPROBÓ PORQUE HABÍA MOTIVO PARA DUDAR: en la auditoría, un HEAD a
 * estos mismos ficheros NO devolvía `Last-Modified` —el WAF la quita— y hubo que
 * tirar de GET con rango. Que el HEAD mienta no implicaba que el condicional
 * funcionara. Funciona. Pero se verificó, no se dio por hecho.
 *
 * 88 KML comprobados una vez por hora = **1,4 peticiones/minuto**, casi todas
 * respondidas con 304 y sin cuerpo. A cambio, sabemos qué línea ha cambiado de
 * trazado sin descargar un solo byte de las 84 que no han cambiado.
 *
 * (En la auditoría, 21 de los 84 KML existentes se habían modificado el
 * 30/06/2026: exactamente las líneas desviadas. Los otros 52 seguían sin tocar
 * desde febrero de 2025. La señal es limpia.)
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ CUÁNDO SE USA EL KML Y CUÁNDO shapes.txt, QUE NO ES LO MISMO:
 *
 *     SIN desvío  →  shapes.txt del GTFS. Preciso. Y cierto, porque no hay obra.
 *     CON desvío  →  KML. Más basto, pero VERDADERO.
 *
 * Pintar el trazado oficial durante unas obras es dibujar un autobús metiéndose
 * por una calle cortada. Es la clase de error que nadie reporta porque parece
 * perfectamente normal — hasta que vas a la parada.
 */

import { parse } from 'node-html-parser';
import type { LatLon } from '@/core';
import { pedir, type Transporte } from './transporte';

export const BASE_KML = 'https://zaragoza.avanzagrupo.com/wp-content/uploads/2019/12';

/** Avanza numera los KML 1 y 2. Se corresponden con `direction_id` 0 y 1. */
export const urlKml = (linea: string, directionId: 0 | 1) =>
  `${BASE_KML}/${linea}-${directionId + 1}.kml`;

export class KmlIlegible extends Error {
  constructor(motivo: string, detalle?: string) {
    super(`No se puede leer el KML: ${motivo}${detalle ? ` · ${detalle}` : ''}`);
    this.name = 'KmlIlegible';
  }
}

export type EstadoKml =
  | { readonly tipo: 'sin-cambios'; readonly lastModified: string }
  | { readonly tipo: 'cambiado'; readonly lastModified: string | null; readonly geometria: readonly LatLon[] }
  | { readonly tipo: 'no-existe' };

/**
 * Comprueba (y trae, si ha cambiado) el trazado.
 *
 * @param conocido El `Last-Modified` de la última vez. Si se pasa, la petición
 *                 va condicional y lo normal es que vuelva un 304 sin cuerpo.
 */
export async function comprobarKml(
  linea: string,
  directionId: 0 | 1,
  transporte: Transporte,
  conocido?: string | null,
): Promise<EstadoKml> {
  const { status, texto, cabeceras } = await pedir(transporte, {
    url: urlKml(linea, directionId),
    cabeceras: conocido ? { 'If-Modified-Since': conocido } : undefined,
  });

  if (status === 304) return { tipo: 'sin-cambios', lastModified: conocido! };
  if (status === 404) return { tipo: 'no-existe' }; // 4 de las 88 no existen. Es un hecho, no un fallo.
  if (status !== 200) throw new KmlIlegible(`HTTP ${status}`, `${linea}-${directionId + 1}.kml`);

  return {
    tipo: 'cambiado',
    lastModified: cabeceras['last-modified'] ?? null,
    geometria: parsearKml(texto),
  };
}

/**
 * El KML es XML, y se parsea como tal. Otra vez: NO con un regex.
 *
 * ⚠️ Y aquí el regex es todavía peor idea que en el HTML, porque `<coordinates>`
 * puede traer MILES de puntos separados por espacios y saltos de línea, y un
 * regex que se coma la mitad produce un trazado que se pinta perfectamente...
 * pasando por encima de los edificios. Un trazado a medias no da error: da una
 * línea recta preciosa que no es la calle.
 */
export function parsearKml(xml: string): readonly LatLon[] {
  if (!xml.includes('<kml') && !xml.includes('<coordinates')) {
    throw new KmlIlegible('la respuesta no es un KML', `empieza por: "${xml.trimStart().slice(0, 50)}"`);
  }
  const arbol = parse(xml, { lowerCaseTagName: true });
  const bloques = arbol.querySelectorAll('coordinates');
  if (bloques.length === 0) {
    throw new KmlIlegible('el KML no tiene ni un bloque <coordinates>');
  }

  const puntos: LatLon[] = [];
  for (const b of bloques) {
    for (const trozo of b.text.trim().split(/\s+/)) {
      if (trozo === '') continue;
      // ⚠️ KML va (LON, LAT, alt). AL REVÉS que todo lo demás. Invertirlo manda
      //    el trazado a Somalia, y en el mapa se ve... bueno, no se ve nada.
      const [lon, lat] = trozo.split(',').map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new KmlIlegible(`punto ilegible en <coordinates>: "${trozo.slice(0, 30)}"`);
      }
      if (lat === 0 && lon === 0) continue; // Null Island, otra vez. No se pinta.
      puntos.push({ lat, lon });
    }
  }
  if (puntos.length < 2) {
    throw new KmlIlegible(`un trazado con ${puntos.length} punto(s) no es un trazado`);
  }
  return puntos;
}
