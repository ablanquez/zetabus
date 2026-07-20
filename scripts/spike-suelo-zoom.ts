/**
 * SPIKE · ¿CUÁNTO SE DISPARA EL CLAMP DE `ZOOM_SUELO`, Y BASTARÍA 13?
 *
 *      npx tsx scripts/spike-suelo-zoom.ts [nMuestra]
 *
 * ⚠️ ESTO NO TOCA EL MAPA. Solo mide, y escribe un JSON que luego consume el
 *    calculador de zoom (que corre en un navegador con el Leaflet de verdad,
 *    porque reimplementar `getBoundsZoom` a mano sería medir mi aritmética en
 *    vez de la del mapa).
 *
 * LA MUESTRA: paradas repartidas por TODA la red, tomadas a paso fijo sobre la
 * lista ordenada por poste. No es aleatoria —así es reproducible— y no está
 * elegida a mano, que era justo lo que había que evitar.
 *
 * ⚠️ EL COSTE: una petición a Avanza por parada, con freno. Se imprime la cuenta.
 */
import { llegadasDePoste } from '@/engine/llegadas';
import { paradas, posteDe } from '@/engine/topologia';
import { motor } from '@/engine/motor';
import { contador } from '@/sources/avanza/transporte';
import { writeFileSync } from 'node:fs';

const N = Number(process.argv[2] ?? 80);
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Haversine, en metros. Para la distancia al autobús más lejano. */
function metros(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function main() {
  const todas = paradas()
    .filter((p) => p.position != null)
    .sort((a, b) => (posteDe(a.id) ?? 0) - (posteDe(b.id) ?? 0));

  const paso = Math.max(1, Math.floor(todas.length / N));
  const muestra = todas.filter((_, i) => i % paso === 0).slice(0, N);

  console.log(`\n  ${todas.length} paradas con coordenadas · muestra de ${muestra.length} (1 de cada ${paso})`);
  console.log('  Una petición por parada, con freno de 260 ms.\n');

  const dep = motor();
  const filas: unknown[] = [];
  let sinBuses = 0;
  let fallos = 0;

  for (const [i, p] of muestra.entries()) {
    const poste = posteDe(p.id)!;
    try {
      const r = await llegadasDePoste(poste, dep);
      if (r.estado !== 'ok') {
        fallos++;
      } else {
        const conPos = r.datos.llegadas.filter((l) => l.posicion !== null);
        const parada = r.datos.posicionParada;
        if (conPos.length === 0 || !parada) {
          sinBuses++;
        } else {
          const dists = conPos.map((l) => metros(parada, l.posicion!));
          filas.push({
            poste,
            nombre: r.datos.nombreParada,
            parada,
            buses: conPos.map((l) => l.posicion!),
            nBuses: conPos.length,
            nLineas: new Set(conPos.map((l) => l.linea ?? l.etiquetaCruda)).size,
            maxMetros: Math.round(Math.max(...dists)),
          });
        }
      }
    } catch {
      fallos++;
    }
    if (i % 10 === 0) process.stdout.write(`  ${i}/${muestra.length}\r`);
    await dormir(260);
  }

  writeFileSync(
    'C:/Users/ORDENA~1/AppData/Local/Temp/claude/f--01-PROYECTOS-003-ZETABUS/2640e540-5594-4313-bac1-f381db32bc48/scratchpad/muestra-zoom.json',
    JSON.stringify({ generado: new Date().toISOString(), muestra: muestra.length, sinBuses, fallos, filas }, null, 1),
  );

  console.log(`\n  aptas ${filas.length} · sin autobuses ${sinBuses} · fallos ${fallos}`);
  console.log(`  peticiones a Avanza: ${contador.cuenta.peticiones}\n`);
}

void main();
