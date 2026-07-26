/**
 * ⭐ MONTA EL GIF DEL «MOMENTO ORO» a partir de los PNG que captura
 * `e2e/momento-oro.spec.ts`. Reproducible: cualquiera regenera el GIF con
 *
 *   npx playwright test e2e/momento-oro.spec.ts --project=390px --project=1280px
 *   node scripts/gif-momento-oro.mjs
 *
 * Necesita `ffmpeg` en el PATH (v8 probada). NO edita ni recorta el copy ni la banda
 * de demo: monta los dos estados REALES tal cual salen de la app.
 *
 * Transición: normal 2 s → fundido 0,5 s → caído 3 s, 12 fps, en bucle.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ORIGEN = join('capturas', 'zetabus', 'momento-oro');
const DESTINO = join('docs', 'capturas');

// El móvil es el principal (se vive como una marquesina); el escritorio, extra.
const OBJETIVOS = [
  { viewport: '390px', ancho: 380, salida: 'momento-oro.gif' },
  { viewport: '1280px', ancho: 820, salida: 'momento-oro-escritorio.gif' },
];

// Segundos por tramo (idénticos al prototipo aprobado).
const T_NORMAL = 2.0;
const T_CAIDO = 3.0;
const T_FUNDIDO = 0.5;
const FPS = 12;

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
}

let hechos = 0;
for (const o of OBJETIVOS) {
  const normal = join(ORIGEN, `${o.viewport}-1-normal.png`);
  const caido = join(ORIGEN, `${o.viewport}-2-caido.png`);
  if (!existsSync(normal) || !existsSync(caido)) {
    console.error(`⛔ Faltan los PNG de ${o.viewport}. Corre antes el spec de Playwright.`);
    process.exitCode = 1;
    continue;
  }

  const tmp = join(ORIGEN, `_tmp-${o.viewport}.mp4`);
  const paleta = join(ORIGEN, `_paleta-${o.viewport}.png`);
  const gif = join(DESTINO, o.salida);

  // 1 · Compón normal→(fundido)→caído a un vídeo intermedio.
  const filtro =
    `[0:v]scale=${o.ancho}:-2,setsar=1,fps=${FPS}[a];` +
    `[1:v]scale=${o.ancho}:-2,setsar=1,fps=${FPS}[b];` +
    `[a][b]xfade=transition=fade:duration=${T_FUNDIDO}:offset=${T_NORMAL - T_FUNDIDO}[v]`;
  ffmpeg([
    '-loop', '1', '-t', String(T_NORMAL), '-i', normal,
    '-loop', '1', '-t', String(T_CAIDO), '-i', caido,
    '-filter_complex', filtro, '-map', '[v]', tmp,
  ]);

  // 2 · Paleta optimizada (GIF nítido y ligero) y aplicación.
  ffmpeg(['-i', tmp, '-vf', 'palettegen=stats_mode=full', paleta]);
  ffmpeg(['-i', tmp, '-i', paleta, '-lavfi', 'paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', gif]);

  rmSync(tmp, { force: true });
  rmSync(paleta, { force: true });

  const kb = (statSync(gif).size / 1024).toFixed(0);
  console.log(`✅ ${gif}  (${o.ancho}px · ${kb} KB)`);
  hechos++;
}

if (hechos === 0) process.exitCode = 1;
