import { STROKE_FAVICON, VISTA_FAVICON, Z_PATH } from '@/components/marca-fuente';

/**
 * ⭐ EL FAVICON. Opción A: la MISMA Z de la marca (`Z_PATH`), sin poste ni
 * bandera, con el stroke más grueso (8) que aguanta 16 px con los contratrazos
 * abiertos (42–49% de hueco; medido en `docs/LOGO_ANALISIS_COLOR.md §7). NO es
 * un SVG con su propio path: interpola `Z_PATH`, así que el `d=` vive UNA sola
 * vez, en `marca-fuente.ts`.
 *
 * Se sirve como SVG de verdad (un `Response`, que la convención `icon` de Next
 * acepta) en vez de rasterizarlo: una Z de trazo limpio se ve más nítida a
 * 16 px vectorial que pasada por un PNG.
 *
 * ⚠️ HEX A PELO, y con motivo: un favicon es un asset de imagen y NO puede leer
 *    `var(--color-marca)`. El color se declara aquí y su copia está en el
 *    allowlist del guardián anti-hex; que no se separe del token lo comprueba
 *    `tests/marca-z-unica.test.ts`.
 */
export const contentType = 'image/svg+xml';

export default function Icon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VISTA_FAVICON}"><path d="${Z_PATH}" fill="none" stroke="#7048E8" stroke-width="${STROKE_FAVICON}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
