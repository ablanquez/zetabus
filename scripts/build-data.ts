/**
 * LA INGESTA. Se ejecuta en el BUILD, no en runtime.
 *
 * `stop_times.txt` tiene 1,1 millones de filas. Parsear el ZIP en cada arranque
 * es tirar arranque a la basura; en cada petición sería demencial. Aquí se lee
 * una vez y se emite un artefacto compacto que el servidor solo importa.
 *
 * ⚠️ FALLA RUIDOSAMENTE. Si algo no cuadra, este script revienta y el build se
 * cae. No emite un artefacto a medias con un aviso en amarillo: **un artefacto
 * a medias se despliega; un build roto, no**.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { feedStatus, feedWarning, type Mode, type Stop } from '@/core';
import { loadGtfs, readGtfsZip } from '@/sources/gtfs-nap';
import { calcularTerminales } from '@/sources/gtfs-nap/terminal';
import { loadFleet } from '@/sources/flota-zetabus/adapter';
import { aplicarNombres } from '@/sources/avanza/aplicar-nombres';

const GTFS = 'data/gtfs/zaragoza-gtfs.zip';
const FLEET = 'data/flota-avanza-zaragoza.json';
const NOMBRES = 'src/generated/nombres.json';
const OUT = 'src/generated';

/** Los modos que ZetaBus v1 sirve. El 004 añadirá 'tram' AQUÍ, y en ningún otro sitio. */
const MODES: Mode[] = ['bus'];

const now = new Date();
const t0 = Date.now();

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  ZETABUS · INGESTA DE DATOS                                  ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ── GTFS ────────────────────────────────────────────────────────────────────
const files = readGtfsZip(GTFS);
const gtfs = loadGtfs(files, { modes: MODES, now });

// ── ⭐ A1 · CAPA DE NOMBRES (avanza-web), superpuesta sobre las paradas ───────
//    Se lee la tabla que dejó `npm run nombres:build`. Si NO está, no es un error:
//    se usa el GTFS entero, MARCADO como sin confirmar, y se dice. El build NUNCA
//    se cae por esto — la app siempre puede desplegar (ver build-nombres.ts).
const tablaNombres = existsSync(NOMBRES)
  ? (JSON.parse(readFileSync(NOMBRES, 'utf8')) as { generatedAt: string; porPoste: Record<string, string> })
  : null;
const nombres = aplicarNombres(gtfs.stops, gtfs.posteByStopId, tablaNombres);
const stopsConNombre: readonly Stop[] = nombres.stops;

console.log('CAPA DE NOMBRES (A1)\n');
if (nombres.sinCapa) {
  console.log('  ⚠️  NO hay tabla de nombres (src/generated/nombres.json).');
  console.log('     TODAS las paradas usan el nombre del GTFS, MARCADO como sin confirmar.');
  console.log('     Para pedir los nombres buenos al operador:  npm run nombres:build\n');
} else {
  const pct = Math.round((nombres.deAvanza / nombres.total) * 100);
  console.log(`  ✅ ${String(nombres.deAvanza).padStart(4)} / ${nombres.total}  paradas con nombre de Avanza (${pct}%)`);
  console.log(`  ⚠️  ${String(nombres.deGtfsMarcado).padStart(4)} / ${nombres.total}  se quedan con el del GTFS, marcadas (Avanza no las da: desvíos)`);
  if (nombres.sobrantesDeAvanza > 0) {
    console.log(`  ·  ${nombres.sobrantesDeAvanza} poste(s) que Avanza da y no están en nuestro GTFS (paradas provisionales)`);
  }
  console.log('');
}

// ── Flota ───────────────────────────────────────────────────────────────────
const fleet = loadFleet(FLEET);

// ── Los contadores de control, a la vista ───────────────────────────────────
console.log('CONTADORES DE CONTROL (L1 — esperado vs obtenido)\n');
const allControls = [...gtfs.controls, ...fleet.controls];
for (const c of allControls) {
  console.log(`  ✅ ${String(c.got).padStart(8)} / ${String(c.expected).padEnd(8)}  ${c.subject}`);
}
console.log(`\n  ${allControls.length} contadores, todos cuadrados. Si uno fallara, este script`);
console.log('  habría muerto antes de llegar aquí — no habría avisado y seguido.\n');

// ── Avisos ──────────────────────────────────────────────────────────────────
if (gtfs.warnings.length > 0) {
  console.log('AVISOS (no fatales, pero se dicen)\n');
  for (const w of gtfs.warnings) console.log(`  ⚠️  ${w}`);
  console.log('');
}

