/**
 * ⭐⭐ EL ÍNDICE DE CORRESPONDENCIAS POR POSTE. La pieza nueva del motor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA IDEA (de Antonio): un artefacto que, para CADA poste, diga qué líneas
 *  pasan por él — separando las de siempre de las que hoy pasan por un desvío.
 *
 *      correspondenciasNormales       el par (poste, línea·sentido) SÍ está en la
 *                                     ruta OFICIAL de esa línea.
 *      correspondenciasProvisionales  hoy el autobús pasa por ahí, pero NO está en
 *                                     la ruta oficial → lo ha traído un desvío.
 *
 *  Se genera barriendo `get_stops_list` (el recorrido REAL de hoy) de los 74
 *  sentidos y cruzándolo con la ruta oficial del GTFS. Es el mismo endpoint —y el
 *  mismo parser— que la capa de nombres y los desvíos: aquí NO hay red nueva.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ POR QUÉ ITERAR EL RECORRIDO DE HOY, Y NO EL OFICIAL. Es lo que hace el índice
 *    honesto de VERDAD: una línea cuyo oficial pasa por P pero que HOY va desviada
 *    lejos de P **no aparece en P** (P no está en su recorrido de hoy). Así las
 *    `normales` también son de HOY —no "habituales"—: una correspondencia que sale
 *    del índice es una línea que HOY pasa por ahí. El que la pinta ya no necesita
 *    matizar "habitualmente" en las que vienen del fichero.
 *
 * ⚠️ EL SENTIDO SE CONSERVA, y no es un capricho: en una marquesina la pregunta no
 *    es "¿para aquí el 36?" sino "¿el 36 que para aquí va hacia DONDE YO VOY?". Por
 *    eso cada par lleva su `directionId` (el destino se deriva de él en pantalla). Y
 *    hay un motivo técnico que lo hace irreversible: **el sentido de una PROVISIONAL
 *    no se puede recuperar después del barrido** —no está en el oficial, así que no
 *    hay de dónde sacarlo—. Si no se guarda ahora, se pierde para siempre.
 *
 * ⚠️ LA PARTE PURA (esta) NO TOCA LA RED. Se le pasan los recorridos ya leídos y la
 *    ruta oficial, y devuelve el índice + los contadores. Así se prueba sin Avanza.
 *    La red vive en `pedirNombres` (se reutiliza tal cual: devuelve lo mismo).
 */

import type { RespuestaDeSentido } from './nombres';
import type { SentidoAvanza } from './recorrido';
import { UMBRAL_ABSURDO } from '@/engine/desvios';
import { assertCount } from '@/core/control';

/**
 * `directionId` del GTFS por el sentido de Avanza. Es el INVERSO del `SENTIDO_AVANZA`
 * de `desvios.ts` (`{0:-1, 1:-2}`). Se declara aquí, como en `build-nombres.ts`, con
 * este comentario que lo ata a su origen: la fuente de la verdad es `desvios.ts`.
 */
const direccionDeSentido = (s: SentidoAvanza): 0 | 1 => (s === -1 ? 0 : 1);

/** Una línea que pasa por un poste, con su sentido. `linea` = shortName del GTFS. */
export interface ParQuePasa {
  readonly linea: string;
  readonly sentido: 0 | 1;
}

/**
 * Lo que el índice sabe de un poste. Para los postes del GTFS se guardan SOLO las
 * correspondencias: el nombre y las coordenadas ya están en el GTFS y duplicarlos
 * aquí sería crear una segunda fuente que se desincroniza. Para los postes que solo
 * aparecen en el barrido (no están en el GTFS) se guarda además el `nombre` que da
 * Avanza —el GTFS no lo tiene— y se marca `sinCoordenadas` hasta que alguien la
 * resuelva a mano (get_stops_list NO da lat/lon: medido).
 */
export interface CorrespondenciasDePoste {
  readonly normales: readonly ParQuePasa[];
  readonly provisionales: readonly ParQuePasa[];
  readonly nombre?: string;
  readonly sinCoordenadas?: true;
}

