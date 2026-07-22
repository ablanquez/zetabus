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

/**
 * La ventana (viewBox) es ÚNICA y la comparten las dos salidas. Está centrada en
 * la Z: su centro (34,32) es el del bbox de la Z con su stroke. Medido, con trazo:
 *   · Favicon (Z sola, stroke 8, bbox x[12,56] y[10,54]): aire 2/2/2/2 —centrada—;
 *     a 16 px la Z llena el cuadro de esquina a esquina (bbox 16×16 px).
 *   · Marca (Z s6 + poste + bandera, bbox x[13,57] y[11,53]): aire 3/1/3/3; la
 *     bandera queda a 1 u del borde derecho, apretada pero SIN recortar.
 * Es UN valor porque ambas encuadran bien con él, no dos ajustes que coinciden por
 * azar. Ajustar el favicon a su bbox (12 10 44 44) no agranda la Z a 16 px (ya
 * llena el cuadro): solo engrosa el trazo ~9% y arriesga los huecos. Por eso no se
 * aprieta. El día que una salida necesite otra ventana, se parte aquí, con motivo.
 */
export const VISTA = '10 8 48 48';

/** Grosores: la única variable entre las dos salidas. */
export const STROKE_MARCA = 6;
export const STROKE_FAVICON = 8;

/** El poste (mástil) y su señal en bandera. Solo la marca completa los dibuja. */
export const POSTE = { x: 46, yBase: 50, yAlto: 28, grosor: 4 } as const;
export const BANDERA = { x: 48, y: 24.5, ancho: 9, alto: 7, radio: 1.6 } as const;
