/**
 * ⭐⭐ POST /api/regenerar — LA ÚNICA PUERTA POR LA QUE SE PUEDE LANZAR EL BARRIDO
 * NOCTURNO EN UN HOSTING SIN SSH.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ EXISTE. El índice de correspondencias (`data/generated/…json`) es
 *  dato de HOY: dice qué líneas pasan de verdad por cada poste, desvíos incluidos.
 *  Se regenera de noche. En una máquina propia eso es un `cron` que lanza
 *  `npm run correspondencias:build`; en Hostinger NO HAY SSH, así que lo único
 *  que un cron puede hacer es pedir una URL. Ésta.
 *
 *  ⚠️ ES LO MÁS DELICADO QUE TIENE ESTE PROYECTO: una URL que, si se queda
 *     abierta, cualquiera puede pulsar para lanzar 74 peticiones contra Avanza —un
 *     servicio ajeno del que ZetaBus vive de prestado— tantas veces como quiera.
 *     Todo lo de abajo está para que eso no pueda pasar NI POR DESCUIDO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ LAS CUATRO DECISIONES, Y SUS PORQUÉS:
 *
 * ── 1 · FALLA CERRADO. Si `ZETABUS_REGEN_TOKEN` no está definido, o es corto, el
 *      endpoint devuelve 503 y NO EJECUTA NADA. No hay ninguna rama que lleve a
 *      barrer sin token. El fallo que esto impide es el único que importa: una
 *      variable de entorno que no se copió al configurar el hosting convertiría
 *      esto en un botón público. El largo mínimo está por el mismo motivo — un
 *      `TOKEN=1` es un endpoint abierto con un trámite.
 *
 * ── 2 · SIN TOKEN → **401, NO 404.** Y es a propósito, contra la costumbre.
 *
 *      404 solo sirve para ocultar que el endpoint existe, y **aquí no oculta
 *      nada: el repositorio es PÚBLICO**. Este mismo fichero, con su ruta en el
 *      nombre del directorio, se lee en GitHub. Fingir que no existe sería una
 *      ceremonia que no engaña a quien busca y sí engaña a quien depura: un 404 a
 *      las 02:00 es indistinguible de «me he equivocado de URL», y la URL del
 *      cron se escribe una vez y no se vuelve a mirar. El 401 dice la verdad —
 *      *estás llamando bien, te falta la credencial*— y es exactamente lo que hay
 *      que saber. La puerta no la cierra el disimulo: la cierra el token.
 *
 * ── 3 · **POST, no GET.** Un GET lo dispara un enlace, un prefetch, un rastreador
 *      maleducado o un calentador de caché. Un POST no se dispara solo. Es la
 *      barrera que sigue en pie aunque el token se filtre en un historial de shell.
 *      (`robots.txt` ya cierra `/api/`, pero `robots.txt` es una petición, no una
 *      valla — ver `src/app/robots.ts`.)
 *
 * ── 4 · **RESPONDE 202 Y TRABAJA DE FONDO.** El barrido dura ~2 min. Contestar al
 *      terminar obligaría al `curl` del cron a esperar dos minutos, y en esa espera
 *      hay dos cosas que no controlamos: el timeout del propio cron y el del CDN de
 *      Hostinger (`Server: hcdn`), que delante de una respuesta de dos minutos es
 *      candidato firme a devolver un 504. Si eso pasa, el cron registra un fallo
 *      **sin que sepamos si el trabajo se hizo**: lo peor de los dos mundos.
 *
 *      ⚠️ Y hay un argumento más fuerte, que es una ley de este proyecto: **el
 *         panel tiene que leer el ARTEFACTO, no el registro de que se intentó.**
 *         Un 200 al terminar sería justo eso, un recibo. El resultado de verdad se
 *         mira donde se ha mirado siempre: `/api/diag` → `correspondencias`.
 *
 * ⚠️ LO QUE ESTE FICHERO **NO** GARANTIZA, dicho para que nadie lo dé por hecho:
 *    · Que el cron se haya lanzado. Un cron mal puesto no deja rastro aquí.
 *    · Que un segundo PROCESO de Node no barra a la vez (el cerrojo es por
 *      proceso; ver `@/engine/barrido`). Lo que sí está garantizado es que el
 *      fichero nunca queda a medias.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { after } from 'next/server';
import { barrerCorrespondencias, tomarElCerrojo } from '@/engine/barrido';
// El suelo se importa para el MENSAJE, no para decidir: quien decide es
// `alcanzaElSuelo`, dentro del barrido. Aquí solo se cuenta lo que pasó.
import { RATIO_SUELO as RATIO } from '@/sources/avanza/correspondencias';

export const dynamic = 'force-dynamic';

/** La variable de entorno. En Hostinger: panel → Variables de entorno. */
const VARIABLE = 'ZETABUS_REGEN_TOKEN';