export interface ContadoresCorrespondencias {
  /** Peticiones que se esperaba hacer (= nº de sentidos). */
  readonly esperadas: number;
  readonly respondidas: number;
  readonly fallidas: number;
  /**
   * ⚠️ Sentidos cuyo recorrido de hoy llegó ABSURDAMENTE corto (más del
   * `UMBRAL_ABSURDO` de las paradas oficiales ausentes): son lecturas rotas con
   * pinta de desvío. De esos NO se fía la clasificación de provisionales (ver abajo).
   */
  readonly sospechosos: number;
  readonly postesGtfs: number;
  readonly postesSoloBarrido: number;
  /** Postes con AL MENOS una correspondencia provisional hoy. */
  readonly postesConProvisional: number;
  /** Líneas distintas con al menos una provisional hoy. */
  readonly lineasDesviadas: number;
  /** Total de pares (poste, línea, sentido) del índice. El recuento que se cruza. */
  readonly incidencias: number;
}

export interface IndiceCorrespondencias {
  readonly postes: Record<number, CorrespondenciasDePoste>;
  readonly contadores: ContadoresCorrespondencias;
  readonly avisos: readonly string[];
}

/** La ruta oficial que la fusión necesita del GTFS. Datos planos, para probar sin él. */
export interface OficialParaFusion {
  /** Postes de la ruta OFICIAL de un (shortName, directionId). `undefined` = no consta. */
  readonly postesDeSentido: (linea: string, dir: 0 | 1) => ReadonlySet<number> | undefined;
  /** Todos los postes que existen en el GTFS. Uno fuera = solo-barrido. */
  readonly postesGtfs: ReadonlySet<number>;
}

type Acumulado = {
  readonly normales: Map<string, ParQuePasa>;
  readonly provisionales: Map<string, ParQuePasa>;
  nombre?: string;
  soloBarrido: boolean;
};

const clavePar = (linea: string, dir: 0 | 1): string => `${linea}|${dir}`;

/**
 * ⭐ LA FUSIÓN. Pura: recorridos de hoy + ruta oficial → índice. Sin red, sin reloj.
 *
 * `incidenciasAlInsertar` cuenta cada par NUEVO en el momento de insertarlo; al final
 * se recuenta recorriendo el índice ya montado. Los dos números tienen que coincidir
 * (L1): si el índice se hubiera mutado por otro camino, no cuadrarían y revienta —no
 * se hornea un artefacto que no cuadra.
 */
