/**
 * Descarga el GTFS del NAP (fichero 1176, «Transporte urbano de Zaragoza»).
 *
 * No se versiona en el repositorio: caduca, cambia cada pocos meses y pesa
 * 6,6 MB. Ver data/gtfs/README.md.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⭐ VA DENTRO DE `npm run build`, Y ES EL PRIMER ESLABÓN.
 *
 *  El primer despliegue en Hostinger murió exactamente aquí: el hosting clona el
 *  repositorio y compila en su servidor, y el zip **no viaja en el repositorio**.
 *  Murió bien —con el mensaje de `readGtfsZip`, legible desde un panel remoto—
 *  pero murió. Así que el build se descarga su propio GTFS.
 *
 *  LAS TRES SITUACIONES, Y QUÉ HACE CADA UNA:
 *
 *    · NAP contesta                    → SE DESCARGA. Siempre. (Ver «por qué» abajo.)
 *    · NAP no contesta + NO hay zip     → ⛔ EL BUILD MUERE. No se construye con
 *                                          datos vacíos: un mapa sin paradas que no
 *                                          se queja es peor que un error.
 *    · NAP no contesta + SÍ hay zip     → ⚠️ SE SIGUE CON EL QUE HAY, diciendo su
 *                                          edad. Un fallo del NAP no puede impedir
 *                                          desplegar; servir el GTFS de ayer sí es
 *                                          aceptable, y callárselo no.
 *
 *  ⚠️ FALTA `NAP_API_KEY` → MUERE SIEMPRE, aunque el zip esté.
 *     Y es a propósito, porque **no es lo mismo una caída que una configuración a
 *     medias**. Una caída del NAP es ajena y pasajera: para eso está el respaldo.
 *     Una clave que falta es un build MAL CONFIGURADO, y tragárselo dejaría el
 *     despliegue congelado para siempre en el zip que hubiera, sin que nadie se
 *     entere nunca. El respaldo es para lo que no controlamos, no para lo que se
 *     nos ha olvidado.
 *
 *  ⚠️ POR QUÉ SE DESCARGA SIEMPRE Y NO SE REUTILIZA EL ZIP EXISTENTE:
 *     1. El feed CADUCA (este trae vigencia 23/06 – 05/10/2026). Compilar producción
 *        contra un zip de hace meses es exactamente la clase de mentira silenciosa
 *        que este proyecto persigue: la app diría «hoy» sobre una red de antes.
 *     2. En Hostinger el zip NO VA A ESTAR CASI NUNCA — cada despliegue clona en
 *        `.builds/source/...`. O sea que la rama «reutilizar» solo se dispararía en
 *        local: sería complejidad extra en el camino que menos importa.
 *     3. Cuesta unos segundos y 6,6 MB. Frente a servir una red equivocada, no hay
 *        discusión.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { existsSync, mkdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const FILE_ID = '1176';
const URL_ = `https://nap.transportes.gob.es/api/Fichero/download/${FILE_ID}`;
const OUT = 'data/gtfs/zaragoza-gtfs.zip';

/**
 * ⚠️ El NAP sin timeout dejaría el build colgado para siempre, que es peor que
 * fallar: un despliegue que no termina no avisa a nadie. 60 s es generoso para
 * 6,6 MB y corto frente a «nunca».
 */
const TIMEOUT_MS = 60_000;

/** Un zip de 6,6 MB. Por debajo de 1 MB no es este fichero, sea lo que sea. */
const SUELO_BYTES = 1_000_000;

const linea = '═'.repeat(70);

/** El recuadro que se ve en el log de un panel remoto, que es la única ventana. */
function recuadro(marca: string, lineas: readonly string[]): string {
  return `\n${marca}${linea}${marca}\n${marca}\n${lineas
    .map((l) => `${marca}   ${l}`)
    .join('\n')}\n${marca}\n${marca}${linea}${marca}\n`;
}

/** Días desde que se escribió el zip que hay. `null` si no se puede saber. */
function edadDelZip(): number | null {
  try {
    return Math.floor((Date.now() - statSync(OUT).mtimeMs) / 86_400_000);
  } catch {
    return null;
  }
}

/**
 * El NAP no ha podido darnos el fichero. Si hay uno viejo se sigue con él; si no,
 * el build muere aquí y ahora, no tres pasos más tarde.
 */
function seguirConElQueHay(motivo: string): never {
  if (!existsSync(OUT)) {
    console.error(
      recuadro('⛔', [
        'NO HAY GTFS, Y NO SE HA PODIDO DESCARGAR.',
        '',
        motivo,
        '',
        `No existe ${OUT} y el NAP no lo ha servido.`,
        'El build SE PARA AQUÍ: no se construye con datos vacíos. Un mapa sin',
        'paradas que no se queja es peor que un error.',
        '',
        'Qué hacer: reintenta el despliegue (el NAP puede estar de mantenimiento),',
        'o comprueba que NAP_API_KEY sigue siendo válida.',
      ]),
    );
    process.exit(1);
  }

  const dias = edadDelZip();
  console.warn(
    recuadro('⚠️', [
      'EL NAP NO HA CONTESTADO. SE COMPILA CON EL GTFS QUE YA HABÍA.',
      '',
      motivo,
      '',
      `Se usa ${OUT}` + (dias === null ? '' : `, descargado hace ${dias} día(s).`),
      'El build CONTINÚA —una caída del NAP no puede impedir desplegar—, pero',
      'los datos son los de esa descarga, no los de hoy.',
      '',
      'Si el feed ha caducado, la aplicación lo dirá en /api/diag y en pantalla.',
    ]),
  );
  process.exit(0);
}

