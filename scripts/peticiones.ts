/**
 * ¿CUÁNTAS PETICIONES LE HACEMOS A AVANZA DE VERDAD?
 *
 * No es una estimación. Se cuentan, en el único sitio del programa que habla con
 * ellos, simulando escenarios reales de uso con el reloj en la mano.
 *
 * ⚠️ ESTE SCRIPT NO TOCA AVANZA NI UNA VEZ. Usa un transporte falso. La cuenta
 * que sale es la de LLAMADAS QUE SE HABRÍAN HECHO — que es exactamente lo que
 * queremos medir, y medirlo machacándoles sería absurdo además de grosero.
 *
 *      npm run peticiones
 */
import { CacheDosPisos } from '@/cache/dos-pisos';
import { Limitador } from '@/cache/limitador';
import { llegadasDePoste } from '@/engine/llegadas';
import type { Transporte } from '@/sources/avanza/transporte';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RESPUESTA = JSON.stringify({
  tablatiempos:
    '<li><a href="#"><strong>039<i></i>VADORREY</strong></a><ul class="nav nav-second-level">' +
    '<li><a href="https://gps.avanzabus.com/zaragoza/fParadas/744/4650"><i></i>4650 [3 mins]</a></li>' +
    '</ul></li>',
  maquinas: {
    0: { coordenadas: { 0: { LAT: 41.65, LON: -0.88 } }, icon: '/img/bus_rojo.png', title: 'p' },
    1: { coordenadas: { 0: { LAT: 41.64, LON: -0.87 } }, icon: '/img/bus.png', title: '039 4650' },
  },
});

interface Escenario {
  nombre: string;
  detalle: string;
  correr: (dep: { cache: CacheDosPisos; transporte: Transporte }) => Promise<void>;
  /** Cuántas veces se repite el patrón en un minuto (con TTL de 15 s: 4 veces). */
  ciclosPorMinuto: number;
}

/** Un usuario con la pantalla abierta refresca cada 10 s → 6 veces/min. */
const REFRESCOS_POR_MINUTO = 6;
/** Pero la caché solo deja pasar 1 de cada 15 s → 4 refrescos reales/min. */
const CICLOS_UTILES = 4;

/**
 * ⚠️ AQUÍ HABÍA DOS ESCENARIOS MÁS, Y ERAN LOS QUE MANDABAN EN LA CUENTA:
 *
 *     "1 línea en pantalla (la 35)"          →  67 peticiones por barrido
 *     "PEOR CASO: la línea más larga (N7)"   → 119 peticiones por barrido
 *
 * El barrido de línea está APARCADO (ver `docs/BARRIDO_APARCADO.md`), así que ya
 * no hay ninguna operación en la aplicación que haga más de UNA petición a Avanza.
 * Los escenarios que quedan son todos de PARADA — que es todo lo que hay.
 *
 * ⭐ Y ese es justamente el argumento del aparcamiento, dicho en números: el 80%
 *   del valor cuesta UNA petición cacheada; el 20% restante costaba 67.
 */
const ESCENARIOS: Escenario[] = [
  {
    nombre: '1 usuario mirando 1 parada',
    detalle: `refresca cada 10 s (${REFRESCOS_POR_MINUTO} veces/min), pero el TTL de 15 s solo deja pasar ${CICLOS_UTILES}`,
    ciclosPorMinuto: CICLOS_UTILES,
    correr: async (d) => {
      await llegadasDePoste(744, d);
    },
  },
  {
    nombre: '10 usuarios en LA MISMA parada',
    detalle: 'el caso de una marquesina con gente. El vuelo único los funde.',
    ciclosPorMinuto: CICLOS_UTILES,
    correr: async (d) => {
      await Promise.all(Array.from({ length: 10 }, () => llegadasDePoste(744, d)));
    },
  },
  {
    nombre: '10 usuarios en 10 paradas DISTINTAS',
    detalle: 'sin nada que compartir: cada uno paga lo suyo',
    ciclosPorMinuto: CICLOS_UTILES,
    correr: async (d) => {
      const postes = [744, 262, 448, 230, 586, 80, 122, 152, 539, 878];
      await Promise.all(postes.map((p) => llegadasDePoste(p, d)));
    },
  },
  {
    nombre: 'alguien mirando el RECORRIDO de una línea',
    // ⭐ CERO. Y no es que esté cacheado: es que NO EXISTE EL CÓDIGO que lo pediría.
    //    El itinerario sale del GTFS, que se hornea en el build. Avanza no se entera
    //    de que alguien ha abierto /linea/35.
    detalle: 'itinerario, transbordos, paradas. Todo del GTFS. CERO peticiones.',
    ciclosPorMinuto: CICLOS_UTILES,
    correr: async () => {
      /* a propósito: no hay nada que llamar */
    },
  },
  {
    nombre: '⚠️ PEOR CASO: un rastreador pidiendo los 934 postes',
    detalle: 'lo que pasa cuando alguien nos escanea entero. AQUÍ MANDA EL TECHO.',
    ciclosPorMinuto: 1,
    correr: async (d) => {
      const { paradas } = await import('@/engine/topologia');
      const { posteDe, idParada } = await import('@/engine/topologia');
      const postes = paradas()
        .map((s) => posteDe(idParada(String(s.id))))
        .filter((p): p is number => p !== null);
      await Promise.all(postes.map((p) => llegadasDePoste(p, d)));
    },
  },
];

