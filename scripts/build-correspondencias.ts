/**
 * ⭐⭐ EL ÍNDICE DIARIO DE CORRESPONDENCIAS POR POSTE, DESDE LA TERMINAL.
 *
 *     npm run correspondencias:build
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ ESTE FICHERO YA NO BARRE: IMPRIME.
 *
 *  El barrido entero —red, fusión, contadores, suelo y escritura atómica— vive en
 *  `src/engine/barrido.ts`, porque tiene DOS bocas: esta línea de comandos y
 *  `POST /api/regenerar`, que es lo único que un cron puede pulsar en un hosting
 *  sin SSH. Dos copias del código que produce el MISMO artefacto acabarían
 *  divergiendo sin que nadie se entere; por eso hay una sola, y aquí queda la
 *  presentación: los recuadros, los contadores en pantalla y el código de salida.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Escribe `data/generated/correspondencias.json` = { poste → líneas que pasan,
 * normales vs provisionales }, barriendo `get_stops_list` (los 74 sentidos) y
 * cruzándolo con la ruta oficial del GTFS.
 *
 * ⚠️ NO SE VERSIONA. `data/generated/` es dato raspado de Avanza (como nombres.json):
 *    el .gitignore lo bloquea. Vive SOLO en la máquina que lo genera. En un despliegue
 *    nuevo NO existe hasta el primer barrido → el arranque en frío es el MODO DEGRADADO,
 *    que la red de resiliencia del lector cubre con el GTFS.
 *
 * ⭐ CONTINGENCIA: si responde menos del suelo, NO se sobrescribe el índice bueno y
 *    se sale con código 1. «Menos del 80 %» no es «hoy hay muchos desvíos»: es «Avanza
 *    no está». Esta ejecución a mano es UN intento: escribe, o mantiene el de ayer.
 */
import { barrerCorrespondencias, RATIO_SUELO } from '@/engine/barrido';
import { CODIGO_FUENTE_CAIDA } from './codigos-salida';

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ZETABUS · ÍNDICE DE CORRESPONDENCIAS (get_stops_list)       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const r = await barrerCorrespondencias({
    alEmpezar: (v) => {
      console.log(
        `  ${v.lineas} líneas · ${v.peticiones.length} sentidos → ${v.peticiones.length} peticiones`,
      );
      console.log(
        `  ritmo ~1,5 s · ~${Math.round((v.peticiones.length * 1.5) / 60)} min · a gps... paciencia.\n`,
      );
    },
    alAvanzar: (hechas, total, ultima) => {
      const marca = ultima.ok ? '·' : '✗';
      const detalle = ultima.ok ? `${ultima.postes.length} postes` : ultima.motivo.slice(0, 60);
      process.stdout.write(
        `\r  ${marca} ${String(hechas).padStart(3)}/${total}  ` +
          `${ultima.peticion.lineaEtiqueta}/${ultima.peticion.sentido}  (${detalle})`.padEnd(70),
      );
    },
  });

  if (r.estado === 'ocupado') {
    console.error(`\n⛔ Ya hay un barrido en curso en este proceso (desde hace ${Math.round(r.desdeHaceMs / 1000)} s).`);
    process.exit(1);
  }
  if (r.estado === 'error') {
    console.error('\n⛔ La generación del índice de correspondencias ha fallado:\n', r.detalle);
    process.exit(1);
  }

  process.stdout.write('\n\n');

  const c = r.contadores;
  console.log('CONTADOR DE CONTROL (L1)\n');
  console.log(`  ✅ ${String(c.esperadas).padStart(4)}   peticiones esperadas (= sentidos)`);
  console.log(`  ✅ ${String(c.respondidas).padStart(4)}   respondieron`);
  console.log(`  ${c.fallidas > 0 ? '⚠️ ' : '✅ '}${String(c.fallidas).padStart(4)}   fallaron`);
  console.log(
    `  ${c.sospechosos > 0 ? '⚠️ ' : '✅ '}${String(c.sospechosos).padStart(4)}   sentidos con lectura sospechosa (freno de mano: sus provisionales no se marcan)`,
  );
  console.log(`  ✅ ${String(c.incidencias).padStart(4)}   pares (poste, línea, sentido) en el índice`);
  console.log(`  ✅ ${String(c.postesGtfs).padStart(4)}   postes del GTFS con correspondencias`);
  console.log(
    `  ${c.postesSoloBarrido > 0 ? '⚠️ ' : '✅ '}${String(c.postesSoloBarrido).padStart(4)}   postes SOLO-barrido (no están en el GTFS)`,
  );
  console.log(
    `  ${c.postesConProvisional > 0 ? '⚠️ ' : '✅ '}${String(c.postesConProvisional).padStart(4)}   postes con alguna correspondencia PROVISIONAL hoy`,
  );
  console.log(
    `  ${c.lineasDesviadas > 0 ? '⚠️ ' : '✅ '}${String(c.lineasDesviadas).padStart(4)}   líneas desviadas hoy (con alguna provisional)\n`,
  );

  if (r.avisos.length > 0) {
    console.log('AVISOS (no fatales, pero se dicen)\n');
    for (const a of r.avisos) console.log(`  ⚠️  ${a}`);
    console.log('');
  }

  if (r.estado === 'suelo') {
    console.error(
      `\n⛔ SOLO RESPONDIÓ EL ${Math.round(r.ratio * 100)}% DE AVANZA (mínimo ${RATIO_SUELO * 100}%).\n` +
        '   Esto no es un índice parcial por desvíos: es que Avanza no está respondiendo.\n' +
        (r.habiaIndice
          ? '   NO se toca el índice bueno que ya hay. Se mantiene el de ayer. Reintenta más tarde.\n'
          : '   No hay índice previo. El lector funcionará en MODO DEGRADADO (normales del GTFS, sin provisionales).\n'),
    );
    // ⭐ Código PROPIO: «la fuente no respondió», la única caída benigna. `ensure-correspondencias`
    //    la distingue de un fallo interno (que sale con otro código) y solo esta deja continuar
    //    el build. Ver scripts/codigos-salida.ts.
    process.exit(CODIGO_FUENTE_CAIDA);
  }

  if (r.sinCoordenadas > 0) {
    console.log(
      `⚠️  ${r.sinCoordenadas} poste(s) solo-barrido SIN coordenada del feed de Avanza todavía. Están en el índice y en\n` +
        '    /api/diag, pero no se pueden pintar en el mapa. Se resuelven UNA VEZ en\n' +
        '    data/postes-solo-barrido-coordenadas.json\n',
    );
  }
  if (r.conCoordResuelta > 0) {
    console.log(`  ✅ ${r.conCoordResuelta} poste(s) solo-barrido con coordenada ya resuelta desde el feed de Avanza.\n`);
  }

  console.log(`  → índice publicado  (${r.postes} postes · ${(r.bytes / 1024).toFixed(0)} KB)`);
  console.log(`\n✅ Índice de correspondencias generado en ${(r.ms / 1000).toFixed(1)} s\n`);
}

main().catch((e) => {
  console.error('\n⛔ La generación del índice de correspondencias ha fallado:\n', e);
  process.exit(1);
});
