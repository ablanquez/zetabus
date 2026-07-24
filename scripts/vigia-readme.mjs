/**
 * ⭐ EL VIGÍA DEL README. Avisa —no bloquea— cuando `src/` lleva muchos commits
 * cambiando y ningún README se ha tocado.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL CASO REAL QUE LO PRODUCE. El README de ZetaBus pasó **91 commits de `src/`
 *  seguidos** diciendo que la aplicación no existía todavía. Nadie lo rompió:
 *  dejó de ser cierto mientras el fichero no se tocaba, y las más de mil pruebas
 *  del proyecto siguieron en verde porque ninguna mira la prosa.
 *
 *  QUÉ HACE. Cuenta los commits que tocan `src/` desde el último que tocó un
 *  README. Si pasan de UMBRAL, imprime un aviso y dice qué hacer.
 *
 *  ⚠️ SOLO AVISA. NO BLOQUEA, y es una decisión, no una limitación: hay commits
 *     que tocan `src/` y NO deben tocar el README —un refactor interno, un test,
 *     un rename—. Si esto bloqueara, habría que silenciarlo en cada uno de ellos,
 *     y **un guardián que se silencia a menudo acaba silenciado siempre**. Eso es
 *     peor que no tenerlo. Sale siempre con código 0.
 *
 *  ⚠️ Y LO QUE NO PUEDE HACER, dicho en voz alta: esto se apaga TOCANDO el
 *     README. Si se toca sin leerlo, el aviso queda silenciado y el README sigue
 *     mintiendo. El vigía dice CUÁNDO mirar; mirar sigue siendo cosa de una
 *     persona. La pregunta está en `AGENTS.md`, en el cierre de tanda.
 *
 *  DÓNDE CORRE. Como `posttest` de `npm test`: npm lo ejecuta al TERMINAR la
 *  suite, así que su salida es lo ÚLTIMO que queda en pantalla, donde el ojo ya
 *  está mirando. No va en el `build` a propósito: allí se perdería entre cientos
 *  de líneas, y en un despliegue no le sirve a nadie. También a mano:
 *
 *      npm run vigia
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execFileSync } from 'node:child_process';

/**
 * ⭐ EL UMBRAL, Y POR QUÉ ESTE NÚMERO.
 *
 * Medido sobre los 187 commits de historia del proyecto: 132 tocan `src/`,
 * repartidos en 9 días de trabajo (de 4 a 25 commits al día, mediana 14). Las
 * rachas reales de commits a `src/` sin tocar un README fueron: **3, 3, 34 y 91**.
 *
 *   · 15 ≈ **un día entero de trabajo sobre `src/`** a la cadencia real de este
 *     repositorio. Un refactor de una jornada pasa entero sin decir nada.
 *   · Las dos rachas de 3 NO habrían disparado nunca: cero falsos positivos en
 *     toda la historia registrada.
 *   · La racha de 34 habría avisado 19 commits antes de acabar.
 *   · Y la de 91 —la del README que decía que la aplicación no existía— habría
 *     avisado en el commit 15, **76 commits antes de publicar**.
 *
 * Más bajo (5, 8) sería ruido constante; más alto (30) no habría avisado a
 * tiempo ni en el caso que lo produce.
 */
const UMBRAL = 15;

/** Tocar cualquiera de estos cuenta como "he mirado la documentación". */
const esReadme = (f) => f === 'README.md' || f === 'docs/README.md';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/**
 * Commits que tocan `src/` acumulados desde el último que tocó un README.
 * `null` si no hay historia legible (clon superficial, sin git, repo recién creado):
 * entonces se dice, no se supone.
 */
function racha(desde) {
  let salida;
  try {
    salida = git('log', '--format=%x00%h %s', '--name-only', '-n', '400', desde);
  } catch {
    return null;
  }
  const commits = salida
    .split('\0')
    .filter((b) => b.trim())
    .map((b) => {
      const [cabecera, ...ficheros] = b.trim().split('\n');
      return { cabecera, ficheros: ficheros.filter(Boolean) };
    });
  if (commits.length === 0) return null;

  const cuenta = [];
  for (const c of commits) {
    // git log va de lo NUEVO a lo VIEJO: el primer README que aparece cierra la racha.
    if (c.ficheros.some(esReadme)) break;
    if (c.ficheros.some((f) => f.startsWith('src/'))) cuenta.push(c.cabecera);
  }
  return { n: cuenta.length, masViejo: cuenta[cuenta.length - 1] ?? null, tope: commits.length };
}

// Acepta un ref para poder COMPROBARLO contra la historia, no solo contra HEAD:
//     node scripts/vigia-readme.mjs 8f3c1a2
// Sin eso, la única forma de ver el aviso encendido sería esperar a que pase.
const DESDE = process.argv[2] ?? 'HEAD';
const r = racha(DESDE);

if (r === null) {
  console.log('\n  vigía del README: sin historia de git legible aquí. No se ha comprobado nada.\n');
} else if (r.n >= UMBRAL) {
  const tope = r.n >= r.tope ? ` (al menos; solo se miraron ${r.tope} commits)` : '';
  console.log(
    [
      '',
      '  ┌─────────────────────────────────────────────────────────────────────────┐',
      '  │  ⚠️  VIGÍA DEL README                                                    │',
      '  └─────────────────────────────────────────────────────────────────────────┘',
      '',
      `     ${r.n} commits${tope} han tocado \`src/\` desde la última vez que se tocó`,
      '     un README. El umbral es ' + UMBRAL + '.',
      '',
      r.masViejo ? `     La racha arranca en:  ${r.masViejo}` : null,
      '',
      '     Esto NO es un fallo y no bloquea nada. Es la hora de hacerse la pregunta:',
      '',
      '        ⭐ ¿Hay alguna afirmación en el README que el repositorio desmienta?',
      '',
      '     Las cifras ya las vigila `tests/readme-no-miente.test.ts`. Lo que hay que',
      '     mirar con los ojos es LA PROSA SIN NÚMERO — «todavía no hay aplicación»,',
      '     «no está construido», «se hará» —, que es exactamente lo que estuvo',
      '     mintiendo 91 commits sin poner nada rojo.',
      '',
      '     ⚠️ Tocar el README apaga este aviso. Tocarlo sin leerlo lo silencia y ya.',
      '',
    ]
      .filter((l) => l !== null)
      .join('\n') + '\n',
  );
} else {
  console.log(
    `\n  vigía del README: ${r.n} commits a \`src/\` desde el último README (umbral ${UMBRAL}). Bien.\n`,
  );
}

// Siempre 0. Avisa, no bloquea.
process.exit(0);
