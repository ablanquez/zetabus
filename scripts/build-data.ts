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
import { mkdirSync, writeFileSync } from 'node:fs';
import { feedStatus, feedWarning, type Mode } from '@/core';
import { loadGtfs, readGtfsZip } from '@/sources/gtfs-nap';
import { loadFleet } from '@/sources/flota-zetabus/adapter';

const GTFS = 'data/gtfs/zaragoza-gtfs.zip';
const FLEET = 'data/flota-avanza-zaragoza.json';
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

// ── Artefacto ───────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const artifact = {
  generatedAt: now.toISOString(),
  modes: MODES,
  validity: gtfs.validity,
  stops: gtfs.stops,
  lines: gtfs.lines,
  directions: gtfs.directions,
  posteByStopId: gtfs.posteByStopId,
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