// ── 1 · LA CLAVE. Sin ella no se sigue, haya zip o no ────────────────────────
const key = process.env.NAP_API_KEY?.trim();
if (!key) {
  console.error(
    recuadro('⛔', [
      'FALTA NAP_API_KEY.',
      '',
      'Y el build se para AUNQUE YA HAYA UN ZIP DESCARGADO, a propósito:',
      'una caída del NAP es ajena y pasajera, pero una clave que falta es un',
      'build mal configurado. Seguir con el zip viejo dejaría el despliegue',
      'congelado en él para siempre sin que nadie se entere.',
      '',
      '  1. Regístrate (gratis) en https://nap.transportes.gob.es',
      '  2. Copia la ApiKey de tu perfil',
      '  3. En local:      ponla en .env.local  →  NAP_API_KEY=...',
      '     En Hostinger:  panel → Variables de entorno → NAP_API_KEY',
      '',
      'Ver data/gtfs/README.md',
    ]),
  );
  process.exit(1);
}
// Fijada aquí, tras la guarda: dentro de la función el estrechamiento de `key`
// ya no vale, y un `key!` sería decir «confía en mí» donde se puede demostrar.
const CLAVE: string = key;

// ── 2 · LA DESCARGA ──────────────────────────────────────────────────────────
/**
 * ⚠️ TODO ESTO VA DENTRO DE UNA FUNCIÓN, Y NO ES ESTILO.
 *
 * La versión anterior usaba `await` en el nivel superior y **NO ARRANCABA**:
 * `tsx` compila un `.ts` de un paquete sin `"type": "module"` a CommonJS, y ahí
 * el await de nivel superior es un error de compilación, no de ejecución. O sea
 * que `npm run gtfs:fetch` —el comando que recomienda el README, el de
 * `data/gtfs/README.md` y el que imprime el propio error de `readGtfsZip` cuando
 * falta el GTFS— reventaba con un volcado de esbuild antes de ejecutar una línea.
 * Nadie lo notó porque el zip ya estaba descargado desde antes.
 */
async function descargar(): Promise<void> {
  let res: Response;
  try {
    res = await fetch(URL_, { headers: { ApiKey: CLAVE }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    const err = e as Error;
    seguirConElQueHay(
      err.name === 'TimeoutError'
        ? `El NAP no ha respondido en ${TIMEOUT_MS / 1000} s.`
        : `No se ha podido contactar con el NAP: ${err.message}`,
    );
  }

  if (!res.ok) {
  // ⚠️ 401/403 es la clave, no una caída: eso NO se tapa con el zip viejo. Misma
  //    razón que la clave ausente — es configuración, no meteorología.
  if (res.status === 401 || res.status === 403) {
    console.error(
      recuadro('⛔', [
        `EL NAP RECHAZA LA ApiKey (${res.status} ${res.statusText}).`,
        '',
        'No es una caída: es una clave inválida o caducada, así que NO se sigue',
        'con el zip que hubiera. Renuévala en tu perfil del NAP y vuelve a',
        'ponerla donde toque (.env.local en local, panel en Hostinger).',
      ]),
    );
    process.exit(1);
  }
  seguirConElQueHay(`El NAP respondió ${res.status} ${res.statusText}.`);
  }

  const buf = Buffer.from(await res.arrayBuffer());

  // El NAP devuelve 200 con una página de error cuando algo va mal. Un ZIP
  // empieza por "PK". Si no, NO lo guardamos: guardarlo produciría un fichero
  // llamado .zip que no es un zip, y el error aparecería tres pasos más tarde.
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) {
  seguirConElQueHay(
    `La respuesta del NAP no es un ZIP (${buf.length} bytes, empieza por ` +
      `"${buf.subarray(0, 40).toString('utf8')}").`,
  );
  }
  if (buf.length < SUELO_BYTES) {
  // Un zip truncado empieza por "PK" igual que uno entero. La firma no basta.
  seguirConElQueHay(
    `El ZIP del NAP viene corto: ${(buf.length / 1e6).toFixed(2)} MB, y este fichero pesa ~6,6 MB.`,
  );
  }

  // ── 3 · ESCRITURA ATÓMICA ────────────────────────────────────────────────────
  // ⚠️ A temporal y renombrar, NO directo sobre el bueno. Ahora que esto corre en
  //    CADA build, un `writeFileSync` interrumpido a media escritura destruiría el
  //    único zip que había — justo el respaldo del que depende todo lo de arriba.
  mkdirSync('data/gtfs', { recursive: true });
  const tmp = `${OUT}.${process.pid}.tmp`;
  try {
  writeFileSync(tmp, buf);
  renameSync(tmp, OUT);
  } catch (e) {
  try {
    unlinkSync(tmp);
  } catch {
    /* da igual */
  }
  seguirConElQueHay(`No se ha podido escribir ${OUT}: ${(e as Error).message}`);
  }

  console.log(`✅ GTFS descargado: ${OUT} (${(buf.length / 1e6).toFixed(1)} MB)`);
}

// Una excepción no prevista tampoco puede quedarse en un `unhandled rejection`
// silencioso con código 0: si algo se rompe aquí, el build se entera.
descargar().catch((e: unknown) => {
  seguirConElQueHay(`Error inesperado descargando el GTFS: ${(e as Error).message}`);
});
