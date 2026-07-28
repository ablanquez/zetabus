/**
 * ⭐ LAS MIGAS DE NAVEGACIÓN, EN JSON-LD. Y ES LO ÚNICO DE SCHEMA.ORG QUE HAY.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ SOLO ESTO, Y NO EL RESTO DEL TRANSPORTE. El diseño en papel tumbó la
 *  propuesta grande (`BusStop`, `BusTrip`, `Place`…) con tres pruebas:
 *
 *   1. NO generan rich result: no están en el catálogo visible de Google, así que
 *      marcar 934 paradas no dibujaría NADA en los resultados. Puro peso muerto.
 *   2. Vivirían en `/parada/*`, que `robots.ts` BLOQUEA a propósito —indexar unos
 *      minutos que caducan en 15 s sería publicar una mentira—.
 *   3. La honestidad prohíbe el resto: nombres «sin confirmar» (16 gtfs-marcado),
 *      paradas provisionales de un desvío, correspondencias con fecha de caducidad,
 *      y sobre todo las llegadas —marcar una estimación volátil como `Schedule` es
 *      la peor mentira posible—. En JSON-LD no hay sitio para el matiz que la
 *      pantalla sí pone al lado.
 *
 *  Sobrevive UNA pieza y es ésta: un `BreadcrumbList` en `/linea/[linea]`. Cumple
 *  las cuatro condiciones a la vez: es VERDAD (Inicio › Línea 35), Google lo DIBUJA
 *  (está en el catálogo), va en una página que `robots.ts` SÍ permite indexar, y NO
 *  ENVEJECE porque se deriva de `shortName` en cada render, no se cablea.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { URL_SITIO } from '@/sitio';

/**
 * El `BreadcrumbList` de una página de línea: Inicio → Línea XX.
 *
 * ⚠️ El ÚLTIMO ítem (la página actual) va SIN `item`, como pide schema.org: no se
 *    enlaza a sí misma. El primero sí lleva la URL de la home, de la fuente única
 *    del dominio (`@/sitio`), la misma que `metadataBase` y el sitemap.
 */
export function migasDeLinea(shortName: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: URL_SITIO },
      { '@type': 'ListItem', position: 2, name: `Línea ${shortName}` },
    ],
  };
}

/**
 * El JSON-LD ya escapado para meter dentro de un `<script>`.
 *
 * ⚠️ `JSON.stringify` NO SANEA. Cada `<` se sustituye por su escape unicode (ver
 *    el `.replace` de abajo) para que un dato con un `</script>` no pueda cerrar la
 *    etiqueta e inyectar HTML — es la técnica de la doc oficial de Next (`json-ld.md`).
 *    Hoy el único dato es `shortName` del GTFS —«35», «Ci3», «N1»—, controlado; el
 *    escape va IGUAL, por disciplina y no por confiar en el dato: el día que aquí
 *    entre texto de terceros, la valla ya está puesta.
 */
export function migasJsonLd(shortName: string): string {
  return JSON.stringify(migasDeLinea(shortName)).replace(/</g, '\\u003c');
}
