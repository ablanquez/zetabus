/**
 * ⭐⭐ EL BARRIDO DE CORRESPONDENCIAS. UN SOLO SITIO, DOS BOCAS.
 *
 * Pide a Avanza los 74 sentidos, los cruza con la ruta oficial del GTFS y publica
 * `data/generated/correspondencias.json`. Lo llaman DOS:
 *
 *     · `scripts/build-correspondencias.ts`  —  a mano y en el build (`npm run …`)
 *     · `POST /api/regenerar`                —  el cron nocturno, sin SSH
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ POR QUÉ ESTO VIVE AQUÍ Y NO EN EL SCRIPT, QUE ES DE DONDE VIENE.
 *
 *  Hostinger no da SSH, así que el cron no puede lanzar el script: tiene que
 *  disparar una URL. Y una URL corre DENTRO de la aplicación. O el barrido se
 *  copiaba a un route handler —dos copias del código que produce EL MISMO
 *  artefacto, condenadas a divergir sin que nadie se entere— o se sacaba a un
 *  módulo que importan los dos. Es lo segundo. El script pasa a ser lo que
 *  siempre debió ser: una CARA, que imprime.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐⭐ Y EL CAMBIO DE FUENTE QUE TRAE, QUE NO ES COSMÉTICO: EL GTFS YA NO SE LEE
 *    DEL ZIP, SE LEE DE `@/engine/topologia` — el artefacto HORNEADO EN EL BUNDLE.
 *
 *    · **Correcto**: el índice tiene que cuadrar con la red que la aplicación
 *      está SIRVIENDO, que es la horneada. Cruzarlo contra un zip que está en el
 *      disco produciría un índice consistente con un GTFS que nadie ve.
 *    · **Y posible**: en producción `process.cwd()` es `~/nodejs`, y NADIE HA
 *      DEMOSTRADO que `data/gtfs/zaragoza-gtfs.zip` viaje hasta allí —el zip no
 *      se versiona y se descarga en `.builds/`, que es otro directorio—. Un
 *      barrido que dependiera del zip podría no arrancar nunca en el servidor.
 *      Contra el bundle no hay duda: el bundle ES lo que corre.
 *
 *    ⚠️ LO QUE ESTO ASUME, DICHO EN VOZ ALTA: el artefacto horneado se filtró por
 *       servicios activos en la FECHA DEL BUILD. Un despliegue que lleve semanas
 *       sin recompilar barrerá los sentidos de aquel día. No es nuevo ni es peor:
 *       es exactamente la red que la aplicación pinta, y su caducidad ya la
 *       vigila `feedStatus` (sale en `/api/diag` y en pantalla).
 *
 * ⚠️ LA GARANTÍA QUE NO SE TOCA: **NUNCA UN FICHERO PARCIAL.** Suelo del 80 %,
 *    escritura a temporal, relectura y re-verificación, `.bak` del anterior, y
 *    `rename` atómico al final. Si el barrido falla, el índice de ayer se queda
 *    donde estaba. Es la regla que ya estaba escrita; aquí solo se muda de casa.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { control } from '@/core/control';
import { unicoPorProceso } from '@/core/proceso';
import { RUTA_INDICE } from '@/engine/correspondencias';
import { idLinea, idParada, lineas, paradas, posteDe, sentidosDe } from '@/engine/topologia';
import {
  alcanzaElSuelo,
  fundirCorrespondencias,
  RATIO_SUELO,
  type ContadoresCorrespondencias,
  type OficialParaFusion,
  type ParQuePasa,
} from '@/sources/avanza/correspondencias';
import { pedirNombres, type PeticionDeSentido, type RespuestaDeSentido } from '@/sources/avanza/nombres';
import type { SentidoAvanza } from '@/sources/avanza/recorrido';
import { transporteReal, type Transporte } from '@/sources/avanza/transporte';

/** El sentido de Avanza por `direction_id` del GTFS. Igual que en `desvios.ts`. */
const SENTIDO_AVANZA: Record<0 | 1, SentidoAvanza> = { 0: -1, 1: -2 };