export function fundirCorrespondencias(
  respuestas: readonly RespuestaDeSentido[],
  oficial: OficialParaFusion,
): IndiceCorrespondencias {
  const acc = new Map<number, Acumulado>();
  const avisos: string[] = [];
  let respondidas = 0;
  let fallidas = 0;
  let sospechosos = 0;
  let incidenciasAlInsertar = 0;

  const dameAcc = (poste: number): Acumulado => {
    let a = acc.get(poste);
    if (!a) {
      a = { normales: new Map(), provisionales: new Map(), soloBarrido: !oficial.postesGtfs.has(poste) };
      acc.set(poste, a);
    }
    return a;
  };

  for (const r of respuestas) {
    if (!r.ok) { fallidas++; continue; }
    respondidas++;

    const linea = r.peticion.lineaEtiqueta;
    const dir = direccionDeSentido(r.peticion.sentido);
    const oficialDeEste = oficial.postesDeSentido(linea, dir) ?? new Set<number>();

    // ── EL FRENO DE MANO, prestado de `desvios.ts`. Si el recorrido de hoy se ha
    //    "comido" más del UMBRAL de las paradas oficiales, ESO NO ES UN DESVÍO: es una
    //    lectura rota. No se fabrican provisionales con una respuesta a medias. Lo que
    //    SÍ se conserva son las paradas que están en el oficial (esas son normales sí o
    //    sí, venga la respuesta entera o truncada). Solo se descarta lo dudoso.
    const ausentes = [...oficialDeEste].filter((p) => !r.postes.some((q) => q.poste === p)).length;
    const truncado = oficialDeEste.size > 0 && ausentes / oficialDeEste.size > UMBRAL_ABSURDO;
    if (truncado) {
      sospechosos++;
      avisos.push(
        `${linea}/${r.peticion.sentido}: el recorrido de hoy no incluye el ` +
          `${Math.round((ausentes / oficialDeEste.size) * 100)}% de las paradas oficiales ` +
          `(${ausentes} de ${oficialDeEste.size}). Lectura sospechosa: no se marca ninguna provisional de este sentido.`,
      );
    }

    for (const p of r.postes) {
      const enOficial = oficialDeEste.has(p.poste);
      // truncado + NO-oficial → se calla: no se sabe si es desvío o respuesta rota. Ni
      // se registra el par ni se crea la entrada (si no, el poste quedaría vacío).
      if (!enOficial && truncado) continue;

      const a = dameAcc(p.poste);
      if (a.soloBarrido && a.nombre === undefined && p.nombre.trim() !== '') a.nombre = p.nombre.trim();

      const k = clavePar(linea, dir);
      if (enOficial) {
        if (!a.normales.has(k)) { a.normales.set(k, { linea, sentido: dir }); incidenciasAlInsertar++; }
      } else {
        // No está en el oficial y la lectura es de fiar → provisional del desvío de hoy.
        if (!a.provisionales.has(k)) { a.provisionales.set(k, { linea, sentido: dir }); incidenciasAlInsertar++; }
      }
    }
  }

  // ── Del acumulador al índice, en orden estable (por línea·sentido) ───────────
  const ordenar = (m: Map<string, ParQuePasa>): ParQuePasa[] =>
    [...m.values()].sort(
      (a, b) => a.linea.localeCompare(b.linea, 'es', { numeric: true }) || a.sentido - b.sentido,
    );

  const postes: Record<number, CorrespondenciasDePoste> = {};
  const lineasConProvisional = new Set<string>();
  let postesConProvisional = 0;
  let postesSoloBarrido = 0;
  let incidencias = 0;

  for (const [poste, a] of [...acc.entries()].sort((x, y) => x[0] - y[0])) {
    const normales = ordenar(a.normales);
    const provisionales = ordenar(a.provisionales);
    incidencias += normales.length + provisionales.length;

    // ⚠️ Un poste que se quedó sin NINGUNA correspondencia es un bug: solo se creó su
    //    entrada porque se le vio en algún recorrido. No debería pasar; se afirma.
    if (normales.length === 0 && provisionales.length === 0) {
      throw new Error(`el poste ${poste} entró en el índice sin ninguna correspondencia. Es un bug de la fusión.`);
    }

    if (provisionales.length > 0) {
      postesConProvisional++;
      for (const par of provisionales) lineasConProvisional.add(par.linea);
    }

    const entrada: CorrespondenciasDePoste = a.soloBarrido
      ? { normales, provisionales, nombre: a.nombre ?? `poste ${poste}`, sinCoordenadas: true }
      : { normales, provisionales };
    if (a.soloBarrido) postesSoloBarrido++;
    postes[poste] = entrada;
  }

  // ⭐ EL RECUENTO INDEPENDIENTE (L1): pares contados al insertar === pares contados
  //    recorriendo el índice final. Dos traversías distintas del mismo hecho.
  assertCount(
    'pares (poste,línea,sentido) del índice de correspondencias',
    incidenciasAlInsertar,
    incidencias,
    'contados al insertar cada par nuevo vs. sumando los arrays del índice ya montado (dos recorridos distintos)',
  );

  return {
    postes,
    avisos,
    contadores: {
      esperadas: respuestas.length,
      respondidas,
      fallidas,
      sospechosos,
      postesGtfs: [...acc.values()].filter((a) => !a.soloBarrido).length,
      postesSoloBarrido,
      postesConProvisional,
      lineasDesviadas: lineasConProvisional.size,
      incidencias,
    },
  };
}

/**
 * ⭐ EL SUELO. Por debajo, `build-correspondencias.ts` NO sobrescribe el índice bueno:
 * "menos del 80% respondió" NO es "hoy hay muchos desvíos", es "Avanza no está" — y un
 * fichero con 40 de 74 sentidos parece completo y no lo es (un silencio falso en disco).
 *
 * ⚠️ Vive AQUÍ, con la fusión que produce los contadores que juzga, y NO inline en el
 *    script, por un motivo de método: la garantía "NUNCA un fichero parcial" tiene que
 *    poder PROBARSE. Si la lógica estuviera copiada en el script, el test probaría una
 *    copia —una afirmación duplicada, no el código que corre (L42/L43)—. El script
 *    DELEGA en esta función; el test la prueba a ella; es la misma que decide de verdad.
 *
 * `esperadas === 0` → no alcanza (no hay nada que publicar, no un 0/0 que colar).
 */
export const RATIO_SUELO = 0.8;

export function alcanzaElSuelo(c: Pick<ContadoresCorrespondencias, 'esperadas' | 'respondidas'>): boolean {
  return c.esperadas > 0 && c.respondidas / c.esperadas >= RATIO_SUELO;
}
