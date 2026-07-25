/**
 * ⭐ FIJA LAS COORDENADAS DE LOS POSTES SOLO-BARRIDO, DESDE EL FEED DE AVANZA.
 *
 *      npx tsx scripts/coords-solo-barrido.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL PROBLEMA. Hay postes que Avanza sirve SOLO cuando una línea va desviada
 *  (provisionales), y que el GTFS no conoce → no tienen lat/lon → no se pueden
 *  pintar en el mapa. El barrido nocturno usa `get_stops_list`, que da el ORDEN
 *  de los postes pero NO su coordenada (medido, ver sources/avanza/recorrido.ts).
 *
 *  LA COORDENADA SÍ EXISTE, EN OTRO FEED. El feed de llegadas por poste
 *  (`gps.avanzabus.com/.../fRefrescaEmpresaExternos`) devuelve el MARCADOR de la
 *  parada (`marcadorParada`) —un campo que el parser YA extrae y la app YA usa
 *  para posicionar la parada del poste—. Este script lo lee una vez, para los 9
 *  postes, y lo FIJA en `data/postes-solo-barrido-coordenadas.json`.
 *
 *  ⚠️ SE FIJA, NO SE DERIVA CADA NOCHE. Una parada física no se mueve: resolverla
 *     una vez es correcto y más robusto que rehacer 9 peticiones cada madrugada
 *     —y el barrido nocturno ya cuida de no saturar Avanza—.
 *
 *  ⚠️ PROCEDENCIA HONESTA: estas coordenadas son `avanza-web` (el mismo literal
 *     que usan los nombres, ver core/provenance.ts), NO `observacion_propia`. No
 *     las vio una persona: las dio el feed. Se guardan con esa procedencia, y el
 *     barrido la PROPAGA al índice tal cual (no la pisa). Esto NO se pinta en
 *     ninguna pantalla: es trazabilidad (git blame + índice), no dato de usuario.
 *
 *  ⚠️ SOLO LA COORDENADA. Las llegadas del mismo feed son volátiles (los buses se
 *     mueven); la coordenada del poste, no. Se lee `marcadorParada` y se ignora
 *     todo lo demás.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⛔ SI ALGÚN POSTE NO DA COORDENADA (feed caído, marcador ausente, o coordenada
 *    fuera de Zaragoza), NO se fija NADA: el script se para y lo dice. Fijar una
 *    coordenada basura es la mentira silenciosa que este proyecto persigue.
 */
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { leerPoste } from '@/sources/avanza/poste';
import { transporteReal } from '@/sources/avanza/transporte';

const OUT = 'data/postes-solo-barrido-coordenadas.json';

/**
 * Los 9 postes solo-barrido de hoy, con la línea a la que pertenecen (de su
 * provisional). Si algún día aparece otro, se añade aquí o se pasa por argv.
 */
const POSTES_POR_DEFECTO = [
  { poste: 617, linea: '34', nombre: 'Parque de Atracciones' },
  { poste: 646, linea: '34', nombre: 'P. Duque de Alba / Sarrión' },
  { poste: 647, linea: '34', nombre: 'P. Duque de Alba / Glorieta' },
  { poste: 648, linea: '34', nombre: 'P. Duque de Alba / Monumento A La Legión' },
  { poste: 649, linea: '34', nombre: 'P. Duque de Alba / Velódromo (Dir. P.Atracc.)' },
  { poste: 650, linea: '34', nombre: 'P. Duque de Alba / Velódromo (Dir. Cementerio)' },
  { poste: 736, linea: '35', nombre: 'Plaza San Francisco' },
  { poste: 1283, linea: '52', nombre: 'Av. de Navarra (C.M.E Inocencio Jimenez / Rioja)' },
  { poste: 8138, linea: '28', nombre: 'P. Echegaray y Caballero nº. 152' },
] as const;

/**
 * Caja de cordura de Zaragoza. Generosa a propósito: no valida "está en la parada
 * exacta" (no lo podemos saber), solo descarta lo absurdo —un 0,0, otro continente,
 * un signo cambiado—. La ciudad va por 41,6x N / -0,8x a -0,9x O.
 */
const CAJA = { latMin: 41.5, latMax: 41.8, lonMin: -1.05, lonMax: -0.75 };

const enZaragoza = (lat: number, lon: number): boolean =>
  lat >= CAJA.latMin && lat <= CAJA.latMax && lon >= CAJA.lonMin && lon <= CAJA.lonMax;

