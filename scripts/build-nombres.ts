/**
 * ⭐⭐ A1 · LA CAPA DE NOMBRES SE PIDE AL OPERADOR, EN EL BUILD, UNA VEZ.
 *
 *     npm run nombres:build
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Escribe `src/generated/nombres.json` = { poste → nombre bueno }, sacado de
 *  `get_stops_list`, el mismo endpoint de los desvíos. `build-data.ts` lo lee
 *  después y lo aplica a las paradas, con su procedencia campo a campo.
 *
 *  ⚠️ NO SE COMMITEA. `src/generated/` está gitignorado entero. Es dato scrapeado
 *     de Avanza: consumirlo no es publicarlo. Igual que el GTFS, que se descarga
 *     con `gtfs:fetch` y tampoco entra al repo.
 *
 *  ⚠️ NO va dentro de `npm run build`. Va aparte, a propósito, como `gtfs:fetch`:
 *     si estuviera en cada build, martillearíamos a Avanza en cada CI y en cada
 *     `next build` de desarrollo. Se ejecuta cuando quieres REFRESCAR los nombres.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐⭐ QUÉ PASA SI AVANZA ESTÁ CAÍDA DURANTE EL BUILD. Está DISEÑADO, en dos capas:
 *
 *   1. ESTE script (la petición) PUEDE fallar, y falla RUIDOSAMENTE. Si responden
 *      menos sentidos que el umbral, NO sobrescribe la tabla buena que ya hay en
 *      disco: sale con código 1 y lo dice. "Menos de X de 74" no es "hay desvíos":
 *      es "no llego a Avanza", y una tabla 90 % vacía NO puede tener la misma pinta
 *      que una con cobertura buena. El que despliega decide: reintenta, o despliega
 *      con la última tabla buena.
 *
 *   2. `build-data.ts` (el build de la app) NUNCA falla por los nombres. Si la tabla
 *      falta del todo, usa el GTFS ENTERO, MARCADO como sin confirmar, y lo dice.
 *      Acoplar el despliegue de un arreglo a que Avanza tenga un buen día, por una
 *      capa cosmética, es el intercambio equivocado. La app SIEMPRE puede desplegar.
 *
 * ⚠️ Y "a medio pedir" NO PASA EN SILENCIO: el contador de control (L1) enseña
 *    esperadas / respondidas / caídas, y una tabla parcial legítima (desvíos) se
 *    distingue de una caída (umbral) por el número, no por la fe.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadGtfs, readGtfsZip } from '@/sources/gtfs-nap';
import { fundirNombres, pedirNombres, type PeticionDeSentido } from '@/sources/avanza/nombres';
import { transporteReal } from '@/sources/avanza/transporte';
import type { SentidoAvanza } from '@/sources/avanza/recorrido';

const GTFS = 'data/gtfs/zaragoza-gtfs.zip';
const OUT = 'src/generated/nombres.json';

/** El sentido de Avanza por `direction_id` del GTFS. Igual que en `desvios.ts`. */
const SENTIDO_AVANZA: Record<0 | 1, SentidoAvanza> = { 0: -1, 1: -2 };

/**
 * ⚠️ EL SUELO. Por debajo de esto NO es "hay desvíos": es "Avanza no responde".
 * Un día normal, todas o casi todas las líneas contestan; un puñado de sentidos
 * puede fallar por un timeout suelto y no pasa nada. Pero si contesta menos del
 * 80 %, lo que tenemos no es una tabla parcial: es una tabla ROTA con pinta de
 * parcial, y esas no se escriben.
 */
const MIN_RESPONDIDAS = 0.8;

/**
 * ⚠️ TODO VA DENTRO DE `main()`, NO SUELTO. `tsx` compila estos scripts a CommonJS,
 *    y CJS NO admite `await` de primer nivel: un `const x = await ...` en la raíz
 *    del fichero NO ARRANCA (falla en la transformación, antes de tocar la red).
 *    Se envuelve en una función async y se llama al final con `.catch`.
 */
