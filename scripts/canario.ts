/**
 * EL CANARIO. Una petición. Una pregunta: ¿sigue Avanza hablando como creemos?
 *
 *      npm run canario
 *
 * ⚠️ POR QUÉ HACE FALTA, Y ES INCÓMODO DECIRLO:
 *
 * Los 157 tests del motor corren contra fixtures que ESCRIBÍ YO. Si Avanza
 * cambiara mañana su HTML, esos tests seguirían en verde — porque prueban que
 * el parser hace lo que creemos, no que Avanza haga lo que creemos.
 *
 * Un CI en verde NO demuestra que la fuente no haya cambiado. Punto.
 *
 * Este script es lo único que lo demuestra: pide UN poste de verdad y comprueba
 * que la respuesta sigue teniendo la forma que el parser espera. Si Avanza
 * cambia algo, aquí sale en rojo, y sale ANTES de que un usuario vea una
 * pantalla vacía y se crea que no hay autobuses.
 *
 * Una petición. Es lo que cuesta no engañarse.
 */
import { parsearPoste } from '@/sources/avanza/parse-poste';
import { leerPoste } from '@/sources/avanza/poste';
import { transporteReal, contador } from '@/sources/avanza/transporte';

/** Plaza San Miguel: dos líneas, dos sentidos. Un poste con tráfico de sobra. */
const POSTE = Number(process.argv[2] ?? 744);

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ZETABUS · CANARIO — ¿sigue Avanza hablando como creemos?     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log(`  poste ${POSTE} · ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}\n`);

  let lectura;
  try {
    lectura = await leerPoste(POSTE, transporteReal);
  } catch (e) {
    console.error('  ⛔ EL CANARIO HA MUERTO.\n');
    console.error(`     ${(e as Error).message}\n`);
    console.error('     O Avanza ha cambiado su respuesta, o está caída, o el parser está mal.');
    console.error('     Las tres cosas hay que MIRARLAS A MANO. No se relaja nada.\n');
    process.exit(1);
  }

  const { llegadas, vehiculos, marcadorParada, avisos } = lectura;

  console.log(`  llegadas leídas:        ${llegadas.length}`);
  console.log(`  vehículos en el mapa:   ${vehiculos.length}`);
  console.log(`  marcador de la parada:  ${marcadorParada ? '✅' : '— (sin coordenadas)'}`);
  console.log(`  con posición:           ${vehiculos.filter((v) => v.posicion).length}/${vehiculos.length}`);
  if (avisos.length) {
    console.log('\n  AVISOS:');
    for (const a of avisos) console.log(`    ⚠️  ${a}`);
  }
  console.log('');

  for (const l of llegadas) {
    console.log(`    ${l.lineaCruda} → ${l.destino.padEnd(18)} coche ${l.coche}  ${String(l.etaMinutos).padStart(3)} min`);
  }

  console.log('');
  if (llegadas.length === 0) {
    console.log('  ⚠️  EL POSTE ESTÁ MUDO AHORA MISMO.');
    console.log('');
    console.log('      Y eso NO prueba nada, ni bueno ni malo: un poste mudo es exactamente');
    console.log('      lo mismo que devuelve un poste inexistente. Vuelve a correrlo en hora');
    console.log('      de servicio, o el canario no está cantando: está callado.\n');
    process.exit(2);
  }

  // ⭐ El cruce de canales ya se ha comprobado dentro de `parsearPoste`: si no
  //    cuadrara, habría lanzado. Que hayamos llegado aquí ES la prueba.
  console.log('  ✅ EL CANARIO CANTA.');
  console.log('');
  console.log('     · el HTML de `tablatiempos` sigue teniendo la forma esperada');
  console.log('     · el cruce `tablatiempos` ↔ `maquinas` CUADRA (si no, habría reventado)');
  console.log('     · los coches del enlace y del texto coinciden, fila a fila');
  console.log('     · el marcador de la parada se distingue de los autobuses por su icono');
  console.log('');
  console.log(`  peticiones a Avanza en esta comprobación: ${contador.cuenta.peticiones}`);
  console.log(`  (${contador.cuenta.msAcumulados} ms)\n`);
}

void main();
export { parsearPoste };
