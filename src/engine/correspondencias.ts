/**
 * ⭐⭐ EL LECTOR DEL ÍNDICE DE CORRESPONDENCIAS. La cara de runtime del motor nuevo.
 *
 * Lee `data/generated/correspondencias.json` (lo escribe `build-correspondencias.ts`,
 * de noche) y responde dos preguntas de pantalla:
 *   · en una PARADA, qué líneas pasan hoy, separando normales de provisionales, con
 *     su sentido y destino (para "36 · Hacia Picarral"). → `correspondenciasDeParada`.
 *   · en un ITINERARIO, qué OTRAS líneas coinciden en cada poste (transbordos). →
 *     `otrasLineasEnPoste`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ SE LEE EN RUNTIME, NO SE IMPORTA. `gtfs.json` se hornea en el build (`import`);
 *  ÉSTE no puede, porque se regenera cada noche SIN build: importarlo obligaría a
 *  recompilar para verlo cambiar. Por eso vive en `data/generated/` (fuera del bundle)
 *  y se lee con `fs`, cacheado por `mtime` (se relee solo cuando el fichero cambia).
 *
 *  ⚠️ CAVEAT DE DESPLIEGUE (Tanda 8): en producción hay que asegurar que `data/` viaje
 *  con el deploy y sea legible desde `process.cwd()`. En `next dev` y `next start`
 *  locales lo es. Un `readFileSync` que va en dev y falla en el servidor es la peor
 *  clase de bug —el que solo ve el usuario—, así que esto se vigilará al desplegar.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ RED DE RESILIENCIA (H6), Y NO ES "DOS FUENTES QUE DIVERGEN": es UNA fuente y un
 *    MODO DEGRADADO. Si el fichero no existe (deploy nuevo antes del primer barrido) o
 *    no se puede leer, las NORMALES se calculan del GTFS —como se hacía antes— y NO hay
 *    provisionales (el GTFS no las conoce). Así la sección NUNCA se apaga.
 *
 *    ⚠️ Y el modo degradado NO lleva rótulo al usuario. ¿Cómo se evita volver a mentir
 *    "habitualmente" sin decirlo? El TÍTULO de la sección es neutro ("Líneas que pasan
 *    por aquí"): no promete "ahora" ni "siempre". La promesa de HOY vive SOLO en el
 *    recuadro de provisionales —que en degradado no aparece—. Sin recuadro, no se
 *    afirma nada de hoy: la lista desnuda es "líneas que pasan por aquí", cierta en los
 *    dos modos. El degradado SÍ se nota, pero donde toca: en `/api/diag` y el panel.
 *
 * ⚠️ NÚCLEO PURO + ENVOLTURA DE IO. Las funciones `...Desde(indice, …)` no tocan disco:
 *    se les pasa el índice (o `null` = degradado) y se prueban con fixtures, sin
 *    depender de un fichero que en CI ni existe (es raspado, gitignorado). La lectura
 *    del disco vive en `leerIndice()`, y las envolturas públicas la enchufan.
 */

import { statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Line, LineId, StopId } from '@/core';
import {
  esBuho,
  idLinea,
  lineaDeEtiqueta,
  linea as lineaPorId,
  paresOficialesDe,
  posteDe,
  sentidosParaRumbo,
} from '@/engine/topologia';
import { rumboDe } from '@/engine/rumbo';

// ── La forma del artefacto en disco (la escribe build-correspondencias.ts) ───────
export interface ParQuePasa {
  readonly linea: string; // shortName del GTFS
  readonly sentido: 0 | 1;
}
interface EntradaIndice {
  readonly normales: readonly ParQuePasa[];
  readonly provisionales: readonly ParQuePasa[];
  readonly nombre?: string;
  readonly sinCoordenadas?: true;
  readonly lat?: number;
  readonly lon?: number;
}
export interface ArtefactoIndice {
  readonly generadoEn: string;
  readonly barrido: {
    readonly sentidosEsperados: number;
    readonly sentidosRespondidos: number;
    readonly sentidosFallidos: number;
    readonly sentidosSospechosos: number;
    readonly postesGtfs: number;
    readonly postesSoloBarrido: number;
    readonly postesSinCoordenadas: number;
    readonly postesConProvisional: number;
    readonly lineasDesviadas: number;
    readonly incidencias: number;
  };
  readonly postes: Readonly<Record<string, EntradaIndice>>;
}

// ── El rumbo de una línea que pasa (paralelo a `Rumbo`, con directionId para enlazar)
export type RumboQuePasa =
  | { readonly tipo: 'sentido'; readonly directionId: 0 | 1; readonly destino: string }
  | { readonly tipo: 'circular'; readonly por: string }
  | { readonly tipo: 'nombre'; readonly texto: string };