async function main(): Promise<void> {
const t0 = Date.now();
const ahora = new Date();

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  ZETABUS · CAPA DE NOMBRES (get_stops_list de Avanza)        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ── Las peticiones salen del GTFS: una por cada sentido de cada línea ─────────
const gtfs = loadGtfs(readGtfsZip(GTFS), { modes: ['bus'], now: ahora });
const etiquetaPorLinea = new Map(gtfs.lines.map((l) => [String(l.id), l.shortName]));

const peticiones: PeticionDeSentido[] = [];
for (const d of gtfs.directions) {
  const etiqueta = etiquetaPorLinea.get(String(d.lineId));
  if (!etiqueta) continue;
  peticiones.push({ lineaEtiqueta: etiqueta, sentido: SENTIDO_AVANZA[d.directionId] });
}

console.log(`  ${gtfs.lines.length} líneas · ${peticiones.length} sentidos → ${peticiones.length} peticiones`);
console.log(`  ritmo ~1,5 s · ~${Math.round((peticiones.length * 1.5) / 60)} min · a gps... paciencia.\n`);

// ── La red. Con barra de avance, para no mirar a una pantalla muerta ─────────
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

const tabla = fundirNombres(respuestas);
const c = tabla.contadores;

// ── ⭐ CONTADOR DE CONTROL (L1). Esperadas, respondidas, caídas. Y que cuadre ──
console.log('CONTADOR DE CONTROL (L1)\n');
console.log(`  ✅ ${String(c.esperadas).padStart(4)}   peticiones esperadas (= sentidos)`);
console.log(`  ✅ ${String(c.respondidas).padStart(4)}   respondieron`);
console.log(`  ${c.fallidas > 0 ? '⚠️ ' : '✅ '}${String(c.fallidas).padStart(4)}   fallaron (esos postes caerán al GTFS marcado)`);
console.log(`  ✅ ${String(c.postesConNombre).padStart(4)}   postes distintos con nombre de Avanza`);
if (c.vacios > 0) console.log(`  ⚠️  ${String(c.vacios).padStart(4)}   nombres vacíos descartados (no son un nombre)`);

// El recuento independiente: respondidas + fallidas TIENE que ser esperadas.
if (c.respondidas + c.fallidas !== c.esperadas) {
  throw new Error(
    `el contador no cuadra: ${c.respondidas} + ${c.fallidas} ≠ ${c.esperadas}. ` +
      'O se ha perdido una petición en silencio, o se ha contado dos veces. No se escribe una tabla que no cuadra.',
  );
}

if (tabla.discrepancias.length > 0) {
  console.log(`\n⚠️  ${tabla.discrepancias.length} POSTE(S) CON NOMBRE DISTINTO EN DOS SENTIDOS (se usa el primero):`);
  for (const d of tabla.discrepancias.slice(0, 10)) {
    console.log(`     poste ${d.poste}: ${d.nombres.map((n) => `"${n}"`).join('  vs  ')}`);
  }
  if (tabla.discrepancias.length > 10) console.log(`     …y ${tabla.discrepancias.length - 10} más.`);
}

// ── ⛔ EL SUELO. Por debajo, NO se sobrescribe la tabla buena ─────────────────
const ratio = c.esperadas === 0 ? 0 : c.respondidas / c.esperadas;
if (ratio < MIN_RESPONDIDAS) {
  console.error(
    `\n⛔ SOLO RESPONDIÓ EL ${Math.round(ratio * 100)}% DE AVANZA (mínimo ${MIN_RESPONDIDAS * 100}%).\n` +
      '   Esto no es una tabla parcial por desvíos: es que Avanza no está respondiendo.\n' +
      (existsSync(OUT)
        ? `   NO se toca la tabla buena que ya hay en ${OUT}. Reintenta más tarde,\n` +
          '   o despliega con la última buena (build-data usará esa).\n'
        : `   No hay tabla previa. build-data usará el GTFS entero MARCADO, y lo dirá.\n`),
  );
  process.exit(1);
}

// ── Se escribe. Con su fecha y sus contadores dentro ─────────────────────────
mkdirSync('src/generated', { recursive: true });
const artefacto = {
  generatedAt: ahora.toISOString(),
  fuente: 'avanza-web' as const,
  url: 'https://zaragoza.avanzagrupo.com/wp-admin/admin-ajax.php?action=get_stops_list',
  porPoste: tabla.porPoste,
  discrepancias: tabla.discrepancias,
  contadores: tabla.contadores,
};

// ⚠️ Aviso si la nueva tabla trae MUCHOS menos postes que la anterior: puede ser
//    legítimo (más desvíos hoy), pero es justo la clase de bajón que hay que MIRAR.
if (existsSync(OUT)) {
  try {
    const previa = JSON.parse(readFileSync(OUT, 'utf8')) as { porPoste?: Record<string, string> };
    const antes = Object.keys(previa.porPoste ?? {}).length;
    if (antes > 0 && c.postesConNombre < antes * 0.9) {
      console.log(
        `\n⚠️  La tabla anterior cubría ${antes} postes y esta cubre ${c.postesConNombre}. ` +
          'Cae más de un 10 %. Puede ser normal (más desvíos), pero míralo.',
      );
    }
  } catch { /* si la previa no se puede leer, no es un motivo para no escribir la nueva */ }
}

writeFileSync(OUT, JSON.stringify(artefacto));
console.log(`\n  → ${OUT}  (${c.postesConNombre} nombres)`);
console.log(`\n✅ Capa de nombres generada en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
}

main().catch((e) => {
  console.error('\n⛔ La generación de la capa de nombres ha fallado:\n', e);
  process.exit(1);
});