// ── Vigencia del feed ───────────────────────────────────────────────────────
const status = feedStatus(gtfs.validity, now);
const warn = feedWarning(status, gtfs.validity);
console.log('VIGENCIA DEL FEED\n');
console.log(`  versión:  ${gtfs.validity.version}`);
console.log(`  vigencia: ${gtfs.validity.startDate} → ${gtfs.validity.endDate}`);
console.log(`  estado:   ${status.kind}`);
if (warn) console.log(`\n  ⚠️  ${warn}`);
if (status.kind === 'CADUCADO') {
  console.log('\n  El artefacto se genera IGUALMENTE, con la caducidad grabada dentro, y la');
  console.log('  aplicación lo dirá en pantalla. No se construye a espaldas del usuario,');
  console.log('  pero tampoco se le deja sin servicio por un feed viejo.\n');
}
console.log('');

// ── ⭐ C5 · FUNCIONAMIENTO DE TERMINAL ───────────────────────────────────────
//    Primeras y últimas salidas por tipo de día. Sale de stop_times + trips +
//    calendar_dates, y NO de clasificar `service_id` por su nombre — ver la
//    cabecera de `terminal.ts`: hay dos convenciones distintas en el feed y una
//    de ellas hace circular "domingos y festivos" un martes (porque un festivo
//    CAE en martes). Se evalúa una fecha concreta, que es leer y no inferir.
const term = calcularTerminales(
  files['calendar_dates.txt'],
  files['trips.txt'],
  files['stop_times.txt'],
  now,
);
console.log('FUNCIONAMIENTO DE TERMINAL (C5)\n');
console.log(`  fechas representativas tomadas DEL PROPIO FEED:`);
for (const [k, v] of Object.entries(term.fechas)) {
  console.log(`     ${k.padEnd(10)} ${v ?? '⚠️ el feed no cubre ningún día de este tipo'}`);
}
// ⭐ CONTADOR DE CONTROL (L1): los trips con salida de cabecera tienen que ser
//    TODOS los trips. Si faltara alguno, es que stop_times no cubre un viaje — y
//    entonces la "primera salida" de esa línea podría estar mal y no lo sabríamos.
if (term.control.tripsConSalida !== term.control.tripsLeidos) {
  throw new Error(
    `stop_times no cubre todos los trips: ${term.control.tripsConSalida} de ${term.control.tripsLeidos}. ` +
      'La primera/última salida de alguna línea saldría mal Y NADIE SE ENTERARÍA.',
  );
}
console.log(`  ✅ ${term.control.tripsConSalida} / ${term.control.tripsLeidos}  trips con salida de cabecera`);
console.log(`  ✅ ${term.terminales.length} sentidos con horario de terminal\n`);

// ── Artefacto ───────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const artifact = {
  generatedAt: now.toISOString(),
  modes: MODES,
  validity: gtfs.validity,
  stops: stopsConNombre,
  lines: gtfs.lines,
  directions: gtfs.directions,
  posteByStopId: gtfs.posteByStopId,
  terminales: term.terminales,
  fechasDeReferencia: term.fechas,
  // La flota viaja HORNEADA en el artefacto, no se lee de `data/` en runtime.
  // En producción el bundle no lleva `data/`, y un `readFileSync` que funciona
  // en `next dev` y falla en el servidor es la peor clase de bug: el que solo
  // aparece cuando ya lo ha visto alguien.
  flota: fleet.perfiles,
};
writeFileSync(`${OUT}/gtfs.json`, JSON.stringify(artifact));
writeFileSync(
  `${OUT}/index.ts`,
  `// GENERADO POR scripts/build-data.ts. NO EDITAR A MANO.\n` +
    `import data from './gtfs.json';\nexport default data;\n`,
);

const posteCount = Object.keys(gtfs.posteByStopId).length;
console.log('RESUMEN\n');
console.log(`  líneas             ${gtfs.lines.length}`);
console.log(`  sentidos           ${gtfs.directions.length}`);
console.log(`  paradas            ${gtfs.stops.length}`);
console.log(`  puente de identidad ${posteCount}/${gtfs.stops.length} paradas con poste`);
console.log(`  flota              ${fleet.size} vehículos`);
console.log(`\n  → ${OUT}/gtfs.json  (${(JSON.stringify(artifact).length / 1e6).toFixed(1)} MB)`);
console.log(`\n✅ Ingesta completada en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
