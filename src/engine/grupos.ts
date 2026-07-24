/**
 * ⭐⭐ LO QUE SE SABE DE UNA LÍNEA **MIRANDO SU NOMBRE**. Y NADA MÁS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ ESTE FICHERO EXISTE, Y ES UNA RAZÓN MEDIDA EN KILOBYTES.
 *
 *  Todo esto vivía en `topologia.ts`, que en su línea 44 hace
 *  `import artefacto from '@/generated'` — **el GTFS entero, 1,9 MB**. En el
 *  servidor eso da igual. Pero `ChipLinea` necesita `esBuho()` y `ChipLinea` lo
 *  usan `LlegadasVivas` y `MapaParada`, que son `'use client'`.
 *
 *  ⇒ Resultado medido con `next build`: `/parada/[poste]` mandaba al navegador
 *    **2.431 KB (546 KB comprimidos)** frente a los ~515 KB (148 KB) del resto
 *    de rutas. **La red de transporte de Zaragoza entera, descargada para saber
 *    si un nombre de línea empieza por «N».**
 *
 *  Y la pregunta que responde este fichero no necesita ningún dato: `grupoDe`
 *  mira `shortName` con una expresión regular, y `giroDe` consulta una tabla de
 *  once entradas escrita a mano. **Cero topología.**
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ LA REGLA QUE HAY QUE MANTENER: **este fichero NO importa `@/generated`, ni
 *    nada que lo importe.** Solo tipos del núcleo. Si algún día necesita mirar la
 *    topología, ese algo NO pertenece aquí: pertenece a `topologia.ts`.
 *    Lo vigila `tests/nada-de-gtfs-en-el-cliente.test.ts`, no la buena voluntad.
 *
 * ⚠️ `topologia.ts` RE-EXPORTA todo esto, así que los ~15 sitios que ya lo
 *    importaban de allí siguen funcionando sin tocarse. Lo que cambia es de dónde
 *    tiran los DOS componentes de cliente.
 */

import type { Line } from '@/core';

// ─────────────────────────────────────────────────────────────────────────────
//  ⭐ LOS GRUPOS DE LÍNEA. También clonado: Diurnas / Lanzaderas / Circulares /
//  Búhos. Su índice los agrupa así y es la manera correcta de leer 44 líneas.
// ─────────────────────────────────────────────────────────────────────────────

export type GrupoLinea = 'diurna' | 'lanzadera' | 'circular' | 'buho';

export const GRUPOS: { readonly clave: GrupoLinea; readonly titulo: string; readonly nota: string }[] = [
  { clave: 'diurna', titulo: 'Diurnas', nota: 'las de todos los días' },
  { clave: 'circular', titulo: 'Circulares', nota: 'dan la vuelta: un solo sentido' },
  { clave: 'lanzadera', titulo: 'Lanzaderas', nota: 'refuerzo puntual' },
  { clave: 'buho', titulo: 'Búhos', nota: 'de madrugada' },
];

/**
 * ⚠️ Pide `Pick<Line, 'shortName'>` y no `Line` **a propósito**: así se lee en la
 *    firma que aquí no hace falta nada más que el nombre, y quien tenga solo el
 *    nombre —una llegada viva, por ejemplo— puede preguntar sin fabricar una
 *    `Line` entera ni ir a buscarla a la topología.
 */
export function grupoDe(l: Pick<Line, 'shortName'>): GrupoLinea {
  const s = l.shortName;
  if (/^N/i.test(s)) return 'buho';
  if (/^Ci/i.test(s)) return 'circular';
  if (/^C\d/i.test(s)) return 'lanzadera';
  return 'diurna';
}

/**
 * ⭐ ¿Es una línea nocturna? La pregunta que responde LA INVERSIÓN del chip (D1).
 *
 * Vive aquí, y no en el componente, para que **haya un solo sitio que lo decida**.
 * Si el chip de la lista, el del itinerario y el del índice lo dedujeran cada uno
 * por su cuenta con su propia expresión regular, bastaría con que uno se
 * despistase para que una N7 saliera pintada de diurna en una pantalla y de búho
 * en otra. Ése es exactamente el fallo del "0C1", con otro traje.
 */
export const esBuho = (l: Pick<Line, 'shortName'>): boolean => grupoDe(l) === 'buho';

/**
 * ⭐ EL SENTIDO DE GIRO de una línea circular. `null` = no es circular (no gira).
 *
 * ⚠️ ESTE DATO LO DA ANTONIO, no una fuente. El GTFS dice si una línea CIERRA el
 * bucle (geometría), pero NO hacia qué lado gira, y ni siquiera acierta a marcar
 * cuáles son circulares: la Ci1 y la Ci2 vienen con dos sentidos de ida y vuelta
 * en el feed, y aun así son circulares. Por eso esto es una CONSTANTE EXPLÍCITA
 * con su procedencia —conocimiento de campo—, y no se deriva de la topología.
 *
 * Se pinta como un icono ↻/↺ DESPUÉS del nombre en la tarjeta de la home (delante
 * empujaría el texto y rompería la columna alineada de los chips). Ver `page.tsx`.
 */
export type Giro = 'horario' | 'antihorario';

const SENTIDO_GIRO: Readonly<Record<string, Giro>> = {
  // Horario (↻): las circulares al tranvía y las dos primeras Ci.
  '30': 'horario', '54': 'horario', '55': 'horario', '56': 'horario',
  '57': 'horario', '58': 'horario', '59': 'horario', Ci1: 'horario', Ci3: 'horario',
  // Antihorario (↺):
  Ci2: 'antihorario', Ci4: 'antihorario',
};

export const giroDe = (l: Pick<Line, 'shortName'>): Giro | null => SENTIDO_GIRO[l.shortName] ?? null;
