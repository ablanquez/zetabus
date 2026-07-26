/**
 * ⭐ EL MARCO DE MÓVIL, SCRIPTADO — la receta del commit f7a642d, hecha código.
 *
 * Hasta hoy el marco de las capturas de móvil del README (home-movil, parada-movil,
 * desvio-abierto-movil) se aplicaba A MANO. Aquí está la receta como constantes con
 * nombre, para que sea reproducible y se pueda re-enmarcar cualquier captura de móvil.
 *
 *   node scripts/marco-movil.mjs <entrada.png> <salida.png>
 *
 * Verificado: sobre una captura cruda de móvil da un PNG de la MISMA familia que
 * `home-movil.png` (bisel, aro, esquinas redondeadas y sombra suave), ~160 KB.
 *
 * ⛔⛔ SOLO PNG. NO SIRVE PARA GIF ANIMADO — y no es un descuido, se midió:
 *
 *   El marco necesita TRANSPARENCIA (esquinas redondeadas + sombra suave sobre un
 *   fondo agnóstico de tema, porque GitHub tiene modo claro y oscuro). En un GIF esa
 *   transparencia ROMPE la compresión entre-frames: cada frame se guarda casi entero.
 *   Medido sobre `momento-oro.gif` (787 KB a pelo):
 *       · GIF enmarcado (dither)          → 5,7 MB   (~6×)
 *       · APNG con sombra suave           → 5,0 MB
 *       · GIF sin dither, 128 colores     → 4,9 MB
 *   Todos ~5-6× el techo de 1 MB de un README. Además el GIF solo tiene alfa de 1 bit,
 *   así que ni siquiera reproduce la sombra suave. ⇒ El GIF del momento oro se queda A
 *   PELO a propósito (ver docs/BITACORA.md). Si vuelves a intentarlo, ya sabes el precio.
 *
 * Proporciones (medidas sobre home-movil.png, coinciden con la receta de f7a642d):
 *   · bisel      = 4,36 % del ancho de pantalla
 *   · radio ext. = 14,67 % del ancho del teléfono
 *   · margen     = 9 % del ancho del teléfono (para la sombra)
 *   · color      = #0F172A (--color-tinta) · aro interior al 16 % blanco
 */

import { existsSync, statSync } from 'node:fs';
import sharp from 'sharp';

// ── La receta, con nombre ────────────────────────────────────────────────────
const BISEL_PCT = 0.0436; // grosor del bisel / ancho de pantalla
const RADIO_EXT_PCT = 0.1467; // radio exterior / ancho del teléfono
const MARGEN_PCT = 0.09; // margen (para la sombra) / ancho del teléfono
const COLOR = '#0F172A'; // --color-tinta
const ARO = 'rgba(255,255,255,0.16)'; // aro interior, para no fundirse con el GitHub oscuro
const SOMBRA_OPACIDAD = 0.35;

function geometria(anchoPantalla, altoPantalla) {
  const b = Math.round(BISEL_PCT * anchoPantalla);
  const Wp = anchoPantalla + 2 * b;
  const Hp = altoPantalla + 2 * b;
  const Rext = Math.round(RADIO_EXT_PCT * Wp);
  const Rin = Math.max(0, Rext - b);
  const m = Math.round(MARGEN_PCT * Wp);
  const aro = Math.max(1, Math.round(b * 0.06));
  return { b, Wp, Hp, Rext, Rin, m, aro, Cw: Wp + 2 * m, Ch: Hp + 2 * m };
}

/** SVG del MARCO con el hueco de la pantalla transparente y la sombra suave. */
function svgMarco(g) {
  const { b, Wp, Hp, Rext, Rin, m, aro, Cw, Ch } = g;
  return Buffer.from(
    `<svg width="${Cw}" height="${Ch}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
           <feDropShadow dx="0" dy="${Math.round(m * 0.45)}" stdDeviation="${Math.round(m * 0.5)}"
             flood-color="${COLOR}" flood-opacity="${SOMBRA_OPACIDAD}"/>
         </filter>
         <mask id="hueco">
           <rect width="${Cw}" height="${Ch}" fill="white"/>
           <rect x="${m + b}" y="${m + b}" width="${Wp - 2 * b}" height="${Hp - 2 * b}" rx="${Rin}" fill="black"/>
         </mask>
       </defs>
       <g mask="url(#hueco)">
         <rect x="${m}" y="${m}" width="${Wp}" height="${Hp}" rx="${Rext}" fill="${COLOR}" filter="url(#s)"/>
       </g>
       <rect x="${m + aro / 2}" y="${m + aro / 2}" width="${Wp - aro}" height="${Hp - aro}"
         rx="${Rext}" fill="none" stroke="${ARO}" stroke-width="${aro}"/>
     </svg>`,
  );
}

async function enmarcarPng(entrada, salida) {
  const meta = await sharp(entrada).metadata();
  const g = geometria(meta.width, meta.height);
  const marco = await sharp(svgMarco(g)).png().toBuffer();
  // La pantalla, recortada a las esquinas redondeadas interiores (alfa completa).
  const mascara = Buffer.from(
    `<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${meta.width}" height="${meta.height}" rx="${g.Rin}" fill="white"/></svg>`,
  );
  const pantalla = await sharp(entrada)
    .composite([{ input: mascara, blend: 'dest-in' }])
    .png()
    .toBuffer();
  await sharp({ create: { width: g.Cw, height: g.Ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: pantalla, left: g.m + g.b, top: g.m + g.b },
      { input: marco, left: 0, top: 0 },
    ])
    .png()
    .toFile(salida);
  return statSync(salida).size;
}

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida || !existsSync(entrada)) {
  console.error('uso: node scripts/marco-movil.mjs <entrada.png> <salida.png>');
  process.exit(1);
}
if (entrada.toLowerCase().endsWith('.gif')) {
  console.error('⛔ Este script NO enmarca GIF: la transparencia dispara el peso ~6× (ver cabecera).');
  process.exit(1);
}
const bytes = await enmarcarPng(entrada, salida);
console.log(`✅ ${salida}  (${(bytes / 1024).toFixed(0)} KB)`);
