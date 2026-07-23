/**
 * ⭐⭐ EL ÍNDICE DIARIO DE CORRESPONDENCIAS POR POSTE. Se pide a Avanza, se cruza con
 * el GTFS, y se escribe un artefacto que el servidor LEE EN RUNTIME.
 *
 *     npm run correspondencias:build
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Escribe `data/generated/correspondencias.json` = { poste → líneas que pasan,
 *  normales vs provisionales }, barriendo `get_stops_list` (los 74 sentidos) y
 *  cruzándolo con la ruta oficial del GTFS. La lógica pura vive —y se prueba— en
 *  `src/sources/avanza/correspondencias.ts`; aquí va la red, el disco y los contadores.
 *
 *  ⚠️ NO SE VERSIONA. `data/generated/` es dato raspado de Avanza (como nombres.json):
 *     el .gitignore lo bloquea. Vive SOLO en la máquina que lo genera. En un despliegue
 *     nuevo NO existe hasta el primer barrido → el arranque en frío es el MODO DEGRADADO,
 *     que la red de resiliencia del lector (Commit B) cubre con el GTFS.
 *
 *  ⚠️ SE LEE EN RUNTIME, no se hornea en el bundle. Un fichero que se regenera cada
 *     noche SIN build no puede importarse como `gtfs.json` (importarlo exigiría
 *     recompilar para verlo cambiar). Por eso vive en `data/generated/` y no en
 *     `src/generated/`, y el lector hace `fs.readFile`.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ CONTINGENCIA (como en build-nombres, y por el mismo motivo):
 *   · Si responde menos del suelo, NO se sobrescribe el índice bueno: sale con
 *     código 1. "Menos del 80%" no es "hoy hay muchos desvíos": es "Avanza no está".
 *   · Escritura ATÓMICA: se escribe a un `.tmp`, se RELEE y se re-verifica, se guarda
 *     una copia `.bak` del anterior, y solo entonces se renombra sobre el vivo. Nunca
 *     un fichero a medias.
 *   · Los reintentos 1h / máx 3 son del AUTOMATISMO (cron, Tanda 8). Esta ejecución a
 *     mano es UN intento: escribe, o mantiene el de ayer y sale con error.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { loadGtfs, readGtfsZip } from '@/sources/gtfs-nap';
import { pedirNombres, type PeticionDeSentido } from '@/sources/avanza/nombres';
import { transporteReal } from '@/sources/avanza/transporte';
import type { SentidoAvanza } from '@/sources/avanza/recorrido';
import {
  alcanzaElSuelo,
  fundirCorrespondencias,
  RATIO_SUELO,
  type OficialParaFusion,
  type ParQuePasa,
} from '@/sources/avanza/correspondencias';
import { control } from '@/core/control';

const GTFS = 'data/gtfs/zaragoza-gtfs.zip';
const DIR_OUT = 'data/generated';
const OUT = `${DIR_OUT}/correspondencias.json`;
const COORDS = 'data/postes-solo-barrido-coordenadas.json';

/** El sentido de Avanza por `direction_id` del GTFS. Igual que en `desvios.ts`. */
const SENTIDO_AVANZA: Record<0 | 1, SentidoAvanza> = { 0: -1, 1: -2 };

// El suelo (`RATIO_SUELO`) y la decisión (`alcanzaElSuelo`) viven en
// `@/sources/avanza/correspondencias`: una fuente, con test propio. Aquí se DELEGA.

/** La coordenada a mano de un poste solo-barrido (observacion_propia). */
interface CoordObservada {
  readonly lat: number;
  readonly lon: number;
  readonly quien: string;
  readonly fecha: string;
  readonly comoLoSupe: string;
}

/** Una entrada del artefacto tal y como se ESCRIBE (más rica que la de la fusión pura). */
interface EntradaEscrita {
  readonly normales: readonly ParQuePasa[];
  readonly provisionales: readonly ParQuePasa[];
  readonly nombre?: string;
  readonly sinCoordenadas?: true;
  readonly lat?: number;
  readonly lon?: number;
  readonly coordProc?: CoordObservada & { readonly confidence: 'observacion_propia' };
}