async function main() {
console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║  ZETABUS · PETICIONES A AVANZA, MEDIDAS (no estimadas)                      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
console.log('  Transporte FALSO: cero peticiones reales a Avanza en esta medición.');
console.log('  TTL de caché: 15 s · techo sostenido: 4 req/s (240/min) · ráfaga: 40\n');

const filas: string[] = [];

for (const e of ESCENARIOS) {
  const dir = mkdtempSync(join(tmpdir(), 'zetabus-med-'));
  let llamadas = 0;
  const transporte: Transporte = async () => {
    llamadas++;
    return { status: 200, texto: RESPUESTA };
  };
  // Un cubo generoso para MEDIR la demanda real; luego se compara con el techo.
  const sinTecho = new Limitador(join(dir, 'libre'), 1e6, 1e6);
  const cache = new CacheDosPisos({ dir, limitador: sinTecho });

  // Un ciclo completo (lo que produce UNA carga de pantalla).
  await e.correr({ cache, transporte });
  const porCiclo = llamadas;

  // Los refrescos siguientes DENTRO del TTL no cuestan nada. Se comprueba:
  await e.correr({ cache, transporte });
  const gratis = llamadas - porCiclo;

  const porMinuto = porCiclo * e.ciclosPorMinuto;
  const porSegundo = porMinuto / 60;
  const techa = porSegundo > 4;

  filas.push(
    `  ${e.nombre.padEnd(46)} ${String(porCiclo).padStart(4)} pet.  ` +
      `${String(porMinuto).padStart(5)}/min  ${porSegundo.toFixed(2).padStart(6)}/s  ` +
      (techa ? '⛔ TOPE' : '✅'),
  );
  filas.push(`     ${e.detalle}`);
  filas.push(`     refresco inmediato dentro del TTL: ${gratis} peticiones (la caché lo absorbe)`);
  if (techa) {
    const real = Math.min(porSegundo, 4);
    filas.push(
      `     ⚠️  El techo lo corta a ${real}/s. Lo que sobra NO se encola: se sirve el dato`,
    );
    filas.push('         anterior CON SU EDAD. ZetaBus envejece a la vista; no machaca ni miente.');
  }
  filas.push('');

  rmSync(dir, { recursive: true, force: true });
}

console.log(filas.join('\n'));

console.log('  ────────────────────────────────────────────────────────────────────────────');
console.log('  ⚠️  Y LA CUENTA QUE JUSTIFICA EL PISO DE DISCO:');
console.log('');
console.log('      Si la caché viviera SOLO en memoria, cada worker de Hostinger tendría');
console.log('      la suya. Con 4 workers, TODAS las cifras de arriba se multiplican por 4.');
console.log('      En silencio. Sin un solo error en el log.');
console.log('');
console.log('      El piso de disco es lo único que impide que eso pase, y no depende de');
console.log('      saber cuántos workers hay — que no lo sabemos, y no lo dice su doc.');
console.log('');
console.log('  ⚠️  CERO PETICIONES CUANDO NADIE MIRA: no hay barredor de fondo. Todas estas');
console.log('      cifras son 0 si nadie tiene la pantalla abierta.\n');
}

void main();
