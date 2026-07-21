/**
 * ⭐⭐ LA FUENTE ÚNICA DE LA Z. Un solo `d=` en TODO el proyecto.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  La marca de ZetaBus es una Z (de ZetaBus y de Zaragoza) trazada como un
 *  recorrido, con la base prolongada y un poste de parada plantado encima: el
 *  recorrido llega a la parada. Se eligió V4 —señal en bandera, prolongación
 *  media— midiendo dónde el logo se USA (pestaña, icono, cabecera), no solo
 *  dónde se mira. El porqué, con números, en `docs/LOGO_ANALISIS_COLOR.md §7.
 *
 *  ⚠️ De aquí salen las DOS salidas, y NO se redibuja la Z en ninguna:
 *     · la marca completa (`Marca.tsx`) = esta Z (stroke 6) + poste + bandera.
 *     · el favicon (`app/icon.tsx`)     = ESTA MISMA Z, sin poste, stroke 8.
 *     El stroke es la única variable. Si algún día hay un segundo `d=` con una
 *     Z dentro, el guardián `tests/marca-z-unica.test.ts` se pone rojo. Es la
 *     ley de las 26 copias a mano: una geometría, una fuente.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** El recorrido en Z: barra sup → diagonal → barra inf PROLONGADA. Geometría V4. */
export const Z_PATH = 'M 16 14 L 38 14 L 16 50 L 52 50';

/** Ventana que recorta la marca (con poste + bandera) ajustada, sin aire de sobra. */
export const VISTA_MARCA = '10 8 48 48';
/** Ventana que recorta solo la Z (el favicon): llena el cuadro a 16 px. */
export const VISTA_FAVICON = '10 8 48 48';

/** Grosores: la única variable entre las dos salidas. */
export const STROKE_MARCA = 6;
export const STROKE_FAVICON = 8;

/** El poste (mástil) y su señal en bandera. Solo la marca completa los dibuja. */
export const POSTE = { x: 46, yBase: 50, yAlto: 28, grosor: 4 } as const;
export const BANDERA = { x: 48, y: 24.5, ancho: 9, alto: 7, radio: 1.6 } as const;