/** Las coordenadas a mano de los postes solo-barrido. Relativa a `cwd`, como el índice. */
const COORDS = 'data/postes-solo-barrido-coordenadas.json';

// ─────────────────────────────────────────────────────────────────────────────
//  1 · LA VISTA DEL GTFS QUE LA FUSIÓN NECESITA, SACADA DEL ARTEFACTO HORNEADO
// ─────────────────────────────────────────────────────────────────────────────

export interface VistaOficial {
  readonly oficial: OficialParaFusion;
  /** Una petición por sentido: es lo que hay que pedirle a Avanza. */
  readonly peticiones: readonly PeticionDeSentido[];
  readonly lineas: number;
}

export function vistaOficial(): VistaOficial {
  const postesDeSentido = new Map<string, Set<number>>();
  const peticiones: PeticionDeSentido[] = [];

  for (const l of lineas()) {
    for (const d of sentidosDe(idLinea(String(l.id)))) {
      const set = new Set<number>();
      for (const sid of d.official.stops) {
        const poste = posteDe(idParada(sid));
        if (poste !== null) set.add(poste);
      }
      postesDeSentido.set(`${l.shortName}|${d.directionId}`, set);
      peticiones.push({ lineaEtiqueta: l.shortName, sentido: SENTIDO_AVANZA[d.directionId] });
    }
  }

  const postesGtfs = new Set<number>();
  for (const p of paradas()) {
    const poste = posteDe(p.id);
    if (poste !== null) postesGtfs.add(poste);
  }

  return {
    oficial: { postesDeSentido: (linea, dir) => postesDeSentido.get(`${linea}|${dir}`), postesGtfs },
    peticiones,
    lineas: lineas().length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  2 · EL CERROJO: UN BARRIDO A LA VEZ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ POR QUÉ HACE FALTA, EN CONCRETO. Dos barridos a la vez son 148 peticiones
 * simultáneas contra un servicio ajeno del que este proyecto vive de prestado, y
 * dos escrituras compitiendo por el mismo fichero. Basta con un `curl` repetido
 * porque la primera respuesta llegó en dos segundos (se responde 202 y se trabaja
 * de fondo) y parece que no ha pasado nada.
 *
 * ⚠️ VIVE EN `unicoPorProceso`, NO EN UN `let` DE MÓDULO, y la razón está medida:
 *    las páginas y los route handlers son GRAFOS DE MÓDULOS DISTINTOS aunque
 *    compartan proceso (ver `@/core/proceso`). Un `let` aquí sería un cerrojo por
 *    grafo, es decir, ningún cerrojo.
 *
 * ⚠️ Y LO QUE **NO** CUBRE, que hay que saberlo: si Hostinger levantara VARIOS
 *    PROCESOS de Node, cada uno tendría su propio cerrojo. Contra eso lo único que
 *    protege es la escritura atómica —el fichero nunca queda a medias—, no el
 *    gasto de red. El cron dispara UNA petición, así que el caso real que esto
 *    cubre (el dedo que pulsa dos veces) queda cubierto; el caso de varios
 *    procesos queda DICHO, no tapado.
 */
export const CERROJO_TTL_MS = 30 * 60_000;

interface Cerrojo {
  empezadoEnMs: number | null;
}

const cerrojo = (): Cerrojo => unicoPorProceso('barrido.cerrojo', () => ({ empezadoEnMs: null }));

export type IntentoDeCerrojo =
  | { readonly tomado: true; readonly soltar: () => void }
  | { readonly tomado: false; readonly desdeHaceMs: number };

/**
 * Toma el cerrojo o dice cuánto lleva corriendo el que hay. **Síncrono a
 * propósito**: quien responde 202 tiene que haberlo tomado ya, o el hueco entre
 * «decido responder» y «empiezo a trabajar» deja pasar a un segundo barrido.
 *
 * ⚠️ EL TTL NO ES DECORACIÓN. El cerrojo vive en memoria, así que un proceso que
 *    muere lo suelta solo. Pero un barrido COLGADO (una petición que ni responde
 *    ni corta) lo dejaría echado para siempre, y el cron dejaría de regenerar sin
 *    que nada se pusiera rojo salvo la edad del índice. Pasada media hora —quince
 *    veces lo que tarda— se da por muerto.
 */
export function tomarElCerrojo(ahoraMs: number = Date.now()): IntentoDeCerrojo {
  const c = cerrojo();
  const desde = c.empezadoEnMs;
  if (desde !== null && ahoraMs - desde < CERROJO_TTL_MS) {
    return { tomado: false, desdeHaceMs: ahoraMs - desde };
  }
  c.empezadoEnMs = ahoraMs;
  let soltado = false;
  return {
    tomado: true,
    soltar: () => {
      // Idempotente y solo si sigue siendo EL NUESTRO: si el TTL ya lo caducó y
      // otro barrido lo tomó, soltarlo aquí lo dejaría abierto para un tercero.
      if (soltado) return;
      soltado = true;
      if (c.empezadoEnMs === ahoraMs) c.empezadoEnMs = null;
    },
  };
}

/** `null` = no hay barrido en curso. Para `/api/diag` y para las pruebas. */
export const barridoEnCursoDesdeMs = (): number | null => cerrojo().empezadoEnMs;

// ─────────────────────────────────────────────────────────────────────────────
//  3 · EL BARRIDO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La coordenada FIJADA de un poste solo-barrido, con su procedencia. DOS fuentes:
 *  · 'avanza-web'         la da el feed de llegadas de Avanza (marcadorParada). Es
 *                         lo que resuelve las 9 de hoy. Ver scripts/coords-solo-barrido.ts.
 *  · 'observacion_propia' una persona la resolvió a mano (quien/fecha/comoLoSupe).
 *                         Hoy no hay ninguna; el modelo la admite.
 *
 * ⚠️ La procedencia se PROPAGA al índice tal cual (ver `fijarCoordenada`): NO se
 *    pisa con un literal fijo. Un dato de Avanza etiquetado 'observacion_propia'
 *    sería una mentira de procedencia — justo lo que este proyecto persigue. Antes
 *    aquí ponía `& { confidence: 'observacion_propia' }` cableado, y por eso las 9
 *    del feed habrían salido como observación manual.
 */
type CoordFijada = { readonly lat: number; readonly lon: number } & (
  | { readonly fuente: 'avanza-web'; readonly fecha: string; readonly comoSeSupo?: string }
  | { readonly fuente: 'observacion_propia'; readonly quien: string; readonly fecha: string; readonly comoLoSupe: string }
);

/**
 * ⭐ EL ESTAMPADO DE COORDENADA — PURO, para poder probar que NO PISA la procedencia.
 *
 * Toma la entrada base del poste (sin coord) y la coordenada fijada del fichero, y
 * devuelve la entrada con `lat/lon` y `coordProc` = la coord tal cual, con SU
 * `fuente`. No hace red, no toca disco: es la parte verificable de la costura, y
 * su test (`tests/coords-propagacion.test.ts`) demuestra el rojo si alguien vuelve
 * a cablear un literal encima.
 */
export function fijarCoordenada(
  base: Pick<EntradaEscrita, 'normales' | 'provisionales' | 'nombre'>,
  co: CoordFijada,
): EntradaEscrita {
  return {
    normales: base.normales,
    provisionales: base.provisionales,
    nombre: base.nombre,
    lat: co.lat,
    lon: co.lon,
    coordProc: co, // ← PROPAGA la procedencia del fichero, NO la pisa
  };
}

/** Una entrada del artefacto tal y como se ESCRIBE (más rica que la de la fusión pura). */
interface EntradaEscrita {
  readonly normales: readonly ParQuePasa[];
  readonly provisionales: readonly ParQuePasa[];
  readonly nombre?: string;
  readonly sinCoordenadas?: true;
  readonly lat?: number;
  readonly lon?: number;
  readonly coordProc?: CoordFijada;
}

export type ResultadoBarrido =
  | {
      readonly estado: 'publicado';
      readonly generadoEn: string;
      readonly contadores: ContadoresCorrespondencias;
      readonly avisos: readonly string[];
      readonly postes: number;
      readonly sinCoordenadas: number;
      readonly conCoordResuelta: number;
      readonly bytes: number;
      readonly ms: number;
    }
  | {
      /** Avanza no respondió lo bastante. El índice de ayer SE QUEDA. */
      readonly estado: 'suelo';
      readonly contadores: ContadoresCorrespondencias;
      readonly avisos: readonly string[];
      readonly ratio: number;
      readonly habiaIndice: boolean;
      readonly ms: number;
    }
  | { readonly estado: 'ocupado'; readonly desdeHaceMs: number }
  | { readonly estado: 'error'; readonly detalle: string; readonly ms: number };

export interface OpcionesBarrido {
  readonly transporte?: Transporte;
  readonly ahora?: Date;
  readonly alAvanzar?: (hechas: number, total: number, ultima: RespuestaDeSentido) => void;
  /** Se llama con las peticiones ya calculadas, antes de tocar la red. Para el script. */
  readonly alEmpezar?: (v: VistaOficial) => void;
  /** Ya tomado por quien llama (el route handler lo toma antes de responder 202). */
  readonly cerrojoYaTomado?: boolean;
  readonly pausaMs?: number;
}

/**
 * Barre, funde, verifica y publica. **No imprime nada y no llama a `process.exit`**:
 * devuelve lo que ha pasado y decide quien llama. Es lo que permite que la misma
 * función sirva a un script de terminal y a un route handler.
 */
export async function barrerCorrespondencias(opts: OpcionesBarrido = {}): Promise<ResultadoBarrido> {
  const intento = opts.cerrojoYaTomado ? null : tomarElCerrojo();
  if (intento && !intento.tomado) return { estado: 'ocupado', desdeHaceMs: intento.desdeHaceMs };

  const t0 = Date.now();
  try {
    return await barrer(opts, t0);
  } catch (e) {
    return { estado: 'error', detalle: (e as Error)?.message ?? String(e), ms: Date.now() - t0 };
  } finally {
    intento?.soltar();
  }
}

async function barrer(opts: OpcionesBarrido, t0: number): Promise<ResultadoBarrido> {
  const ahora = opts.ahora ?? new Date();
  const vista = vistaOficial();
  opts.alEmpezar?.(vista);

  // ── LA RED ──────────────────────────────────────────────────────────────────
  const respuestas = await pedirNombres(vista.peticiones, opts.transporte ?? transporteReal, {
    alAvanzar: opts.alAvanzar,
    ...(opts.pausaMs === undefined ? {} : { pausaMs: opts.pausaMs }),
  });

  // ── LA FUSIÓN (pura). Cruza recorrido de hoy × oficial ──────────────────────
  const indice = fundirCorrespondencias(respuestas, vista.oficial);
  const c = indice.contadores;

  // L1 · el contador de control, INDEPENDIENTE de la fusión: lo que se pidió tiene
  // que ser lo que respondió más lo que falló. Revienta antes de publicar nada.
  control(
    'sentidos del barrido de correspondencias',
    c.esperadas,
    c.respondidas + c.fallidas,
    'respondidas + fallidas TIENE que ser las esperadas (= nº de sentidos del GTFS)',
  );

  // ── EL SUELO. Por debajo, NO se sobrescribe el índice bueno ─────────────────
  if (!alcanzaElSuelo(c)) {
    return {
      estado: 'suelo',
      contadores: c,
      avisos: indice.avisos,
      ratio: c.esperadas === 0 ? 0 : c.respondidas / c.esperadas,
      habiaIndice: existsSync(RUTA_INDICE),
      ms: Date.now() - t0,
    };
  }

  // ── LAS COORDENADAS FIJADAS de los solo-barrido (avanza-web u observacion_propia) ──
  const coords: Record<string, CoordFijada> = existsSync(COORDS)
    ? ((JSON.parse(readFileSync(COORDS, 'utf8')) as { postes?: Record<string, CoordFijada> }).postes ?? {})
    : {};

  let sinCoordenadas = 0;
  let conCoordResuelta = 0;
  const postesEscritos: Record<number, EntradaEscrita> = {};
  for (const [posteStr, e] of Object.entries(indice.postes)) {
    const poste = Number(posteStr);
    if (!e.sinCoordenadas) {
      postesEscritos[poste] = { normales: e.normales, provisionales: e.provisionales };
      continue;
    }
    const co = coords[posteStr];
    if (co) {
      conCoordResuelta++;
      postesEscritos[poste] = fijarCoordenada(e, co);
    } else {
      sinCoordenadas++;
      postesEscritos[poste] = {
        normales: e.normales,
        provisionales: e.provisionales,
        nombre: e.nombre,
        sinCoordenadas: true,
      };
    }
  }

  // ── EL ARTEFACTO. `generadoEn` se pone AL FINAL, cuando todo ha cuadrado ────
  const artefacto = {
    generadoEn: ahora.toISOString(),
    fuente: 'avanza-web:get_stops_list',
    barrido: {
      sentidosEsperados: c.esperadas,
      sentidosRespondidos: c.respondidas,
      sentidosFallidos: c.fallidas,
      sentidosSospechosos: c.sospechosos,
      postesGtfs: c.postesGtfs,
      postesSoloBarrido: c.postesSoloBarrido,
      postesSinCoordenadas: sinCoordenadas,
      postesConProvisional: c.postesConProvisional,
      lineasDesviadas: c.lineasDesviadas,
      incidencias: c.incidencias,
    },
    postes: postesEscritos,
  };

  // ── ESCRITURA ATÓMICA: tmp → releer y re-verificar → .bak → rename ──────────
  // ⚠️ El temporal lleva el PID, y NO es manía: si dos procesos barrieran a la vez
  //    (el cerrojo es por proceso, ver arriba) un `.tmp` de nombre fijo sería el
  //    MISMO fichero para los dos, y el `rename` publicaría un híbrido. Es la
  //    cicatriz de `fetch-gtfs.ts`, aplicada aquí antes de que la produzca.
  mkdirSync(dirname(RUTA_INDICE), { recursive: true });
  const tmp = `${RUTA_INDICE}.${process.pid}.tmp`;
  const texto = JSON.stringify(artefacto);
  try {
    writeFileSync(tmp, texto);

    // Re-verificación del fichero ESCRITO (no del objeto en memoria): que se relea,
    // se parsee, y que el nº de postes coincida. Un fichero que no se relee no vale.
    const releido = JSON.parse(readFileSync(tmp, 'utf8')) as typeof artefacto;
    const nEsperado = Object.keys(postesEscritos).length;
    const nReleido = Object.keys(releido.postes).length;
    if (nReleido !== nEsperado || typeof releido.generadoEn !== 'string') {
      throw new Error(
        `el índice escrito no se relee bien: ${nReleido} postes (esperados ${nEsperado}) o falta generadoEn. No se publica.`,
      );
    }

    if (existsSync(RUTA_INDICE)) copyFileSync(RUTA_INDICE, `${RUTA_INDICE}.bak`);
    renameSync(tmp, RUTA_INDICE); // atómico: el lector nunca ve un fichero a medias
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      /* si no está, mejor */
    }
    throw e;
  }

  // El lector (`@/engine/correspondencias`) cachea por `mtime`: el rename cambia el
  // mtime, así que la próxima lectura trae el índice nuevo sin reiniciar nada.
  return {
    estado: 'publicado',
    generadoEn: artefacto.generadoEn,
    contadores: c,
    avisos: indice.avisos,
    postes: Object.keys(postesEscritos).length,
    sinCoordenadas,
    conCoordResuelta,
    bytes: texto.length,
    ms: Date.now() - t0,
  };
}

export { RATIO_SUELO };