export interface LineaQuePasa {
  readonly linea: Line;
  readonly rumbo: RumboQuePasa;
}

export interface CorrespondenciasDeParada {
  readonly normales: readonly LineaQuePasa[];
  readonly provisionales: readonly LineaQuePasa[];
  /** `true` = no había índice: normales del GTFS, sin provisionales. Se nota en /api/diag. */
  readonly degradado: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  LA LECTURA DEL DISCO. Cacheada por mtime: se relee solo cuando el fichero cambia
//  (una vez al día, cuando el barrido lo reescribe). `null` = no existe/ilegible.
// ─────────────────────────────────────────────────────────────────────────────

const RUTA = join(process.cwd(), 'data', 'generated', 'correspondencias.json');
let cache: { readonly mtimeMs: number; readonly data: ArtefactoIndice } | null = null;

export function leerIndice(): ArtefactoIndice | null {
  try {
    const st = statSync(RUTA);
    if (cache && cache.mtimeMs === st.mtimeMs) return cache.data;
    const data = JSON.parse(readFileSync(RUTA, 'utf8')) as ArtefactoIndice;
    cache = { mtimeMs: st.mtimeMs, data };
    return data;
  } catch {
    // No existe (deploy nuevo, o barrido nunca corrido) o ilegible → degradado.
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  EL NÚCLEO PURO. Toma el índice (o null) y no toca disco.
// ─────────────────────────────────────────────────────────────────────────────

/** Un par (línea, sentido) → la línea resuelta con su rumbo. `null` si el GTFS ya no
 *  conoce la línea (reconciliación: el índice puede ir un día por detrás del GTFS). */
function parALineaQuePasa(par: ParQuePasa): LineaQuePasa | null {
  const l = lineaDeEtiqueta(par.linea);
  if (!l) return null; // línea desconocida hoy: se salta, no se inventa
  const sents = sentidosParaRumbo(idLinea(String(l.id)));
  const activo = sents.find((s) => s.directionId === par.sentido);
  if (!activo) return { linea: l, rumbo: { tipo: 'nombre', texto: l.longName } };
  const r = rumboDe(activo, sents, { esBuho: esBuho(l), nombreLargo: l.longName });
  if (r.tipo === 'trayecto') {
    return { linea: l, rumbo: { tipo: 'sentido', directionId: par.sentido, destino: r.destino } };
  }
  if (r.tipo === 'circular') return { linea: l, rumbo: { tipo: 'circular', por: r.por } };
  return { linea: l, rumbo: { tipo: 'nombre', texto: r.texto } };
}

const claveRumbo = (e: LineaQuePasa): string =>
  e.rumbo.tipo === 'sentido' ? e.rumbo.destino : e.rumbo.tipo === 'circular' ? e.rumbo.por : e.rumbo.texto;

function ordenar(lista: LineaQuePasa[]): LineaQuePasa[] {
  // Una circular/búho puede venir repetida (dos pares que colapsan a la misma entrada
  // pelada): se deja una sola. Los 'sentido' son únicos por (línea, directionId).
  const vistas = new Set<string>();
  const unicas = lista.filter((e) => {
    const k = e.rumbo.tipo === 'sentido' ? `${e.linea.shortName}·${e.rumbo.directionId}` : `${e.linea.shortName}·pelada`;
    if (vistas.has(k)) return false;
    vistas.add(k);
    return true;
  });
  return unicas.sort(
    (a, b) =>
      a.linea.shortName.localeCompare(b.linea.shortName, 'es', { numeric: true }) ||
      claveRumbo(a).localeCompare(claveRumbo(b), 'es'),
  );
}

/** Las normales del GTFS (ruta oficial), para el MODO DEGRADADO. Es lo que hacía la
 *  vieja `lineasQuePasanPor`: se conserva aquí como red de resiliencia, un solo sitio. */
function normalesDelGtfs(paradaId: StopId): LineaQuePasa[] {
  const pares = paresOficialesDe(paradaId);
  const salida: LineaQuePasa[] = [];
  for (const { lineId, directionId } of pares) {
    const l = lineaPorId(idLinea(lineId));
    if (!l) continue;
    const e = parALineaQuePasa({ linea: l.shortName, sentido: directionId });
    if (e) salida.push(e);
  }
  return ordenar(salida);
}

export function correspondenciasDeParadaDesde(
  indice: ArtefactoIndice | null,
  paradaId: StopId,
): CorrespondenciasDeParada {
  const poste = posteDe(paradaId);
  if (indice && poste !== null) {
    const e = indice.postes[String(poste)];
    // El índice existe. Si el poste no está, HOY no pasa nada por aquí (no es degradado):
    // el índice es de hoy y cubre todos los postes barridos. Se dice el vacío arriba.
    const normales = e ? ordenar(e.normales.map(parALineaQuePasa).filter((x): x is LineaQuePasa => x !== null)) : [];
    const provisionales = e ? ordenar(e.provisionales.map(parALineaQuePasa).filter((x): x is LineaQuePasa => x !== null)) : [];
    return { normales, provisionales, degradado: false };
  }
  // Sin índice → DEGRADADO: normales del GTFS, sin provisionales.
  return { normales: normalesDelGtfs(paradaId), provisionales: [], degradado: true };
}

/** Dedup por id + orden natural por número de línea. */
function ordenarLineas(lineas: readonly Line[]): readonly Line[] {
  const porId = new Map(lineas.map((l) => [String(l.id), l]));
  return [...porId.values()].sort((a, b) => a.shortName.localeCompare(b.shortName, 'es', { numeric: true }));
}

/** Los transbordos de un poste del itinerario, SEPARADOS en normales y provisionales. */
export interface TransbordosDePoste {
  readonly normales: readonly Line[];
  readonly provisionales: readonly Line[];
}

/**
 * Las OTRAS líneas que coinciden en un poste (transbordos del itinerario), colapsadas a
 * la línea (un transbordo es "aquí cambias al 21", no dos "21") y sin la actual, y
 * REPARTIDAS en normales / provisionales —el mismo reparto que en la parada—.
 *
 * ⚠️ UNA LÍNEA NORMAL EN CUALQUIER SENTIDO ES NORMAL. Al colapsar a la línea, si el 40
 *    pasa aquí normal en un sentido y provisional en el otro, cuenta como NORMAL: aquí
 *    puedes cambiarte al 40 con fiabilidad. Solo va al recuadro la que HOY solo pasa por
 *    desvío.
 *
 * Del índice si lo hay (de hoy); del GTFS por `sid` en degradado —y ahí todas son
 * normales, sin provisionales—. Funciona aunque `sid` sea null (poste provisional),
 * donde la función vieja de transbordos devolvía [].
 */
export function transbordosDePosteDesde(
  indice: ArtefactoIndice | null,
  poste: number,
  sid: StopId | null,
  exceptoLinea: LineId,
): TransbordosDePoste {
  const except = String(exceptoLinea);
  const aLinea = (sn: string): Line | null => {
    const l = lineaDeEtiqueta(sn);
    return l && String(l.id) !== except ? l : null;
  };

  if (indice) {
    const e = indice.postes[String(poste)];
    if (!e) return { normales: [], provisionales: [] }; // hoy no coincide nadie
    const enNormal = new Set(e.normales.map((p) => p.linea));
    const soloProvisional = new Set(e.provisionales.map((p) => p.linea).filter((sn) => !enNormal.has(sn)));
    const normales = [...enNormal].map(aLinea).filter((l): l is Line => l !== null);
    const provisionales = [...soloProvisional].map(aLinea).filter((l): l is Line => l !== null);
    return { normales: ordenarLineas(normales), provisionales: ordenarLineas(provisionales) };
  }

  // Degradado: del GTFS por sid, todas normales (el GTFS no conoce provisionales).
  if (!sid) return { normales: [], provisionales: [] };
  const lineas = paresOficialesDe(sid)
    .map(({ lineId }) => lineaPorId(idLinea(lineId)))
    .filter((l): l is Line => l !== null && String(l.id) !== except);
  return { normales: ordenarLineas(lineas), provisionales: [] };
}

export interface EstadoIndice {
  readonly presente: boolean;
  readonly degradado: boolean;
  readonly generadoEn?: string;
  readonly edadSegundos?: number;
  readonly barrido?: ArtefactoIndice['barrido'];
}

export function estadoIndiceDesde(indice: ArtefactoIndice | null, ahoraMs: number): EstadoIndice {
  if (!indice) return { presente: false, degradado: true };
  const t = Date.parse(indice.generadoEn);
  return {
    presente: true,
    degradado: false,
    generadoEn: indice.generadoEn,
    edadSegundos: Number.isNaN(t) ? undefined : Math.max(0, Math.round((ahoraMs - t) / 1000)),
    barrido: indice.barrido,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  LAS ENVOLTURAS PÚBLICAS. Enchufan el disco al núcleo. Son las que usan las páginas.
// ─────────────────────────────────────────────────────────────────────────────

export const correspondenciasDeParada = (paradaId: StopId): CorrespondenciasDeParada =>
  correspondenciasDeParadaDesde(leerIndice(), paradaId);

export const transbordosDePoste = (
  poste: number,
  sid: StopId | null,
  exceptoLinea: LineId,
): TransbordosDePoste => transbordosDePosteDesde(leerIndice(), poste, sid, exceptoLinea);

export const estadoIndice = (): EstadoIndice => estadoIndiceDesde(leerIndice(), Date.now());
