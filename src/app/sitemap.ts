import type { MetadataRoute } from 'next';
import { generadoEn, lineas } from '@/engine/topologia';
import { URL_SITIO } from '@/sitio';

/**
 * ⭐⭐ EL SITEMAP DE ZETABUS. Estático, honesto, y coherente con robots.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  QUÉ ENTRA — Y NADA MÁS: 3 fijas + las 44 líneas ≈ 47 URLs.
 *
 *    /                  la portada
 *    /sobre-los-datos   de dónde sale cada cosa
 *    /estado            el panel de salud (URL estable; su contenido, volátil)
 *    /linea/<n>         ⭐ el contenido con valor de búsqueda: el recorrido, cierto
 *                       durante meses. UNA por línea, generadas de `lineas()`.
 *
 *  ⛔ NINGUNA PARADA. Ni las 934, ni las 9 solo-barrido. `robots.ts` prohíbe
 *     `/parada/*` (su dato caduca en 15 s: indexarlo es mentir), y un sitemap que
 *     liste una URL bloqueada por robots es una contradicción que Google marca. La
 *     coherencia se PRUEBA en `tests/sitemap.test.ts` (con su rojo).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ESTÁTICO EN BUILD, a propósito. Este fichero no usa ninguna API de request-time,
 *    así que Next lo hornea (doc `metadata/sitemap`). Y es lo correcto: el CONJUNTO de
 *    URLs (portada + 44 líneas) sale del GTFS horneado en el bundle, así que cambia
 *    EXACTAMENTE cuando hay un deploy nuevo — que es justo cuando el estático se rehace.
 *    Engancharlo al cron nocturno regeneraría un sitemap idéntico cada noche e invitaría
 *    a la mentira de `lastmod = hoy`. Ver `docs/BITACORA.md` y el diagnóstico previo.
 *
 * ⚠️ URLs ABSOLUTAS vía `@/sitio` (la misma base que `metadataBase` y `robots`). En
 *    local salen contra el dominio de producción, y es correcto: el sitemap es para el
 *    sitio publicado.
 *
 * ⚠️ `lastModified` SOLO donde hay una fecha HONESTA:
 *    · las líneas → `generadoEn` del GTFS (cuándo se horneó el recorrido, que es su
 *      contenido durable). NO la fecha de hoy, NO la del desvío vivo (el desvío no es
 *      lo que se indexa).
 *    · las fijas y `/estado` → SIN `lastmod`: no hay fecha honesta para un panel de
 *      salud que cambia a cada minuto, ni para las páginas fijas (cambian con el deploy).
 *      Inventar `new Date()` por URL es la única opción que miente.
 *
 * ⚠️ SIN `priority` ni `changeFrequency`: Google los ignora públicamente; ponerlos
 *    "vende" una frescura que no controlamos. Se omiten.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const fijas: MetadataRoute.Sitemap = [
    { url: `${URL_SITIO}/` },
    { url: `${URL_SITIO}/sobre-los-datos` },
    { url: `${URL_SITIO}/estado` }, // sin lastmod: su contenido no tiene fecha honesta
  ];

  const deLineas: MetadataRoute.Sitemap = lineas().map((l) => ({
    // UNA URL por línea. NADA de `?sentido=`: el sentido es query, no una URL distinta.
    url: `${URL_SITIO}/linea/${encodeURIComponent(l.shortName)}`,
    lastModified: generadoEn, // = A.generatedAt del GTFS horneado (topologia.ts)
  }));

  return [...fijas, ...deLineas];
}