/**
 * ⚠️ Un token corto no es «menos seguro»: es un endpoint abierto con un trámite.
 * 32 caracteres es lo que sale de `openssl rand -hex 16`, y lo recomendado es el
 * doble. Por debajo de esto el endpoint se declara MAL CONFIGURADO (503), no
 * «configurado flojo»: la mitad de una configuración no es una configuración.
 */
const LARGO_MINIMO = 32;

const sinCache = { 'Cache-Control': 'no-store' } as const;

/** El token si está bien puesto; `null` si falta o no llega al mínimo. */
function tokenConfigurado(): string | null {
  const t = process.env[VARIABLE]?.trim();
  return t && t.length >= LARGO_MINIMO ? t : null;
}

/**
 * Comparación de tiempo constante. Se comparan los DIGESTS, no las cadenas: así
 * los dos buffers miden siempre 32 bytes y `timingSafeEqual` no puede reventar por
 * longitudes distintas —que además filtrarían el largo del token—.
 */
function coincide(dado: string, bueno: string): boolean {
  const a = createHash('sha256').update(dado).digest();
  const b = createHash('sha256').update(bueno).digest();
  return timingSafeEqual(a, b);
}

/** `Authorization: Bearer <token>`. Nada de query string: se queda en los logs. */
function tokenDeLaPeticion(req: Request): string | null {
  const cabecera = req.headers.get('authorization');
  if (!cabecera) return null;
  const m = /^Bearer\s+(.+)$/i.exec(cabecera.trim());
  return m ? m[1].trim() : null;
}

export async function POST(req: Request): Promise<Response> {
  const bueno = tokenConfigurado();
  if (bueno === null) {
    // FALLA CERRADO. Ni se mira la cabecera: no hay contra qué compararla.
    console.error(
      `⛔ POST /api/regenerar: ${VARIABLE} no está definido (o es más corto de ${LARGO_MINIMO} caracteres). ` +
        'El endpoint NO ejecuta nada mientras siga así.',
    );
    return Response.json(
      { error: 'no configurado', detalle: `Falta ${VARIABLE} en el servidor.` },
      { status: 503, headers: sinCache },
    );
  }

  const dado = tokenDeLaPeticion(req);
  if (dado === null || !coincide(dado, bueno)) {
    return Response.json(
      { error: 'no autorizado' },
      { status: 401, headers: { ...sinCache, 'WWW-Authenticate': 'Bearer' } },
    );
  }

  // ⚠️ El cerrojo se toma AQUÍ, antes de responder, y no dentro del trabajo: entre
  //    «decido contestar 202» y «empiezo a barrer» hay un hueco, y un segundo
  //    `curl` que cayera dentro se llevaría otro 202 y lanzaría otro barrido.
  const intento = tomarElCerrojo();
  if (!intento.tomado) {
    return Response.json(
      { error: 'ya hay un barrido en curso', desdeHaceSegundos: Math.round(intento.desdeHaceMs / 1000) },
      { status: 409, headers: sinCache },
    );
  }

  const empezadoEn = new Date().toISOString();
  console.log(`▶ /api/regenerar: barrido aceptado (pid ${process.pid}, ${empezadoEn}).`);

  after(async () => {
    try {
      const r = await barrerCorrespondencias({ cerrojoYaTomado: true });
      if (r.estado === 'publicado') {
        console.log(
          `✅ /api/regenerar: índice publicado en ${(r.ms / 1000).toFixed(1)} s · ` +
            `${r.contadores.respondidas}/${r.contadores.esperadas} sentidos · ${r.postes} postes · ` +
            `${r.contadores.lineasDesviadas} líneas desviadas.`,
        );
      } else if (r.estado === 'suelo') {
        console.error(
          `⛔ /api/regenerar: solo respondió el ${Math.round(r.ratio * 100)} % de Avanza (mínimo ` +
            `${Math.round(RATIO * 100)} %). NO se toca el índice que ya había. Se mantiene el de ayer.`,
        );
      } else if (r.estado === 'error') {
        console.error(`⛔ /api/regenerar: el barrido ha fallado: ${r.detalle}. El índice anterior se queda.`);
      } else {
        console.error('⛔ /api/regenerar: el cerrojo dijo «ocupado» con el cerrojo ya tomado. Esto no debería pasar.');
      }
    } finally {
      intento.soltar();
    }
  });

  return Response.json(
    {
      aceptado: true,
      empezadoEn,
      pid: process.pid,
      // Dónde se mira el RESULTADO. Esta respuesta solo dice que se ha aceptado.
      resultadoEn: '/api/diag → correspondencias',
    },
    { status: 202, headers: sinCache },
  );
}
