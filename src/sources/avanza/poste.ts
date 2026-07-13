/**
 * PEDIRLE UN POSTE A AVANZA. La petición y su lectura, nada más.
 * La caché, el techo y la validez del poste NO viven aquí. Cada cosa, un sitio.
 */

import { pedir, type Transporte } from './transporte';
import { parsearPoste, PosteIlegible, type LecturaPoste } from './parse-poste';

export const URL_POSTE = 'https://gps.avanzabus.com/index.php/zaragoza/fRefrescaEmpresaExternos';

export async function leerPoste(poste: number, transporte: Transporte): Promise<LecturaPoste> {
  const { status, texto } = await pedir(transporte, {
    url: URL_POSTE,
    // `coche=0` significa "todos los coches". Es lo que manda su propia web.
    cuerpo: new URLSearchParams({ poste: String(poste), coche: '0' }).toString(),
  });

  if (status !== 200) {
    // ⚠️ Un 500, un 403 del WAF o un 302 a una página de mantenimiento NO son
    //    "no hay autobuses". Son "no lo sabemos". Y se dicen distinto.
    throw new PosteIlegible(`la fuente ha respondido con HTTP ${status}`, `poste ${poste}`);
  }
  return parsearPoste(texto);
}

export type { LecturaPoste };
