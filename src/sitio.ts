/**
 * ⭐ EL DOMINIO DE ZETABUS, EN UN SOLO SITIO.
 *
 * Hasta hoy el dominio solo vivía en COMENTARIOS y en `.env.example` (robots.ts,
 * transporte.ts) — nunca como un valor que el código pudiera leer. El sitemap lo
 * necesita de verdad (sus URLs han de ser ABSOLUTAS), y también lo quieren el
 * `metadataBase` del layout (Open Graph, canónicas) y el `Sitemap:` de robots.
 *
 * ⚠️ UNA fuente, tres lectores (`layout`, `robots`, `sitemap`). Copiar la cadena a
 *    mano en cada uno es justo el fallo que este repo ya pagó una vez —una cabecera
 *    con su propia tabla de colores por no reutilizar la buena—. Aquí no se repite:
 *    quien necesite el dominio, lo importa de aquí.
 *
 * Es el dominio de PRODUCCIÓN a propósito: el sitemap y las canónicas son para el
 * sitio publicado, no para `localhost`. En local, `/sitemap.xml` emitirá este
 * dominio, y es lo correcto.
 */
export const URL_SITIO = 'https://zetabus.antonioblanquez.es';