async function main(): Promise<void> {
  const t0 = Date.now();
  const ahora = new Date();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ZETABUS · ÍNDICE DE CORRESPONDENCIAS (get_stops_list)       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ── El GTFS: de aquí salen las peticiones y la ruta oficial contra la que cruzar ─
  const gtfs = loadGtfs(readGtfsZip(GTFS), { modes: ['bus'], now: ahora });
  const shortDe = new Map(gtfs.lines.map((l) => [String(l.id), l.shortName]));

  // Postes de la ruta oficial de cada (shortName, directionId), y todos los del GTFS.
  const postesOficiales = new Map<string, Set<number>>();
  for (const d of gtfs.directions) {
    const short = shortDe.get(String(d.lineId));
    if (!short) continue;
    const set = new Set<number>();
    for (const sid of d.official.stops) {
      const poste = gtfs.posteByStopId[sid];
      if (poste !== undefined) set.add(poste);
    }
    postesOficiales.set(`${short}|${d.directionId}`, set);
  }
  const postesGtfs = new Set<number>(Object.values(gtfs.posteByStopId));

  const peticiones: PeticionDeSentido[] = [];
  for (const d of gtfs.directions) {
    const short = shortDe.get(String(d.lineId));
    if (!short) continue;
    peticiones.push({ lineaEtiqueta: short, sentido: SENTIDO_AVANZA[d.directionId] });
  }

  console.log(`  ${gtfs.lines.length} líneas · ${peticiones.length} sentidos → ${peticiones.length} peticiones`);
  console.log(`  ritmo ~1,5 s · ~${Math.round((peticiones.length * 1.5) / 60)} min · a gps... paciencia.\n`);

  // ── La red. Se reutiliza `pedirNombres`: devuelve los postes ORDENADOS por sentido,
  //    que es justo lo que aquí hace falta (el nombre lo aprovechamos para los solo-barrido).
  const respuestas = await pedirNombres(peticiones, transporteReal, {
    alAvanzar: (hechas, total, ultima) => {
      const marca = ultima.ok ? '·' : '✗';
      const detalle = ultima.ok ? `${ultima.postes.length} postes` : ultima.motivo.slice(0, 60);
      process.stdout.write(
        `\r  ${marca} ${String(hechas).padStart(3)}/${total}  ` +
          `${ultima.peticion.lineaEtiqueta}/${ultima.peticion.sentido}  (${detalle})`.padEnd(70),
      );
    },
  });
  process.stdout.write('\n\n');

  // ── La fusión (pura). Cruza recorrido de hoy × oficial. Cuenta y se autoverifica ──
  const oficial: OficialParaFusion = {
    postesDeSentido: (linea, dir) => postesOficiales.get(`${linea}|${dir}`),
    postesGtfs,
  };
  const indice = fundirCorrespondencias(respuestas, oficial);
  const c = indice.contadores;

  console.log('CONTADOR DE CONTROL (L1)\n');
  control('sentidos del barrido de correspondencias', c.esperadas, c.respondidas + c.fallidas,
    'respondidas + fallidas TIENE que ser las esperadas (= nº de sentidos del GTFS)');
  console.log(`  ✅ ${String(c.esperadas).padStart(4)}   peticiones esperadas (= sentidos)`);
  console.log(`  ✅ ${String(c.respondidas).padStart(4)}   respondieron`);
  console.log(`  ${c.fallidas > 0 ? '⚠️ ' : '✅ '}${String(c.fallidas).padStart(4)}   fallaron`);
  console.log(`  ${c.sospechosos > 0 ? '⚠️ ' : '✅ '}${String(c.sospechosos).padStart(4)}   sentidos con lectura sospechosa (freno de mano: sus provisionales no se marcan)`);
  console.log(`  ✅ ${String(c.incidencias).padStart(4)}   pares (poste, línea, sentido) en el índice`);
  console.log(`  ✅ ${String(c.postesGtfs).padStart(4)}   postes del GTFS con correspondencias`);
  console.log(`  ${c.postesSoloBarrido > 0 ? '⚠️ ' : '✅ '}${String(c.postesSoloBarrido).padStart(4)}   postes SOLO-barrido (no están en el GTFS)`);
  console.log(`  ${c.postesConProvisional > 0 ? '⚠️ ' : '✅ '}${String(c.postesConProvisional).padStart(4)}   postes con alguna correspondencia PROVISIONAL hoy`);
  console.log(`  ${c.lineasDesviadas > 0 ? '⚠️ ' : '✅ '}${String(c.lineasDesviadas).padStart(4)}   líneas desviadas hoy (con alguna provisional)\n`);

  if (indice.avisos.length > 0) {
    console.log('AVISOS (no fatales, pero se dicen)\n');
    for (const a of indice.avisos) console.log(`  ⚠️  ${a}`);
    console.log('');
  }

  // ── EL SUELO. Por debajo, NO se sobrescribe el índice bueno ──────────────────
  const ratio = c.esperadas === 0 ? 0 : c.respondidas / c.esperadas;
  if (!alcanzaElSuelo(c)) {
    console.error(
      `\n⛔ SOLO RESPONDIÓ EL ${Math.round(ratio * 100)}% DE AVANZA (mínimo ${RATIO_SUELO * 100}%).\n` +
        '   Esto no es un índice parcial por desvíos: es que Avanza no está respondiendo.\n' +
        (existsSync(OUT)
          ? `   NO se toca el índice bueno que ya hay en ${OUT}. Se mantiene el de ayer. Reintenta más tarde.\n`
          : `   No hay índice previo. El lector funcionará en MODO DEGRADADO (normales del GTFS, sin provisionales).\n`),
    );
    process.exit(1);
  }

  // ── LAS COORDENADAS A MANO (observacion_propia). Se funden en los solo-barrido ──
  const coords: Record<string, CoordObservada> = existsSync(COORDS)
    ? (JSON.parse(readFileSync(COORDS, 'utf8')).postes ?? {})
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
    // Solo-barrido: ¿tiene coordenada resuelta a mano?
    const co = coords[posteStr];
    if (co) {
      conCoordResuelta++;
      postesEscritos[poste] = {
        normales: e.normales,
        provisionales: e.provisionales,
        nombre: e.nombre,
        lat: co.lat,
        lon: co.lon,
        coordProc: { ...co, confidence: 'observacion_propia' },
      };
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

  if (sinCoordenadas > 0) {
    console.log(
      `⚠️  ${sinCoordenadas} poste(s) solo-barrido SIN coordenada a mano todavía. Están en el índice y en\n` +
        `    /api/diag, pero no se pueden pintar en el mapa. Se resuelven UNA VEZ en ${COORDS}.\n`,
    );
  }
  if (conCoordResuelta > 0) {
    console.log(`  ✅ ${conCoordResuelta} poste(s) solo-barrido con coordenada ya resuelta a mano.\n`);
  }

  // ── EL ARTEFACTO. `generadoEn` se pone AL FINAL, cuando todo ha cuadrado ──────
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

  // ── ESCRITURA ATÓMICA: tmp → releer y re-verificar → .bak → rename ───────────
  mkdirSync(DIR_OUT, { recursive: true });
  const tmp = `${OUT}.tmp`;
  writeFileSync(tmp, JSON.stringify(artefacto));

  // Re-verificación del fichero ESCRITO (no del objeto en memoria): que se relea, se
  // parsee, y que el nº de postes coincida. Un fichero que no se puede releer no vale.
  const releido = JSON.parse(readFileSync(tmp, 'utf8')) as typeof artefacto;
  const nEsperado = Object.keys(postesEscritos).length;
  const nReleido = Object.keys(releido.postes).length;
  if (nReleido !== nEsperado || typeof releido.generadoEn !== 'string') {
    throw new Error(
      `el índice escrito no se relee bien: ${nReleido} postes (esperados ${nEsperado}) o falta generadoEn. No se publica.`,
    );
  }

  if (existsSync(OUT)) copyFileSync(OUT, `${OUT}.bak`);
  renameSync(tmp, OUT); // atómico: el lector nunca ve un fichero a medias

  const bytes = JSON.stringify(artefacto).length;
  console.log(`  → ${OUT}  (${Object.keys(postesEscritos).length} postes · ${(bytes / 1024).toFixed(0)} KB)`);
  console.log(`\n✅ Índice de correspondencias generado en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
}

main().catch((e) => {
  console.error('\n⛔ La generación del índice de correspondencias ha fallado:\n', e);
  process.exit(1);
});