const linea = '═'.repeat(70);
const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** La fecha civil de hoy, `YYYY-MM-DD`. Es un script de terminal: aquí sí se mira el reloj. */
function hoy(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface Fijada {
  readonly lat: number;
  readonly lon: number;
  readonly fuente: 'avanza-web';
  readonly fecha: string;
  readonly comoSeSupo: string;
}

async function main(): Promise<void> {
  const postes = POSTES_POR_DEFECTO;
  const fecha = hoy();

  console.log(`\n  Fijando coordenadas de ${postes.length} postes solo-barrido desde el feed de Avanza`);
  console.log(`  (marcadorParada · ritmo pausado · solo la coordenada, no las llegadas)\n`);

  const resueltas: Record<string, Fijada> = {};
  const fallos: string[] = [];

  for (let i = 0; i < postes.length; i++) {
    const { poste, nombre } = postes[i];
    if (i > 0) await dormir(1_300);

    let marcador: { lat: number; lon: number } | null = null;
    try {
      const lectura = await leerPoste(poste, transporteReal); // REUTILIZA el parser del proyecto
      marcador = lectura.marcadorParada; // solo esto; las llegadas se ignoran
    } catch (e) {
      fallos.push(`poste ${poste} (${nombre}): Avanza no respondió — ${(e as Error).message}`);
      console.log(`  ✗ ${String(poste).padStart(5)}  ${nombre}  → Avanza no respondió`);
      continue;
    }

    if (!marcador) {
      fallos.push(`poste ${poste} (${nombre}): el feed respondió, pero SIN marcador de parada (coordenada ausente o 0,0).`);
      console.log(`  ✗ ${String(poste).padStart(5)}  ${nombre}  → sin marcador`);
      continue;
    }
    if (!enZaragoza(marcador.lat, marcador.lon)) {
      fallos.push(`poste ${poste} (${nombre}): coordenada FUERA de Zaragoza — ${marcador.lat}, ${marcador.lon}`);
      console.log(`  ✗ ${String(poste).padStart(5)}  ${nombre}  → fuera de Zaragoza (${marcador.lat}, ${marcador.lon})`);
      continue;
    }

    resueltas[String(poste)] = {
      lat: marcador.lat,
      lon: marcador.lon,
      fuente: 'avanza-web',
      fecha,
      comoSeSupo: 'marcadorParada del feed de llegadas de Avanza (gps.avanzabus.com), fijado por scripts/coords-solo-barrido.ts',
    };
    console.log(`  ✔ ${String(poste).padStart(5)}  ${nombre}  → ${marcador.lat}, ${marcador.lon}`);
  }

  // ⛔ Si CUALQUIERA falló, NO se escribe nada. Un fichero a medias con 8 de 9 sería
  //    peor que no tocar: parecería completo. Se para y se dice cuál.
  if (fallos.length > 0) {
    console.error(
      `\n⛔${linea}⛔\n⛔\n⛔   NO SE FIJA NADA: ${fallos.length} poste(s) no dieron una coordenada buena.\n⛔\n` +
        fallos.map((f) => `⛔   · ${f}`).join('\n') +
        `\n⛔\n⛔   Fijar una coordenada a medias o basura es la mentira que perseguimos.\n` +
        `⛔   Reintenta cuando Avanza responda (se cae sola). NO se ha tocado ${OUT}.\n⛔\n⛔${linea}⛔\n`,
    );
    process.exit(1);
  }

  const artefacto = {
    _meta: {
      que: 'Coordenadas (lat/lon) FIJADAS de los postes que SOLO aparecen en el barrido de recorridos de Avanza (get_stops_list) y que NO están en nuestro GTFS. Son postes provisionales de un desvío: existen hoy, pero el GTFS no los conoce y por tanto no tiene su posición.',
      de_donde_salen:
        'Del feed de LLEGADAS por poste de Avanza (gps.avanzabus.com/.../fRefrescaEmpresaExternos), que devuelve el marcadorParada. NO de get_stops_list (que da orden de postes, no coordenadas), y NO de observación manual. Las fija scripts/coords-solo-barrido.ts, una vez, reutilizando el parser del proyecto (sources/avanza/parse-poste.ts).',
      procedencia:
        "avanza-web (ver core/provenance.ts). Es dato del OPERADOR, no observacion_propia: no lo vio una persona, lo dio el feed. El barrido lo PROPAGA al indice tal cual, no lo pisa. NO se pinta en ninguna pantalla: es trazabilidad (git blame + indice), no dato de usuario.",
      por_que_se_fija_y_no_se_deriva:
        'Una parada fisica no se mueve: resolverla una vez es correcto y mas robusto que rehacer 9 peticiones cada madrugada. Ademas mantiene el barrido nocturno sin peticiones extra (el "barrido de linea" se aparco justo por saturar Avanza).',
      formato_avanza_web: "poste (string) -> { lat: number, lon: number, fuente: 'avanza-web', fecha: 'YYYY-MM-DD', comoSeSupo: string }",
      tambien_admite:
        "entradas observacion_propia (una persona resuelve la coordenada a mano), con forma { lat, lon, fuente: 'observacion_propia', quien, fecha, comoLoSupe }. Hoy no hay ninguna; el modelo la deja abierta por si un poste no lo diera el feed.",
    },
    postes: resueltas,
  };

  // Escritura atomica (tmp -> rename), como el resto del proyecto.
  mkdirSync('data', { recursive: true });
  const tmp = `${OUT}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, `${JSON.stringify(artefacto, null, 2)}\n`);
    renameSync(tmp, OUT);
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      /* da igual */
    }
    console.error(`⛔ No se pudo escribir ${OUT}: ${(e as Error).message}`);
    process.exit(1);
  }

  // Re-verificacion del fichero ESCRITO (no del objeto en memoria).
  const releido = JSON.parse(readFileSync(OUT, 'utf8')) as { postes: Record<string, Fijada> };
  const n = Object.keys(releido.postes).length;
  if (n !== postes.length) {
    console.error(`⛔ El fichero escrito tiene ${n} postes, esperaba ${postes.length}. Revisa ${OUT}.`);
    process.exit(1);
  }

  console.log(`\n  ✅ ${n} coordenadas fijadas en ${OUT} (procedencia avanza-web).\n`);
}

main().catch((e) => {
  console.error('\n⛔ La fijación de coordenadas ha fallado:\n', e);
  process.exit(1);
});
