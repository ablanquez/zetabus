/**
 * ⭐⭐ EL PUENTE: DOS CLASES DE PARADA, SIN QUE NINGUNA FINJA SER LA OTRA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Hay paradas del GTFS (la inmensa mayoría) y hay 9 paradas SOLO-BARRIDO: postes
 *  que Avanza usa cuando una línea se desvía y que el GTFS no conoce. No tienen
 *  `StopId` —esa marca significa "vino del GTFS"—, así que TODO el tubo de
 *  `/parada`, keyed por `StopId`, las dejaba fuera con un 404.
 *
 *  ⛔ LA TENTACIÓN ERA UN `StopId` SINTÉTICO: fabricar uno "de mentira" para que el
 *     tubo existente tragara. Se rechazó: es una mentira estructural circulando por
 *     el núcleo (mismo tufillo que etiquetar `observacion_propia` un dato de feed en
 *     la Tanda A). En su lugar, un TIPO DISCRIMINADO: el `clase` obliga al COMPILADOR
 *     a que cada consumidor trate los dos casos. La bifurcación deja de ser
 *     disciplina (se olvida) y pasa a ser tipo (no se puede olvidar).
 *
 *  ⚠️ ESTO NO VIVE EN `topologia.ts`, QUE ES GTFS-PURO A PROPÓSITO. La lógica
 *     solo-barrido (leer el fichero, reconocer las 9) es de OTRA fuente; mezclarla
 *     con el GTFS horneado ensuciaría la frontera que `topologia` mantiene limpia.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { LatLon, StopId } from '@/core';
import { nombreDePoste } from '@/engine/correspondencias';
import { numeroDePoste, paradaDelPoste, posteDe } from '@/engine/topologia';

/** Una parada a la que se puede ENTRAR por la URL. Dos clases, discriminadas. */
export type ParadaVisitable =
  | { readonly clase: 'gtfs'; readonly paradaId: StopId; readonly poste: number }
  | { readonly clase: 'solo-barrido'; readonly poste: number; readonly coord: LatLon };

// ─────────────────────────────────────────────────────────────────────────────
//  LA FRONTERA ESTÁTICA: el fichero VERSIONADO de coordenadas (9 claves).
//
//  ⚠️ Es la fuente de "¿existe esta parada?", que es una pregunta PERMANENTE. NO se
//     usa el índice de correspondencias (dinámico, diario, ausente en degradado): eso
//     daría un 404 intermitente (la parada aparece unos días sí y otros no). El
//     fichero está versionado a propósito (.gitignore lo des-ignora) y viaja con el
//     deploy, así que las 9 son visitables SIEMPRE, haya índice o no.
// ─────────────────────────────────────────────────────────────────────────────

/** Relativa a `cwd`, como `RUTA_INDICE`. La MISMA que lee el barrido para fijar coords. */
const RUTA_COORDS = join(process.cwd(), 'data', 'postes-solo-barrido-coordenadas.json');

interface EntradaCoord {
  readonly lat?: unknown;
  readonly lon?: unknown;
}

let cache: { readonly mtimeMs: number; readonly postes: ReadonlyMap<number, LatLon> } | null = null;

/**
 * El whitelist de los solo-barrido con su coordenada. Cacheado por `mtime` (el fichero
 * es versionado y casi-inmutable: se lee una vez). `null`/ilegible → mapa vacío: las 9
 * dejarían de ser visitables, pero eso NO abre el 404 a nadie (falla cerrado).
 */
function whitelist(): ReadonlyMap<number, LatLon> {
  try {
    const st = statSync(RUTA_COORDS);
    if (cache && cache.mtimeMs === st.mtimeMs) return cache.postes;
    const crudo = JSON.parse(readFileSync(RUTA_COORDS, 'utf8')) as { postes?: Record<string, EntradaCoord> };
    const postes = new Map<number, LatLon>();
    for (const [clave, e] of Object.entries(crudo.postes ?? {})) {
      const n = numeroDePoste(clave);
      const lat = Number(e.lat);
      const lon = Number(e.lon);
      // Solo entra lo que es un poste real con coordenada real. Una clave o coord
      // rota NO se cuela como parada visitable a medias: se salta y punto.
      if (n === null || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      postes.set(n, { lat, lon });
    }
    cache = { mtimeMs: st.mtimeMs, postes };
    return postes;
  } catch {
    return new Map();
  }
}

/** La coordenada fijada de un poste solo-barrido, o `null` si no es uno de los 9. */
export function coordSoloBarrido(poste: number): LatLon | null {
  return whitelist().get(poste) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EL RESOLVER: la única puerta que reconoce las DOS clases.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ Resuelve un poste crudo de la URL a una parada visitable, o `null` (→ 404).
 *
 * Orden: 1) ¿es del GTFS? (la puerta de siempre, sin cambios). 2) si no, ¿es uno de
 * los 9 del fichero estático? Un 99999 no es ni lo uno ni lo otro → `null` → 404. La
 * frontera se abre a 9 CLAVES NOMBRADAS y a ninguna más: para colar otra hay que
 * editar el fichero versionado a mano.
 *
 * ⚠️ Las dos ramas normalizan los dígitos con la MISMA `numeroDePoste`: `0x2E8`, `1e3`,
 *    el vacío y los decimales se rechazan igual en las dos. El agujero no vuelve por
 *    la puerta nueva.
 */
export function resolverParada(crudo: unknown): ParadaVisitable | null {
  const paradaId = paradaDelPoste(crudo);
  if (paradaId !== null) return { clase: 'gtfs', paradaId, poste: posteDe(paradaId)! };

  const n = numeroDePoste(crudo);
  if (n === null) return null;
  const coord = coordSoloBarrido(n);
  if (coord === null) return null; // no es del GTFS ni de los 9 → 404 legítimo
  return { clase: 'solo-barrido', poste: n, coord };
}

/**
 * El nombre de una parada solo-barrido, con prioridad honesta:
 *   1. el del FEED en vivo (`delFeed`) — el más fresco, lo da Avanza ahora mismo;
 *   2. el del ÍNDICE (lo guardó el barrido, también de Avanza);
 *   3. `poste N` — solo si no hay ni feed ni índice (arranque en frío total).
 * Los tres son honestos y su procedencia es `avanza-web` (nunca `gtfs-marcado`): el
 * GTFS no conoce estas paradas, así que el aviso "nombre sin confirmar" NO les aplica.
 */
export function nombreSoloBarrido(poste: number, delFeed?: string | null): string {
  if (delFeed && delFeed.trim() !== '') return delFeed.trim();
  return nombreDePoste(poste) ?? `poste ${poste}`;
}
